const won = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("ko-KR");
let accounts = [];
let activeFilter = "all";

const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0);
const flattenMonths = (items) => items.flatMap((account) => account.months || []);
const maskEmail = (email) => {
  const [name, domain] = String(email || "").split("@");
  if (!domain) return "—";
  return `${name.slice(0, 3)}${"•".repeat(Math.max(2, Math.min(5, name.length - 3)))}@${domain}`;
};

function accountTotals(account) {
  const months = account.months || [];
  return { revenue: sum(months, "revenue"), views: sum(months, "views"), clicks: sum(months, "clicks") };
}

function renderSummary(data) {
  const collected = accounts.filter((a) => a.status === "collected");
  const months = flattenMonths(collected);
  const totalRevenue = sum(months, "revenue");
  const paid = months.filter((m) => m.payment_status === "지급");
  const unpaid = months.filter((m) => m.payment_status !== "지급");
  const views = sum(months, "views");
  const clicks = sum(months, "clicks");
  document.querySelector("#totalRevenue").textContent = won.format(totalRevenue);
  document.querySelector("#coverage").textContent = `${collected.length}/${accounts.length}개 계정 확인 완료`;
  document.querySelector("#paidRevenue").textContent = won.format(sum(paid, "revenue"));
  document.querySelector("#unpaidRevenue").textContent = won.format(sum(unpaid, "revenue"));
  document.querySelector("#trafficMetric").textContent = `${number.format(clicks)} / ${number.format(views)}`;
  document.querySelector("#ctrMetric").textContent = views ? `확인 구간 클릭률 ${(clicks / views * 100).toFixed(2)}%` : "—";
  document.querySelector("#notice").textContent = data.notice || "";
  document.querySelector("#updatedAt").textContent = `마지막 확인: ${new Date(data.updated_at).toLocaleString("ko-KR")}`;
}

function renderChart() {
  const grouped = new Map();
  flattenMonths(accounts.filter((a) => a.status === "collected")).forEach((m) => grouped.set(m.month, (grouped.get(m.month) || 0) + m.revenue));
  const rows = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(...rows.map(([, v]) => v), 1);
  document.querySelector("#monthRange").textContent = rows.length ? `${rows[0][0]} — ${rows.at(-1)[0]}` : "데이터 없음";
  document.querySelector("#monthlyChart").innerHTML = rows.map(([month, value]) => `
    <div class="bar-slot"><span class="bar-value">${won.format(value)}</span><div class="bar" style="height:${Math.max(3, value / max * 180)}px"></div><span class="bar-label">${month.replace("-", ".")}</span></div>`).join("");
}

function renderRanking() {
  const rows = accounts.filter((a) => a.status === "collected").map((a) => ({ ...a, ...accountTotals(a) })).sort((a, b) => b.revenue - a.revenue);
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  document.querySelector("#ranking").innerHTML = rows.map((row, i) => `
    <div class="rank-row"><span class="rank-no">${String(i + 1).padStart(2, "0")}</span><div><div class="rank-name">${row.name}</div><div class="track"><i style="width:${row.revenue / max * 100}%"></i></div></div><span class="rank-value">${won.format(row.revenue)}</span></div>`).join("");
}

function renderAccounts() {
  const filtered = accounts.filter((a) => activeFilter === "all" || a.status === activeFilter);
  document.querySelector("#accountRows").innerHTML = filtered.map((a) => {
    const totals = accountTotals(a);
    const latest = [...(a.months || [])].sort((x, y) => y.month.localeCompare(x.month))[0];
    const collected = a.status === "collected";
    return `<tr>
      <td class="blog-cell"><a href="${a.url}" target="_blank" rel="noreferrer">${a.name}</a><small>@${a.slug}</small></td>
      <td><span class="email">${maskEmail(a.email)}</span></td>
      <td><span class="status ${collected ? "ok" : "wait"}">${collected ? "수집 완료" : "로그인 필요"}</span></td>
      <td class="num ${collected ? "" : "empty"}">${collected ? number.format(totals.views) : "—"}</td>
      <td class="num ${collected ? "" : "empty"}">${collected ? number.format(totals.clicks) : "—"}</td>
      <td class="num ${collected ? "" : "empty"}"><strong>${collected ? won.format(totals.revenue) : "—"}</strong></td>
      <td>${latest ? `${latest.label}<span class="email">${latest.payment_status}</span>` : "—"}</td>
    </tr>`;
  }).join("");
  document.querySelector("#allCount").textContent = accounts.length;
  document.querySelector("#collectedCount").textContent = accounts.filter((a) => a.status === "collected").length;
  document.querySelector("#pendingCount").textContent = accounts.filter((a) => a.status === "requires_login").length;
}

document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
  renderAccounts();
}));

fetch("../api/adsense", { cache: "no-store" })
  .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
  .then((data) => { accounts = data.accounts || []; renderSummary(data); renderChart(); renderRanking(); renderAccounts(); })
  .catch((error) => { document.querySelector("#notice").textContent = `수익 데이터를 불러오지 못했습니다: ${error.message}`; });
