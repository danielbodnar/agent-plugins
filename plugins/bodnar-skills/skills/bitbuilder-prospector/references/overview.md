# BitBuilder Prospector: Overview

This is the single-source-of-truth document loaded at the start of every
run. Read this once. The per-phase reference docs fill in details.

## What this pipeline produces

One unsolicited-redesign proposal per run. The artifacts at the end:

1. A password-gated live preview at `{slug}.bitbuilder.cloud`, viewable
   only by the business owner (via Cloudflare Access one-time PIN)
   and Daniel. The slug is Daniel's choice; defaults to the apex
   domain with dots replaced by hyphens. Same target URL can be
   deployed under multiple slugs in parallel for A/B testing.
2. A fully-wired lifecycle: Durable Object state machine, three CTAs
   (purchase, schedule, extend), soft-delete / archive / hard-delete
   with manual gates.
3. A per-slug Stripe Payment Link (with Link enabled for one-click
   checkout) that on purchase triggers a zipped source-code delivery
   via R2 signed URL.
4. A draft cold email and a draft 4-day follow-up nudge. Both saved to
   disk. Neither sent.

## What it deliberately does NOT do

- Send email
- Deploy without human review of the filled-in Worker + Wrangler configs
- Bypass the opt-out list under any circumstance
- Generate Python code
- Use em-dashes in prose output
- Suggest or use Shodan for geographic discovery (Shodan's `city:`
  filter indexes server location, not business location, and local
  businesses rarely self-host)

## Technology choices

| Need | Choice | Why |
|------|--------|-----|
| Lead discovery | Google Places / Outscraper | Upstream business data; Shodan doesn't solve this |
| Per-URL tech stack | Cloudflare Radar URL Scanner | Already in MCP, free, returns everything needed |
| Static crawl | wget mirror | Universal, polite, keeps local paths |
| Dynamic crawl fallback | Cloudflare Browser Rendering | For SPA / blocked sites |
| Design QA | chrome-devtools-mcp | a11y + perf + screenshots |
| Runtime | Bun + strict TypeScript | Single runtime, fast, native ESM |
| Hosting | Cloudflare Workers + Static Assets | Preview-per-slug |
| State | Durable Objects | Lifecycle state machine, alarms |
| Access control | Cloudflare Access (one-time PIN) | Native magic-link UX |
| Payment | Stripe Payment Links + Link | One-click passwordless checkout |
| Storage | R2 | Mirrors, archives, source bundles, og-images |
| Relational state | D1 | Leads, events, opt-outs |

## File layout on disk

Working directory per run:

```
./leads/{slug}/
  state.json               # phase tracker + decisions made so far
  mirror/                  # wget output, IMMUTABLE after Phase 1
  rendered/                # browser-rendered fallback pages
  radar-scan.json          # Radar URL Scanner output
  extracted.json           # structured content
  inventory.json           # image inventory
  brand-voice.md           # tone analysis
  build-brief.md           # redesign spec
  design-plan.md           # hero, palette, sections (Phase 3)
  dist/
    index.html             # final site
    beacon.js              # review-tracking
    og-image.png
    qa/
      {WxH}.png            # per-viewport screenshots
      {WxH}-a11y.json
      {WxH}-perf.json
      original.png
  deploy/
    wrangler.jsonc
    worker.ts
    access-config.json
  qc/
    reviewer-report.md     # Phase 5.5 output
  out/
    outreach.eml           # draft cold email
    followup.eml           # draft nudge
    preview-credentials.md # Access walkthrough
    delivery.eml           # post-purchase email draft
  decisions.log            # append-only reasoning log
```

R2 layout (authoritative durable storage):

```
r2://bitbuilder-prospector/
  mirrors/{slug}/{iso_ts}/           # crawl snapshot, 14-day retention
  previews/{slug}/dist/              # live site assets
  source-bundles/{slug}/{sha}.zip    # purchaser deliverable
  archives/{slug}.zip                # post-soft-delete cold storage
  screenshots/{slug}/{viewport}.png
  og-images/{slug}.png
  radar-scans/{slug}.json
```

## State machine (Durable Object)

See `references/lifecycle-state-machine.md` for full transitions.
Summary: site stays live indefinitely until the owner clicks the
magic link AND meets the review threshold (60s dwell + 50% scroll).
Only after that does the 7-day soft-delete clock start. Extension
via email-verified CTA adds 5 days. Archive is a manual one-click
action by Daniel, after which cold storage auto-deletes at 30 days.

## Success criteria

Quality gates that must pass before Phase 6 deploys, full KPIs, and
SLOs live in `references/success-metrics.md`.
