# Phase 4: Build

## Objective

Produce `dist/index.html`, `dist/beacon.js`, and `dist/og-image.png`
by mechanically executing the design plan. Taste decisions are
already made; Phase 4 is craft.

## Inputs

- `design-plan.md`
- `extracted.json`
- `inventory.json`
- Any logo / photo file paths referenced from `mirror/`

## Actions

### 1. Generate `dist/index.html`

Start from `templates/index.html.tmpl`. Fill in every `{{PLACEHOLDER}}`
by reading the design plan.

Hard constraints (must all hold):

- Tailwind via `https://cdn.tailwindcss.com`
- Google Fonts via `<link>` in `<head>`
- No React, Vue, Svelte, or build step
- One `<h1>`, and only one. All other headings step down correctly.
- Semantic `<header>`, `<main>`, `<section>`, `<footer>`
- AA contrast verified on every text-on-background pair used
- Responsive at 375, 768, 1280, 1920 viewport widths
- Sticky header includes: name, tap-to-call phone (`tel:`), primary CTA
- CTA anchors: `href="/cta/purchase"`, `href="/cta/schedule"`,
  `href="/cta/extend"`. These map to Worker routes in Phase 6; in
  preview they simply navigate there (Phase 6 attaches behavior).
- Footer watermark, byte-exact:
  ```
  Design concept prepared by BitBuilder Cloud. Not affiliated with {BUSINESS_NAME}. Feedback: daniel@bitbuilder.io
  ```
- No `unsplash.com`, `pexels.com`, or any stock-photo CDN URL
- No `<iframe>` to third-party services
- No em-dashes in any copy
- `<script src="/beacon.js" defer></script>` at end of `<body>`

Inline scripts allowed for:
- Mobile nav toggle
- Smooth scroll for same-page anchors

### 2. Generate `dist/beacon.js`

Copy from `templates/beacon.js.tmpl`. Fill in the `SLUG` constant.

The beacon:
- Tracks cumulative dwell time while the tab is visible (pause on
  `visibilitychange` → `hidden`)
- Tracks max scroll depth as integer percentage of document height
- POSTs JSON to `/_beacon` every 10 seconds with
  `{ slug, dwell_ms, scroll_pct }`
- On `visibilitychange` → `hidden`, `pagehide`, and `beforeunload`,
  uses `navigator.sendBeacon` to send one final update
- Size budget: under 2KB minified (verify with `wc -c` after any
  tweaks)
- No dependencies

### 3. Generate `dist/og-image.png`

1200x630 PNG. Business name + primary headline on a branded background.

Use Bun + `satori` + `@resvg/resvg-js`:

```ts
// scripts/og.ts (or inline)
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
// render JSX-like template → SVG → PNG
```

Upload the result to R2 at `og-images/{slug}.png`.

If `satori` is not available in the environment, log to
`decisions.log` and skip. Phase 5 and later phases do not depend on
og-image.

### 4. Local verification before checkpoint

Serve `./leads/{slug}/dist/` on a random port via a tiny Bun static
server (`Bun.serve`). Open in a headless browser (via
`cloudflare-browser-run:get_url_screenshot` or chrome-devtools-mcp)
and confirm:

- Page loads without 404s for fonts, CSS CDN, or images
- Mobile viewport (375px) has no horizontal scroll
- All three CTA anchors are present and click-targetable

## Outputs

- `./leads/{slug}/dist/index.html`
- `./leads/{slug}/dist/beacon.js`
- `./leads/{slug}/dist/og-image.png` (if satori available)
- Updated `state.json`

## Acceptance criteria

- `index.html` passes the regex compliance check
  (`scripts/compliance-check.ts`):
  - Zero em-dashes
  - Watermark present byte-exact
  - No stock-photo CDN URLs
  - No Python syntax accidentally present
  - Exactly one `<h1>`
- `beacon.js` under 2KB
- Page loads in local smoke test

## Writing rules for generated copy

- No em-dashes
- No superlatives
- No generic marketing openers
- Use their phrasing where possible, verbatim
- Numbers over adjectives
