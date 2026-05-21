#!/usr/bin/env node
/** 배송지 JSON 구조 검증 (npm test) */
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const dir = dirname(fileURLToPath(import.meta.url));
const path = join(dir, "../public/data/locations.json");
const data = JSON.parse(readFileSync(path, "utf8"));

const required = ["id", "name", "address", "mapUrl", "difficulty", "sections", "image", "route", "cargo"];
let ok = true;

if (!Array.isArray(data) || data.length !== 9) {
  console.error("FAIL: 배송지는 9개여야 합니다. 현재:", data?.length);
  process.exit(1);
}

for (const loc of data) {
  for (const key of required) {
    if (!loc[key]) {
      console.error(`FAIL: ${loc.id || loc.name} — 필드 누락: ${key}`);
      ok = false;
    }
  }
  if (!loc.mapUrl.startsWith("https://map.naver.com")) {
    console.error(`FAIL: ${loc.id} — mapUrl 형식 오류`);
    ok = false;
  }
  const imgPath = join(dir, "../public", loc.image);
  if (!existsSync(imgPath)) {
    console.error(`FAIL: ${loc.id} — 이미지 파일 없음: ${loc.image}`);
    ok = false;
  }
  if (!loc.route?.order || !loc.route?.label) {
    console.error(`FAIL: ${loc.id} — route.order/label 누락`);
    ok = false;
  }
  const b = loc.cargo?.booklet;
  if (!b?.bundles && b?.bundles !== 0) {
    console.error(`FAIL: ${loc.id} — cargo.booklet 누락`);
    ok = false;
  } else if (b.totalCopies !== b.bundles * 500 + b.extraCopies) {
    console.error(`FAIL: ${loc.id} — totalCopies 불일치`);
    ok = false;
  }
}

// 동선 순서 1~9 연속 확인
const orders = data.map((l) => l.route.order).sort((a, b) => a - b);
if (orders.join(",") !== "1,2,3,4,5,6,7,8,9") {
  console.error("FAIL: 배송 동선 order는 1~9여야 합니다:", orders);
  ok = false;
}

if (ok) {
  console.log("OK: 9개 배송지, 필수 필드·네이버 지도 URL 검증 통과");
} else {
  process.exit(1);
}
