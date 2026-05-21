#!/usr/bin/env node
/** 배송지 JSON 구조 검증 (npm test) */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const dir = dirname(fileURLToPath(import.meta.url));
const path = join(dir, "../public/data/locations.json");
const data = JSON.parse(readFileSync(path, "utf8"));

const required = ["id", "name", "address", "mapUrl", "difficulty", "sections", "image"];
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
}

if (ok) {
  console.log("OK: 9개 배송지, 필수 필드·네이버 지도 URL 검증 통과");
} else {
  process.exit(1);
}
