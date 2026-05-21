/**
 * 평택시 선거물 배송지 — 모바일·카톡 공유용 SPA (배송 동선·수량·시간)
 */

import {
  buildDeliveryTimeline,
  estimateUnloadMinutes,
  formatCargoQuantity,
  formatMinutes,
} from "./delivery-time.js";

let locations = [];
let routeGuide = null;
let timeline = null;

const homeView = document.getElementById("home-view");
const detailView = document.getElementById("detail-view");
const locationListEl = document.getElementById("location-list");
const filterBar = document.getElementById("filter-bar");
const routeGuideEl = document.getElementById("route-guide");
const timelineEl = document.getElementById("delivery-timeline");

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "easy", label: "양호" },
  { id: "moderate", label: "주의" },
  { id: "hard", label: "어려움" },
  { id: "special", label: "특별" },
];

let activeFilter = "all";
let listView = "route";

/** JSON 데이터 로드 */
async function loadData() {
  const [locRes, guideRes] = await Promise.all([
    fetch("data/locations.json"),
    fetch("data/route-guide.json"),
  ]);
  locations = await locRes.json();
  routeGuide = await guideRes.json();
  locations.sort((a, b) => (a.route?.order ?? 99) - (b.route?.order ?? 99));
  timeline = buildDeliveryTimeline(locations, routeGuide);
}

/** 타임라인 행 조회 */
function getTimelineRow(id) {
  return timeline?.rows.find((r) => r.id === id);
}

/** 난이도 뱃지 HTML */
function badgeHtml(loc) {
  return `<span class="badge ${loc.difficulty}">${loc.difficultyLabel}</span>`;
}

/** 동선 뱃지 HTML */
function routeBadgeHtml(loc) {
  if (!loc.route) return "";
  const cls = loc.route.label === "출발" ? "start" : loc.route.isFinal ? "final" : "step";
  const extra = loc.route.badge ? ` · ${loc.route.badge}` : "";
  return `<span class="route-badge ${cls}">${loc.route.label}${extra}</span>`;
}

/** 수량·시간 요약 HTML */
function cargoTimeHtml(loc) {
  if (!loc.cargo?.booklet) return "";
  const row = getTimelineRow(loc.id);
  const qty = formatCargoQuantity(loc.cargo);
  const unload = row
    ? formatMinutes(row.unloadMin)
    : formatMinutes(estimateUnloadMinutes(loc, routeGuide || {}));
  let travel = "";
  if (row?.travelMin) {
    travel = `<span class="time-travel">🚗 이동 ${formatMinutes(row.travelMin)}</span>`;
  }
  const eta = row ? `<span class="time-eta">도착 ${row.arriveTime}</span>` : "";
  return `
    <p class="card-cargo"><strong>📦 하차</strong> ${qty}</p>
    <p class="card-time">${travel}${eta}<span class="time-unload">하차 ${unload}</span></p>
  `;
}

/** 배송 동선 안내 + 전체 요약 */
function renderRouteGuide() {
  if (!routeGuide || !timeline) return;

  const guidesHtml = routeGuide.guides
    .map(
      (g) => `
    <div class="guide-block">
      <h4>${g.title}</h4>
      <ul>${g.items.map((i) => `<li>${i}</li>`).join("")}</ul>
    </div>
  `
    )
    .join("");

  const cfg = routeGuide.timeConfig || {};
  routeGuideEl.innerHTML = `
    <h3>${routeGuide.title}</h3>
    <p class="route-subtitle">${routeGuide.subtitle}</p>
    <p class="route-start">${routeGuide.startNote}</p>
    <div class="summary-stats">
      <div><strong>${timeline.totalCopies.toLocaleString()}</strong><span>총 책자형(부)</span></div>
      <div><strong>${formatMinutes(timeline.totalTravel)}</strong><span>이동 합계</span></div>
      <div><strong>${formatMinutes(timeline.totalUnload)}</strong><span>하차 합계(3명)</span></div>
      <div><strong>${timeline.startTime}~${timeline.endTime}</strong><span>예상 일정</span></div>
    </div>
    ${guidesHtml}
    <p class="time-disclaimer">${cfg.note || ""}</p>
  `;

  renderTimeline();
}

