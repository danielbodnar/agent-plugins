# Phase 6: Deploy

## Objective

Ship the preview. Worker + Durable Object + D1 + R2 + Cloudflare
Access + Stripe Payment Link, all bound together into a state machine
that owns the lifecycle from first click through archive.

## Prerequisites

- Phase 5.5 verdict: `ship`
- Daniel has approved the filled-in `wrangler.jsonc` and `worker.ts`
  at this phase's checkpoint

## Files produced

- `./leads/{slug}/deploy/wrangler.jsonc`
- `./leads/{slug}/deploy/worker.ts`
- `./leads/{slug}/deploy/access-config.json`
- `./leads/{slug}/out/preview-credentials.md`
- R2: `previews/{slug}/dist/` (live assets)
- D1: one row in `leads` table, state `pending`

## Actions

### 1. Fill templates

From `templates/`, fill in `wrangler.jsonc.tmpl`, `worker.ts.tmpl`,
and `access-config.json.tmpl` using values from `state.json`.

Key placeholders:
- `{{SLUG}}`, `{{BUSINESS_NAME}}`, `{{CLIENT_EMAIL}}`, `{{APEX_DOMAIN}}`
- `{{ACCOUNT_ID}}` = `5dae265f74e6077ad674a3d855bf9853`
- `{{PURCHASE_PRICE_CENTS}}` (default `199900`)
- `{{HOSTING_MONTHLY_CENTS}}` (default `9900`)

### 2. Show Daniel for approval

Print the filled-in `wrangler.jsonc` and `worker.ts` to the
conversation. Wait for explicit `go` before continuing. This is the
second hard stop of Phase 6 (after the phase-level Plan checkpoint).

### 3. Provision Stripe Payment Link

Run `bun scripts/stripe-provision.ts {slug}`. The script calls Stripe
API to create a Payment Link with:

- Product: `{BUSINESS_NAME} website launch + 3 months hosting`
- One-time charge at `PURCHASE_PRICE_CENTS`
- Description: "Launch of the {BUSINESS_NAME} redesign. Includes
  instant source-code download, domain switchover assistance, and
  3 months of managed Cloudflare hosting."
- `payment_method_types: ['card', 'link']`
- `after_completion.type: 'redirect'` to
  `{slug}.bitbuilder.cloud/purchased?session_id={CHECKOUT_SESSION_ID}`
- `metadata: { slug, client_email, domain }`

Also create a subscription Price for the hosting upsell
(`HOSTING_MONTHLY_CENTS`/month, 90-day trial). Not wired to a Payment
Link yet; appears as an upsell button on `/purchased`.

Store the returned Payment Link URL in D1 `leads.purchase_link_url`
and include it in `access-config.json` metadata.

### 4. Upload dist/ to R2

```bash
# Conceptually, via cloudflare-api MCP:
for file in dist/**/*; do
  cloudflare-api:execute "r2.putObject(bucket='bitbuilder-prospector',
    key='previews/{slug}/dist/${file}', body=...)"
done
```

### 5. Deploy Worker

Via `cloudflare-api:execute`:

1. Deploy Worker script (code from filled `worker.ts`)
2. Bind DO namespace `ProposalLifecycle`
3. Bind D1 database `outreach`
4. Bind R2 bucket `bitbuilder-prospector`
5. Set secrets via wrangler: `STRIPE_SECRET_KEY`, `CALCOM_LINK`,
   `HOSTING_SIGNUP_LINK`
6. Create DNS `CNAME` for `{slug}.bitbuilder.cloud` pointing to the
   Worker route

### 6. Create Cloudflare Access application

Via `cloudflare-api:execute`:

```json
{
  "name": "Preview: {slug}",
  "domain": "{slug}.bitbuilder.cloud",
  "session_duration": "24h",
  "policies": [{
    "name": "Owner and Daniel",
    "decision": "allow",
    "include": [
      { "email": { "email": "{CLIENT_EMAIL}" } },
      { "email": { "email": "daniel@bitbuilder.io" } }
    ]
  }]
}
```

This is the magic-link mechanism: owner clicks the URL, enters their
email on Access's challenge page, gets a one-time PIN via email,
confirms, gets a 24-hour session cookie.

### 7. Seed the DO

Create the DO instance for `{slug}` with initial state:

```json
{
  "slug": "...",
  "client_email": "...",
  "state": "pending",
  "created_at": "ISO8601",
  "purchase_link_url": "https://buy.stripe.com/..."
}
```

Insert matching row into D1 `leads`.

### 8. Verify

```bash
# Expect a 302 to Cloudflare Access
curl -sI https://{slug}.bitbuilder.cloud/ | head -5

# Beacon endpoint should be reachable (returns 401 without Access cookie)
curl -sI https://{slug}.bitbuilder.cloud/_beacon
```

### 9. Write preview-credentials.md

For Daniel's reference and to inform the outreach email in Phase 7:

```markdown
# Preview access: {slug}

- **URL**: https://{slug}.bitbuilder.cloud/
- **Authorized emails**: {CLIENT_EMAIL}, daniel@bitbuilder.io
- **Flow**: Visit URL → enter email → receive PIN from Cloudflare →
  enter PIN → 24h session
- **Preview state**: `pending` (indefinite until magic link clicked)
- **Purchase link**: {stripe_payment_link_url}
- **Stripe Link enabled**: yes (one-click for returning customers)
```

## Outputs

- Live preview at `{slug}.bitbuilder.cloud`
- D1 row in `leads`
- DO instance seeded
- R2 assets under `previews/{slug}/`
- Stripe Payment Link provisioned
- Cloudflare Access application live
- `./leads/{slug}/out/preview-credentials.md`

## Acceptance criteria

- `curl -sI https://{slug}.bitbuilder.cloud/` returns 302 to Access
- Access application exists and lists both emails
- D1 `leads` row exists with `state = 'pending'`
- Stripe Payment Link URL is reachable
- `preview-credentials.md` is written

## Failure modes and rollback

If any step fails, roll back in reverse order:

1. Delete D1 row if created
2. Delete DO instance if seeded
3. Delete Cloudflare Access application
4. Delete DNS record
5. Delete Worker deployment
6. Delete Stripe Payment Link (if API allows; archive if not)
7. Delete R2 objects under `previews/{slug}/`

Record the failure and rollback in `decisions.log`. Do not leave
orphans.
