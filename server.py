from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import re
import threading
import time
import webbrowser
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup
from curl_cffi import requests as curl_requests
from flask import Flask, jsonify, request, send_from_directory


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
STATIC_DIR = ROOT / "static"
ENV_FILE = ROOT / ".env"
CATALOG_FILE = DATA_DIR / "catalog.json"
SNAPSHOTS_FILE = DATA_DIR / "snapshots.jsonl"
DAILY_VIEWS_CSV = DATA_DIR / "daily_blog_views.csv"
CUMULATIVE_VIEWS_CSV = DATA_DIR / "daily_cumulative_views.csv"
COLLECT_INTERVAL_SECONDS = 60 * 60

WIKIDOCS_API = "https://wikidocs.net/napi"
WIKIDOCS_BLOG = "https://wikidocs.net/blog"

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
job_lock = threading.Lock()
job_state: dict[str, Any] = {
    "running": False,
    "started_at": None,
    "finished_at": None,
    "message": "대기 중",
    "progress": [],
    "error": None,
}


def now_kst() -> dt.datetime:
    return dt.datetime.now(dt.timezone(dt.timedelta(hours=9)))


def iso_now() -> str:
    return now_kst().isoformat(timespec="seconds")


def read_env_file(path: Path = ENV_FILE) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def get_config() -> dict[str, Any]:
    file_env = read_env_file()
    token_text = os.environ.get("WIKIDOCS_TOKENS") or file_env.get("WIKIDOCS_TOKENS", "")
    tokens = [token.strip() for token in re.split(r"[\s,]+", token_text) if token.strip()]
    max_pages_raw = os.environ.get("WIKIDOCS_MAX_PAGES") or file_env.get("WIKIDOCS_MAX_PAGES", "0")
    try:
        max_pages = max(0, int(max_pages_raw))
    except ValueError:
        max_pages = 0
    return {"tokens": tokens, "max_pages": max_pages}


def ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, data: Any) -> None:
    ensure_data_dir()
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def append_snapshot(snapshot: dict[str, Any]) -> None:
    ensure_data_dir()
    snapshots = read_snapshots()
    by_date: dict[str, dict[str, Any]] = {}
    for item in snapshots:
        date_key = item.get("date") or str(item.get("collected_at", ""))[:10]
        if not date_key:
            continue
        previous = by_date.get(date_key)
        if not previous or item.get("collected_at", "") > previous.get("collected_at", ""):
            by_date[date_key] = item
    by_date[snapshot["date"]] = snapshot
    daily_snapshots = [by_date[key] for key in sorted(by_date)]
    with SNAPSHOTS_FILE.open("w", encoding="utf-8") as fp:
        for item in daily_snapshots:
            fp.write(json.dumps(item, ensure_ascii=False) + "\n")
    write_daily_csvs(daily_snapshots, active_catalog_blog_ids())


def read_snapshots() -> list[dict[str, Any]]:
    if not SNAPSHOTS_FILE.exists():
        return []
    snapshots: list[dict[str, Any]] = []
    with SNAPSHOTS_FILE.open("r", encoding="utf-8") as fp:
        for line in fp:
            line = line.strip()
            if not line:
                continue
            try:
                snapshots.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return snapshots


def log_job(message: str) -> None:
    with job_lock:
        job_state["message"] = message
        job_state["progress"].append({"at": iso_now(), "message": message})
        job_state["progress"] = job_state["progress"][-80:]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Token {token}"}


def fetch_json(session: requests.Session, url: str, token: str) -> Any:
    last_error: Exception | None = None
    for attempt in range(1, 5):
        try:
            response = session.get(url, headers=auth_headers(token), timeout=40)
            response.raise_for_status()
            return response.json()
        except Exception as exc:  # noqa: BLE001 - surface the final HTTP error with context.
            last_error = exc
            if attempt == 4:
                break
            time.sleep(0.7 * attempt)
    raise RuntimeError(f"Wikidocs API 요청 실패: {url} ({last_error})") from last_error


