# Design System: Quiet

The visual language for everything the project renders. The full specification ships in `assets/design-system/design.md`; this reference is the working guide for applying it.

## The idea in one paragraph

Quiet is a restrained, tool-grade surface for dense repository data. It is a near-white paper, a cool blue-grey ink ramp, and a single chromatic accent at hue 244. Colour is spent only where it carries meaning, so the one accent reads as genuinely significant when it appears: a facet is selected, a row is active, a link is live. Everything else is a calibrated grey. The whole palette is OKLCH so the lightness ramp stays perceptually even and the light-to-dark remapping is legible as a set of deliberate lightness moves rather than a guess.

## The single source of truth

`assets/design-system/theme.config.ts` is the typed, Zod-validated token source. Every colour, font, size, radius, motion value, and layout dimension is declared there once. The compiler `assets/design-system/styles/hallmark/build-tokens.ts` is a pure function from that config to `tokens.css`. Components reference the compiled custom properties by name.

To use the system in a project, copy `assets/design-system/` in and import the CSS:

```ts
import "@/styles/hallmark/index.css";
```

The barrel chains the layer in the fixed order tokens, then base, then primitives. Load the three webfonts with the href that `buildFontsHref()` emits:

```
https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Inter:wght@400;450;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap
```

## The locked-token rule

This is the rule that matters most. Once the design system defines a value, the UI references it by name (`var(--color-accent)`, `font-family: var(--font-display)`), never by a raw literal. If a component needs a value that does not exist as a token, the value is added to `theme.config.ts` and the tokens are recompiled, and only then is it referenced. Inline OKLCH, hex, or `rgb()` values, and any `font-family` that bypasses the token block, are not allowed.

The reason is concrete: the app, the marketing site, and the docs stay visually identical without sharing any stylesheet beyond this token layer. A hardcoded value somewhere breaks that guarantee silently. To change a value globally, edit the config and recompile by running the `build-tokens.ts` compiler under the project's TypeScript runtime. The bundled compiler currently uses Bun-specific file APIs, so as shipped it runs with `bun run styles/hallmark/build-tokens.ts`; if the project uses a different runtime, the compiler's two functions (`buildTokensCss()` and `buildFontsHref()`) are plain and portable, and the small amount of file-writing glue at the bottom can be adjusted to match. The runtime is the owner's choice; see `references/stack-options.md`.

The schema validates every colour as a well-formed OKLCH string at import time, so a typo fails the build rather than shipping a broken stylesheet.

## Colour tokens

Surfaces are a paper ramp: `--color-paper` is the base, and `--color-paper-2` through `--color-paper-4` sit progressively "above" it for hover fills, insets, and tags. Foreground is an ink ramp: `--color-ink` is primary text, and `--color-ink-2` through `--color-ink-4` recede into secondary text, labels, and faint metadata. Lines are `--color-rule` (the default hairline border) and `--color-rule-2` (stronger dividers and hover borders); the composed shorthands `--hairline` and `--hairline-strong` exist because those borders appear everywhere.

The accent family is `--color-accent` (links, active state), `--color-accent-2` (accent hover), `--color-accent-bg` (tinted background for active chips and facets), and `--color-accent-bg-strong` (pressed). Status is three hues at matched chroma: `--color-success` (green, activity and pass), `--color-warning` (amber, warm or warning), `--color-danger` (red). Row states are kept separate from the paper ramp so selection reads as an accent tint: `--color-row-hover`, `--color-row-selected`, `--color-row-selected-rule`.

Every token has a hand-tuned dark value. Paper drops to a near-black at low chroma, ink rises to a soft off-white, and the accent gains lightness (from 52% to 72%) so it stays legible on the dark surface. The exact values are in `design.md` and `tokens.css`.

## Typography

