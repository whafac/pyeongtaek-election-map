/**
 * 평택시 선거물 배송지 — 모바일·카톡 공유용 SPA
 */

let locations = [];

const homeView = document.getElementById("home-view");
const detailView = document.getElementById("detail-view");
const locationListEl = document.getElementById("location-list");
const filterBar = document.getElementById("filter-bar");

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "easy", label: "양호" },
  { id: "moderate", label: "주의" },
  { id: "hard", label: "어려움" },
  { id: "special", label: "특별" },
];

let activeFilter = "all";

/** JSON 데이터 로드 */
async function loadData() {
  const res = await fetch("data/locations.json");
  locations = await res.json();
}

/** 난이도 뱃지 HTML */
function badgeHtml(loc) {
  return `<span class="badge ${loc.difficulty}">${loc.difficultyLabel}</span>`;
}

/** 목록 카드 렌더 */
function renderList() {
  const filtered =
    activeFilter === "all"
      ? locations
      : locations.filter((l) => l.difficulty === activeFilter);

  locationListEl.innerHTML = filtered
    .map(
      (loc) => `
    <article class="location-card" data-id="${loc.id}">
      <a class="card-link" href="#${loc.id}" data-navigate="${loc.id}">
        <div class="card-top">
          <h2>${loc.name}</h2>
          ${badgeHtml(loc)}
        </div>
        <p class="card-address">${loc.shortAddress}</p>
        <p class="card-summary">${loc.summary}</p>
      </a>
      <div class="card-actions">
        <a class="btn btn-map" href="${loc.mapUrl}" target="_blank" rel="noopener noreferrer"
           onclick="event.stopPropagation()">🗺 지도</a>
        <a class="btn btn-detail" href="#${loc.id}" data-navigate="${loc.id}">📋 상세</a>
      </div>
    </article>
  `
    )
    .join("");

  // 카드 내 상세/목록 네비게이션
  locationListEl.querySelectorAll("[data-navigate]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const id = el.getAttribute("data-navigate");
      openDetail(id);
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

  document.getElementById("detail-title").textContent = loc.name;
  document.getElementById("detail-address").textContent = loc.address;

  const badge = document.getElementById("detail-badge");
  badge.className = `badge ${loc.difficulty}`;
  badge.textContent = loc.difficultyLabel;

  document.getElementById("detail-summary").textContent = loc.summary;

  const img = document.getElementById("detail-image");
  img.src = loc.image;
  img.alt = `${loc.name} 안내 이미지`;

  document.getElementById("detail-sections").innerHTML = loc.sections
    .map(
      (s) => `
    <section class="section-block">
      <h3>${s.title}</h3>
      <ul>${s.items.map((i) => `<li>${i}</li>`).join("")}</ul>
    </section>
  `
    )
    .join("");

  const mapLink = document.getElementById("detail-map-link");
  mapLink.href = loc.mapUrl;

  const telLink = document.getElementById("detail-tel-link");
  if (loc.phone) {
    telLink.href = `tel:${loc.phone}`;
    telLink.textContent = `📞 ${loc.phone}`;
    telLink.classList.remove("hidden");
  } else {
    telLink.classList.add("hidden");
  }

  homeView.classList.remove("active");
  detailView.classList.add("active");
  detailView.setAttribute("aria-hidden", "false");

  history.pushState({ page: "detail", id }, "", `#${id}`);
  window.scrollTo(0, 0);
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
  } else {
    if (detailView.classList.contains("active")) goHome();
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
  renderFilters();
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
