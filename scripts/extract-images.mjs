#!/usr/bin/env node
/**
 * PDF에서 장소별 지도 스크린샷 이미지 추출
 * 패턴: 설명 → 네이버 지도 링크 → 삽입 이미지(다음 페이지 또는 동일 페이지)
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, "..");

// pymupdf는 Python으로 실행
import { spawnSync } from "child_process";

const pdf =
  process.argv[2] ||
  "/Users/hoon/Downloads/평택시 선거물 배송지-1.pdf";

const py = `
import fitz, json, os
pdf = "${pdf.replace(/\\/g, "\\\\")}"
doc = fitz.open(pdf)
out = os.path.join("${root.replace(/\\/g, "/")}", "public/images")
os.makedirs(out, exist_ok=True)
MAP = {
    "pangseong": 2, "anjung": 3, "poseung": 4, "cheongbuk": 5,
    "godeok-myeon": 6, "oseong": 8, "hyeondeok": 9,
    "godeok-dong": 10, "ichung": 12,
}
for loc_id, pnum in MAP.items():
    page = doc[pnum - 1]
    imgs = page.get_images(full=True)
    if not imgs:
        raise SystemExit(f"no image page {pnum} for {loc_id}")
    xref = imgs[0][0]
    base = doc.extract_image(xref)
    ext = base.get("ext", "png")
    path = os.path.join(out, f"{loc_id}.{ext}")
    open(path, "wb").write(base["image"])
    print(f"{loc_id} <- page {pnum}")
json_path = os.path.join("${root.replace(/\\/g, "/")}", "public/data/locations.json")
data = json.load(open(json_path, encoding="utf-8"))
for loc in data:
    loc["image"] = f"images/{loc['id']}.png"
json.dump(data, open(json_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump(data, open(os.path.join("${root.replace(/\\/g, "/")}", "data/locations.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
`;

const venvPy = join(root, ".venv/bin/python3");
const r = spawnSync(venvPy, ["-c", py], { encoding: "utf-8" });
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}
console.log(r.stdout);
