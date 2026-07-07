const state = {
  dashboard: null,
  pollTimer: null,
  autoCollectStarted: false,
  staticMode:
    new URLSearchParams(window.location.search).has("static") ||
    !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname) ||
    window.location.protocol === "file:",
};

const palette = ["#2563eb", "#0f766e", "#b45309", "#be123c", "#7c3aed", "#15803d", "#475569", "#0891b2"];
const DASHBOARD_API_URL = "/api/dashboard";
const STATIC_DASHBOARD_URL = "data/dashboard.json";

const $ = (id) => document.getElementById(id);

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function truncate(text, limit = 42) {
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function fitCanvasText(ctx, text, maxWidth, suffix = "....") {
  const value = String(text || "");
  if (ctx.measureText(value).width <= maxWidth) return value;

  const suffixWidth = ctx.measureText(suffix).width;
  if (suffixWidth >= maxWidth) return suffix;

  let low = 0;
  let high = value.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = value.slice(0, mid);
    if (ctx.measureText(candidate).width + suffixWidth <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return `${value.slice(0, low)}${suffix}`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text.slice(0, 180) || response.statusText };
  }
  if (!response.ok) {
    throw new Error(data.message || data.error || response.statusText);
  }
  return data;
}

function applyRuntimeMode() {
  document.body.classList.toggle("static-mode", state.staticMode);
  ["collectBtn", "syncCatalogBtn", "importCsvBtn", "maxPagesInput", "csvInput"].forEach((id) => {
    const element = $(id);
    if (element) element.disabled = state.staticMode;
  });
}

function metricCard(label, value, hint) {
  return `
    <article class="metric-card">
      <span class="accent">${label}</span>
      <strong>${value}</strong>
      <p>${hint}</p>
    </article>
  `;
}

function renderMetrics(data) {
  const totals = data.totals || {};
  const monthSummary = data.month_summary || {};
  const monthHint = `${monthSummary.current_month || "이번 달"} ${monthSummary.is_realtime ? "실시간 누적" : "저장 기준"}`;
  $("metrics").innerHTML = [
    metricCard("블로그", formatNumber(totals.blogs), `토큰 ${formatNumber(data.config?.token_count)}개 연결`),
    metricCard("글 수", formatNumber(totals.posts), `수집 성공 ${formatNumber(totals.captured_posts)}개`),
    metricCard("누적 조회수", formatNumber(totals.total_views), "최근 스냅샷 합계"),
    metricCard("오늘 조회수", formatNumber(totals.daily_views), "직전 저장일 대비"),
    metricCard("당월 조회수", formatNumber(monthSummary.current_month_views), monthHint),
    metricCard("스냅샷", formatNumber(data.daily_snapshot_count), "일별 저장 행"),
  ].join("");
}

function renderStatus(data) {
  const job = data.job || {};
  const dot = $("statusDot");
  dot.className = "status-dot";
  if (job.running) dot.classList.add("running");
  if (job.error) dot.classList.add("error");

  if (state.staticMode) {
    $("jobMessage").textContent = "GitHub Pages 자동 게시본";
    const freshness = data.is_today_realtime ? "오늘 데이터 반영" : "마지막 저장 데이터 기준";
    $("snapshotInfo").textContent =
      `최근 자동 갱신: ${formatDateTime(data.latest_snapshot_at)} · 카탈로그: ${formatDateTime(data.catalog_updated_at)} · ${freshness}`;
    return;
  }

  $("jobMessage").textContent = job.message || "대기 중";

  const freshness = data.is_today_realtime ? "오늘 실시간 데이터 반영" : "오늘 데이터 수집 필요";
  $("snapshotInfo").textContent =
    `최근 스냅샷: ${formatDateTime(data.latest_snapshot_at)} · 카탈로그: ${formatDateTime(data.catalog_updated_at)} · ${freshness}`;
  $("collectBtn").disabled = Boolean(job.running);
  $("syncCatalogBtn").disabled = Boolean(job.running);
}

function renderNotes(data) {
  $("historyNote").textContent = data.history_note || "저장된 스냅샷 기준으로 표시합니다.";
  $("csvNote").textContent = `CSV 저장 위치: ${data.daily_views_csv || ""} / ${data.cumulative_views_csv || ""}`;
}

