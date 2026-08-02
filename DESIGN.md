# 한입 Design System

## 1. Atmosphere & Identity

한입 is a compact, warm microlearning app that feels like opening a small study card on a rice-paper desk. The signature is tactile progress: gochujang orange asks for action, restrained gold marks learned material, and celadon confirms success. The interface stays narrow and readable so Korean and English can be compared without visual noise.

Design read: an existing consumer learning app for Korean learners, preserving its warm tactile identity with restrained, functional interactions. `DESIGN_VARIANCE: 3`, `MOTION_INTENSITY: 3`, `VISUAL_DENSITY: 5`.

## 2. Color

### Palette

| Role | Token | Value | Usage |
|---|---|---:|---|
| Ground | `--bg` | `#FAF6EE` | Rice-white page background |
| Text primary | `--ink` | `#26221C` | Headlines and body |
| Text secondary | `--ink-2` | `#5E5346` | Supporting copy |
| Text tertiary | `--ink-3` | `#8C7F6B` | Metadata and disabled text |
| Surface | `--card` | `#FFFFFF` | Cards, fields, fixed navigation |
| Surface muted | `--wash` | `#F2E9DA` | Selected and inset areas |
| Border default | `--line` | `#E5DCC8` | Cards and dividers |
| Border strong | `--line-2` | `#D6C9AE` | Focused and selected outlines |
| Action | `--accent` | `#E4572E` | Primary action and focus |
| Action strong | `--accent-deep` | `#C13D1B` | Pressed action and action text |
| Action soft | `--accent-soft` | `#FBE7DD` | Selected filter and quiet action |
| Progress | `--gold` | `#C9A227` | Learned state and target highlight |
| Progress soft | `--gold-soft` | `rgba(201, 162, 39, 0.16)` | Progress background |
| Success | `--good` | `#4E8D6E` | Correct outline |
| Success strong | `--good-deep` | `#2E6B4E` | Correct text |
| Success soft | `--good-soft` | `#E2EFE6` | Correct background |
| Error | `--bad` | `#C4452E` | Incorrect state and error text |
| Primary action text | `--on-accent` | `#FFF6EF` | Text on orange controls |
| Chat canvas | `--chat-canvas` | `#EFE6D4` | Dialogue background |
| Chat self | `--chat-self` | `#FCE879` | Learner message bubble |
| Progress track | `--progress-track` | `#EFE4CD` | Bite progress track |

### Rules

- Orange is for actions and focus, not decoration.
- Gold is reserved for progress and the exact Korean target being learned.
- Celadon communicates correctness and completion confirmation.
- The shipped identity is a fixed light theme. A dark theme is not part of the current product contract.

## 3. Typography

### Font stack

- Primary: `--sans`, Pretendard Variable with Korean system fallbacks.
- Hanja display exception: Noto Serif KR with platform CJK serif fallbacks.
- No additional webfont request is required for first paint.

### Scale

| Token | Size | Weight range | Usage |
|---|---:|---:|---|
| `--type-overline` | `11px` | 800-850 | Section labels |
| `--type-caption` | `12px` | 650-850 | Metadata and compact badges |
| `--type-small` | `12.5px` | 650-850 | Hints and secondary labels |
| `--type-body-sm` | `13.5px` | 650-800 | Dense rows and supporting copy |
| `--type-body` | `15px` | 650-800 | Default interactive copy |
| `--type-title-sm` | `15.5px` | 750-850 | Chapter titles |
| `--type-title` | `18px` | 750-850 | Card questions and phrases |
| `--type-heading` | `22px` | 800-850 | Detail headings |
| `--type-display` | `clamp(40px, 12vw, 76px)` | 850-900 | One focal Korean word |

Legacy lesson cards contain intermediate half-step sizes from `10.5px` through `34px`. New components use the canonical tokens above; consolidation of older card typography is outside the current migration orders.

## 4. Spacing & Layout

### Base and tokens

All spacing intent uses a 4px base.

| Token | Value | Usage |
|---|---:|---|
| `--space-1` | `4px` | Tight inline space |
| `--space-2` | `8px` | Compact list gap |
| `--space-3` | `12px` | Row and label gap |
| `--space-4` | `16px` | Card inset |
| `--space-5` | `20px` | Page gutter |
| `--space-6` | `24px` | Section gap |
| `--space-8` | `32px` | Page intro spacing |
| `--space-10` | `40px` | Page end spacing |

- Primary content width: `480px` centered.
- Mobile gutter: `20px`; focused home gutter: `24px`.
- Breakpoint checks: `375px`, `768px`, and `1280px`. The learning column remains narrow at larger widths.
- Primary interactive targets are at least `44px` high.
- Long Korean labels use `word-break: keep-all`; secondary single-line labels may truncate only when the full title is available in the same row or expanded state.

## 5. Components

### Surface Card

- **Structure**: semantic section or group with `--card`, `--line`, `--r-card`, and `--shadow-1`.
- **Variants**: plain, inset wash, success, error.
- **Spacing**: `--space-3` to `--space-5`.
- **States**: default, hover border/background, focused child control, empty message, error message.
- **Accessibility**: card never replaces a semantic button or region.
- **Motion**: none; interactive children own feedback.
- **Layout**: stack.

### Action Button

