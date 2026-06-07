# bitbuilder-prospector

End-to-end pipeline for running one unsolicited-redesign proposal at a
time. Plan-first. Phase-gated. Human-approved at every stage.

## What this skill does

1. Crawls a target business's website (wget mirror + Cloudflare Radar
   scan + TLS check)
2. Extracts structured content, images, brand voice
3. Plans a redesign (palette, typography, sections)
4. Builds a single-page static site with a review-tracking beacon
5. Runs accessibility, performance, and visual QA
6. Runs an adversarial QC reviewer pass
7. Deploys behind Cloudflare Access at {slug}.bitbuilder.cloud
8. Drafts outreach + follow-up emails (does not send)

## What this skill does NOT do

- Send any email
- Deploy without showing the filled-in Worker and Wrangler configs for
  review first
- Bypass the opt-out list under any circumstance
- Generate Python code
- Use em-dashes in prose

## How to invoke

```
Run the bitbuilder-prospector on https://example.com for
CLIENT_EMAIL=owner@example.com, BUSINESS_NAME=Example Co,
LEAD_SOURCE=maps.
```

The skill will enter Plan mode for Phase 0 and wait for `go`.

## Required infrastructure

One-time setup (the skill will provision if missing):

- Cloudflare account `5dae265f74e6077ad674a3d855bf9853`
- R2 bucket `bitbuilder-prospector`
- D1 database `outreach` with tables `opt_outs`, `leads`, `events`
- Cloudflare Access configured on `*.bitbuilder.cloud`
- Stripe account with API key in `STRIPE_SECRET_KEY`

## File map

- `SKILL.md`: entry point, operating rules
- `references/`: per-phase detailed instructions
- `scripts/`: Bun/TypeScript and shell helpers
- `templates/`: Worker + HTML + email scaffolds with `{{PLACEHOLDERS}}`
- `evals/evals.json`: test cases

## Development notes

Daniel Bodnar (danielbodnar@github, daniel@bitbuilder.io).
BitBuilder Cloud LLC, Denton, TX.