/** 전체 배송 타임라인 */
function renderTimeline() {
  if (!timeline) return;

  const rowsHtml = timeline.rows
    .map((row) => {
      const loc = locations.find((l) => l.id === row.id);
      const qty = loc ? formatCargoQuantity(loc.cargo) : "";
      const travelLine =
        row.travelMin != null
          ? `<li class="tl-travel">🚗 ${row.travelFrom} → ${formatMinutes(row.travelMin)}</li>`
          : "";
      return `
      <li class="timeline-item" data-id="${row.id}">
        <a href="#${row.id}" class="timeline-link" data-navigate="${row.id}">
          <div class="tl-head">
            <span class="tl-label">${row.label}</span>
            <span class="tl-arrive">${row.arriveTime}</span>
          </div>
          <p class="tl-name">${row.name}</p>
          ${travelLine}
          <p class="tl-cargo">📦 ${qty}</p>
          <p class="tl-unload">👷 하차 ${formatMinutes(row.unloadMin)} (3명) · ${row.departTime} 출발</p>
        </a>
      </li>
    `;
    })
    .join("");

  timelineEl.innerHTML = `
    <h3>⏱ 배송 일정 예상 (${timeline.startTime} 출발 · 3명)</h3>
    <ol class="timeline-list">${rowsHtml}</ol>
  `;

  timelineEl.querySelectorAll("[data-navigate]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openDetail(el.getAttribute("data-navigate"));
    });
  });
}

/** 동선 순 목록 */
function getDisplayList() {
  if (listView === "route") return locations;
  const filtered =
    activeFilter === "all"
      ? [...locations]
      : locations.filter((l) => l.difficulty === activeFilter);
  return filtered.sort((a, b) => {
    const diffOrder = { easy: 0, moderate: 1, hard: 2, special: 3 };
    return (diffOrder[a.difficulty] ?? 9) - (diffOrder[b.difficulty] ?? 9);
  });
}

function phaseHeaderHtml(loc, prevPhase) {
  if (listView !== "route" || !loc.route?.phase) return { html: "", phase: prevPhase };
  if (loc.route.phase === prevPhase) return { html: "", phase: prevPhase };
  return {
    html: `<div class="phase-header">${loc.route.phase}</div>`,
    phase: loc.route.phase,
  };
}

/** 목록 카드 렌더 */
function renderList() {
  const list = getDisplayList();
  let prevPhase = null;
  const parts = [];

  list.forEach((loc) => {
    const { html: phaseHtml, phase } = phaseHeaderHtml(loc, prevPhase);
    prevPhase = phase;
    if (phaseHtml) parts.push(phaseHtml);

    parts.push(`
    <article class="location-card" data-id="${loc.id}">
      <a class="card-link" href="#${loc.id}" data-navigate="${loc.id}">
        <div class="card-top">
          <div class="card-title-row">
            ${listView === "route" ? routeBadgeHtml(loc) : ""}
            <h2>${loc.name}</h2>
          </div>
          ${badgeHtml(loc)}
        </div>
        <p class="card-address">${loc.shortAddress}</p>
        ${listView === "route" ? cargoTimeHtml(loc) : ""}
        ${
          listView === "route" && loc.route?.move
            ? `<p class="card-route-move"><strong>이동</strong> ${loc.route.move}</p>`
            : ""
        }
        <p class="card-summary">${loc.summary}</p>
      </a>
      <div class="card-actions">
        <a class="btn btn-map" href="${loc.mapUrl}" target="_blank" rel="noopener noreferrer"
           onclick="event.stopPropagation()">🗺 지도</a>
        <a class="btn btn-detail" href="#${loc.id}" data-navigate="${loc.id}">📋 상세</a>
      </div>
    </article>
  `);
  });

  locationListEl.innerHTML = parts.join("");

  locationListEl.querySelectorAll("[data-navigate]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openDetail(el.getAttribute("data-navigate"));
    });
  });
}

