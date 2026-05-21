/**
 * 평택시 선거물 배송지 — 모바일·카톡 공유용 SPA (배송 동선 순)
 */

let locations = [];
let routeGuide = null;

const homeView = document.getElementById("home-view");
const detailView = document.getElementById("detail-view");
const locationListEl = document.getElementById("location-list");
const filterBar = document.getElementById("filter-bar");
const routeGuideEl = document.getElementById("route-guide");

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "easy", label: "양호" },
  { id: "moderate", label: "주의" },
  { id: "hard", label: "어려움" },
  { id: "special", label: "특별" },
];

let activeFilter = "all";
let listView = "route"; // route | difficulty

/** JSON 데이터 로드 */
async function loadData() {
  const [locRes, guideRes] = await Promise.all([
    fetch("data/locations.json"),
    fetch("data/route-guide.json"),
  ]);
  locations = await locRes.json();
  routeGuide = await guideRes.json();
  // 동선 순 정렬
  locations.sort((a, b) => (a.route?.order ?? 99) - (b.route?.order ?? 99));
}

/** 동선 순 목록 (필터는 난이도순 보기일 때만) */
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

/** 배송 동선 안내 블록 */
function renderRouteGuide() {
  if (!routeGuide) return;
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

  routeGuideEl.innerHTML = `
    <h3>${routeGuide.title}</h3>
    <p class="route-subtitle">${routeGuide.subtitle}</p>
    <p class="route-start">${routeGuide.startNote}</p>
    ${guidesHtml}
  `;
}

/** 구간 헤더가 필요한지 (동선순 보기) */
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

/** 보기 전환 (동선순 / 난이도순) */
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

/** 필터 버튼 */
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

/** 상세 화면 */
function openDetail(id) {
  const loc = locations.find((l) => l.id === id);
  if (!loc) return;

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

  // 동선 팁 + 기존 섹션
  const routeSection =
    loc.route && (loc.route.move || loc.route.tip)
      ? `
    <section class="section-block route-section">
      <h3>🚛 배송 동선</h3>
      ${loc.route.region ? `<p><strong>위치</strong> ${loc.route.region}</p>` : ""}
      ${loc.route.move ? `<p><strong>이동</strong> ${loc.route.move}</p>` : ""}
      ${loc.route.tip ? `<p class="route-tip"><strong>주의·팁</strong> ${loc.route.tip}</p>` : ""}
    </section>
  `
      : "";

  document.getElementById("detail-sections").innerHTML =
    routeSection +
    loc.sections
      .map(
        (s) => `
    <section class="section-block">
      <h3>${s.title}</h3>
      <ul>${s.items.map((i) => `<li>${i}</li>`).join("")}</ul>
    </section>
  `
      )
      .join("");

  document.getElementById("detail-map-link").href = loc.mapUrl;

  const telLink = document.getElementById("detail-tel-link");
  if (loc.phone) {
    telLink.href = `tel:${loc.phone}`;
    telLink.textContent = `📞 ${loc.phone}`;
    telLink.classList.remove("hidden");
  } else {
    telLink.classList.add("hidden");
  }

  // 이전/다음 동선 네비
  renderDetailNav(loc);

  homeView.classList.remove("active");
  detailView.classList.add("active");
  detailView.setAttribute("aria-hidden", "false");

  history.pushState({ page: "detail", id }, "", `#${id}`);
  window.scrollTo(0, 0);
}

/** 상세 화면 이전·다음 배송지 */
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

/** 목록으로 */
function goHome() {
  detailView.classList.remove("active");
  detailView.setAttribute("aria-hidden", "true");
  homeView.classList.add("active");
  history.pushState({ page: "home" }, "", location.pathname + location.search);
}

/** URL 해시로 라우팅 */
function handleRoute() {
  const hash = location.hash.replace("#", "");
  if (hash && locations.some((l) => l.id === hash)) {
    openDetail(hash);
  } else if (detailView.classList.contains("active")) {
    goHome();
  }
}

/** 링크 복사 (카톡 공유용) */
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

/** 이미지 모달 */
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
