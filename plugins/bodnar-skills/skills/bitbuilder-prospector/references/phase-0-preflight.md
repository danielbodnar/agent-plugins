# Phase 0: Preflight and opt-out check

## Objective

Establish the working directory, verify infrastructure exists, and
confirm the target is not on the opt-out list. Zero network calls to
the target itself in this phase.

## Inputs

- `TARGET_URL`
- `CLIENT_EMAIL` (optional)
- `BUSINESS_NAME` (optional)
- `LEAD_SOURCE` (optional)
- `SLUG` (optional, overrides auto-derivation)

## Slug resolution

If `SLUG` is provided explicitly, validate and use it directly.
Otherwise derive from the apex domain of `TARGET_URL`: lowercase,
replace dots with hyphens, strip `www.` if present.

Validation (applies in both cases):

- Must match `/^[a-z0-9][a-z0-9-]{0,62}$/`
- Must not start or end with hyphen
- Must be unique across D1 `leads.slug`; abort with a clear error if
  the slug is already in use

Examples:

| TARGET_URL | SLUG provided | Resolved slug | Subdomain |
|------------|---------------|---------------|-----------|
| `https://nealins.com/` | (none) | `nealins-com` | `nealins-com.bitbuilder.cloud` |
| `https://nealins.com/` | `nealins` | `nealins` | `nealins.bitbuilder.cloud` |
| `https://nealins.com/` | `nealins-v3` | `nealins-v3` | `nealins-v3.bitbuilder.cloud` |
| `https://www.foo-bar.com/` | (none) | `foo-bar-com` | `foo-bar-com.bitbuilder.cloud` |

Use explicit slugs for A/B runs, iteration, or when the
auto-derived form is ugly. Same target URL can ship under many slugs
in parallel; each gets its own preview, DO instance, Stripe link, and
Access app.

## Actions

1. Resolve `{slug}` per "Slug resolution" above. Validate the regex.
2. Check slug uniqueness against D1:
   ```sql
   SELECT slug, domain, state, created_at FROM leads WHERE slug = ?
   ```
   If a row exists, ABORT with message: "Slug `{slug}` already in use
   for domain `{domain}` (state: `{state}`). Choose a different slug."
3. Create `./leads/{slug}/` if missing.
4. Write initial `state.json`:
   ```json
   {
     "slug": "...",
     "target_url": "...",
     "apex_domain": "...",
     "client_email": "...",
     "business_name": "...",
     "lead_source": "...",
     "slug_source": "explicit | derived",
     "started_at": "ISO8601",
     "phase": 0,
     "phase_status": "in_progress"
   }
   ```
5. Touch `decisions.log`.
6. Run `scripts/setup-infrastructure.ts` to idempotently ensure:
   - R2 bucket `bitbuilder-prospector` exists
   - D1 database `outreach` exists
   - Tables `opt_outs`, `leads`, `events` exist with correct schema
7. Run `scripts/opt-out-check.ts {apex_domain}`. If the script returns
   any row, ABORT the run. Write the abort reason to `decisions.log`.
   (Note: opt-out is scoped to apex domain, not slug. An owner who
   opted out cannot be re-engaged by picking a different slug.)
8. Verify tool availability: `wget`, `bun`, `curl`, `jq`, `openssl`.
   Report missing tools.
9. Verify MCP server availability: `cloudflare-api`, `cloudflare-radar`,
   `cloudflare-browser-run`. Report missing servers as warnings (not
   fatal; some phases have fallbacks).
10. Update `state.json`: `phase: 1, phase_status: "awaiting_plan"`.

## Outputs

- `./leads/{slug}/state.json`
- `./leads/{slug}/decisions.log` (with Phase 0 entry)

## Acceptance criteria

- R2 bucket exists and is writable
- D1 database exists with three required tables
- Apex domain is NOT in `opt_outs`
- All required tools present
- `state.json` reflects Phase 1 as next

## Failure modes

| Failure | Response |
|---------|----------|
| Slug fails regex validation | Halt, show expected format |
| Slug already in `leads` table | Halt, show existing state, suggest picking a new slug |
| Opt-out row exists (apex domain) | Abort, write to log, exit |
| R2 provisioning fails | Report error, retry once, then halt |
| D1 provisioning fails | Report error, retry once, then halt |
| `wget` missing | Halt with install instructions |
| `bun` missing | Halt with install instructions |
