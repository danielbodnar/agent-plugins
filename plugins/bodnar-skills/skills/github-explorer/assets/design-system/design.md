# Stars Workbench — Design System

**Theme:** Quiet · **Macrostructure:** Workbench · **Accent hue:** 244 (cool blue)

A restrained, tool-grade surface for dense repository data. The system is a near-white paper, a cool blue-grey ink ramp, and a single chromatic accent. It stays out of the way: colour is spent only where it carries meaning (the accent for interaction and selection, three status hues for activity and badges), and everything else is a calibrated grey.

The source of truth is [`theme.config.ts`](./theme.config.ts), a typed and Zod-validated token set. The CSS custom properties in [`styles/hallmark/tokens.css`](./styles/hallmark/tokens.css) are compiled from it and must not be edited by hand. Components reference tokens by name; no component carries a raw colour, font, or size literal.

---

## Principles

The system holds to a few rules that explain most of the specific choices below.

Colour is earned, not decorative. The palette is mostly greys derived from a single cool hue (240) so the one chromatic accent (244) reads as genuinely meaningful when it appears. A facet is selected, a row is active, a link is live: that is what blue means here, and it does not mean anything else.

OKLCH is the only colour space. Every value is `oklch(L C H)`. This keeps the lightness ramp perceptually even, makes the light-to-dark remapping legible as a set of lightness inversions rather than a guess, and lets the status hues sit at matched chroma so none of them shouts louder than the others.

Dark mode is a remapping, not an inversion. The dark scheme is authored explicitly. Paper goes to a near-black at chroma 0.008, ink comes up to a soft off-white, and the accent *gains* lightness (52% to 72%) so it stays legible against the dark surface. Shadows get denser. None of this falls out of a filter; it is a second hand-tuned scheme.

Type is a three-face system used with discipline. Inter Tight for display, Inter for body and UI, JetBrains Mono for the technical register: repository names, counts, code, keyboard hints, badges. The mono face is the outlier and it tags exactly one kind of content, the machine-legible data, everywhere it appears.

Tokens are locked. A value that does not exist as a token does not get improvised at a call site. It gets added to `theme.config.ts`, recompiled, and then referenced. This is what keeps the marketing site, the docs, and the app visually identical without any of them sharing a stylesheet beyond this layer.

---

## Colour

### Surfaces — the paper ramp

Paper is the base. Higher numbers sit visually above the page and are used for raised panels, hover fills, and insets.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--color-paper` | `oklch(99% 0 0)` | `oklch(13% 0.008 240)` | Page base, panels, sticky headers |
| `--color-paper-2` | `oklch(96.8% 0 0)` | `oklch(16% 0.01 240)` | Inset fields, hover fills, toolbars sit on paper |
| `--color-paper-3` | `oklch(94% 0.003 240)` | `oklch(20% 0.012 240)` | Tag backgrounds, deeper insets |
| `--color-paper-4` | `oklch(91% 0.005 240)` | `oklch(25% 0.012 240)` | Strongest inset, pressed states |

### Ink — the foreground ramp

Ink is primary text. Higher numbers recede: secondary text, then tertiary labels, then the faintest metadata.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--color-ink` | `oklch(17% 0.012 240)` | `oklch(95% 0.005 240)` | Primary text, repository names |
| `--color-ink-2` | `oklch(36% 0.008 240)` | `oklch(76% 0.005 240)` | Body text, descriptions |
| `--color-ink-3` | `oklch(54% 0.005 240)` | `oklch(58% 0.008 240)` | Labels, placeholders, muted meta |
| `--color-ink-4` | `oklch(70% 0.004 240)` | `oklch(42% 0.008 240)` | Faintest text, disabled, counts |

### Lines

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--color-rule` | `oklch(89% 0.003 240)` | `oklch(26% 0.012 240)` | Hairline dividers, the default border |
| `--color-rule-2` | `oklch(82% 0.005 240)` | `oklch(34% 0.012 240)` | Stronger dividers, hover borders |

`--hairline` and `--hairline-strong` are composed shorthands (`1px solid var(--color-rule)` and `...rule-2`) for the borders that appear everywhere.

### Accent

The single chromatic voice. Used for interaction, selection, links, and the focus ring.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--color-accent` | `oklch(52% 0.17 244)` | `oklch(72% 0.15 244)` | Links, active state, primary highlight |
| `--color-accent-2` | `oklch(60% 0.16 244)` | `oklch(78% 0.14 244)` | Accent hover / secondary accent |
| `--color-accent-bg` | `oklch(96% 0.025 244)` | `oklch(28% 0.07 244)` | Tinted accent background, active chips |
| `--color-accent-bg-strong` | `oklch(92% 0.04 244)` | `oklch(34% 0.09 244)` | Pressed accent background |
| `--color-focus` | `oklch(52% 0.17 244)` | `oklch(72% 0.15 244)` | Focus-visible outline |

