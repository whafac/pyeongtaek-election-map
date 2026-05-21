# 평택시 선거물 배송지 안내

PDF「평택시 선거물 배송지」를 분석해 **모바일·카카오톡 공유**에 맞춘 웹 페이지입니다.

## 기능

- 9개 배송지 목록 (난이도 필터)
- 각지 **상세 설명** (도로·진입·하차 팁)
- PDF에서 추출한 **안내 이미지**
- **네이버 지도** 버튼 → 모바일에서 앱/웹으로 바로 열림
- 상세 화면 **링크 복사** → 카톡에 `#배송지id` URL 전달 시 해당 상세로 바로 이동

## 로컬 실행

```bash
cd /Users/hoon/projects/pyeongtaek_map
npm start
```

브라우저: http://localhost:3456

같은 Wi‑Fi의 휴대폰에서 접속하려면 PC IP로 `http://<PC-IP>:3456` 접속 후 카톡에 URL 공유.

## 공개 URL (GitHub Pages)

**https://whafac.github.io/pyeongtaek-election-map/**

카카오톡에 위 링크를내면 모바일에서 바로 확인할 수 있습니다.

## 카카오톡 공유

- 전체 목록: https://whafac.github.io/pyeongtaek-election-map/
- 특정 배송지 예: https://whafac.github.io/pyeongtaek-election-map/#anjung

## 배송지 목록

| 구분 | 난이도 |
|------|--------|
| 팽성읍행정복지센터 | 주의 |
| 안중읍 행정복지센터 | 매우 양호 |
| 포승읍행정복지센터 | 주의 |
| 청북읍행정복지센터 | 매우 양호 |
| 고덕면행정복지센터 | 보통 |
| 오성면행정복지센터 | 최상 |
| 현덕면행정복지센터 | 가장 어려움 |
| 고덕동행정복지센터 | 특별 주의 (빌딩 3층) |
| 이충문화체육센터 실내체육관 | 최상 |
