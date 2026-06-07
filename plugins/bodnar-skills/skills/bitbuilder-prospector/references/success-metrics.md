# Success criteria and measurement

Three tiers of measurement: per-lead quality gates (block deploy if
failed), per-lead lifecycle variables (logged for analysis), and
campaign-level KPIs (queryable against D1 across all runs).

## Per-lead quality gates

All must pass before Phase 6 deploys.

| Gate | Threshold | Source |
|------|-----------|--------|
| Extraction completeness | `business_name`, `phone`, >= 1 service, `about` all non-null | `extracted.json` |
| Voice match score | >= 3 / 5 | QC reviewer report |
| Visual quality score | >= 3 / 5 | QC reviewer report |
| Critical a11y issues | 0 | `dist/qa/*-a11y.json` |
| Serious a11y issues | <= 2 | `dist/qa/*-a11y.json` |
| Mobile LCP | <= 2.5s | `dist/qa/*-perf.json` at 375w |
| Mobile CLS | <= 0.1 | `dist/qa/*-perf.json` at 375w |
| AA contrast on primary CTA | pass | QA audit |
| Watermark present | byte-exact match | `scripts/compliance-check.ts` |
| No em-dashes anywhere | zero regex matches | `scripts/compliance-check.ts` |
| No Python code | zero regex matches | `scripts/compliance-check.ts` |
| No stock-photo CDN URLs | zero regex matches | `scripts/compliance-check.ts` |
| No franchise trademarks | zero regex matches | `scripts/compliance-check.ts` |

## Per-lead lifecycle variables

Tracked in D1 `leads` table (columns already in schema). Populated by
DO transitions and beacon posts.

| Variable | Meaning | Source |
|----------|---------|--------|
| `time_to_first_click_h` | Hours from email send to first beacon | computed |
| `total_dwell_ms` | Cumulative review time (sum of all beacons) | beacon |
| `max_scroll_pct` | Deepest scroll across all sessions | beacon |
| `reviewed` | Boolean: review_confirmed ever reached | DO state |
| `cta_chosen` | `purchase` / `schedule` / `extend` / `none` | CTA click |
| `time_to_cta_s` | Seconds from first_click to CTA click | computed |
| `extension_used` | Boolean | DO state |
| `session_count` | Number of distinct Access sessions observed | beacon |

## Campaign-level KPIs

Queryable via D1 SQL. Each has a target.

| KPI | Target | Query |
|-----|--------|-------|
| Email → magic link click rate | >= 25% | `first_click` events / emails sent |
| Click → review-confirmed rate | >= 60% | `review_confirmed` / `first_click` |
| Reviewed → any-CTA rate | >= 40% | CTA clicks / `review_confirmed` |
| Purchase rate per email | >= 2% | `purchased` / emails sent |
| Schedule rate per email | >= 8% | `scheduled` / emails sent |
| Opt-out rate | <= 5% | (delete + STOP reply) / emails sent |
| Mean time deploy → first click | <= 48h | avg(first_click - deployed) |
| Mean dwell when reviewed | >= 90s | avg(total_dwell_ms WHERE reviewed=true) |

## Pipeline SLOs

Measured across runs, not per-lead.

| SLO | Target | Measurement |
|-----|--------|-------------|
| End-to-end run time (Phase 0 → 7) | <= 45 min | Manual timing |
| Preview uptime (non-terminal states) | >= 99% | Cloudflare Analytics |
| Stripe webhook → delivery email draft | <= 60s | DO event timing |
| DO alarm firing delay | <= 5s vs scheduled | DO logs |

## Sample D1 queries for campaign reporting

```sql
-- Click rate by lead source
SELECT
  lead_source,
  COUNT(*) as total,
  SUM(CASE WHEN review_confirmed_at IS NOT NULL THEN 1 ELSE 0 END) as reviewed,
  ROUND(100.0 * SUM(CASE WHEN review_confirmed_at IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) as review_rate_pct
FROM leads
GROUP BY lead_source;

-- Funnel from last 30 days
SELECT
  SUM(CASE WHEN state IN ('pending','active') THEN 1 ELSE 0 END) as deployed_not_reviewed,
  SUM(CASE WHEN state = 'review_confirmed' THEN 1 ELSE 0 END) as reviewed_no_cta,
  SUM(CASE WHEN state = 'extended' THEN 1 ELSE 0 END) as extended,
  SUM(CASE WHEN state = 'purchased' THEN 1 ELSE 0 END) as purchased,
  SUM(CASE WHEN state = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
  SUM(CASE WHEN state = 'soft_deleted' THEN 1 ELSE 0 END) as soft_deleted
FROM leads
WHERE created_at > datetime('now', '-30 days');

-- Avg dwell time for reviewed leads
SELECT AVG(total_dwell_ms) / 1000.0 as avg_dwell_sec
FROM leads
WHERE review_confirmed_at IS NOT NULL;
```