function renderBlogs(data) {
  const blogs = data.blogs || [];
  if (!blogs.length) {
    $("blogGrid").innerHTML = `<div class="empty">아직 표시할 블로그 데이터가 없습니다. 실시간 수집을 실행하세요.</div>`;
    return;
  }
  $("blogGrid").innerHTML = blogs
    .map((blog) => {
      const top = blog.top_post;
      return `
        <article class="blog-card">
          <h3 class="line-clamp">${blog.name}</h3>
          <p>@${blog.slug}</p>
          <div class="blog-stats">
            <div><span>누적</span><strong>${formatNumber(blog.total_views)}</strong></div>
            <div><span>오늘</span><strong>${formatNumber(blog.daily_views)}</strong></div>
            <div><span>수집</span><strong>${formatNumber(blog.captured_posts)}</strong></div>
          </div>
          <p class="line-clamp">${top ? `상위: ${top.title}` : "수집된 포스팅이 없습니다."}</p>
        </article>
      `;
    })
    .join("");
}

function renderTables(data) {
  const topRows = (data.top_posts || []).slice(0, 20);
  $("topRows").innerHTML = topRows.length
    ? topRows
        .map(
          (post, index) => `
          <tr>
            <td class="num">${index + 1}</td>
            <td><a href="${post.url}" target="_blank" rel="noreferrer">${post.title}</a></td>
            <td>${post.blog_name}</td>
            <td class="num">${formatNumber(post.daily_views)}</td>
            <td class="num">${formatNumber(post.views)}</td>
            <td class="num">${formatNumber(post.likes)}</td>
            <td class="num">${formatNumber(post.comments)}</td>
          </tr>
        `,
        )
        .join("")
    : `<tr><td colspan="7" class="empty">조회수 스냅샷이 없습니다.</td></tr>`;

  const dailyRows = (data.top_daily_posts || []).slice(0, 12);
  $("dailyTopRows").innerHTML = dailyRows.length
    ? dailyRows
        .map(
          (post) => `
          <tr>
            <td class="clip-cell"><a href="${post.url}" target="_blank" rel="noreferrer">${post.title}</a></td>
            <td class="clip-cell muted-cell">${post.blog_name}</td>
            <td class="num">${formatNumber(post.daily_views)}</td>
            <td class="num">${formatNumber(post.views)}</td>
          </tr>
        `,
        )
        .join("")
    : `<tr><td colspan="4" class="empty">오늘 증가분은 직전 저장일 이후 조회수 증가가 있을 때 표시됩니다.</td></tr>`;
}

function renderMonthly(data) {
  const monthSummary = data.month_summary || {};
  const month = monthSummary.current_month || "이번 달";
  const monthNote = $("monthNote");
  if (monthNote) {
    const freshness = monthSummary.is_realtime ? "오늘 실시간 스냅샷 포함" : "마지막 저장 스냅샷 기준";
    monthNote.textContent = `${month} 누적 ${formatNumber(monthSummary.current_month_views)}회 · ${freshness}`;
  }

  const monthRows = $("currentMonthRows");
  if (!monthRows) return;

  const rows = (monthSummary.current_month_blog_views || []).slice(0, 20);
  monthRows.innerHTML = rows.length
    ? rows
        .map((row) => {
          const blogUrl = row.blog_slug ? `https://wikidocs.net/blog/@${encodeURIComponent(row.blog_slug)}/` : "#";
          return `
          <tr>
            <td class="clip-cell"><a href="${blogUrl}" target="_blank" rel="noreferrer">${row.blog_name}</a></td>
            <td class="num">${formatNumber(row.views)}</td>
            <td class="num">${formatNumber(row.total_views)}</td>
          </tr>
        `;
        })
        .join("")
    : `<tr><td colspan="3" class="empty">당월 조회수 데이터가 없습니다.</td></tr>`;
}

function prepareCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(rect.width * ratio));
  canvas.height = Math.max(220, Math.floor((Number(canvas.getAttribute("height")) || 260) * ratio));
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return { ctx, width: canvas.width / ratio, height: canvas.height / ratio };
}