function setupViewToggle() {
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      listView = btn.dataset.view;
      document.querySelectorAll(".view-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.view === listView);
      });
      filterBar.classList.toggle("hidden", listView === "route");
      renderList();
    });
  });
}

function renderFilters() {
  filterBar.innerHTML = FILTERS.map(
    (f) =>
      `<button type="button" class="filter-btn${f.id === activeFilter ? " active" : ""}" data-filter="${f.id}">${f.label}</button>`
  ).join("");

  filterBar.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      renderFilters();
      renderList();
    });
  });
}

/** 상세 — 수량·시간·동선 */
function openDetail(id) {
  const loc = locations.find((l) => l.id === id);
  if (!loc) return;

  const row = getTimelineRow(id);

  const routeStep = document.getElementById("detail-route-step");
  if (loc.route) {
    const phase = loc.route.phase ? `${loc.route.phase} · ` : "";
    routeStep.textContent = `${phase}${loc.route.label}${
      loc.route.badge ? " [" + loc.route.badge + "]" : ""
    } (${loc.route.order}/9)`;
    routeStep.classList.remove("hidden");
  } else {
    routeStep.classList.add("hidden");
  }

  document.getElementById("detail-title").textContent = loc.name;
  document.getElementById("detail-address").textContent = loc.address;

  const badge = document.getElementById("detail-badge");
  badge.className = `badge ${loc.difficulty}`;
  badge.textContent = loc.difficultyLabel;

  document.getElementById("detail-summary").textContent = loc.summary;

  const img = document.getElementById("detail-image");
  img.src = loc.image;
  img.alt = `${loc.name} 안내 이미지`;

  const cargoSection = buildCargoSection(loc, row);
  const routeSection = buildRouteSection(loc, row);

  document.getElementById("detail-sections").innerHTML =
    cargoSection + routeSection + buildFacilitySections(loc);

  document.getElementById("detail-map-link").href = loc.mapUrl;

  const telLink = document.getElementById("detail-tel-link");
  if (loc.phone) {
    telLink.href = `tel:${loc.phone}`;
    const who = loc.cargo?.contactName ? ` ${loc.cargo.contactName}` : "";
    telLink.textContent = `📞${who} ${loc.phone}`;
    telLink.classList.remove("hidden");
  } else {
    telLink.classList.add("hidden");
  }

  renderDetailNav(loc);

  homeView.classList.remove("active");
  detailView.classList.add("active");
  detailView.setAttribute("aria-hidden", "false");

  history.pushState({ page: "detail", id }, "", `#${id}`);
  window.scrollTo(0, 0);
}

/** 선거공보물 수량 섹션 */
function buildCargoSection(loc, row) {
  if (!loc.cargo?.booklet) return "";

  const b = loc.cargo.booklet;
  const extras = [];
  if (loc.cargo.poster) extras.push(`${loc.cargo.poster.label} ${loc.cargo.poster.submitted}부`);
  if (loc.cargo.braille) extras.push(`${loc.cargo.braille.label} ${loc.cargo.braille.submitted}부`);

  return `
    <section class="section-block cargo-section">
      <h3>📦 하차 선거공보물 (${loc.cargo.committeeName || ""})</h3>
      <ul>
        <li><strong>${b.label}</strong> ${b.bundles}묶음 × 500부 + ${b.extraCopies.toLocaleString()}부 = <strong>총 ${b.totalCopies.toLocaleString()}부</strong></li>
        ${extras.map((e) => `<li>${e}</li>`).join("")}
      </ul>
      ${
        row
          ? `<p class="schedule-line"><strong>예상 도착</strong> ${row.arriveTime} · <strong>하차</strong> ${formatMinutes(row.unloadMin)} (3명) · <strong>출발</strong> ${row.departTime}</p>`
          : ""
      }
      ${row?.travelMin ? `<p class="schedule-line"><strong>이전지 이동</strong> ${row.travelFrom} → ${formatMinutes(row.travelMin)}</p>` : ""}
    </section>
  `;
}