Three families, used with discipline. `--font-display` (Inter Tight) for headings and brand, `--font-body` (Inter) for body and UI, `--font-mono` (JetBrains Mono) for the technical register. The mono face is the outlier: it tags the machine-legible content (a repository's `owner/name`, star counts, file sizes, keyboard hints, code, badge text) and once a kind of content is mono, every instance of it is mono.

The type scale runs `--text-xs` (0.75rem) to `--text-3xl` (2.125rem) in a roughly major-third progression, with a base below 1rem because the UI is dense and more data should fit without feeling cramped. Line height is 1.5 for body, 1.65 for README prose, and tighter for display via negative letter-spacing.

## Spacing, radius, motion

Spacing is a 4-pt scale from `--space-1` (0.25rem) to `--space-8` (4.5rem). Radius is `--radius-sm` (0.25rem) for controls and tags, `--radius-md` (0.5rem) for cards and fields, `--radius-lg` (0.75rem) for the modal, `--radius-pill` for round affordances. Motion is two durations (`--duration-fast` 120ms for hovers and toggles, `--duration` 200ms for panels) on one easing (`--ease-out`, a quick-out curve), and everything collapses to near-zero under `prefers-reduced-motion`.

## Layout contracts

The application grid depends on dimensions exposed as tokens so the resize handles and breakpoints can read and write them: `--topbar-h`, `--sidebar-w`, `--list-w` (the master list in browse mode), and `--detail-w`. These are starting widths, not bounds: the panels resize freely with no minimum or maximum, so a reader can drag any pane to fill the workbench or collapse it to nothing. The drag clamps only at zero so a width cannot go negative, and the flexible content column carries `min-width: 0` so it can yield all the way down when an adjacent pane is dragged wide. The resize handles mutate these on `:root` and persist them; a bootstrap script applies saved values before first paint so there is no layout flash.

## Units and accessibility

The system follows one unit rule, for accessibility as much as style. Type, spacing, radius, and the layout dimensions are in rem, and the root sets `font-size: 100%` rather than a pixel base, so the whole interface scales with the reader's browser font-size. Borders, outlines, outline offsets, and shadow offsets are the deliberate exception and stay in px, because a 1px hairline in rem can sub-pixel-round away and a focus ring must stay crisp. When you add CSS, follow this split: dimensional values in rem, hairlines and rings in px.

Breakpoints are in em, not px, so they shift with the reader's font-size rather than stranding a zoomed-in reader in the wrong layout. Reach for intrinsically fluid mechanisms first (grid with `fr` and `minmax`, `min()` clamps, percentage and viewport units, `auto-fill` grids) and use an em breakpoint only for a genuine structural reflow, such as collapsing the three-pane grid to an overlay sidebar on narrow viewports. Do not introduce fixed-px breakpoints or fixed-px widths for responsive structure.

Interactive controls meet the WCAG 2.5.8 (AA) 24px minimum target size; the small ones carry a `min-height` floor so they stay hittable at the smallest font scale. Do not strip focus indication with a bare `outline: none`; if you must remove the default outline for pointer focus, scope it to `:focus:not(:focus-visible)` so keyboard focus keeps a visible ring.

## Component vocabulary

`assets/design-system/styles/hallmark/primitives.css` ships the reusable, placement-independent classes: surfaces, buttons (`.btn` with `-primary`/`-secondary`/`.is-starred`, plus `.icon-btn` and `.star-btn`), tags and chips, inputs and the search field, the segmented toggle, the card, the sidebar tree, the datagrid with sticky header and row states, the activity indicator, README prose with badges, the toast, and the modal. Reuse these before writing new component CSS.

## Dark mode

Works two ways out of the box. With no attribute set, the system follows `prefers-color-scheme`. Setting `data-theme="dark"` or `data-theme="light"` on the root element forces a scheme; the auto-dark block is written to defer to a manual `light` override so the toggle always wins. Persist the choice to `localStorage` and apply it in a head script before paint.

## Portable exports

The same locked tokens are available for other toolchains under `styles/hallmark/`: `tokens.json` (W3C DTCG), `tailwind.theme.css` (Tailwind v4 `@theme`), and `shadcn.css` (shadcn/ui variables, light and dark). All derive from `theme.config.ts` and carry identical values. If the palette is expected to change often, extend `build-tokens.ts` to emit all of these so they cannot drift; otherwise keep the config as the one place values live.
