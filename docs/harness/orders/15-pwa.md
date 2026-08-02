# 지시 15 — PWA화: 설치·오프라인·아이콘

## 목표
홈 화면에 설치되고, 지하철에서도 열리는 진짜 앱. 부모 저장소의
`scripts/finalize-pwa.mjs` 패턴을 참고하되 이 저장소 구조에 맞게 새로 쓴다.

## 작업
1. **아이콘**: `public/icons/` — 밥그릇 모티프 SVG 마스터를 하나 만들고(크림 배경에
   금색 밥그릇, 브랜드 토큰 색), 192/512 PNG + maskable 512 + apple-touch-icon 180.
   래스터화는 `scripts/make-icons.mjs`(sharp 없이 — svg를 canvas 없이 변환 불가하면
   sharp를 devDependency로 추가해도 좋다. 커밋에 사유 1줄).
2. **manifest**: `public/manifest.webmanifest` — name "한입 — Bite-sized Korean",
   short_name "한입", start_url `./`, display standalone, background/theme #FAF6EE,
   아이콘 등록. index.html에 link + `<meta name="theme-color">` 정합.
3. **서비스워커**: `public/sw.js` + 빌드 후처리 `scripts/finalize-pwa.mjs` —
   precache: entry(js/css)·index.html·manifest·아이콘·**bites-index**·a1 청크.
   런타임 캐시(stale-while-revalidate): 나머지 레벨 청크·단어장 샤드·간식·리더·
   클러스터·가이드·한자 (첫 조회 후 오프라인 가용).
   업데이트 전략: 새 SW 설치 시 대기 → "새 버전이 있어요 · Update ready" 토스트 →
   탭하면 skipWaiting+reload. **조용한 자동 리로드 금지**(학습 중 끊김).
   등록은 main.js에서 프로덕션 빌드에만.
4. **설치 유도**: beforeinstallprompt 저장 → 두 번째 방문(bowls 이력 ≥1일)에 홈 하단
   1회성 배너 "홈 화면에 추가 · Add to home screen" (닫으면 다시 안 봄).
5. build 스크립트에 finalize-pwa 연결, check-budget은 sw.js·아이콘을 entry 합산에서
   제외(파일명 패턴으로).

## 검증
```bash
npm run guard:full
npx vite preview --port 4180 &   # SW는 preview에서 검증
```
Playwright/dev: ① 로드 → SW 등록 확인 ② 오프라인 전환(DevTools) → 새로고침 →
홈·A1 한입 플레이 가능 ③ 두 번째 레벨 청크는 온라인에서 한 번 연 뒤 오프라인 가용
④ Lighthouse PWA 통과(가능하면).

## 완료 기준
- 설치 가능(manifest+아이콘+SW) · A1 오프라인 완주 가능 · 업데이트 토스트 동작
- guard:full 그린 · **배포** 후 폰 설치 확인 안내를 PROGRESS 특이사항에