### Status

Three semantic hues at matched chroma. Used sparingly: activity dots, README badges, validation. Green is activity and pass, amber is warm or warning, red is danger.

| Token | Light | Dark |
| --- | --- | --- |
| `--color-success` | `oklch(56% 0.14 148)` | `oklch(70% 0.14 148)` |
| `--color-warning` | `oklch(70% 0.16 75)` | `oklch(78% 0.16 75)` |
| `--color-danger` | `oklch(55% 0.18 25)` | `oklch(70% 0.16 25)` |

### Row states

The datagrid and list lean on these for hover and selection, kept separate from the paper ramp so selection reads as an accent tint rather than just a darker grey.

| Token | Light | Dark |
| --- | --- | --- |
| `--color-row-hover` | `oklch(96.8% 0 0)` | `oklch(18% 0.01 240)` |
| `--color-row-selected` | `oklch(94% 0.025 244)` | `oklch(24% 0.05 244)` |
| `--color-row-selected-rule` | `oklch(82% 0.06 244)` | `oklch(40% 0.08 244)` |

---

## Typography

Three families, one outlier.

| Token | Stack | Role |
| --- | --- | --- |
| `--font-display` | Inter Tight, system-ui, sans-serif | Headings, brand, README titles |
| `--font-body` | Inter, system-ui, sans-serif | Body text, UI labels, descriptions |
| `--font-mono` | JetBrains Mono, ui-monospace, SF Mono, Menlo | Repository names, counts, code, kbd, badges |

The mono face is the technical register. It tags the machine-legible content: a repository's `owner/name`, star counts, file sizes, keyboard shortcuts, code blocks, and badge text. Once a kind of content is mono, every instance of it is mono.

### Type scale

Roughly a major-third progression, tuned for a dense UI where the base is below 1rem so more data fits without feeling cramped.

| Token | Value |
| --- | --- |
| `--text-xs` | 0.75rem |
| `--text-sm` | 0.8125rem |
| `--text-base` | 0.9375rem |
| `--text-lg` | 1.0625rem |
| `--text-xl` | 1.25rem |
| `--text-2xl` | 1.625rem |
| `--text-3xl` | 2.125rem |

Line height: 1.5 for body, 1.65 for README prose, tighter for display headings via negative letter-spacing (`-0.01em` to `-0.015em`).

---

## Spacing, radius, motion

A 4-pt spacing scale from `--space-1` (0.25rem) to `--space-8` (4.5rem). Radius is four steps: `--radius-sm` (0.25rem) for controls and tags, `--radius-md` (0.5rem) for cards and fields, `--radius-lg` (0.75rem) for the modal, `--radius-pill` (62.5rem) for the toast and round affordances.

Motion is two durations and one easing. `--duration-fast` (120ms) for hovers and toggles, `--duration` (200ms) for panels and the modal, both on `--ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`), a quick-out curve that feels responsive without overshoot. Everything collapses to near-zero under `prefers-reduced-motion`.

---

## Layout contracts

These are not decoration; they are the dimensions the app grid depends on, exposed as tokens so the resize handles and responsive breakpoints can read and write them.

| Token | Value | Role |
| --- | --- | --- |
| `--topbar-h` | 3.5rem | Fixed top bar height |
| `--sidebar-w` | 17.5rem | Left sidebar starting width (resizable without bounds) |
| `--list-w` | 23.75rem | Master list starting width in browse mode (resizable without bounds) |
| `--detail-w` | 25rem | Detail panel starting width (resizable without bounds) |

The resize handles mutate these properties on `:root` and persist them to `localStorage`; the bootstrap script applies saved values before first paint so there is no layout flash on reload. Because the layout tokens are expressed in rem, a drag tracks the pointer in px and converts back to rem on write, so a resized panel still scales with the reader's font-size.

The widths above are starting points, not bounds. The panels resize freely, with no minimum or maximum, so a reader can drag any pane to fill the workbench or collapse it down to nothing. The drag clamps only at zero, to keep a width from going negative and breaking the grid track. For this to work, the flexible content column carries `min-width: 0` so it can shrink all the way to zero when an adjacent pane is dragged wide; without that, the grid's default `min-width: auto` would stop the content column from yielding.

