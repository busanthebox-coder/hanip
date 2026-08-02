# 중간 브리핑 — 지시 08 이후 세션은 이 문서를 먼저 읽는다

작성: 지시 01–07 완료 시점, 감독자(Fable)의 독립 검증 후. 대장(PROGRESS)의 자기 보고와
별개로 아래 수치는 감독자가 게이트를 직접 재실행해 확인한 값이다.

## 검증된 현재 상태 (2026-08-02)

- **65과 전체 컴파일**: 619한입 / 2,039카드 (뉘앙스 탑재 guess 977)
- guard:full 그린: validate OK · A1 기준선 무변 · 테스트 94 · entry 51kB gz · 총 1,913kB gz
- 감사 대장: 12–65과 54파일, 발견 232 / blocker 63 / **미수정 0**
- 아키텍처 (지시 04·05에서 확정된 실물 — 새 작업은 이걸 따른다):
  - `src/lib/bites-index.json` — 65챕터 {id, number, title, goal, level, biteCount, bites[]}
  - `src/lib/bites/{a1,a2,b1,b2c1}.json` — 레벨 청크, `src/lib/courseData.js`의
    `loadChapterCards(chapterId)`로 지연 로드 (+`createLatestRequest`로 경합 방지)
  - `src/lib/levels.js` `chapterLevel(number)` — 레벨 판정은 반드시 이 함수 재사용
  - 단어장: 목록 `wordbook.json` + 깊이 샤드 `wordbook-depth/<level>-N.json`
    (extract-wordbook이 210kB gz 목표로 자동 샤딩) · 718단어 / 짝 48
  - 상세 UI 컴포넌트 실존: `WordDetail.svelte`, `ContrastCard.svelte`, `WordbookRow.svelte`

## 주의보 3건

1. **청크 여유 9kB**: 최대 샤드(b1-1)가 211kB gz, 한도 220kB. 단어장 샤드에 필드를
   더하지 마라. 새 데이터(간식·리더·클러스터)는 **반드시 각자 새 지연 청크**로.
2. **라이브가 저장소보다 한 빌드 뒤**: 지시 07 배포 후 커밋이 더 있었다. 지시 12의
   배포에서 `dist/index.html`의 엔트리 해시와 라이브 해시가 **일치할 때까지** 확인할 것.
3. **대장 규율 누락 1건**: 지시 03에서 A1 9곳 재스냅샷을 했는데 PROGRESS의
   "기준선 재스냅샷 이력" 표에 행이 없다. **다음 커밋에서 보완하라** (날짜 2026-08-02,
   지시 03, 바뀐 것: A2 혼동쌍 금지가 A1 guess 9카드의 선택지를 교정, 사유: 감사 판정).

## 지시 08 완료 검수 기준 (진행 중인 작업에 대한 추가 요구)

- 미커밋 상태로 발견된 `DesignShowcase.svelte`·`DESIGN.md`는 지시에 없던 자발 작업이다.
  유지하려면: (a) entry 청크에 0바이트 영향(지연 import 유지 + 탭바 미노출), (b) 커밋
  메시지에 존재 이유 1줄, (c) tab-contract 준수. 아니면 커밋에서 제외하라.
- `.omo/`·`.playwright-cli/` 등 에이전트 작업 디렉터리는 `.gitignore`에 추가하고
  커밋에 포함시키지 마라.
- `shelf.js`의 그룹/열림 로직에 단위 테스트가 있어야 한다(이미 shelf.test.js가 보인다 —
  guard가 잡도록 vitest 수집 범위에 들어있는지 확인).
- 나머지는 지시 08 원문 그대로: 기본 열림 = 다음 한입의 레벨, 검색 시 매칭 그룹 전개,
  guard:full 그린.

## 다음 세션 시작 프롬프트

> docs/harness/README.md 규약과 docs/harness/BRIEFING-08.md를 읽어라.
> PROGRESS.md에서 첫 미완(⬜) 지시를 찾아 그 지시 파일을 실행하라.
> 지시 09부터는 파일이 v2로 갱신되어 있다 — 구버전 기억이 있어도 파일 내용이 우선한다.
