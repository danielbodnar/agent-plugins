# Phase 3: Design plan

## Objective

Before any HTML is written, decide the shape of the redesign. Write a
plan document that Phase 4 executes mechanically. This is the phase
where taste lives; Phase 4 is mostly transcription.

## Inputs

- `extracted.json`
- `inventory.json`
- `brand-voice.md`
- `build-brief.md`
- `radar-scan.json` (for reference, not direct input)

## Actions

Produce `design-plan.md` with these sections.

### Hero

- **Primary headline** (<= 10 words, in their voice). Anchor to a
  specific phrase from `brand-voice.md` if possible.
- **Alternate headline** (<= 10 words). Meaningfully different tone or
  angle so Daniel has a second option.
- **Subhead** (<= 20 words). States what they do, for whom, and what
  makes them choose-able.
- **Primary CTA text** (2-4 words). Should map to one of `Get a quote`,
  `Schedule a call`, `Call now`, or similar verb-object.

### Palette

Five hex values:

- `primary`: their brand color, refined if dated (e.g., if their
  existing brown is muddy, shift hue slightly while keeping
  recognizable family). Call this out explicitly in the plan.
- `accent`: a complementary color for highlights and secondary CTAs.
- `bg`: near-white, not pure `#fff`. Warm or cool depending on primary.
- `text`: near-black, not pure `#000`. At least 12:1 contrast on `bg`.
- `muted`: for subtext, dividers, captions.

### Typography

- **Headline font**: one serif Google Font. Include the exact
  `<link>` URL.
- **Body font**: one sans-serif Google Font. Include the exact
  `<link>` URL.
- Default choices that work well:
  - Headline: `Playfair Display`, `Fraunces`, `DM Serif Display`,
    `Lora`, `Crimson Pro`
  - Body: `Inter`, `Manrope`, `DM Sans`, `Work Sans`, `Nunito Sans`

If the brand voice is "warm / family / personal" prefer Fraunces or
Lora headlines with Nunito Sans body. If it's "authoritative /
professional" prefer Playfair Display or Crimson Pro with Inter body.

### Section order

A numbered list. For each section, one sentence describing what's in
it and which images from `inventory.json` it uses.

Default order for a service business:

1. Sticky header (logo, nav, phone, primary CTA)
2. Hero (headline, subhead, CTA, optional hero image)
3. Services (3-6 cards with icons or small images)
4. About (portrait + copy, or CSS pattern + copy)
5. Testimonials (if `extracted.testimonials` is non-empty)
6. Coverage area or hours (if applicable to business type)
7. Contact + map
8. Footer (with watermark)

### Image plan

For each section that uses an image, specify the path from
`inventory.json`. For sections without suitable imagery, specify the
fallback: either a CSS gradient (define the gradient stops) or an
SVG pattern (Hero Patterns, subtle, under 5% opacity on bg).

### Risks and open questions

Anything ambiguous. Did you have to invent a service name? Did you
guess a business type? State it and ask Daniel.

## Outputs

- `./leads/{slug}/design-plan.md`

## Acceptance criteria

- Both headline options present, each <= 10 words
- Palette has 5 hex values, all AA-contrast compliant pairwise where
  used
- Typography choices include exact Google Fonts URL
- Section order has at least 5 sections
- Every section with imagery names its source path OR specifies a
  fallback (gradient / SVG pattern)

## Writing rules (apply to everything produced)

- No em-dashes
- No hyperbolic vocabulary ("stunning", "cutting-edge", "world-class")
- No "we are passionate about..." template openers
- Headlines use their verbs, not generic marketing verbs
- Numbers over adjectives where possible ("29 years serving Denton"
  not "decades of experience")
