# Phase 5.5: QC Reviewer

## Objective

Adversarial second pass. You just built this thing. Now pretend you
did not, and try to find reasons it should not ship.

## Inputs

- `extracted.json`
- `brand-voice.md`
- `design-plan.md`
- `dist/index.html`
- `dist/qa/*.png`, `*-a11y.json`, `*-perf.json`
- `dist/qa/original.png`
- `radar-scan.json`

## Actions

Write `./leads/{slug}/qc/reviewer-report.md` with five sections
(factual, voice, visual, compliance, technical), then a final JSON
verdict block.

### 1. Factual accuracy (all items pass/fail)

- [ ] Business name in HTML matches `extracted.json.business_name`
      exactly, byte-for-byte
- [ ] Phone number in HTML matches (handle formatting variance:
      strip non-digits before comparing)
- [ ] Address, if present in HTML, matches extracted
- [ ] Every service listed in HTML has a corresponding entry in
      `extracted.services` (no invented services)
- [ ] Every testimonial in HTML is verbatim from `extracted.testimonials`
      (ok to trim to first sentence if too long, but no rewording)

Any fail → overall `factual_accuracy: fail`.

### 2. Voice match (0-5)

Read three sample phrases from `brand-voice.md`. Then read the hero
headline, the subhead, and one body paragraph from `dist/index.html`.

Score:
- **5**: Same register, vocabulary overlaps, you could insert the new
  copy into their existing site and no one would notice the seam
- **4**: Same register, distinct but compatible voice
- **3**: Register matches but some phrases feel generic
- **2**: Register drift (too casual / too formal relative to source)
- **1**: Doesn't sound like them at all
- **0**: Actively contradicts their voice

Must be >= 3 to ship.

Quote specific phrases as evidence. "The headline reads [X] and their
about page uses [Y], which share [specific quality]."

### 3. Visual quality (0-5)

Compare `dist/qa/1280x800.png` side-by-side with `dist/qa/original.png`.

Score:
- **5**: Obviously better to a non-designer; every element is improved
- **4**: Clearly better overall; one or two areas could be stronger
- **3**: Better in aggregate; mixed wins and losses
- **2**: Similar quality; redesign does not earn the ask
- **1**: Worse; original has elements the redesign lost
- **0**: Catastrophic visual regression

Must be >= 3 to ship.

Anchor to specifics: hierarchy, whitespace, typography, color,
alignment, photography use.

### 4. Compliance checks (all pass/fail)

Run `bun scripts/compliance-check.ts ./leads/{slug}/dist/index.html`
which checks:

- [ ] No em-dashes anywhere in HTML
- [ ] Footer watermark present with byte-exact match (including
      `daniel@bitbuilder.io`)
- [ ] No `unsplash.com`, `pexels.com`, `pixabay.com`, `istockphoto.com`,
      or other stock CDN URLs
- [ ] No Python code (no `def `, `import `, `print(` in any script
      tag content)
- [ ] No franchise/chain trademarks (regex against blocklist:
      State Farm, RE/MAX, Keller Williams, McDonalds, Subway, Hertz,
      Avis, Allstate, Farmers, Progressive, GEICO, Liberty Mutual,
      AAA, Nationwide, Travelers, etc.) UNLESS the business is itself
      that franchise (verify via extracted business name)
- [ ] All three CTA anchors present with correct hrefs
- [ ] Beacon script loaded at `src="/beacon.js"`
- [ ] Exactly one `<h1>` element
- [ ] No skipped heading levels (no `<h3>` without a `<h2>` before it)

Any fail → overall `compliance: fail`.

### 5. Technical QA (all pass/fail)

Aggregate from `dist/qa/*.json`:

- [ ] Zero `critical` a11y issues across all viewports
- [ ] Zero `serious` a11y issues across all viewports (warn if any,
      fail if 3+)
- [ ] Mobile (375w) LCP <= 2.5s
- [ ] Mobile CLS <= 0.1
- [ ] Primary CTA button passes AA contrast check

Any fail → overall `technical_qa: fail`.

### 6. Final verdict

Append a JSON block at the very end of the report:

```json
{
  "factual_accuracy": "pass",
  "voice_match_score": 4,
  "visual_quality_score": 4,
  "compliance": "pass",
  "technical_qa": "pass",
  "overall_verdict": "ship",
  "failures": []
}
```

`overall_verdict` is one of:

- `ship`: all pass/fail items pass AND both scores >= 3
- `revise`: at least one item failed but auto-fixable; list specific
  fixes in `failures`
- `halt`: structural failure (e.g., voice score 0, visual score 1,
  invented services)

## Outputs

- `./leads/{slug}/qc/reviewer-report.md`

## Acceptance criteria

- Report file exists with all five sections filled in
- Final JSON verdict block is parseable
- If `verdict != ship`, STOP the run. Do not proceed to Phase 6.

## On the psychology of this phase

You are the agent that produced Phase 4's output. This phase is where
you pretend you are not that agent. The temptation to rubber-stamp
your own work is real. Anchor every score to quoted evidence from
files. If you cannot cite a specific phrase, image, or measurement,
you are guessing; fix the rubric application, not the score.
