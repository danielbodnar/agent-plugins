# Phase 7: Draft outreach emails

## Objective

Write two email drafts (initial cold email + 4-day follow-up nudge).
Save them as `.eml` files. Never send.

## Inputs

- `extracted.json`
- `radar-scan.json` (for a factual opener)
- `state.json`
- `out/preview-credentials.md` (for the URL and access walkthrough)

## Copy rules (every draft must comply)

- **No em-dashes** anywhere
- No "hand-crafted", "poured hours", "I just", "spent the weekend",
  "built from scratch"
- No superlatives: no "amazing", "incredible", "game-changing",
  "stunning", "world-class"
- State prices as numbers, not ranges (unless genuinely tiered)
- Include a plain-text unsubscribe option: "Reply STOP and I'll add
  you to my opt-out list. No follow-up."
- From: `Daniel Bodnar <daniel@bitbuilder.io>`
- Sign-off includes BitBuilder Cloud LLC, Denton, TX for CAN-SPAM

## `out/outreach.eml`

RFC5322 with plain-text body (HTML alt is optional; if included,
mirror the plain text exactly).

### Structure

1. **Opener sentence**: one true specific fact from the crawl or
   Radar scan. Good sources:
   - Outdated stack: "I noticed your site runs WordPress 5.2, which
     stopped getting security patches in 2021."
   - Expired or soon-expiring cert: "Your SSL certificate expires in
     X days."
   - Missing mobile viewport: "Your site's missing a mobile viewport
     meta tag, so it renders unzoomed on phones."
   - Slow LCP: "Your homepage takes 4.8 seconds to render on mobile,
     per a Cloudflare scan."
   Avoid flattery. Avoid generic openers. Avoid "I was on your site
   and noticed...".

2. **Two sentences** on what's on offer:
   - A single-page redesign of their site is already live at
     `{slug}.bitbuilder.cloud`
   - Access is gated by their email; only they (and I) can see it

3. **How to view**: They'll see a Cloudflare Access challenge page,
   enter `{CLIENT_EMAIL}`, get a one-time PIN by email, confirm, and
   the preview loads.

4. **Three CTA buttons** (rendered as text in .eml, formatted as
   buttons in the HTML alt):

   - **Launch this site**: `https://{slug}.bitbuilder.cloud/cta/purchase`
     - Line under: "$1,999 one-time. Includes instant source-code
       download, domain switchover help, and 3 months of managed
       Cloudflare hosting."

   - **Schedule a 20-minute call**: `https://{slug}.bitbuilder.cloud/cta/schedule`

   - **Extend this preview**: `https://{slug}.bitbuilder.cloud/cta/extend`
     - Line under: "Verifies your email, adds 5 days to the preview."

5. **One sentence on deletion**: "For legal reasons the preview is
   only active during your review session. Closing the tab returns a
   goodbye page with a one-click option to request a restore."

6. **Sign-off**:
   ```
   Daniel Bodnar
   BitBuilder Cloud LLC
   daniel@bitbuilder.io
   940-XXX-XXXX (Daniel fills in)
   Denton, TX

   Reply STOP and I'll add you to my opt-out list. No follow-up.
   ```

### Subject line rules

- Under 60 characters
- References their business by name
- Not clickbait; no ALL CAPS; no excessive punctuation
- Avoid "Your Website" and "Quick question"

Good shapes:
- `Neal & Neal Insurance: a redesign idea, 2-minute look`
- `{BusinessName}: draft redesign ready to view`
- `A quicker homepage for {BusinessName}`

### Body length

Under 220 words.

## `out/followup.eml`

4-day nudge. Assume they opened the first email but did not click.

### Structure

- One sentence: "Following up on the preview at
  `{slug}.bitbuilder.cloud`. It's still live and waiting for your
  email."
- One sentence reiterating the three options.
- One sentence: "If this isn't a fit, reply STOP and I won't follow
  up again."
- Sign-off.

### Length

Under 80 words.

## Outputs

- `./leads/{slug}/out/outreach.eml`
- `./leads/{slug}/out/followup.eml`

## Acceptance criteria

- Both files exist as valid RFC5322
- Neither contains em-dashes (regex check)
- Neither contains banned phrases
- Both have the `Reply STOP` unsubscribe
- Outreach body under 220 words
- Follow-up body under 80 words

## Absolute rule

**DO NOT SEND EITHER EMAIL.** Phase 7 ends with drafts on disk,
printed to conversation, and a CHECKPOINT. Daniel sends the emails
manually from his own client.
