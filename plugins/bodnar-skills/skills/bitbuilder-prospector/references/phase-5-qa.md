# Phase 5: QA

## Objective

Per-viewport screenshots, accessibility audit, and performance trace.
Fix anything that fails the technical thresholds before continuing.

## Inputs

- `./leads/{slug}/dist/` (served locally)

## Actions

Serve `dist/` on a random local port via Bun:

```ts
// scripts/serve.ts
const server = Bun.serve({
  port: 0, // random
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    return new Response(Bun.file('./dist' + path));
  }
});
console.log(`http://localhost:${server.port}`);
```

### If chrome-devtools-mcp is available

For each viewport in `[{w:375,h:812}, {w:768,h:1024}, {w:1280,h:800}, {w:1920,h:1080}]`:

1. Full-page screenshot → `dist/qa/{w}x{h}.png`
2. Accessibility audit → `dist/qa/{w}x{h}-a11y.json`
3. Performance trace → `dist/qa/{w}x{h}-perf.json`
   - Extract `LCP`, `CLS`, `total_weight_bytes`, `request_count`

Plus: screenshot the original `TARGET_URL` at 1280x800 →
`dist/qa/original.png`.

### Fallback: Cloudflare Browser Rendering

If chrome-devtools-mcp is unavailable, use
`clooudflare-browser-run:get_url_screenshot` for screenshots only.
A11y and perf data are skipped; Phase 5.5 must rely on visual
comparison alone in that case. Log to `decisions.log`.

## Auto-fix thresholds

After collecting data, check:

| Condition | Action |
|-----------|--------|
| Any `critical` a11y issue | Fix and re-run Phase 5 before checkpoint |
| Any `serious` a11y issue | Fix and re-run |
| Mobile LCP > 2.5s | Inspect page weight; reduce hero image if dominant |
| Mobile CLS > 0.1 | Add explicit width/height to images causing shift |

Do not checkpoint with known critical or serious issues. Phase 5.5
will fail the run anyway.

## Outputs

- `./leads/{slug}/dist/qa/*.png`
- `./leads/{slug}/dist/qa/*-a11y.json`
- `./leads/{slug}/dist/qa/*-perf.json`
- Updated `state.json` with QA summary

## Acceptance criteria

- Screenshots captured for all four viewports (if tools available)
- `dist/qa/original.png` captured from live target
- Zero critical a11y issues across all viewports
- Mobile LCP <= 2.5s
- Mobile CLS <= 0.1
