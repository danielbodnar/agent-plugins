# Lifecycle state machine (Durable Object)

One DO instance per slug. Owns the full proposal lifecycle from
deploy through purchase, extension, soft-delete, archive, and hard
delete. Uses DO alarms for time-based transitions. No time alarms
fire until review is confirmed.

## States

| State | Meaning |
|-------|---------|
| `pending` | Deployed, magic link issued, owner has not yet clicked |
| `active` | Magic link clicked, beacon reporting dwell + scroll |
| `review_confirmed` | Dwell >= 60s AND scroll >= 50% met in some session |
| `extended` | Owner clicked extend + verified email; +5d alarm active |
| `purchased` | Stripe webhook confirmed purchase (terminal happy) |
| `scheduled` | Owner clicked schedule CTA (terminal happy-ish) |
| `soft_deleted` | 7d elapsed post-review; goodbye page served |
| `archived` | Daniel manually clicked archive; zipped in R2 cold storage |
| `hard_deleted` | 30d post-archive elapsed; R2 object deleted |
| `restored` | Owner requested restore post-soft-delete; Daniel approved |

## Transitions

### pending → active

**Trigger**: first `/_beacon` POST received (session cookie implies
Access authentication completed).

**Side effects**:
- `state.changed_at = now()`
- `state.first_click_at = now()`
- D1 `leads.state` updated
- D1 `events` insert: `{ event_type: 'first_click', ts: now() }`

### active → review_confirmed

**Trigger**: any `/_beacon` POST where `dwell_ms >= 60000` AND
`scroll_pct >= 50`.

**Side effects**:
- `state.review_confirmed_at = now()`
- Alarm set for `now() + 7 days`
- D1 updated
- D1 event: `review_confirmed`

### active → active (idle session)

**Trigger**: session ends (no beacons for 60+ seconds) without
threshold met.

**Side effects**: none. Waiting for the next session. No alarm set.
Site stays up indefinitely.

### review_confirmed → purchased

**Trigger**: `/webhook/stripe` receives `checkout.session.completed`
with matching `metadata.slug`.

**Side effects**:
- Cancel 7d alarm
- Zip `dist/` + README + DEPLOY.md + LICENSE.md
- Upload to R2 `source-bundles/{slug}/{sha256}.zip`
- Generate 14-day signed R2 URL
- Draft `out/delivery.eml` with signed URL and onboarding info
- D1 event: `purchased`
- `state.purchased_at = now()`

### review_confirmed → scheduled

**Trigger**: `/cta/schedule` clicked.

**Side effects**:
- Cancel 7d alarm
- 302 redirect to `CALCOM_LINK`
- D1 event: `scheduled`
- `state.scheduled_at = now()`

### review_confirmed → extended

**Trigger**: `/cta/extend/submit` posted with verified email
(one-time code flow).

**Side effects**:
- Cancel 7d alarm
- Set new alarm for `now() + 5 days`
- D1 event: `extended`
- `state.extended_until = now() + 5d`

### extended → review_confirmed

**Trigger**: 5d alarm fires.

**Side effects**:
- Set new 7d alarm from `now()`
- D1 event: `extension_expired`

### review_confirmed → soft_deleted

**Trigger**: 7d alarm fires.

**Side effects**:
- Worker starts serving `/goodbye` on all paths except
  `/goodbye/restore-request` and `/webhook/stripe`
- D1 event: `soft_deleted`
- Draft notification email to `daniel@bitbuilder.io` with one-click
  archive button (URL includes a signed token)

### soft_deleted → archived

**Trigger**: Daniel clicks the archive button in the notification
email (hits a Worker endpoint with the signed token).

**Side effects**:
- Zip `dist/` and upload to R2 `archives/{slug}.zip`
- Remove R2 `previews/{slug}/` objects
- Set new alarm for `now() + 30 days`
- D1 event: `archived`

### archived → hard_deleted

**Trigger**: 30d alarm fires.

**Side effects**:
- Delete R2 `archives/{slug}.zip`
- Delete DO storage
- Remove DNS record and Cloudflare Access application
- Remove Worker route binding (or leave as returning 410 Gone)
- D1 event: `hard_deleted`

### soft_deleted → restored

**Trigger**: Daniel manually approves a restore request. This is
outside the automated flow; he'd call a Worker admin endpoint with
an auth token.

**Side effects**:
- Cancel any pending alarm
- `state` → `active` (not back to `pending`, because the review
  threshold must be re-met)
- D1 event: `restored`
- Worker resumes serving `dist/` at preview URL

## Alarm summary

| State | Alarm |
|-------|-------|
| pending | None |
| active | None |
| review_confirmed | 7d |
| extended | 5d |
| soft_deleted | None (waiting on Daniel) |
| archived | 30d |
| purchased | None |
| scheduled | None |
| hard_deleted | Terminal |

## D1 `events` event types

Use this exact vocabulary (lower_snake_case):

- `deployed`
- `first_click`
- `beacon_received`
- `review_confirmed`
- `cta_purchase_clicked`
- `cta_schedule_clicked`
- `cta_extend_clicked`
- `extend_verified`
- `purchased`
- `scheduled`
- `extended`
- `extension_expired`
- `soft_deleted`
- `archive_notification_sent`
- `archived`
- `restore_requested`
- `restored`
- `hard_deleted`
- `opt_out_delete_click`
- `opt_out_email_reply`

Each event carries `{ slug, ts, payload_json }` where payload varies by
type.
