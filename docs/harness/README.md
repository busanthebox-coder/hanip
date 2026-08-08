# 한입 전체 이관 하네스 — Codex 실행 규약

**목표**: korean-core-starter의 나머지 전부(A2~C1 54개 챕터 + 단어팩 12 + 리더 20 + 표현 클러스터 32)를
한입(Hanip)으로 이관한다. A1 11개 챕터는 이미 라이브다 — **한 번도 깨지지 않아야 한다.**

이 문서를 읽는 너(Codex)는 `docs/harness/orders/`의 지시를 **01부터 순서대로** 실행한다.
각 지시는 자기완결적이다: 목표 → 작업 → 검증 커맨드 → 완료 기준(게이트) → 롤백.

---

## 절대 규칙 7

1. **A1 무회귀.** 어떤 변경 후에도 `npm run baseline`이 통과해야 한다. 이 게이트는 라이브 중인
   A1 89한입의 구조 스냅샷과 현재 컴파일 출력을 비교한다. 의도된 개선으로 A1 출력이 바뀌는
   경우에만 `node scripts/baseline.mjs --write`로 재스냅샷하고, **커밋 메시지에 무엇이 왜
   바뀌었는지 명시**한다. 지시가 재스냅샷을 명령하지 않는 한 하지 마라.
2. **콘텐츠 무변경.** `data/chapters/*.json`은 원본 그대로다. 컴파일러는 재배열·클로즈만 한다.
   데이터 수정은 오직 (a) 사실 오류(감사에서 blocker 판정) → 수정 후 `docs/harness/DATA-CHANGES.md`에
   기록, (b) `data/overrides.json`의 배제 규칙 추가 — 이 두 경로뿐이다.
3. **지시 1건 = 커밋 1건.** 커밋 메시지 첫 줄에 `[order-NN]` 접두. 지시 완료 시
   `docs/harness/PROGRESS.md`의 해당 행을 갱신(날짜·결과 수치·특이사항)하고 같은 커밋에 포함.
4. **게이트가 빨간데 넘어가지 마라.** `npm run guard`(컴파일+구조검증+기준선+테스트)와
   `npm run guard:full`(+빌드+번들예산)이 각 지시의 최소 게이트다. 실패를 우회하는 코드
   (검증 완화, 예산 상향)는 지시가 명시적으로 허용할 때만.
5. **추측 금지, 검증 우선.** 컴파일러를 고치기 전에 반드시 실패를 재현하는 테스트를
   `scripts/lib/compiler.test.js`에 먼저 추가한다. 데이터 형태가 문서와 다르면 문서를 믿지 말고
   `node -e`로 실제 JSON을 확인하라 (경로에 공백 있음 — 항상 따옴표).
6. **이중 언어 UI.** 학습자는 영어 화자다. 새 UI 문자열은 전부 `한국어 · English` 병기.
   스타일은 `docs/tab-contract.md`가 구속한다(토큰만 사용, 44px 탭 타깃, keep-all, 진짜 button).
7. **배포는 지시가 명령할 때만.** `npm run deploy`는 guard:full을 통과해야만 발행되도록 이미
   묶여 있다. 원격(GitHub)에 push는 각 지시 완료 시, deploy는 지시 03·05·07·12가 명령한다.

## 저장소 지도

```
data/chapters/          챕터 원본 JSON (현재 01–11, 이관하며 12–65 추가)
data/overrides.json     추측 선택지 금지쌍·헌트 예문 배제·보상 배제 (감사의 산출물)
data/hanja.json         한자 뿌리 40 (완료)
data/guide.json         가이드 6트랙 20유닛 (완료)
scripts/lib/compiler.mjs        바이트 컴파일러 (무늬 추출·추측 타깃·선택지 생성)
scripts/lib/compiler.test.js    컴파일러 테스트 (현재 21) — 여기가 너의 첫 방어선
scripts/compile-bites.mjs       실행기: chapters → src/lib/bites.json (+뉘앙스 부착)
scripts/extract-wordbook.mjs    단어장 생성: 챕터 어휘 ⨝ 부모 사전 뉘앙스 레이어
scripts/validate-bites.mjs      구조 게이트 (풀 수 없는 카드=빌드 실패)
scripts/baseline.mjs            A1 무회귀 게이트 (--write로 재스냅샷)
scripts/check-budget.mjs        번들 예산 게이트 (entry 150kB·청크 220kB·총 2.5MB gzip)
src/App.svelte                  5탭 셸 (참고 탭 4개는 lazy import)
src/components/                 Home/Shelf/BitePlayer + cards/ + 참고 탭 4개
docs/design/STYLE.md            디자인 정본 (타이포·색 예산·킬 리스트·재질·종이 3층). 지시 27부터 UI 게이트
docs/tab-contract.md            UI 계약 (스타일·토큰·접근성) — STYLE.md의 최소 하위집합
docs/harness/audit-protocol.md  콘텐츠 감사 프로토콜 (지시 03·06·07에서 실행)
../korean-core-starter/         부모 저장소 (형제 체크아웃). 읽기 전용으로만 접근.
  scripts/rich-chapters/chapter-NN.json   챕터 원본 (여기서 복사해 온다)
  public/data/app-core.*.json             vocabPacks·readers·expressionClusters·patterns
  public/data/app-words.*.json 외         사전 3,848 항목 (뉘앙스 레이어의 원천)
```

