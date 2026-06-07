# Phase 2: Extract

## Objective

Convert crawl output into structured content artifacts that Phase 3
can plan against and Phase 4 can build against. Read-only on
`mirror/` and `rendered/`.

## Inputs

- `./leads/{slug}/mirror/**/*.html`
- `./leads/{slug}/rendered/**/*.html` (if present)
- `./leads/{slug}/radar-scan.json`

## Actions

1. Enumerate every HTML file under `mirror/` and `rendered/`.
2. Parse each with a lightweight HTML parser (e.g., `cheerio` via Bun,
   or `DOMParser` from `linkedom`). Never shell out to Python.
3. Aggregate across pages to produce `extracted.json`.
4. Enumerate image files and score them to produce `inventory.json`.
5. Analyze voice and write `brand-voice.md`.
6. Write the redesign spec at `build-brief.md`.

## `extracted.json` schema

```json
{
  "business_name": "string",
  "tagline": "string | null",
  "address": "string | null",
  "phone": "string | null",
  "email": "string | null",
  "hours": { "mon": "...", "tue": "...", ... } | null,
  "services": [ { "name": "...", "description": "..." } ],
  "about": "string (<= 400 chars, their words)",
  "testimonials": [ { "quote": "...", "attribution": "..." } ],
  "socials": { "facebook": "...", "instagram": "...", "linkedin": "..." },
  "colors": { "primary": "#hex", "accent": "#hex", "bg": "#hex", "text": "#hex" },
  "logo": "path/to/best-logo.png | null",
  "photography_style": "portraits | stock | none | mixed",
  "pages_seen": ["/", "/about", "/services", ...]
}
```

Rules:

- `business_name` comes from the most specific source available: the
  `<title>` of the homepage, a prominent `<h1>`, or the logo's alt
  text. Prefer shorter forms ("Neal & Neal Insurance" over
  "Neal & Neal Insurance Agency, Inc.") unless the full legal name is
  the only branded form.
- `phone` and `email` extracted from `tel:` and `mailto:` hrefs first,
  then regex fallback on visible text.
- `services` extracted from nav, repeated card sections, `<h2>`/`<h3>`
  headings on service pages. Use their exact wording for the name.
  Descriptions under 120 chars; if theirs is longer, quote their
  opening sentence.
- `about` taken from an "About" page if present, otherwise from the
  homepage body. Stick to their words. Under 400 chars.
- `testimonials` verbatim with attribution. If anonymous in source,
  set attribution to `null` (not "Anonymous").
- `colors`: scan every linked CSS file under `mirror/` and every
  inline `<style>` for the most frequent hex codes on `color`,
  `background`, and `background-color` declarations. If CSS parsing
  fails, sample dominant colors from the logo PNG via a lightweight
  color quantizer.
- `logo`: prefer SVG, then transparent PNG, then JPEG. If multiple
  sizes of the same logo, pick the largest.

## `inventory.json` schema

Array of usable content images (exclude sprites, 32x32 icons,
decorative bullets, and duplicate logos):

```json
[
  {
    "path": "mirror/wp-content/uploads/2022/01/team.jpg",
    "width": 1600,
    "height": 1067,
    "subject_guess": "portrait | storefront | product | stock | other",
    "quality_1_to_5": 4,
    "used_on_pages": ["/", "/about"]
  }
]
```

Quality scoring is subjective; use the rubric:
- 5: Original high-resolution (>= 1600px) professional photography
- 4: Original mid-resolution (>= 1000px) good composition
- 3: Original low-resolution or stock photography obviously matched
- 2: Visibly dated or low-quality original
- 1: Do not use (blurry, tiny, ugly)

`subject_guess: "stock"` is flag-worthy; Phase 3 decides whether to
replace or keep.

## `brand-voice.md` structure

Three paragraphs:

1. **Register and formality.** How casual or formal is the copy?
   Quote one short phrase.
2. **Personality markers.** Do they use humor? Are they warm or
   corporate? Quote one short phrase.
3. **Vocabulary and distinctives.** Any industry jargon? Any
   signature phrases that show up repeatedly? Quote one short phrase.

Total under 300 words. The goal is to give Phase 3 enough grounding to
write a headline in their voice.

## `build-brief.md` structure

200-300 words:

- Business type and target customer
- The 3-5 sections the redesign needs (always: hero, services, about,
  contact; plus optional testimonials, hours, coverage area)
- Tone target (formal / warm / brisk / etc.)
- Any content gaps that will need filler (e.g., "no testimonials
  surfaced, will use CSS pattern in that slot instead")

## Outputs

- `./leads/{slug}/extracted.json`
- `./leads/{slug}/inventory.json`
- `./leads/{slug}/brand-voice.md`
- `./leads/{slug}/build-brief.md`

## Acceptance criteria

- `extracted.json.business_name` is non-null
- `extracted.json.phone` is non-null
- At least one service in `extracted.json.services`
- At least one image in `inventory.json` with quality >= 3 (or the
  brief explicitly notes "no imagery, using gradients")
- `brand-voice.md` contains at least three quoted phrases

## Failure modes

| Failure | Response |
|---------|----------|
| `business_name` cannot be determined | Halt, ask Daniel |
| No phone anywhere | Halt, ask Daniel (likely a bad target) |
| All images quality < 3 | Continue, note in brief that Phase 4 uses fallbacks |
