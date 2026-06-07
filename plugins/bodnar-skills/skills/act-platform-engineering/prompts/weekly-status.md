# Weekly Status Report

A weekly status report is for Zach (and sometimes Clint). Brief, prose-first, no operational metadata they already have in Zoho.

## Structure

```
## Week of [Monday date] — [Friday date]

### Highlights

[1-3 sentences. What moved forward this week that matters. No more than 3 bullet points if listed.]

### Investigations

[What was investigated. Brief findings. Reference INT-XX or SY1-XX IDs where applicable but don't recap what Zach can read in Zoho.]

### Blockers

[Specific things that prevented progress. Be concrete, not vague.]

### Next Week

[1-3 priorities for the coming week. Don't list every Zoho item; pick what matters.]

### Decisions Needed

[If applicable: questions or decisions where Zach's input is needed. Otherwise omit the section.]
```

## Style Rules

- **No em-dashes.** Use commas or restructure.
- **No bulleted lists for prose.** Prose for narrative, bullets only for genuinely list-shaped content.
- **Match Zach's tone.** Conversational-but-professional. See `references/zach-style-guide.md`.
- **No first/third person framing in summaries.** "PVE3 drive replacement was scheduled" not "I scheduled the PVE3 drive replacement."
- **First person is OK in the Decisions Needed and Blockers sections** because those are direct asks from Daniel.

## What NOT to Include

- Project IDs, portal IDs, Zoho links (Zach has them)
- Full task descriptions (Zach can read Zoho)
- Background context Zach already knows (he wrote the Bodnar Tasks framework)
- Hour-by-hour breakdowns (he doesn't need them)

## Example

```
## Week of April 8 — April 12

### Highlights

The assessment cheatsheet now covers PostgreSQL, ZFS, kernel tuning, and disk health with red/green criteria for each. Initial triage on dbprimary identified the ZFS recordsize tuning gap and an unused index totaling roughly 8 GB. Grafana is up and reporting from Netdata on dbprimary; deployment to the rest of the fleet is in progress.

### Investigations

The filesystem tuning gap on dbprimary (recordsize at 128K) was confirmed. Remediation requires planning since recordsize only affects new writes; full benefit needs a dataset recreation. The reporting performance investigation from last week was validated against current pg_stat_statements; the same top three queries still dominate total time.

### Blockers

Backup server diagnosis is waiting on Miller's availability. PVE3 drive replacements are ordered but not yet on-site.

### Next Week

Move first server config into the act-infra repo as proof of concept. Continue Netdata rollout to remaining hosts. Begin VACUUM and reindex work on vsurv_production during off-hours.

### Decisions Needed

Do we want to keep Zabbix or fully migrate observability to Grafana + Netdata? Either is workable but running both indefinitely splits attention.
```
