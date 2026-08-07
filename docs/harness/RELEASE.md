# Hanip v2 migration release

Released: 2026-08-02

## Shipped content

| Level | Chapters | Chapter bites | Chapter cards | hunt | teach | Snacks | Snack cards |
|---|---:|---:|---:|---:|---:|---:|---:|
| A1 | 11 | 89 | 335 | 18 | 5 | 11 | 161 |
| A2 | 23 | 196 | 663 | 37 | 22 | 1 | 12 |
| B1 | 22 | 242 | 740 | 65 | 48 | 0 | 0 |
| B2 | 7 | 74 | 244 | 26 | 7 | 0 | 0 |
| C1 | 2 | 18 | 57 | 1 | 7 | 0 | 0 |
| **Total** | **65** | **619** | **2,039** | **147** | **89** | **12** | **173** |

- Total playable items: 631 (619 chapter bites + 12 snacks)
- Total playable cards: 2,212 (2,039 chapter cards + 173 snack cards)
- Wordbook: 718 words, including 48 course words linked to a confusable set
- Confusable-set browser: 32 sets / 89 members
- Readers: 20
- Vocab packs: 12 / 173 of 173 members joined / 0 excluded

The canonical count command is `node scripts/smoke-stats.mjs`.

## Audit and regression receipt

- Content audit: 232 findings, including 63 blockers; 0 findings remain unfixed.
- Polish: 1 finding recorded, 1 fixed, **0 outstanding**.
- A1 baseline: unchanged since the intentional order-03 resnapshot recorded in `PROGRESS.md`.
- Final guard: compile, validation, baseline, 104 tests, production build, and bundle budget all pass.
- Browser coverage: A1 start, A2 pattern hunt, C1 entry, snack/reader/cluster, and Continue; console errors 0.

## Remaining teach fallbacks

Teach cards are the intentional fallback when a grammar title cannot be safely converted into a tap hunt. There are 89 in the shipped course. The complete generated lists are recorded in:

- A1 (5): Ch. 1 `자음 (Consonants)`, Ch. 1 `모음 (Vowels)`, Ch. 5 `자연스럽게 말하기`, Ch. 11 `-아서/어서`, Ch. 11 `-고 / -(으)면 / -(으)ㄹ게요`
- A2 (22): [chapters 12–34 gap report](audit/gap-report-12-34.md)
- B1 (48): [chapters 35–56 gap report](audit/gap-report-35-56.md)
- B2/C1 (14): [chapters 57–65 gap report](audit/gap-report-57-65.md)

The same reports record 17 remaining guess examples whose sentence target is null (15 in chapters 12–34, 0 in 35–56, 2 in 57–65). They are reported as extraction limits, not hidden as successful hunts.

## Production receipt

- Deployment command: `npm run deploy` (its bundled `guard:full` passed before publish).
- Deployment source: clean committed runtime at `f01113f2bf86fbce77191d0d2fb3234cd56552a8`; unrelated local showcase work was excluded.
- Local entry: `assets/index-PzFaCE37.js`.
- Cache-busted live entry: `assets/index-PzFaCE37.js` (matched after two 20-second checks).
- Live browser: A1 chapter 1 first word bite and C1 chapter 64 first word bite both loaded and rendered.
- Live browser warnings/errors: 0.

## Known limits

- The 89 teach fallbacks above remain read-confirmation cards rather than morpheme hunts.
- The 17 null-target guess examples remain visible in the generated gap reports.
- Progress and `lastPlayed` are browser-local; session snack skips intentionally reset on a new app session.
- No vocab-pack member was excluded and no audit or polish finding remains unfixed.

# 3단계 — 두께 (지시 20–23, 2026-08-03 ~ 2026-08-07)

Codex가 1·2단계(이관·앱스러움)를 마친 뒤, 3단계는 Fable이 직접 실행했다.
목표는 콘텐츠 추가가 아니라 **이미 반입된 자료를 문제로 바꾸는 것** — 새 한국어 문장은
한 줄도 저작하지 않았고, 기존 카드 프롬프트·선택지·정답은 1장도 수정하지 않았다
(check-additive가 매 커밋 증명).

## Before → after (report-density)

