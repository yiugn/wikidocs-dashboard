from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

import server


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def reset_public_dir(public_dir: Path) -> None:
    root = server.ROOT.resolve()
    target = public_dir.resolve()
    if root not in target.parents:
        raise RuntimeError(f"Refusing to clear a directory outside project root: {target}")
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True, exist_ok=True)


def copy_if_exists(source: Path, target: Path) -> None:
    if source.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def export_public(public_dir: Path) -> None:
    server.ensure_data_dir()
    daily_snapshots = server.latest_snapshot_per_day(server.read_snapshots())
    server.write_daily_csvs(daily_snapshots, server.active_catalog_blog_ids())

    reset_public_dir(public_dir)
    shutil.copytree(server.STATIC_DIR, public_dir, dirs_exist_ok=True)
    (public_dir / ".nojekyll").write_text("", encoding="utf-8")

    dashboard = server.build_dashboard()
    dashboard["static_generated_at"] = server.iso_now()
    dashboard["daily_views_csv"] = "data/daily_blog_views.csv"
    dashboard["cumulative_views_csv"] = "data/daily_cumulative_views.csv"
    dashboard["job"] = {
        "running": False,
        "started_at": None,
        "finished_at": dashboard["static_generated_at"],
        "message": "GitHub Actions 자동 갱신 완료",
        "progress": [],
        "error": None,
    }
    write_json(public_dir / "data" / "dashboard.json", dashboard)

    review_note = server.build_review_note_dashboard()
    review_note["static_generated_at"] = dashboard["static_generated_at"]
    write_json(public_dir / "data" / "review-note.json", review_note)

    copy_if_exists(server.DAILY_VIEWS_CSV, public_dir / "data" / "daily_blog_views.csv")
    copy_if_exists(server.CUMULATIVE_VIEWS_CSV, public_dir / "data" / "daily_cumulative_views.csv")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect Wikidocs stats and export a static GitHub Pages dashboard.")
    parser.add_argument("--collect", action="store_true", help="Collect a fresh snapshot before exporting.")
    parser.add_argument("--refresh-catalog", action="store_true", help="Force refresh the Wikidocs post catalog.")
    parser.add_argument("--max-pages", type=int, default=None, help="Limit public pages per blog. 0 means all pages.")
    parser.add_argument("--public-dir", default="public", help="Directory to write the static site to.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = server.get_config()
    max_pages = config["max_pages"] if args.max_pages is None else max(0, args.max_pages)
    if args.collect:
        server.collect_snapshot(
            max_pages=max_pages,
            refresh_catalog=args.refresh_catalog or server.catalog_needs_refresh(),
        )
    export_public((server.ROOT / args.public_dir).resolve())


if __name__ == "__main__":
    main()