- **Structure**: native `button` with a single-line label.
- **Variants**: primary orange, quiet card, ghost outline, chip.
- **Spacing**: minimum `44px` target, horizontal inset from `--space-3` or `--space-4`.
- **States**: default, hover, active translation/scale, focus-visible outline, disabled opacity, loading text, success and error colors where relevant.
- **Accessibility**: native disabled state and visible `:focus-visible` ring.
- **Motion**: micro feedback with `--duration-micro` and `--ease`; reduced motion collapses duration.
- **Layout**: cluster or full-width stack.

### Search Field

- **Structure**: labelled native `input[type="search"]`.
- **Variants**: empty, populated, no-result context.
- **Spacing**: `--space-3` vertical rhythm and `--space-4` horizontal inset.
- **States**: default wash, hover, focus card surface, populated, disabled.
- **Accessibility**: explicit bilingual `aria-label`; results update without stealing focus.
- **Motion**: color and border only.
- **Layout**: full-width stack item.

### Level Accordion

- **Structure**: section, native trigger button, progress badge, chevron, labelled content region, chapter rows.
- **Variants**: closed, open, complete, search-forced open, empty.
- **Spacing**: group gap `--space-3`, header inset `--space-4`, chapter gap `--space-2`.
- **States**: default, hover, active, focus, open, complete, search-forced, no results.
- **Accessibility**: trigger has `aria-expanded` and `aria-controls`; content region has `aria-labelledby`; search-forced headers are disabled while results are expanded.
- **Motion**: chevron rotation and content opacity/translation only, adapted from the beui.dev `bouncy-accordion` mechanism; no motion when reduced motion is requested.
- **Layout**: accordion stack. No internal scroll owner.

### Chapter Row

- **Structure**: native trigger, numbered completion marker, title and goal, bite progress marks; expanded bite buttons preserve the `onPlay(chapter, bite)` contract.
- **Variants**: incomplete, complete, open.
- **Spacing**: header gap `--space-3`; bite row inset `--space-4`.
- **States**: default, hover, active, focus, open, complete.
- **Accessibility**: `aria-expanded` and a labelled bite region; progress marks are decorative because the text badge carries the count.
- **Motion**: same disclosure treatment as Level Accordion.
- **Layout**: stack.

### Filter Chip

- **Structure**: native button inside a labelled group.
- **Variants**: off, on, learned, level.
- **States**: default, hover, active, focus, selected with `aria-pressed`.
- **Accessibility**: minimum `44px` target and text label.
- **Motion**: color and border only.
- **Layout**: wrapping cluster.

### Audio Button

- **Structure**: circular native button with the existing speaker icon.
- **Variants**: standard sizes from 22px to 44px where paired with larger parent targets.
- **States**: default, hover, active, focus.
- **Accessibility**: bilingual pronunciation label; the parent row supplies sufficient target size where the icon is compact.
- **Motion**: color only.
- **Layout**: inline cluster item.

Primitive showcase: `/?showcase=shelf` renders Search Field, Level Accordion, Chapter Row, progress, completion, open, empty, and reduced-motion-compatible states for mobile, tablet, and desktop QA.

## 6. Motion & Interaction

| Token | Value | Usage |
|---|---|---|
| `--duration-press` | `90ms` | Physical button press |
| `--duration-micro` | `150ms` | Hover, color, focus-adjacent feedback |
| `--duration-standard` | `240ms` | Disclosure content and chevron |
| `--ease` | `cubic-bezier(0.22, 0.61, 0.36, 1)` | Existing tactile ease |

- Motion only communicates press, selection, progress, or disclosure state.
- New animations use transform and opacity only.
- All animation durations collapse under `prefers-reduced-motion: reduce`.
- Interactions remain interruptible because state changes are direct and do not queue.

## 7. Depth & Surface

Strategy: mixed, following the existing product.

| Level | Token | Usage |
|---|---|---|
| Resting | `--shadow-1` plus `--line` | Cards, grouped lists, accordions |
| Elevated | `--shadow-2` | Player overlays and emphasis surfaces |
| Inset | `--wash` plus `--line` | Inputs, selected areas, builders |

Radii follow a documented hierarchy: cards `18-20px`, controls `14-16px`, compact badges and progress marks use full pills.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- Target WCAG 2.2 AA with 4.5:1 body contrast and 3:1 large text and component boundaries.
- Every interactive element is keyboard reachable and has a visible focus state.
- Native buttons and inputs are preferred over clickable generic elements.
- Disclosure state is exposed with `aria-expanded`, `aria-controls`, and labelled regions.
- Primary content has no horizontal overflow at `375px`.
- Korean and English remain readable under 200% text zoom and long-content stress.

### Accepted debt

| Item | Location | Why accepted | Owner / Exit |
|---|---|---|---|
| Fixed light theme | Whole app | Existing 한입 identity and current migration scope are light-only | Revisit only in a separately approved theme order |
| Intermediate legacy type sizes | Existing lesson and reference components | Preserving shipped hierarchy avoids a broad redesign during content migration | Consolidate after Orders 06-12 if requested |
| Existing navigation emoji | `src/App.svelte`, guide entry | Recognizable shipped navigation assets; no new emoji are introduced by shelf work | Replace only with a full icon-system migration |