def fetch_catalog(tokens: list[str]) -> dict[str, Any]:
    if not tokens:
        raise RuntimeError(".env에 WIKIDOCS_TOKENS가 없습니다.")

    session = requests.Session()
    blogs: list[dict[str, Any]] = []
    seen_profiles: set[int] = set()

    for index, token in enumerate(tokens, start=1):
        profile = fetch_json(session, f"{WIKIDOCS_API}/blog/profile/", token)
        profile_id = int(profile["id"])
        if profile_id in seen_profiles:
            continue
        seen_profiles.add(profile_id)
        log_job(f"{index}/{len(tokens)} {profile['name']} 글 목록 확인")

        first_page = fetch_json(session, f"{WIKIDOCS_API}/blog/list/1", token)
        total_pages = int(first_page.get("total_pages") or 1)
        pages = list(first_page.get("blog_pages") or [])
        for page_no in range(2, total_pages + 1):
            page = fetch_json(session, f"{WIKIDOCS_API}/blog/list/{page_no}", token)
            pages.extend(page.get("blog_pages") or [])

        posts_by_id: dict[str, dict[str, Any]] = {}
        for post in pages:
            post_id = int(post["id"])
            posts_by_id[str(post_id)] = {
                "id": post_id,
                "profile_id": profile_id,
                "title": post.get("title") or f"Untitled {post_id}",
                "is_public": bool(post.get("is_public")),
                "url": f"{WIKIDOCS_BLOG}/@{profile['url']}/{post_id}/",
            }

        blogs.append(
            {
                "id": profile_id,
                "slug": profile["url"],
                "name": profile["name"],
                "api_pages": total_pages,
                "post_count": len(posts_by_id),
                "posts": list(posts_by_id.values()),
            }
        )

    catalog = {"updated_at": iso_now(), "blogs": blogs}
    write_json(CATALOG_FILE, catalog)
    return catalog


def load_or_fetch_catalog(tokens: list[str], force: bool = False) -> dict[str, Any]:
    if force or not CATALOG_FILE.exists():
        return fetch_catalog(tokens)
    return read_json(CATALOG_FILE, {"updated_at": None, "blogs": []})


def public_session() -> Any:
    return curl_requests.Session(impersonate="chrome124", verify=False)


def parse_public_blog_page(html: str, slug: str, page_no: int) -> tuple[int, list[dict[str, Any]]]:
    soup = BeautifulSoup(html, "html.parser")
    max_page = page_no
    for anchor in soup.select(".page-link"):
        try:
            max_page = max(max_page, int(anchor.get("data-page") or 0))
        except ValueError:
            continue

    posts: list[dict[str, Any]] = []
    href_re = re.compile(rf"^/blog/@{re.escape(slug)}/(\d+)/")
    for anchor in soup.find_all("a", href=True):
        match = href_re.match(anchor["href"])
        if not match:
            continue
        card = anchor.select_one("div.rounded-md") or anchor
        meta = card.select_one("div.mt-4.text-sm")
        meta_text = meta.get_text(" ", strip=True) if meta else ""
        numbers = [int(num.replace(",", "")) for num in re.findall(r"\d[\d,]*", meta_text)]
        if len(numbers) < 3:
            continue
        post_id = int(match.group(1))
        views, likes, comments = numbers[-3:]
        posts.append(
            {
                "id": post_id,
                "views": views,
                "likes": likes,
                "comments": comments,
                "source_page": page_no,
            }
        )
    return max_page, posts


def scrape_blog_views(slug: str, max_pages: int = 0, delay: float = 0.12) -> dict[str, dict[str, Any]]:
    session = public_session()
    collected: dict[str, dict[str, Any]] = {}
    page_no = 1
    discovered_pages = 1

    while True:
        url = f"{WIKIDOCS_BLOG}/@{quote(slug)}/?page={page_no}&sort=recent"
        response = None
        last_error: Exception | None = None
        for attempt in range(1, 5):
            try:
                response = session.get(url, timeout=40)
                response.raise_for_status()
                break
            except Exception as exc:  # noqa: BLE001 - retry transient Cloudflare/origin failures.
                last_error = exc
                if attempt == 4:
                    raise RuntimeError(f"공개 페이지 수집 실패: {url} ({last_error})") from last_error
                time.sleep(0.8 * attempt)
        if response is None:
            raise RuntimeError(f"공개 페이지 수집 실패: {url}")
        html = response.content.decode("utf-8", "replace")
        discovered_pages, posts = parse_public_blog_page(html, slug, page_no)
        for post in posts:
            collected[str(post["id"])] = post

        if max_pages and page_no >= max_pages:
            break
        if page_no >= discovered_pages:
            break
        page_no += 1
        time.sleep(delay)

    return collected