function buildRouteSection(loc, row) {
  if (!loc.route?.move && !loc.route?.tip) return "";
  return `
    <section class="section-block route-section">
      <h3>🚛 배송 동선</h3>
      ${loc.route.region ? `<p><strong>위치</strong> ${loc.route.region}</p>` : ""}
      ${loc.route.move ? `<p><strong>이동</strong> ${loc.route.move}</p>` : ""}
      ${loc.route.tip ? `<p class="route-tip"><strong>주의·팁</strong> ${loc.route.tip}</p>` : ""}
    </section>
  `;
}

function buildFacilitySections(loc) {
  return loc.sections
    .map(
      (s) => `
    <section class="section-block">
      <h3>${s.title}</h3>
      <ul>${s.items.map((i) => `<li>${i}</li>`).join("")}</ul>
    </section>
  `
    )
    .join("");
}

function renderDetailNav(loc) {
  let nav = document.getElementById("detail-nav");
  if (!nav) {
    nav = document.createElement("div");
    nav.id = "detail-nav";
    nav.className = "detail-nav";
    document.querySelector(".detail-body").appendChild(nav);
  }

  const idx = locations.findIndex((l) => l.id === loc.id);
  const prev = idx > 0 ? locations[idx - 1] : null;
  const next = idx < locations.length - 1 ? locations[idx + 1] : null;

  nav.innerHTML = `
    ${prev ? `<a href="#${prev.id}" class="nav-prev" data-navigate="${prev.id}">← ${prev.route?.label || ""} ${prev.name}</a>` : "<span></span>"}
    ${next ? `<a href="#${next.id}" class="nav-next" data-navigate="${next.id}">${next.route?.label || ""} ${next.name} →</a>` : "<span></span>"}
  `;

  nav.querySelectorAll("[data-navigate]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openDetail(el.getAttribute("data-navigate"));
    });
  });
}

function goHome() {
  detailView.classList.remove("active");
  detailView.setAttribute("aria-hidden", "true");
  homeView.classList.add("active");
  history.pushState({ page: "home" }, "", location.pathname + location.search);
}

function handleRoute() {
  const hash = location.hash.replace("#", "");
  if (hash && locations.some((l) => l.id === hash)) {
    openDetail(hash);
  } else if (detailView.classList.contains("active")) {
    goHome();
  }
}

async function copyLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    alert("링크가 복사되었습니다.\n카톡 채팅에 붙여넣기 하세요.");
  } catch {
    prompt("아래 링크를 복사하세요:", url);
  }
}

async function copyDetailLink() {
  await copyLink(location.href);
}

async function copyHomeLink() {
  const base = `${location.origin}${location.pathname}${location.search}`;
  await copyLink(base);
}

function setupImageModal() {
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("modal-image");
  const closeBtn = document.getElementById("modal-close");

  document.getElementById("detail-image").addEventListener("click", (e) => {
    modalImg.src = e.target.src;
    modalImg.alt = e.target.alt;
    modal.classList.add("open");
  });

  const close = () => modal.classList.remove("open");
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
}

async function init() {
  await loadData();
  renderRouteGuide();
  renderFilters();
  setupViewToggle();
  renderList();
  handleRoute();

  document.getElementById("back-btn").addEventListener("click", goHome);
  document.getElementById("share-detail-btn").addEventListener("click", copyDetailLink);
  document.getElementById("share-home-btn").addEventListener("click", copyHomeLink);

  window.addEventListener("popstate", handleRoute);
  window.addEventListener("hashchange", handleRoute);

  setupImageModal();
}

init();
