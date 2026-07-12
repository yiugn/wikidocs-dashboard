const state = {
  data: null,
  view: "popular",
  blogSlug: "",
  query: "",
  staticMode:
    new URLSearchParams(window.location.search).has("static") ||
    !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname) ||
    window.location.protocol === "file:",
};

const API_URL = "/api/review-note";
const STATIC_URL = "../data/review-note.json";
const $ = (id) => document.getElementById(id);

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDateOnly(value) {
  if (!value) return "없음";
  const isoDate = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanExcerpt(value, title = "") {
  let text = String(value || "")
    .replace(/>?\s*🔔[\s\S]*?수수료를 제공받습니다\.?/u, "")
    .replace(/\s+/g, " ")
    .trim();
  if (title && text.startsWith(title)) {
    text = text.slice(title.length).trim();
  }
  return text;
}

function fallbackLabel(post) {
  if (post.blog_slug === "cartemlab") return "CAR";
  if (post.blog_slug === "petpicknote") return "PET";
  return "LIFE";
}

function imageMarkup(post, className = "") {
  if (post.thumbnail_url) {
    return `<img class="${className}" src="${escapeHtml(post.thumbnail_url)}" alt="${escapeHtml(post.title)}" loading="lazy" />`;
  }
  return `<div class="fallback-media">${fallbackLabel(post)}</div>`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.statusText);
  return response.json();
}

function statCard(label, value, hint) {
  return `
    <article class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <p>${hint}</p>
    </article>
  `;
}

function renderStats(data) {
  const totals = data.totals || {};
  $("statGrid").innerHTML = [
    statCard("누적 조회수", formatNumber(totals.total_views), "3개 리뷰 블로그 합계"),
    statCard("오늘 조회수", formatNumber(totals.daily_views), data.is_today_realtime ? "실시간 스냅샷 기준" : "마지막 저장 기준"),
    statCard("전일 조회수", formatNumber(totals.previous_day_views), `${totals.previous_day_date || "전일"} 기준`),
    statCard("리뷰 수", formatNumber(totals.posts), `${formatNumber(totals.blogs)}개 블로그 수집`),
    statCard("당월 조회수", formatNumber(totals.current_month_views), "저장 로그 이후 월 누적"),
    statCard("최근 갱신", formatDateOnly(data.latest_snapshot_at), `${data.refresh_minutes || 30}분 단위`),
  ].join("");
}

function postMatches(post) {
  if (!state.query) return true;
  const target = [post.title, post.excerpt, post.blog_name].join(" ").toLowerCase();
  return target.includes(state.query.toLowerCase());
}

function getPostsForView() {
  const data = state.data || {};
  const posts = data.posts || [];
  const filtered = posts.filter(postMatches);
  if (state.view === "rising") {
    return [...filtered].sort((a, b) => Number(b.daily_views || 0) - Number(a.daily_views || 0) || Number(b.views || 0) - Number(a.views || 0));
  }
  return [...filtered].sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
}

function cardMarkup(post, index) {
  const excerpt = cleanExcerpt(post.excerpt, post.title);
  const hotBadge = Number(post.daily_views || 0) > 0 ? `<span class="hot-chip">오늘 +${formatNumber(post.daily_views)}</span>` : "";
  return `
    <a class="tile-card" href="${escapeHtml(post.url)}" target="_blank" rel="noreferrer">
      <div class="tile-media">
        ${imageMarkup(post)}
      </div>
      <div class="tile-body">
        <div class="metric-row">
          <span class="rank-chip">#${index + 1}</span>
          <span class="blog-chip">${escapeHtml(post.blog_name)}</span>
          ${hotBadge}
        </div>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(excerpt || "조회 흐름으로 선별된 리뷰입니다.")}</p>
        <div class="metric-row">
          <span class="metric-pill">누적 ${formatNumber(post.views)}</span>
          <span class="metric-pill">오늘 ${formatNumber(post.daily_views)}</span>
        </div>
        <div class="tile-footer">
          <span class="mini-link">리뷰 보기</span>
          <span class="mini-link">${formatNumber(post.likes)} 좋아요</span>
        </div>
      </div>
    </a>
  `;
}

function renderSpotlight(data) {
  const topPost = (data.posts || [])[0];
  if (!topPost) {
    $("spotlight").innerHTML = `<div class="empty">표시할 리뷰가 없습니다.</div>`;
    return;
  }
  $("spotlight").innerHTML = `
    <div class="spotlight-media">${imageMarkup(topPost)}</div>
    <div class="spotlight-body">
      <div>
        <div class="metric-row">
          <span class="blog-chip">${escapeHtml(topPost.blog_name)}</span>
          <span class="rank-chip">누적 1위</span>
        </div>
        <h2>${escapeHtml(topPost.title)}</h2>
        <p>${escapeHtml(cleanExcerpt(topPost.excerpt, topPost.title) || "가장 많이 읽힌 리뷰입니다.")}</p>
      </div>
      <div>
        <div class="metric-row">
          <span class="metric-pill">누적 ${formatNumber(topPost.views)}</span>
          <span class="metric-pill">오늘 ${formatNumber(topPost.daily_views)}</span>
          <span class="metric-pill">${escapeHtml(topPost.published_label || "리뷰")}</span>
        </div>
        <div class="cta-row">
          <a class="view-link" href="${escapeHtml(topPost.url)}" target="_blank" rel="noreferrer">바로 보기</a>
          <span class="mini-link">인기 리뷰</span>
        </div>
      </div>
    </div>
  `;
}