## 자주 쓰는 커맨드

```bash
npm run compile      # 단어장 추출 → 바이트 컴파일 (bites.json 재생성)
npm run guard        # 컴파일 + 구조검증 + A1기준선 + vitest
npm run guard:full   # guard + vite build + 번들예산
npm run dev          # 개발 서버 :5180 (브라우저 확인은 보조 수단 — 게이트는 CLI가 기준)
npm run deploy       # guard:full 통과 시에만 gh-pages 발행
```

## 지시 목록

| # | 제목 | 배포 |
|---|---|---|
| 01 | A2 챕터 반입(12–34) — 마른 컴파일과 격차 리포트 | |
| 02 | 무늬 추출기·추측 타깃 확장 — 상위 레벨 문법 대응 | |
| 03 | A2 콘텐츠 감사·교정 — blocker 0까지 | |
| 04 | 레벨별 코드 스플리팅 — 예산 안으로 | ✅ |
| 05 | 단어장 전체 확장 — 65과 어휘 ⨝ 뉘앙스 | ✅ |
| 06 | B1 반입·감사(35–56) | |
| 07 | B2·C1 반입·감사(57–65) | ✅ |
| 08 | 책장 레벨 그룹 UI | |
| 09 | 단어팩 12 → 간식 한입 · 리더 20 → 책장 | |
| 10 | 표현 클러스터 32 브라우저 | |
| 11 | 홈 오늘-카드 레벨 인지 | |
| 12 | 최종 회귀·배포·릴리스 노트 | ✅ |

### 2단계 — 앱스러움 (BRIEFING-13.md를 먼저 읽을 것)

| # | 제목 | 배포 |
|---|---|---|
| 13 | 설정 시트 + 로마자 정책 | |
| 14 | 온보딩 + 시작점 선택 | |
| 15 | PWA화 — 설치·오프라인·아이콘 | ✅ |
| 16 | 소리·햅틱·정답 피드백 통일 | |
| 17 | 다크 모드 | |
| 18 | 스트릭·히트맵·문법 카드 수집·별표 | |
| 19 | 진짜 SRS — 복습 큐·역방향·워밍업 규칙 | ✅ |

### 3단계 — 두께 (BRIEFING-20.md를 먼저 읽을 것)

문법 설명 뒤에 문제가 없고(80%), 한입이 너무 짧다(41%가 본편 1장)는 실사용 지적을
컴파일 산출 측정으로 확정한 뒤 만든 페이즈. **추가만 허용(additive-only)**이 핵심 규칙.

| # | 제목 | 배포 |
|---|---|---|
| 20 | 두께 게이트 — additive 가드·thin 게이트·밀도 리포트 | |
| 21 | 문법 한입에 문제 2~4개 필수화 | |
| 22 | 대화·읽기 두께 + 어순 이중 출제 제거 | |
| 23 | 워밍업 비율·신규 카드 재감사·재스냅샷·배포 | ✅ |
| 24 | 문법 레퍼런스 뷰 (자습 검증 후속, 23 뒤 실행) | |

### 4단계 — 확장·앱 품질 (지시서는 `orders/`, 결과는 PROGRESS.md 4단계 표)

| # | 제목 | 배포 |
|---|---|---|
| 25 | 신규 챕터 반입 (66~72) | ✅ |
| 26 | 상황별 표현 팩 6개 | ✅ |
| 27 | 디자인 개편 (프로덕트 톤·영어 메인) — `docs/design/STYLE.md` 신설 | ✅ |
| 28 | 재질·구조 복원 (v5) — 그릇·아이콘·종이 결 | ✅ |
| 29 | 학생 프로필 + 진도 코드 이전 | ✅ |
| 30 | 단어 첫 만남은 설명 (teach/quiz 분기) | ✅ |
| 31 | 목차 표면 — Shelf 재설계 + 종이 3층 규칙 | |

의문이 생기면: 게이트를 통과하는 가장 보수적인 해석을 택하고, PROGRESS.md 특이사항에 기록하라.