def collect_snapshot(max_pages: int = 0, refresh_catalog: bool = False) -> dict[str, Any]:
    config = get_config()
    tokens = config["tokens"]
    catalog = load_or_fetch_catalog(tokens, force=refresh_catalog)
    if not catalog.get("blogs"):
        catalog = fetch_catalog(tokens)

    snapshot_blogs: list[dict[str, Any]] = []
    for index, blog in enumerate(catalog["blogs"], start=1):
        page_text = "전체" if max_pages == 0 else f"{max_pages}페이지"
        log_job(f"{index}/{len(catalog['blogs'])} {blog['name']} 조회수 수집 중 ({page_text})")
        views_by_id = scrape_blog_views(blog["slug"], max_pages=max_pages)
        posts = []
        catalog_posts = {str(post["id"]): post for post in blog.get("posts", [])}
        for post_id, view_data in views_by_id.items():
            meta = catalog_posts.get(post_id, {})
            posts.append(
                {
                    "id": int(post_id),
                    "title": meta.get("title") or f"Post {post_id}",
                    "url": meta.get("url") or f"{WIKIDOCS_BLOG}/@{blog['slug']}/{post_id}/",
                    "views": int(view_data["views"]),
                    "likes": int(view_data["likes"]),
                    "comments": int(view_data["comments"]),
                    "source_page": int(view_data["source_page"]),
                }
            )
        posts.sort(key=lambda item: item["views"], reverse=True)
        snapshot_blogs.append(
            {
                "id": blog["id"],
                "slug": blog["slug"],
                "name": blog["name"],
                "post_count": len(catalog_posts),
                "captured_posts": len(posts),
                "total_views": sum(post["views"] for post in posts),
                "posts": posts,
            }
        )

    snapshot = {
        "date": now_kst().date().isoformat(),
        "collected_at": iso_now(),
        "source": "wikidocs-public-html",
        "max_pages": max_pages,
        "blogs": snapshot_blogs,
    }
    append_snapshot(snapshot)
    log_job("조회수 스냅샷 저장 완료")
    return snapshot