function renderRisingList(data) {
  const rows = (data.rising_posts || []).filter((post) => Number(post.daily_views || 0) > 0).slice(0, 6);
  $("risingCount").textContent = `${formatNumber(rows.length)}개`;
  $("risingList").innerHTML = rows.length
    ? rows
        .map(
          (post) => `
        <a class="rising-item" href="${escapeHtml(post.url)}" target="_blank" rel="noreferrer">
          ${imageMarkup(post)}
          <div>
            <strong>${escapeHtml(post.title)}</strong>
            <span>오늘 +${formatNumber(post.daily_views)} · 누적 ${formatNumber(post.views)}</span>
          </div>
        </a>
      `,
        )
        .join("")
    : `<div class="empty">오늘 상승 데이터가 아직 없습니다.</div>`;
}

function renderFlatView() {
  const posts = getPostsForView();
  $("contentArea").className = "tile-grid";
  $("contentArea").innerHTML = posts.length ? posts.map(cardMarkup).join("") : `<div class="empty">검색 결과가 없습니다.</div>`;
  $("resultCount").textContent = `${formatNumber(posts.length)}개 리뷰`;
}

function renderBlogView() {
  const data = state.data || {};
  const blogs = data.blogs || [];
  if (!state.blogSlug || !blogs.some((blog) => blog.slug === state.blogSlug)) {
    state.blogSlug = blogs[0]?.slug || "";
  }
  const selectedBlog = blogs.find((blog) => blog.slug === state.blogSlug) || blogs[0];
  const posts = (data.posts || []).filter(postMatches);
  const blogPosts = posts
    .filter((post) => post.blog_slug === selectedBlog?.slug)
    .sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
  const tabMarkup = blogs
    .map((blog) => {
      const count = posts.filter((post) => post.blog_slug === blog.slug).length;
      return `
        <button class="blog-tab-button ${blog.slug === selectedBlog?.slug ? "active" : ""}" type="button" data-blog-slug="${escapeHtml(blog.slug)}">
          <span>${escapeHtml(blog.name)}</span>
          <strong>${formatNumber(count)}</strong>
        </button>
      `;
    })
    .join("");

  $("contentArea").className = "blog-view";
  $("contentArea").innerHTML = `
    <div class="blog-tab-row" aria-label="블로그별 리뷰">
      ${tabMarkup}
    </div>
    <section class="blog-section">
      <div class="blog-section-head">
        <div>
          <p>${escapeHtml(selectedBlog?.name || "블로그")}</p>
          <h2>${formatNumber(blogPosts.length)}개 리뷰</h2>
        </div>
        <div class="metric-row">
          <span class="metric-pill">누적 ${formatNumber(selectedBlog?.total_views)}</span>
          <span class="metric-pill">오늘 ${formatNumber(selectedBlog?.daily_views)}</span>
        </div>
      </div>
      <div class="tile-grid">
        ${blogPosts.length ? blogPosts.map(cardMarkup).join("") : `<div class="empty">검색 결과가 없습니다.</div>`}
      </div>
    </section>
  `;
  $("resultCount").textContent = `${formatNumber(blogPosts.length)}개 리뷰`;
}

function renderContent() {
  const labels = {
    popular: ["Most Read", "누적 조회수 상위 리뷰"],
    rising: ["Today Rising", "당일 조회 급상승 리뷰"],
    blogs: ["Collections", "블로그별 리뷰 모음"],
  };
  const [eyebrow, title] = labels[state.view];
  $("modeEyebrow").textContent = eyebrow;
  $("modeTitle").textContent = title;
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  if (state.view === "blogs") renderBlogView();
  else renderFlatView();
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      renderContent();
    });
  });

  $("searchToggle").addEventListener("click", () => {
    const panel = $("searchPanel");
    const open = !panel.classList.contains("open");
    panel.classList.toggle("open", open);
    $("searchToggle").setAttribute("aria-expanded", String(open));
    if (open) $("searchInput").focus();
  });

  $("searchInput").addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    renderContent();
  });

  $("clearSearch").addEventListener("click", () => {
    state.query = "";
    $("searchInput").value = "";
    renderContent();
    $("searchInput").focus();
  });

  $("contentArea").addEventListener("click", (event) => {
    const button = event.target.closest(".blog-tab-button");
    if (!button) return;
    state.blogSlug = button.dataset.blogSlug;
    renderBlogView();
  });
}

async function load() {
  state.data = await fetchJson(state.staticMode ? STATIC_URL : API_URL);
  renderStats(state.data);
  renderSpotlight(state.data);
  renderRisingList(state.data);
  renderContent();
}

bindEvents();
load().catch((error) => {
  $("contentArea").innerHTML = `<div class="empty">데이터를 불러오지 못했습니다. ${escapeHtml(error.message)}</div>`;
});
