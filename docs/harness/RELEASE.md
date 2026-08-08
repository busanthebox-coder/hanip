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

## 상황별 표현 팩 6개 (지시 26)

부모 `korean/data/expressions.json`의 표현 889개에서 6팩 84장을 반입했다.
**한국어 저작 0** — hangul·english·romanization·example·nuance 전부 부모 텍스트 그대로,
재배열만 했다. 팩 제목·goal 등 UI 문구만 이쪽에서 작성(이중 언어).

| 팩 | 제목 | 카드 | 배치 | 근거(실측) |
|---|---|---:|---|---|
| snack-transport | 교통 표현 · Getting Around | 14 | 23과 뒤 | 23과가 길 묻기·교통수단·출구 챕터 |
| snack-restaurant | 식당·카페 주문 · Ordering Food & Drinks | 14 | 52과 뒤 | 52과가 삼겹살 주문(인분·공기밥) 챕터 |
| snack-shopping | 쇼핑 표현 · Shopping Talk | 14 | 51과 뒤 | 51과가 옷가게(사이즈·어울리다) 챕터 |
| snack-clinic | 병원·약국 · At the Clinic | 14 | 48과 뒤 | 48과가 증상·병원·약국 챕터 |
| snack-work | 직장 표현 · Office Korean | 14 | 40과 뒤 | 39·40과가 마감·야근·회의 중인 팀장 |
| snack-admin | 은행·행정 · Bank & Paperwork | 14 | 58과 뒤 | 58과가 B2 격식·서비스 응대(확인·처리) |

- **소스 필드 두 개는 못 쓴다**: `level`은 889개 전부 'A1'(부모 생성기 기본값 버그),
  `learnerPriority`도 "Memorize {표현} with one situation…" 템플릿이라 순위 정보가 없다.
  대신 부모 자신의 `sort` 키가 토픽별 교육 우선순위를 담고 있어 그것으로 정렬했다
  (교통이 길 좀 여쭤볼게요 → 여기 어떻게 가요? → 얼마나 걸려요? 순으로 열린다).
- **중복 0**: 기존 표제어 823개(간식 171 + 단어장 720, 정규화 후 합집합) 대비 완전 일치 9건·
  포함 관계 11건 제외. 그 밖에 소스 내부 중복 12·플레이스홀더 2·두 문장 표제어 1·정원 초과 168.
  선별·제외 전량(203건, 사유 포함)은 `docs/harness/audit/pack-selection-26.json`.
- 카드는 기존 스낵 경로 그대로(guess). 표현이 곧 문장이라 word.ko에 표현 전문이 들어가고
  (생존 2팩의 전례), 예문 속 표현 전문이 하이라이트되며, reveal에는 부모 nuance가 붙는다.
- 신규 스크린(`audit-generated.mjs` 팩 패스 → `docs/harness/audit/snack-cards.json`):
  정답 유일성·오답 중복·3지선다·부분 하이라이트·부분정답 오답. **신규 84장 blocker 0.**
  발견 3건은 반입 단계에서 고쳤다 — 두 문장짜리 표제어 1건 배제(드시고 가세요? 가져가세요?),
  포함 관계 오답 2건 금지쌍 등록(아파요 ⊂ 머리가/배가 아파요), 방향 묻기 혼동쌍 1쌍.
- 같은 스크린이 **기존 단어팩 12개에서 33건**을 찾았다(선택지 1~2개뿐인 카드 — 숫자팩
  23장 전부 + 맞장구팩 10장). 지시 26 범위 밖이라 기록만 하고 고치지 않았다.
- 크기: `snacks` 청크 28.8 → **65.2kB gz**(청크 예산 220kB), 총합 1,851 → **1,894kB gz**.
  220kB를 넘지 않아 snacks2 분리는 하지 않았다.
- 게이트: `guard:full` 그린 — validate OK(65챕터/619한입) · A1 baseline 무변경 ·
  테스트 182 → **191** · entry 84kB gz · 총합 1,894kB gz. 기존 12팩 카드와 65챕터 카드는
  바이트 단위로 무변경(컴파일 산출 비교로 확인).

## 신규 챕터 66~72 반입 (지시 25)

부모 `korean-core-starter`의 c10 슬라이스 7챕터를 반입했다. **콘텐츠 저작 0** —
`scripts/rich-chapters/chapter-{66..72}.json`을 그대로 복사했고 SHA-256 7/7 일치.
부모측 감사(`v2-upgrade/audit/c10-chapter-NN.json`)는 전부 blocker 0(minor 5: 69·70 각 2, 71 1).

