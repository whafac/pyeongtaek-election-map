/**
 * 배송 소요시간 계산 (남성 3명 + 구르마 하차 기준)
 * - 1묶음 = 500부
 * - 이동시간: route-guide.json travelLegs
 */

const COPIES_PER_BUNDLE = 500;

/** 난이도별 하차 보정 계수 (구르마 사용 시 소폭만 반영) */
const DIFFICULTY_FACTOR = {
  easy: 1,
  moderate: 1.05,
  hard: 1.1,
  special: 1.15,
};

/** 장소별 추가 하차 시간(분) — 노상 대차·3층 반입·협소 골목 등 */
const EXTRA_UNLOAD_MINUTES = {
  "godeok-dong": 10,
  hyeondeok: 5,
};

/**
 * 책자형 공보 총 부수
 */
export function totalCopies(bundles, extraCopies) {
  return bundles * COPIES_PER_BUNDLE + extraCopies;
}

/**
 * 하차·인수 예상 시간(분) — 3명 기준
 */
export function estimateUnloadMinutes(loc, config) {
  const c = loc.cargo?.booklet;
  if (!c) return 0;

  const {
    baseMinutes = 5,
    minutesPerBundle = 0.65,
    minutesPer100LooseCopies = 0.5,
  } = config.unload || {};

  const loose = c.extraCopies || 0;
  let minutes =
    baseMinutes +
    c.bundles * minutesPerBundle +
    (loose / 100) * minutesPer100LooseCopies;

  const factor = DIFFICULTY_FACTOR[loc.difficulty] ?? 1;
  minutes *= factor;
  minutes += EXTRA_UNLOAD_MINUTES[loc.id] ?? 0;

  return Math.round(minutes);
}

/**
 * 수량 표시 문자열
 */
export function formatCargoQuantity(cargo) {
  if (!cargo?.booklet) return "";
  const { bundles, extraCopies, totalCopies: total } = cargo.booklet;
  const loose = extraCopies > 0 ? ` + ${extraCopies.toLocaleString()}부` : "";
  return `${bundles}묶음${loose} (총 ${total.toLocaleString()}부)`;
}

/**
 * 분 → "1시간 25분" / "45분"
 */
export function formatMinutes(min) {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

/**
 * "09:00" + minutes → "10:25"
 */
export function addMinutesToTime(timeStr, addMin) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + addMin;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/**
 * 동선 전체 타임라인 계산
 */
export function buildDeliveryTimeline(locations, routeGuide) {
  const config = routeGuide.timeConfig || {};
  const startTime = config.defaultStartTime || "09:00";
  const legs = routeGuide.travelLegs || [];

  const legMap = Object.fromEntries(
    legs.map((l) => [`${l.fromId}_${l.toId}`, l.minutes])
  );

  let cumulative = 0;
  const rows = [];

  locations.forEach((loc, idx) => {
    const travelMin =
      idx === 0
        ? 0
        : legMap[`${locations[idx - 1].id}_${loc.id}`] ??
          config.defaultTravelMinutes ??
          20;

    if (idx > 0) cumulative += travelMin;

    const arriveMin = cumulative;
    const arriveTime = addMinutesToTime(startTime, arriveMin);

    const unloadMin = estimateUnloadMinutes(loc, config);
    cumulative += unloadMin;
    const departTime = addMinutesToTime(startTime, cumulative);

    rows.push({
      id: loc.id,
      order: loc.route?.order ?? idx + 1,
      label: loc.route?.label ?? "",
      name: loc.name,
      travelMin: idx === 0 ? null : travelMin,
      travelFrom: idx > 0 ? locations[idx - 1].name : null,
      arriveTime,
      unloadMin,
      departTime,
      cargo: loc.cargo,
      cumulativeMin: cumulative,
    });
  });

  const totalUnload = rows.reduce((s, r) => s + r.unloadMin, 0);
  const totalTravel = rows.reduce((s, r) => s + (r.travelMin || 0), 0);

  return {
    startTime,
    endTime: addMinutesToTime(startTime, cumulative),
    totalMinutes: cumulative,
    totalTravel,
    totalUnload,
    totalCopies: locations.reduce(
      (s, l) => s + (l.cargo?.booklet?.totalCopies ?? 0),
      0
    ),
    rows,
  };
}