function drawEmpty(canvas, message) {
  const { ctx, width, height } = prepareCanvas(canvas);
  ctx.fillStyle = "#667085";
  ctx.font = "14px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(message, width / 2, height / 2);
}

function drawAxes(ctx, width, height, margin, maxValue) {
  const chartHeight = height - margin.top - margin.bottom;
  ctx.strokeStyle = "#d9e0ea";
  ctx.lineWidth = 1;
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.fillStyle = "#667085";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i += 1) {
    const y = margin.top + chartHeight - (chartHeight * i) / 4;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(width - margin.right, y);
    ctx.stroke();
    ctx.fillText(formatNumber(Math.round((maxValue * i) / 4)), margin.left - 8, y + 4);
  }
}

function drawBarChart(canvas, labels, values, options = {}) {
  if (!values.length || Math.max(...values) <= 0) {
    drawEmpty(canvas, options.emptyMessage || "표시할 조회수 데이터가 없습니다.");
    return;
  }
  const { ctx, width, height } = prepareCanvas(canvas);
  const margin = { top: 18, right: 16, bottom: 52, left: 64 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(...values) * 1.12;
  const barGap = 12;
  const barWidth = Math.max(18, (chartWidth - barGap * (values.length - 1)) / values.length);

  drawAxes(ctx, width, height, margin, maxValue);

  values.forEach((value, index) => {
    const x = margin.left + index * (barWidth + barGap);
    const barHeight = (value / maxValue) * chartHeight;
    const y = margin.top + chartHeight - barHeight;
    ctx.fillStyle = palette[index % palette.length];
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "#172033";
    ctx.textAlign = "center";
    ctx.fillText(formatNumber(value), x + barWidth / 2, y - 6);
    ctx.save();
    ctx.translate(x + barWidth / 2, height - 12);
    ctx.rotate(-Math.PI / 8);
    ctx.fillStyle = "#667085";
    ctx.fillText(truncate(labels[index], options.labelLimit || 12), 0, 0);
    ctx.restore();
  });
}

function drawHorizontalBarChart(canvas, posts, metric = "views", emptyMessage = "상위 포스팅 데이터가 없습니다.") {
  const rows = posts.slice(0, 8);
  if (!rows.length || Math.max(...rows.map((post) => Number(post[metric] || 0))) <= 0) {
    drawEmpty(canvas, emptyMessage);
    return;
  }
  const { ctx, width, height } = prepareCanvas(canvas);
  const labelWidth = Math.min(300, Math.max(140, width * 0.38));
  const margin = { top: 12, right: 54, bottom: 14, left: labelWidth + 22 };
  const chartWidth = Math.max(80, width - margin.left - margin.right);
  const rowHeight = Math.min(32, (height - margin.top - margin.bottom) / rows.length);
  const maxValue = Math.max(...rows.map((post) => Number(post[metric] || 0))) * 1.08;

  ctx.font = "13px Segoe UI, sans-serif";
  rows.forEach((post, index) => {
    const y = margin.top + index * rowHeight;
    const value = Number(post[metric] || 0);
    const barWidth = (chartWidth * value) / maxValue;
    ctx.fillStyle = "#667085";
    ctx.textAlign = "left";
    ctx.fillText(fitCanvasText(ctx, post.title, labelWidth), 12, y + 20);
    ctx.fillStyle = palette[index % palette.length];
    ctx.fillRect(margin.left, y + 5, barWidth, 18);
    ctx.fillStyle = "#172033";
    const valueText = formatNumber(value);
    const valueX = margin.left + barWidth + 8;
    if (valueX + ctx.measureText(valueText).width > width - 8) {
      ctx.textAlign = "right";
      ctx.fillText(valueText, width - 8, y + 20);
    } else {
      ctx.textAlign = "left";
      ctx.fillText(valueText, valueX, y + 20);
    }
  });
}

function getDates(series) {
  return [...new Set(series.map((row) => row.date))].sort((a, b) => a.localeCompare(b));
}

function buildMultiSeries(series, metric) {
  const dates = getDates(series);
  const byBlog = new Map();
  dates.forEach((date) => {
    byBlog.set("전체 블로그", { name: "전체 블로그", values: new Map(), totalLine: true });
    byBlog.get("전체 블로그").values.set(date, 0);
  });

  series.forEach((row) => {
    if (!byBlog.has(row.blog_name)) {
      byBlog.set(row.blog_name, { name: row.blog_name, values: new Map(), totalLine: false });
    }
    const value = Number(row[metric] || 0);
    byBlog.get(row.blog_name).values.set(row.date, value);
    const totalItem = byBlog.get("전체 블로그");
    totalItem.values.set(row.date, Number(totalItem.values.get(row.date) || 0) + value);
  });

  const rows = [...byBlog.values()].map((item) => ({
    ...item,
    points: dates.map((date) => Number(item.values.get(date) || 0)),
  }));
  rows.sort((a, b) => {
    if (a.totalLine) return -1;
    if (b.totalLine) return 1;
    return Math.max(...b.points) - Math.max(...a.points);
  });
  return { dates, rows };
}

function drawMultiLineChart(canvas, series, metric, emptyMessage) {
  const { dates, rows } = buildMultiSeries(series, metric);
  const maxValue = Math.max(...rows.flatMap((row) => row.points), 0);
  if (!dates.length || maxValue <= 0) {
    drawEmpty(canvas, emptyMessage);
    return;
  }

  const { ctx, width, height } = prepareCanvas(canvas);
  const margin = { top: 18, right: 180, bottom: 52, left: 72 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const chartMax = maxValue * 1.12;

  drawAxes(ctx, width, height, margin, chartMax);

  const xFor = (index) => margin.left + (dates.length === 1 ? chartWidth / 2 : (chartWidth * index) / (dates.length - 1));
  const yFor = (value) => margin.top + chartHeight - (value / chartMax) * chartHeight;

  rows.forEach((row, rowIndex) => {
    const color = row.totalLine ? "#111827" : palette[(rowIndex - 1 + palette.length) % palette.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = row.totalLine ? 3 : 2;
    ctx.beginPath();
    row.points.forEach((value, index) => {
      const x = xFor(index);
      const y = yFor(value);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    row.points.forEach((value, index) => {
      const x = xFor(index);
      const y = yFor(value);
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = color;
      ctx.lineWidth = row.totalLine ? 2 : 1.5;
      ctx.beginPath();
      ctx.arc(x, y, row.totalLine ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  });

  ctx.fillStyle = "#667085";
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  const labelStep = Math.max(1, Math.ceil(dates.length / 8));
  dates.forEach((date, index) => {
    if (index % labelStep === 0 || index === dates.length - 1) {
      ctx.fillText(date.slice(5), xFor(index), height - 16);
    }
  });

  ctx.textAlign = "left";
  rows.slice(0, 9).forEach((row, index) => {
    const y = margin.top + index * 22 + 4;
    const color = row.totalLine ? "#111827" : palette[(index - 1 + palette.length) % palette.length];
    ctx.fillStyle = color;
    ctx.fillRect(width - margin.right + 18, y, 16, 3);
    ctx.fillStyle = "#172033";
    ctx.fillText(truncate(row.name, 16), width - margin.right + 42, y + 5);
  });
}

function drawLineChart(canvas, series) {
  drawMultiLineChart(canvas, series, "daily_views", "두 날짜 이상의 스냅샷이 저장되면 당일 조회수 추이가 표시됩니다.");
}

function renderCharts(data) {
  const blogs = data.blogs || [];
  const monthSummary = data.month_summary || {};
  const monthlySeries = monthSummary.monthly_series || [];
  const currentMonthBlogs = (monthSummary.current_month_blog_views || []).slice(0, 10);
  drawBarChart(
    $("blogBarChart"),
    blogs.slice(0, 10).map((blog) => blog.name),
    blogs.slice(0, 10).map((blog) => blog.total_views),
  );
  drawLineChart($("dailyLineChart"), data.daily_series || []);
  drawHorizontalBarChart($("topPostsChart"), data.top_posts || []);
  drawHorizontalBarChart($("topDailyPostsChart"), data.top_daily_posts || [], "daily_views", "오늘 조회수 증가분 데이터가 없습니다.");
  drawMultiLineChart($("dailyViewsByBlogChart"), data.daily_series || [], "daily_views", "두 날짜 이상의 스냅샷이 저장되면 일단위 조회수가 표시됩니다.");
  drawMultiLineChart($("cumulativeViewsByBlogChart"), data.daily_series || [], "total_views", "누적 조회수 스냅샷이 없습니다.");
  drawBarChart(
    $("monthlyViewsChart"),
    monthlySeries.map((row) => row.month),
    monthlySeries.map((row) => row.views),
    { labelLimit: 7, emptyMessage: "월별 조회수 데이터가 없습니다." },
  );
  drawBarChart(
    $("currentMonthBlogChart"),
    currentMonthBlogs.map((row) => row.blog_name),
    currentMonthBlogs.map((row) => row.views),
    { labelLimit: 10, emptyMessage: "당월 조회수 데이터가 없습니다." },
  );
}

function setActiveTab(tabId) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
  if (state.dashboard) requestAnimationFrame(() => renderCharts(state.dashboard));
}

async function loadDashboard() {
  let data;
  if (state.staticMode) {
    data = await fetchJson(STATIC_DASHBOARD_URL);
  } else {
    try {
      data = await fetchJson(DASHBOARD_API_URL);
    } catch (error) {
      state.staticMode = true;
      data = await fetchJson(STATIC_DASHBOARD_URL);
    }
  }
  state.dashboard = data;
  applyRuntimeMode();
  $("maxPagesInput").value = data.config?.max_pages ?? 0;
  renderStatus(data);
  renderMetrics(data);
  renderNotes(data);
  renderBlogs(data);
  renderTables(data);
  renderMonthly(data);
  renderCharts(data);

  if (!state.staticMode && data.needs_today_collect && !data.job?.running && !state.autoCollectStarted) {
    state.autoCollectStarted = true;
    await startCollect({ silent: true });
  }
}

async function startCollect({ silent = false } = {}) {
  if (state.staticMode) {
    throw new Error("GitHub Pages에서는 수동 수집을 할 수 없습니다. GitHub Actions가 자동 갱신합니다.");
  }
  const maxPages = Number($("maxPagesInput").value || 0);
  await fetchJson("/api/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ max_pages: maxPages }),
  });
  if (!silent) $("jobMessage").textContent = "실시간 수집 시작";
  startPolling();
}

async function syncCatalog() {
  if (state.staticMode) {
    throw new Error("GitHub Pages에서는 글 목록 동기화를 직접 실행할 수 없습니다. GitHub Actions가 자동 갱신합니다.");
  }
  await fetchJson("/api/catalog", { method: "POST" });
  startPolling();
}

async function importCsv() {
  if (state.staticMode) {
    throw new Error("GitHub Pages 게시본에서는 CSV 가져오기를 사용할 수 없습니다.");
  }
  const input = $("csvInput");
  if (!input.files.length) {
    alert("CSV 파일을 선택하세요.");
    return;
  }
  const body = new FormData();
  body.append("file", input.files[0]);
  await fetchJson("/api/import-csv", { method: "POST", body });
  input.value = "";
  await loadDashboard();
}

async function pollJob() {
  if (state.staticMode) return;
  const job = await fetchJson("/api/job");
  const current = state.dashboard || {};
  renderStatus({ ...current, job });
  if (!job.running) {
    stopPolling();
    await loadDashboard();
  }
}

function startPolling() {
  stopPolling();
  $("collectBtn").disabled = true;
  $("syncCatalogBtn").disabled = true;
  state.pollTimer = setInterval(() => {
    pollJob().catch((error) => {
      console.error(error);
      stopPolling();
    });
  }, 1500);
  pollJob().catch(console.error);
}

function stopPolling() {
  if (state.pollTimer) clearInterval(state.pollTimer);
  state.pollTimer = null;
}

window.addEventListener("resize", () => {
  if (state.dashboard) renderCharts(state.dashboard);
});

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

$("collectBtn").addEventListener("click", () => startCollect().catch((error) => alert(error.message)));
$("syncCatalogBtn").addEventListener("click", () => syncCatalog().catch((error) => alert(error.message)));
$("importCsvBtn").addEventListener("click", () => importCsv().catch((error) => alert(error.message)));

loadDashboard().catch((error) => {
  $("jobMessage").textContent = "대시보드 로드 실패";
  $("snapshotInfo").textContent = error.message;
  $("statusDot").classList.add("error");
});