def latest_snapshot_per_day(snapshots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_date: dict[str, dict[str, Any]] = {}
    for snapshot in snapshots:
        date = snapshot.get("date") or str(snapshot.get("collected_at", ""))[:10]
        if not date:
            continue
        prev = by_date.get(date)
        if not prev or snapshot.get("collected_at", "") > prev.get("collected_at", ""):
            by_date[date] = snapshot
    return [by_date[key] for key in sorted(by_date)]


def write_daily_csvs(daily_snapshots: list[dict[str, Any]], allowed_blog_ids: set[str] | None = None) -> None:
    previous_total_by_blog: dict[str, int] = {}
    daily_rows: list[dict[str, Any]] = []
    cumulative_rows: list[dict[str, Any]] = []

    for snapshot in daily_snapshots:
        snapshot_date = snapshot.get("date") or str(snapshot.get("collected_at", ""))[:10]
        date_daily_total = 0
        date_cumulative_total = 0
        for blog in snapshot.get("blogs", []):
            blog_id = str(blog["id"])
            if allowed_blog_ids is not None and blog_id not in allowed_blog_ids:
                continue
            total_views = int(blog.get("total_views") or 0)
            previous_total = previous_total_by_blog.get(blog_id, total_views)
            daily_views = max(0, total_views - previous_total)
            previous_total_by_blog[blog_id] = total_views
            date_daily_total += daily_views
            date_cumulative_total += total_views
            base = {
                "date": snapshot_date,
                "blog_id": blog["id"],
                "blog_slug": blog.get("slug", ""),
                "blog_name": blog.get("name", ""),
            }
            daily_rows.append({**base, "daily_views": daily_views})
            cumulative_rows.append({**base, "total_views": total_views})

        daily_rows.append(
            {
                "date": snapshot_date,
                "blog_id": "all",
                "blog_slug": "all",
                "blog_name": "전체 블로그",
                "daily_views": date_daily_total,
            }
        )
        cumulative_rows.append(
            {
                "date": snapshot_date,
                "blog_id": "all",
                "blog_slug": "all",
                "blog_name": "전체 블로그",
                "total_views": date_cumulative_total,
            }
        )

    with DAILY_VIEWS_CSV.open("w", encoding="utf-8-sig", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=["date", "blog_id", "blog_slug", "blog_name", "daily_views"])
        writer.writeheader()
        writer.writerows(daily_rows)

    with CUMULATIVE_VIEWS_CSV.open("w", encoding="utf-8-sig", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=["date", "blog_id", "blog_slug", "blog_name", "total_views"])
        writer.writeheader()
        writer.writerows(cumulative_rows)


def catalog_needs_refresh() -> bool:
    catalog = read_json(CATALOG_FILE, {"updated_at": None, "blogs": []})
    updated_at = str(catalog.get("updated_at") or "")[:10]
    return not catalog.get("blogs") or updated_at < now_kst().date().isoformat()


def active_catalog_blog_ids() -> set[str] | None:
    catalog = read_json(CATALOG_FILE, {"blogs": []})
    blogs = catalog.get("blogs") or []
    if not blogs:
        return None
    return {str(blog["id"]) for blog in blogs}


def latest_snapshot_date() -> str | None:
    snapshots = latest_snapshot_per_day(read_snapshots())
    if not snapshots:
        return None
    return snapshots[-1].get("date") or str(snapshots[-1].get("collected_at", ""))[:10]


def should_collect_today() -> bool:
    return latest_snapshot_date() != now_kst().date().isoformat()


def snapshot_blog_map(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {str(blog["id"]): blog for blog in snapshot.get("blogs", [])}


def snapshot_post_map(snapshot: dict[str, Any]) -> dict[str, dict[str, dict[str, Any]]]:
    data: dict[str, dict[str, dict[str, Any]]] = {}
    for blog in snapshot.get("blogs", []):
        data[str(blog["id"])] = {str(post["id"]): post for post in blog.get("posts", [])}
    return data


def build_dashboard() -> dict[str, Any]:
    config = get_config()
    catalog = read_json(CATALOG_FILE, {"updated_at": None, "blogs": []})
    snapshots = read_snapshots()
    daily_snapshots = latest_snapshot_per_day(snapshots)
    latest = daily_snapshots[-1] if daily_snapshots else None
    previous = daily_snapshots[-2] if len(daily_snapshots) >= 2 else None

    latest_blogs = snapshot_blog_map(latest or {})
    previous_blogs = snapshot_blog_map(previous or {})
    previous_posts = snapshot_post_map(previous or {})

    blogs = []
    all_top_posts = []
    for blog in catalog.get("blogs", []):
        blog_id = str(blog["id"])
        latest_blog = latest_blogs.get(blog_id, {})
        prev_blog = previous_blogs.get(blog_id, {})
        total_views = int(latest_blog.get("total_views") or 0)
        daily_views = max(0, total_views - int(prev_blog.get("total_views") or total_views))

        posts = []
        for post in latest_blog.get("posts", []):
            prev_post = previous_posts.get(blog_id, {}).get(str(post["id"]), {})
            daily_delta = max(0, int(post["views"]) - int(prev_post.get("views") or post["views"]))
            enriched = {
                **post,
                "blog_id": blog["id"],
                "blog_name": blog["name"],
                "blog_slug": blog["slug"],
                "daily_views": daily_delta,
            }
            posts.append(enriched)
            all_top_posts.append(enriched)

        posts_by_daily = sorted(posts, key=lambda item: (item["daily_views"], item["views"]), reverse=True)
        posts_by_total = sorted(posts, key=lambda item: item["views"], reverse=True)
        blogs.append(
            {
                "id": blog["id"],
                "name": blog["name"],
                "slug": blog["slug"],
                "post_count": blog.get("post_count", 0),
                "captured_posts": int(latest_blog.get("captured_posts") or 0),
                "total_views": total_views,
                "daily_views": daily_views,
                "top_post": posts_by_total[0] if posts_by_total else None,
                "top_daily_post": posts_by_daily[0] if posts_by_daily else None,
                "posts": posts_by_total[:100],
            }
        )

    daily_series = []
    previous_total_by_blog: dict[str, int] = {}
    active_blog_ids = {str(blog["id"]) for blog in catalog.get("blogs", [])}
    latest_snapshot_date_value = latest.get("date") if latest else None
    observed_start_date = daily_snapshots[0].get("date") if daily_snapshots else None
    for snapshot in daily_snapshots:
        for blog in snapshot.get("blogs", []):
            blog_id = str(blog["id"])
            if active_blog_ids and blog_id not in active_blog_ids:
                continue
            total = int(blog.get("total_views") or 0)
            prior = previous_total_by_blog.get(blog_id, total)
            daily_series.append(
                {
                    "date": snapshot.get("date"),
                    "blog_id": blog["id"],
                    "blog_name": blog["name"],
                    "blog_slug": blog.get("slug", ""),
                    "total_views": total,
                    "daily_views": max(0, total - prior),
                    "is_realtime_today": snapshot.get("date") == now_kst().date().isoformat(),
                }
            )
            previous_total_by_blog[blog_id] = total

    all_top_posts.sort(key=lambda item: item["views"], reverse=True)
    top_daily_posts = sorted(
        [post for post in all_top_posts if int(post.get("daily_views") or 0) > 0],
        key=lambda item: (item["daily_views"], item["views"]),
        reverse=True,
    )

    totals = {
        "blogs": len(catalog.get("blogs", [])),
        "posts": sum(int(blog.get("post_count") or 0) for blog in catalog.get("blogs", [])),
        "captured_posts": sum(blog["captured_posts"] for blog in blogs),
        "total_views": sum(blog["total_views"] for blog in blogs),
        "daily_views": sum(blog["daily_views"] for blog in blogs),
    }

    return {
        "config": {"has_tokens": bool(config["tokens"]), "token_count": len(config["tokens"]), "max_pages": config["max_pages"]},
        "catalog_updated_at": catalog.get("updated_at"),
        "latest_snapshot_at": latest.get("collected_at") if latest else None,
        "latest_snapshot_date": latest.get("date") if latest else None,
        "snapshot_count": len(snapshots),
        "daily_snapshot_count": len(daily_snapshots),
        "totals": totals,
        "blogs": sorted(blogs, key=lambda item: item["total_views"], reverse=True),
        "daily_series": daily_series,
        "observed_start_date": observed_start_date,
        "history_mode": "observed_snapshots_only",
        "history_note": "위키독스는 과거 일별 조회수 원본을 API로 제공하지 않아, 이 대시보드는 저장된 스냅샷 날짜부터 실제 일별 증가분을 누적합니다. 저장된 날짜는 CSV/JSONL에서 재사용하고 오늘 데이터만 실시간으로 갱신합니다.",
        "daily_views_csv": str(DAILY_VIEWS_CSV),
        "cumulative_views_csv": str(CUMULATIVE_VIEWS_CSV),
        "is_today_realtime": latest_snapshot_date_value == now_kst().date().isoformat(),
        "needs_today_collect": should_collect_today(),
        "top_posts": all_top_posts[:30],
        "top_daily_posts": top_daily_posts[:30],
        "job": job_state,
    }


def run_background_collect(max_pages: int, refresh_catalog: bool) -> None:
    with job_lock:
        job_state.update(
            {
                "running": True,
                "started_at": iso_now(),
                "finished_at": None,
                "message": "수집 시작",
                "progress": [],
                "error": None,
            }
        )
    try:
        collect_snapshot(max_pages=max_pages, refresh_catalog=refresh_catalog)
    except Exception as exc:
        with job_lock:
            job_state["error"] = str(exc)
            job_state["message"] = f"오류: {exc}"
    finally:
        with job_lock:
            job_state["running"] = False
            job_state["finished_at"] = iso_now()


def start_collect_thread(max_pages: int, refresh_catalog: bool) -> bool:
    with job_lock:
        if job_state.get("running"):
            return False
    threading.Thread(
        target=run_background_collect,
        args=(max_pages, refresh_catalog),
        daemon=True,
    ).start()
    return True


def daily_scheduler(max_pages: int) -> None:
    while True:
        time.sleep(COLLECT_INTERVAL_SECONDS)
        start_collect_thread(max_pages, catalog_needs_refresh())


@app.get("/")
def index() -> Any:
    return send_from_directory(STATIC_DIR, "index.html")


@app.get("/api/dashboard")
def api_dashboard() -> Any:
    return jsonify(build_dashboard())


@app.get("/api/job")
def api_job() -> Any:
    return jsonify(job_state)


@app.post("/api/collect")
def api_collect() -> Any:
    with job_lock:
        if job_state.get("running"):
            return jsonify({"ok": False, "message": "이미 수집 중입니다.", "job": job_state}), 409

    payload = request.get_json(silent=True) or {}
    config = get_config()
    max_pages = payload.get("max_pages", config["max_pages"])
    try:
        max_pages = max(0, int(max_pages))
    except (TypeError, ValueError):
        max_pages = config["max_pages"]
    if "refresh_catalog" in payload:
        refresh_catalog = bool(payload.get("refresh_catalog"))
    else:
        refresh_catalog = catalog_needs_refresh()
    start_collect_thread(max_pages, refresh_catalog)
    return jsonify({"ok": True, "message": "수집을 시작했습니다.", "job": job_state})


@app.post("/api/catalog")
def api_catalog() -> Any:
    with job_lock:
        if job_state.get("running"):
            return jsonify({"ok": False, "message": "다른 작업이 진행 중입니다.", "job": job_state}), 409

    def run_catalog() -> None:
        with job_lock:
            job_state.update(
                {
                    "running": True,
                    "started_at": iso_now(),
                    "finished_at": None,
                    "message": "글 목록 동기화 시작",
                    "progress": [],
                    "error": None,
                }
            )
        try:
            fetch_catalog(get_config()["tokens"])
            log_job("글 목록 동기화 완료")
        except Exception as exc:
            with job_lock:
                job_state["error"] = str(exc)
                job_state["message"] = f"오류: {exc}"
        finally:
            with job_lock:
                job_state["running"] = False
                job_state["finished_at"] = iso_now()

    threading.Thread(target=run_catalog, daemon=True).start()
    return jsonify({"ok": True, "message": "글 목록 동기화를 시작했습니다.", "job": job_state})


@app.post("/api/import-csv")
def api_import_csv() -> Any:
    if "file" not in request.files:
        return jsonify({"ok": False, "message": "CSV 파일이 없습니다."}), 400

    upload = request.files["file"]
    text = upload.read().decode("utf-8-sig")
    reader = csv.DictReader(text.splitlines())
    required = {"blog_slug", "post_id", "views"}
    if not required.issubset(set(reader.fieldnames or [])):
        return jsonify({"ok": False, "message": "CSV에는 blog_slug, post_id, views 열이 필요합니다."}), 400

    catalog = read_json(CATALOG_FILE, {"blogs": []})
    blog_by_slug = {blog["slug"]: blog for blog in catalog.get("blogs", [])}
    posts_by_blog: dict[str, list[dict[str, Any]]] = {}
    for row in reader:
        slug = row["blog_slug"].strip()
        blog = blog_by_slug.get(slug)
        if not blog:
            continue
        post_id = int(row["post_id"])
        meta = {str(post["id"]): post for post in blog.get("posts", [])}.get(str(post_id), {})
        posts_by_blog.setdefault(slug, []).append(
            {
                "id": post_id,
                "title": row.get("title") or meta.get("title") or f"Post {post_id}",
                "url": meta.get("url") or f"{WIKIDOCS_BLOG}/@{slug}/{post_id}/",
                "views": int(str(row["views"]).replace(",", "")),
                "likes": int(str(row.get("likes") or 0).replace(",", "")),
                "comments": int(str(row.get("comments") or 0).replace(",", "")),
                "source_page": 0,
            }
        )

    snapshot_blogs = []
    for slug, posts in posts_by_blog.items():
        blog = blog_by_slug[slug]
        snapshot_blogs.append(
            {
                "id": blog["id"],
                "slug": slug,
                "name": blog["name"],
                "post_count": blog.get("post_count", len(posts)),
                "captured_posts": len(posts),
                "total_views": sum(post["views"] for post in posts),
                "posts": sorted(posts, key=lambda item: item["views"], reverse=True),
            }
        )
    snapshot = {
        "date": now_kst().date().isoformat(),
        "collected_at": iso_now(),
        "source": "csv-import",
        "max_pages": 0,
        "blogs": snapshot_blogs,
    }
    append_snapshot(snapshot)
    return jsonify({"ok": True, "message": "CSV 스냅샷을 저장했습니다.", "snapshot": snapshot})


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Wikidocs blog views dashboard.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8795, type=int)
    parser.add_argument("--open", action="store_true", help="Open the dashboard in the default browser.")
    parser.add_argument("--collect", action="store_true", help="Collect a snapshot before serving.")
    parser.add_argument("--catalog", action="store_true", help="Refresh the post catalog before serving.")
    parser.add_argument("--max-pages", type=int, default=None, help="Limit public pages per blog. 0 means all pages.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = get_config()
    max_pages = config["max_pages"] if args.max_pages is None else max(0, args.max_pages)
    if args.catalog:
        fetch_catalog(config["tokens"])
    if args.collect:
        collect_snapshot(max_pages=max_pages, refresh_catalog=True)
    elif should_collect_today():
        start_collect_thread(max_pages, catalog_needs_refresh())
    threading.Thread(target=daily_scheduler, args=(max_pages,), daemon=True).start()
    url = f"http://{args.host}:{args.port}"
    if args.open:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    app.run(host=args.host, port=args.port, debug=False)


if __name__ == "__main__":
    main()
