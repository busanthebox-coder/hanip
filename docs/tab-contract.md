# Hanip tab-component contract

Every new tab is one self-contained Svelte 4 component. Follow this exactly so
four components built in parallel integrate without edits.

## Hard rules

- **Svelte 4, plain JS** — no TypeScript syntax, no stores you invent, no router.
- **Write ONLY your assigned file.** Never touch App.svelte, package.json,
  existing components, scripts, or data files.
- **Do NOT run** npm dev/build/test — the integrator verifies compilation.
- Read these before writing: `src/styles/tokens.css` (design tokens),
  `src/components/Shelf.svelte` (style reference), your data file.

## Design language (Hanip)

**전체 규칙은 `docs/design/STYLE.md`가 정본이다** (타이포 낙차·색 예산·킬 리스트).
아래는 새 탭을 만들 때 반드시 지켜야 하는 최소 계약이다.

- Tokens only — no hard-coded colors: `--bg --ink --ink-2 --ink-3 --card --wash
  --line --line-2 --accent --accent-deep --accent-soft --gold --gold-soft
  --good --good-deep --good-soft --r-card --r-chip --shadow-1 --ease`.
- Section shell: `max-width: 480px; margin: 0 auto; padding: 30px 20px 40px;`
- **표면(종이) 판정은 STYLE.md §10-1이 정본이다.** 찾고 고르는 화면(목록·인덱스·검색 결과)은
  전체 폭 래퍼에 `.index-surface`를 걸어 괘선을 걷고 도트만 남긴다 — 480px 칼럼에 걸면
  좌우 여백에 괘선이 남는다. 읽고 생각하는 화면은 기본값(괘선 있는 종이)을 그대로 둔다.
- 목록 행의 식별자·상태는 왼쪽 거터 `[24px][22px]`에서 끝내고 오른쪽 끝은 비운다(STYLE.md §10-2).
- Section header: 화면 이름을 16px/900 한 단어로 두고, 그 아래 `--ink-3` 12.5px 한 줄.
  **uppercase 키커 금지.**
- 구획은 여백과 1px `--line`만. 카드 윤곽은 화면당 0~1겹이고 중첩하지 않는다.
- Korean text: `word-break: keep-all`. Interactive rows ≥44px tall.
- Transitions: explicit properties only (never `transition: all`).

## 언어 정책 (개정 2026-08-22 · 지시 34)

학습자는 **한국어를 배우는 영어 화자**다. 두 언어는 나란히 놓지 않고 위계로 나눈다.

1. **학습 콘텐츠**(단어·예문·대화·문법 형태·타일·토큰·로마자)는 **한국어가 히어로** —
   크게, 화면을 지배하도록.
2. **설명·해설·뉘앙스**는 **영어 본문**이다. 실데이터의 영어 원문을 그대로 흘린다.
3. **기능성 UI 문자열**(버튼·상태·섹션 제목·탭·필터·메타·통계)은
   **영어 메인 + 한국어 11.5px `--ink-3` 보조**, 반드시 **줄바꿈**으로 분리한다.
   짧은 수치·상태는 영어만 써도 된다.
4. **학습 지시문**(「무슨 뜻일까요?」류)은 **레벨이 정한다**(지시 34).
   **A1(1~11과)은 영어 메인 + 한국어 11.5px 보조** — 한글을 아직 가르치는 중인 구간에서
   읽을 수 없는 지시문은 몰입이 아니라 공백이다. **A2부터는 한국어 메인 + 영어 보조**로
   돌아간다. 판정은 `src/lib/instructions.js`의 `instructionLeadFor(bite)` **하나뿐**이고,
   **짝은 절대 깨지 않는다** — 순서와 두 글자 크기만 맞바꾼다. 학습 콘텐츠(1항)와
   기능성 UI(3항)는 이 규칙에 영향받지 않는다.
5. **`「A · B」`식 한 줄 병기 도장 금지.** 두 언어가 한 줄에 점(·)으로 붙는 표기는 만들지 않는다.

```html
<!-- 금지 -->  <button>시작 · Start →</button>
<!-- 권장 -->  <button><b>Start</b><i>시작하기</i></button>
```

### 개정 이력

| 날짜 | 지시 | 바뀐 것 |
|---|---|---|
| (초기) | 하네스 구축 | "새 UI 문자열은 전부 `한국어 · English` 병기" |
| 2026-08-08 | 27 | 병기 폐지 → 위 5항 위계로 교체. 섹션 헤더의 uppercase 키커 규칙도 폐지(STYLE.md §4) |
| 2026-08-08 | 31 | 종이 3층 규칙과 목차 거터 규격을 계약에 편입(STYLE.md §10-1·§10-2) |
| 2026-08-22 | 34 | 4항을 레벨 조건부로 개정(A1 영어 메인 · A2+ 한국어 메인). 1·2·3·5항 무변경 |

## Shared utilities

- Audio: `import AudioDot from './cards/AudioDot.svelte';` →
  `<AudioDot text={'한국어 텍스트'} size={26} />` (speaks via TTS).
  Or `import { speak } from '../lib/tts.js'; speak('가')`.
- Learned-word state (Wordbook only):
  `import { progress } from '../lib/store.js';` — `$progress.learned` is an
  array of guess-cards; `$progress.learned.some((c) => c.word.ko === ko)`
  means the learner has met that word.

## Acceptance

- Component renders top-level (no required props unless listed in your brief).
- All interactive elements are real `<button>`s with visible focus.
- No console errors, no undefined-variable references, no missing imports.
- Long lists stay usable: your tab must not freeze with its full dataset.