---

## Units and responsiveness

The system has one rule about units, and it is an accessibility rule as much as a stylistic one.

Type, spacing, radius, and the layout dimensions are all in rem. The root element sets `font-size: 100%` rather than a fixed pixel value, so every rem resolves against the reader's own browser font-size setting. A reader who has raised their default for legibility gets a proportionally larger interface, including the panels, without anything clipping. Hardcoding a pixel base, which is the common default, silently overrides that preference, so the system does not do it.

Borders, outlines, outline offsets, and shadow offsets stay in px on purpose. A one-pixel hairline expressed in rem can sub-pixel-round to nothing at some zoom levels, and a focus ring needs to stay crisp at every scale. These are the deliberate exception, and they are the only px values in the compiled output.

Breakpoints are expressed in em, not px. A media query written in px does not respond to the user's font-size, so a px breakpoint can strand a zoomed-in reader in the wrong layout. Em-based breakpoints shift with the reader's scale, which is the behaviour you want. The layout itself leans on intrinsically fluid mechanisms first (CSS grid with `fr` and `minmax`, `min()` clamps, percentage and viewport widths, and `auto-fill` grids), and uses the em breakpoints only for the genuine structural reflows: collapsing the resizable three-pane grid down to an overlay sidebar and a single column on narrow viewports.

Touch and pointer targets meet the WCAG 2.5.8 (AA) 24px minimum. The small interactive controls (the star button, the segmented-toggle buttons, the tree rows) carry a `min-height` floor so they stay large enough to hit even at the smallest font scale, where padding alone would render them a few pixels short.

---

## Component vocabulary

[`styles/hallmark/primitives.css`](./styles/hallmark/primitives.css) ships the reusable classes, all built on tokens and placement-independent so they work in the app, the marketing site, and the docs without modification.

Surfaces (`.surface`, `.surface-raised`, `.hairline`), buttons (`.btn` with `-primary` / `-secondary` / `.is-starred`, plus `.icon-btn` and `.star-btn`), tags and chips (`.tag`, `.tag-lang`, `.chip`), inputs (`.search-wrap`, `.search-input`, `.kbd`, `.select`), the segmented toggle (`.segmented`), the card (`.card` with `.is-selected`), the sidebar tree (`.tree-node`, `.tree-item`, carets and children with the indent guide), the datagrid (`.table` with sticky header, `.cell-name`, `.cell-num`, row hover and selection), the activity indicator (`.activity` with `.is-warm` / `.is-cold` dots), README prose (`.readme` and its descendants, plus `.readme-badge`), the toast (`.toast`), and the modal (`.modal-backdrop`, `.modal`).

---

## Usage

Import the whole system with one line. The cascade order (tokens then base then primitives) is fixed inside the barrel.

```html
<link rel="stylesheet" href="/styles/hallmark/index.css">
```

```ts
// Bun / Vite
import "@/styles/hallmark/index.css";
```

Load the three webfonts. The exact href is emitted by `buildFontsHref()` in the compiler:

```
https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Inter:wght@400;450;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap
```

Dark mode works two ways out of the box. With no attribute set, the system follows `prefers-color-scheme`. Setting `data-theme="dark"` or `data-theme="light"` on `<html>` forces a scheme and overrides the system preference. The auto-dark block is written to defer to a manual `light` override so the toggle always wins.

### Changing a token

Edit the value in `theme.config.ts`, then recompile:

```bash
bun run styles/hallmark/build-tokens.ts
```

The Zod schema validates every colour as a well-formed OKLCH string at import time, so a typo fails the build rather than shipping a broken stylesheet. Never edit `tokens.css` directly; it is generated.

---

## Exports

The same locked tokens are available in three portable formats for other toolchains, all under `styles/hallmark/`:

- `tokens.json` — W3C DTCG format for Style Dictionary, Token Studio, or Cobalt.
- `tailwind.theme.css` — a Tailwind v4 `@theme` block that generates `bg-paper`, `text-ink`, `font-display`, and the rest.
- `shadcn.css` — shadcn/ui variables with light and dark, mapping accent to primary and paper-3 to secondary.

All four (including `tokens.css`) derive from `theme.config.ts` and carry identical values. Pick the one your project consumes; do not maintain values in more than one place.