| 지표 | 두께 전 (2026-08-03) | 두께 후 |
|---|---|---|
| 문법 바이트 문제 ≥2 비율 | 0% | **100%** |
| 문제 0개 문법 바이트 | 189 | **0** |
| 본편 1장 바이트 | 256 | **0** |
| 전체 카드 중간값 | 2장 | **5장** |
| 어순 이중 출제 | 63건 | **0건** |
| 대화 바이트 중간값 | 2장 | 4장 |
| 읽기 바이트 중간값 | 1장 | 3장 |
| 총 카드 | 2,042 | **2,977** (+998 생성, 어순 중복 63건 예외 삭제) |

## 신규 카드 감사 (지시 23)

`scripts/audit-generated.mjs`가 스냅샷 diff로 생성 카드 1,028장(드릴 610·어순 418,
정렬 방식 차이로 기존 카드 30장 재검 포함)을 전수 스크린했다. 결과는
`docs/harness/audit/phase3-generated.json`.

- **수정 3종(컴파일러, 테스트 선행)**: ① 서로를 포함하는 오답쌍(으면/면, 으로/로,
  으ㄹ게요/ㄹ게요)은 하나로 취급 — 사실상 2지선다가 되던 10장 해소 ② 어휘 클로즈
  오답 풀에서 정답과 포함 관계인 후보(셔츠/티셔츠) 제외 ③ 부사어가 움직일 수 있는
  생성 어순 타일 153장에 "(X 시작 · Start with X.)" 힌트 — 정답이 하나뿐이 아닌
  문장에서 오답 처리되던 챕터 54 사고의 재발 방지.
- **blocker 0**, 소견 1건(학교에/에서 — 영어 앵커가 의미를 고정하는 정상 대조 문항).
- 함정 픽의 최소대립쌍(커피 주세요/저는 커피 주세요)은 결함이 아니라 수업 그 자체로 판정.
- 사람 표본: 37장 간격 17장 통독 — 회상 문항 오답은 약하지만 안전, 문법 선택지는
  어간·영어 해석으로 판별 가능.

## 워밍업 비율 (지시 23)

본문 4장 미만 바이트는 워밍업 1장(기존 2장), 책장 직접 진입은 0장 유지.
라이브 확인: 3장 읽기 바이트 → 점 4개(3+1), 4장 문법 바이트 → 레슨 덱 11장+워밍업 2장.

## 오프라인 크기 (지시 23에서 발견·수정)

두께 작업 후 gzip 총합이 2,472kB로 예산(2,500kB) 직전이었고 B1 청크가 236kB로
청크 예산(220kB)을 넘겼다. 예산을 완화하지 않고 두 가지를 고쳤다:

1. **B1 코스 청크 분할** — b1a(35–45과)·b1b(46–56과), 각 108/129kB gz.
2. **단어장 깊이 이중 번들 제거** — 지시 05의 재시도 설계가 깊이 샤드를 JS 모듈 +
   원본 JSON 자산으로 두 번씩 싣고 있었다(~430kB gz 중복). fetch 단일 사본으로
   전환(해시 URL은 불변이라 재시도 의미 동일, SW stale-while-revalidate 경로 동일).

결과: **총합 2,472 → 1,851kB gz** (엔트리 79kB, 전 청크 ≤220kB, 예산 2.5MB 원상 유지).

## 게이트·재스냅샷

- 테스트 165 → **180** (워밍업 비율 1 · 오답 위생 3 · 타일 힌트 2 · 깊이 로더 재작성 2 등).
- 기준선 재스냅샷 1회(지시 23 승인분): A1 11챕터 + 전 레벨 65챕터/2,977카드.
  `npm run guard`·`guard:full` 모두 그린 복귀 — guard:thin은 3단계 전용이었다.
- 라이브 QA(dev): 얇은/두꺼운 워밍업, B1 분할 로드(35·46·57과), 단어장 뉘앙스
  fetch(로더 직접 + 실제 UI '의사' 상세), 신규 로드 실패 요청 0.

## Production receipt

- Deployment command: `npm run deploy` (bundled `guard:full` re-ran green before publish).
- Local entry at deploy time: `assets/index-CQScGM0s.js`.
- Cache-busted live entry: `assets/index-CQScGM0s.js` — 일치 (20초 간격 3회차 폴링에서 CDN 전파 확인).
- 알려진 한계: 회상 문항의 오답이 문법적으로만 배제 가능한 경우가 있어 난도가 고르지
  않다 · 함정 픽 2장(한글 챕터)은 선택지가 설명문이라 길다 · guard:thin 스크립트는
  다음 두께 페이즈를 위해 남겨 둔다.