| 한입 번호 = 파일 id | 레벨 | 주제 | 한입 | 카드 | 부모 course.json number |
|---|---|---|---:|---:|---:|
| 66 | B2 | V-이/히/리/기- · N에/에게 + 피동 | 11 | 50 | 64 |
| 67 | B2 | V/A-대요 · N(이)래요 vs V-(으)래요 | 11 | 55 | 65 |
| 68 | B2 | V-느라고 · V-는 바람에 | 11 | 52 | 66 |
| 69 | B2 | V-아/어 버리다 · V-고 말다 | 11 | 54 | 67 |
| 70 | C1 | V/A-(으)며 · V/A-(으)나 | 11 | 56 | 69 |
| 71 | C1 | News passives · -적(的) | 11 | 48 | 70 |
| 72 | C1 | 손이 크다 · 발이 넓다 | 11 | 48 | 71 |

- **번호는 파일 id 기준**. 부모는 c10 등록 때 커리큘럼 경로를 재부여해 number가 통째로
  밀렸다(위 표 오른쪽 열). 한입 1~65는 불변이어야 하므로 부모 number를 따라가지 않는다.
  참고로 한입 64·65는 부모에서 각각 number 63·72가 됐다.
- **레벨 매핑이 구간에서 테이블로**: 66부터 B2와 C1이 교차해 구간 규칙이 깨진다.
  `src/lib/levels.js`는 1~65는 구간 그대로 두고 66+만 명시 테이블에서 읽는다
  (66~69 B2 · 70~72 C1 — 부모 course.json의 `level` 필드와 대조 일치). 기존 65챕터 판정
  무변경을 테스트로 고정했다(`src/lib/levels.test.js`, 신규 4건).
- **컴파일**: 65 → **72챕터** · 619 → **696한입** · 2,977 → **3,340카드**(신규 77한입/363카드).
  hunt 147 → 161(신규 14) · teach 89 → **110**(신규 **21**). 신규 문법 35개 중 21개가 teach
  폴백 — 피동 접미사·관용구처럼 제목에서 형태소를 안전하게 뽑을 수 없는 무늬가 많다.
  RELEASE 관례대로 결함이 아니라 추출 한계로 기록한다(컴파일러 확장은 이 지시 범위 밖).
- **신규 카드 스크린**(`audit-generated.mjs`, 스냅샷 diff): 363장 **blocker 0** ·
  minor 2(67과 `이래요/으래요/래요` 포함쌍 — 영어 앵커로 판별 가능해 수용).
  최초 실행에서 blocker 2건이 나왔다: 70과의 `(으)나`·`(으)므로` 클로즈가 이형태 두 개를
  서로의 오답으로 냈다(지났___ → 으므로/므로 = 철자 동전던지기). 원인은 order 21 이전에
  만들어진 spare 클로즈만 `overrides.interchangeableVariants`를 안 물어본 것 —
  그 생성기도 같은 목록을 참조하게 하고(테스트 선행), 감사 판정 2쌍을 overrides에 등록해 해소했다.
  **콘텐츠는 1글자도 고치지 않았다.**
- **청크**: `b2c1`은 level 기준이라 신규 7과가 자동 합류, 203.5kB gz로 예산(220) 안이라
  b2/c1 분리는 하지 않았다. 대신 `grammarData`(전 챕터 문법 노트)가 **252kB gz로 예산 초과** —
  b1a/b1b 전례대로 `grammarNotes-early`(1~39, 87.9kB) / `grammarNotes-late`(40~99, 164.5kB)로
  쪼갰고 레슨은 자기 챕터가 든 절반만 받는다. entry 88kB gz · 총합 **2,103kB gz**(예산 2.5MB).
- **단어장**: 720 → **803**(신규 표제어 83 = B2 43 · C1 40, 기존 표제어 49개가 새 챕터 참조 획득).
  그중 6개(사람·친구·쉬다·바쁘다·모르다·걸리다)는 더 깊은 항목이 새 챕터 쪽이라 상세가
  a1 샤드에서 b2/c1 샤드로 옮겨졌다(order 05의 "가장 깊은 항목이 대표" 규칙 그대로, 표시 내용은 유지).
- **책장 헤더 수정**: 레벨이 더 이상 연속 구간이 아니라 `Chapters 57–69`가 64·65를 B2로
  주장하게 됐다. 구간을 런(run) 단위로 끊어 `Chapters 57–63, 66–69` / `Chapters 64–65, 70–72`로
  표기한다(`chapterRangeLabel`, 테스트 1건). 새 한국어 문자열 없음.
- **게이트**: `guard:full` 그린 — validate OK(72챕터/696한입) · **A1 baseline 무변경** ·
  테스트 199 → **205** · 번들 예산 OK. 기존 65챕터 카드는 스냅샷 대비 **차이 0**(추가만).
  `snapshot-all`은 72챕터/3,340카드로 재스냅샷(사유: 챕터 반입) · `smoke-stats` 기대값 동기화.
- **알려진 한계**: 67과 읽기 한입은 지문에 어휘가 문자 그대로 나오지 않아 회상 클로즈가
  안 만들어져 1장이다(1~65에는 1장 한입이 없다). 신규 문법 21개는 teach 폴백.
  둘 다 컴파일러 확장 사안이라 다음 지시로 넘긴다.
