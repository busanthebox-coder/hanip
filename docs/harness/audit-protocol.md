# 콘텐츠 감사 프로토콜

자동 컴파일된 한입은 **그럴듯하지만 틀린 카드**를 만든다. A1 감사에서 실제로 78건(블로커 3)이
나왔다. 이 프로토콜은 그 경험을 규칙화한 것이다. 지시 03(A2)·06(B1)·07(B2·C1)에서 실행한다.

## 절차

1. `npm run compile` 후, 감사 대상 챕터를 하나씩 덤프해서 **모든 카드를 직접 읽는다**:
   ```bash
   node -e 'const d=require("./src/lib/bites.json"); console.log(JSON.stringify(d.chapters.find(c=>c.id==="chapter-12"),null,1))' | less
   ```
2. 카드 종류별로 아래 결함 체크리스트를 적용한다.
3. 발견은 `docs/harness/audit/chapter-NN.json`에 기록한다 (스키마 아래).
4. 수정한다 — 수정 경로는 심각도별 정책을 따른다.
5. 수정 후 재컴파일 → 해당 발견이 사라졌는지 재확인 → `npm run guard`.

## 결함 체크리스트 (A1에서 실제로 나온 5종)

### 1. guess — 모호한 선택지 (A1에서 45건, 최다)
학습자가 보는 것: 예문 속 하이라이트 단어 + 영어 선택지 3개.
**결함**: 오답 선택지가 그 문장 맥락에서 **똑같이 자연스러운 해석**일 때.
- 실례: `천천히 말해 주세요`에 "slowly"와 "again" — 다시 말해 주세요도 완전히 자연스러움.
- 실례: 받침 카드에 "consonant" — 받침은 실제로 자음이라 상위개념 겹침.
- **수정**: `data/overrides.json`의 `guessDistractorBans`에 `"단어": ["금지 영어 부분문자열"]` 추가.
  혼동 쌍은 **양방향으로** 등록하라 (천천히↔again, 다시↔slowly).

### 2. hunt — 잘못된/절반 하이라이트 (블로커 가능)
**결함 a**: hit 표시된 형태소가 실제로는 그 문법이 아님 (물 **좀 주세요**의 주세요는
N+주세요 구문이지 V-아/어 주세요가 아님) → `huntExampleBans`에 그 예문 추가.
**결함 b**: 한 줄에 패턴이 두 번인데 하나만 hit → 컴파일러 버그(findAllPatterns)로 취급,
테스트 먼저 추가 후 수정.

### 3. drill — 복수 정답/틀린 설명 (블로커 가능)
**결함**: 클로즈 빈칸에 두 선택지가 다 문법적으로 성립, 또는 explanation이 틀린 문법을
가르침 (A1 실례: 고르다를 "ㄹ-받침 어간"이라 설명 — 실제로는 모음 어간).
- 클로즈 복수정답 → 해당 예문을 `huntExampleBans`로 배제하거나 노트별 드릴 스킵.
- 데이터의 틀린 설명 → **blocker**: 데이터 수정 + `DATA-CHANGES.md` 기록 + 부모 저장소에도
  같은 오류가 있음을 PROGRESS 특이사항에 남김.

### 4. payoff — 엉뚱한 부분문자열 하이라이트 (블로커 가능)
**결함**: hl이 가르친 단어가 아닌 우연한 부분문자열 (저기 ⊂ 저기요, 오 ⊂ 오늘).
- 매칭 규칙 자체의 구멍이면 컴파일러 수정(테스트 먼저), 개별 케이스면 `payoffBans`에
  `{ "word": "...", "contains": "..." }` 추가.

### 5. 데이터 사실 오류 (blocker)
읽기 지문·QA 답·설명이 **틀린 사실**을 가르칠 때 (A1 실례: "자음이 열 개 있어요" —
한국어 기본 자음은 14개). 데이터 수정 + `DATA-CHANGES.md` + 번역·연관 QA까지 일관 수정.

## 심각도

- **blocker**: 틀린 것을 가르침 → 반드시 수정, 챕터당 0이어야 게이트 통과.
- **bad-teaching**: 혼란/모호 → 수정 원칙, 불가하면 PROGRESS 특이사항에 사유.
- **polish**: 어색함 → 기록만, 수정 선택.

## 발견 기록 스키마 (`docs/harness/audit/chapter-NN.json`)

```json
{ "chapterId": "chapter-12", "auditedAt": "YYYY-MM-DD",
  "findings": [ { "biteId": "chapter-12-b3", "cardIndex": 2,
    "severity": "blocker|bad-teaching|polish",
    "class": "guess-ambiguous|hunt-wrong|drill-multi|payoff-substring|data-fact",
    "evidence": "카드의 실제 내용 인용", "fix": "적용한 수정", "fixed": true } ] }
```

## 게이트 (지시 03·06·07 공통)

- 대상 챕터 전부에 audit JSON 존재
- blocker 0 · bad-teaching은 fixed:true 또는 사유 기록
- `npm run guard` 통과 (overrides 변경이 A1 카드를 건드리면 baseline이 잡는다 —
  A1 단어에 새 금지쌍이 걸리는 경우인데, 그 금지가 A1에도 옳다면 지시의 허용 아래 재스냅샷)
