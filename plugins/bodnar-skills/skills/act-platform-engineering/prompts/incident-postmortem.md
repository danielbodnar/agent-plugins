# Incident Postmortem Template

Blameless. Focused on systemic causes. Every action item has an owner and a date.

## Structure

```markdown
# Postmortem: [Brief Incident Title]

| Field | Value |
|-------|-------|
| Incident ID | INT-XX or SY1-XX |
| Date | YYYY-MM-DD |
| Duration | Detection to resolution (HH:MM) |
| Severity | SEV1 / SEV2 / SEV3 |
| Author | Daniel Bodnar |

## Summary

[1-2 paragraphs. What happened, who was affected, how long, how it was resolved. Non-technical reader should understand.]

## Timeline

All times in [TIMEZONE].

- HH:MM — [Event description]
- HH:MM — [Event description]
- ...

Continue through detection, diagnosis, mitigation, recovery, and confirmation.

## Impact

- **User-facing impact**: [Who was affected, how, for how long]
- **Internal impact**: [Lost work, on-call hours, etc.]
- **Data impact**: [Any data loss, corruption, or inconsistency]

## Root Cause

[Systemic explanation. Not "Daniel pushed bad config." Instead "The deploy process did not have a validation step that would have caught this misconfiguration."]

If multiple contributing factors, list them:

1. [Factor 1]
2. [Factor 2]
3. [Factor 3]

## What Went Well

- [Specific positive: detection time, communication, fast recovery, etc.]
- [Another positive]

## What Went Wrong

- [Specific gap: missing monitoring, manual step, undocumented procedure]
- [Another gap]

## Where We Got Lucky

[Things that could have made it much worse but didn't. Worth calling out because they expose latent risks.]

## Action Items

| ID | Description | Owner | Due | Status |
|----|-------------|-------|-----|--------|
| 1 | [Specific corrective action] | [Person] | [Date] | Not Started |
| 2 | [Another action] | [Person] | [Date] | Not Started |

Each action item should be:
- **Specific** (not "improve monitoring", but "add Grafana alert for dbprimary replication lag > 30s")
- **Owned** (a single person)
- **Dated** (a target date, not "ASAP")
- **Tracked** (as a Zoho issue, with the ID in the table)

## Lessons Learned

[A paragraph or two of reflection. What did we learn that we didn't know before? What surprised us? What assumption was wrong?]
```

## Style Rules

- **Blameless.** No naming individuals as causes. Always systemic.
- **Specific and concrete.** "The system" did things, not "we." Time stamps for everything.
- **No em-dashes.** Use commas or restructure.
- **No marketing language.** This is an internal document for learning.

## When NOT to Write a Postmortem

- Minor user-impact issues that resolved quickly with known causes
- Routine maintenance windows (planned outages)
- Issues that didn't reach user-facing impact

## When to Definitely Write One

- Any SEV1 (full service outage or data integrity issue)
- Any incident lasting > 1 hour
- Any incident involving the payment gateway
- Any incident where the resolution involved emergency action (failover, rollback, manual data fix)
- Any incident where multiple people had to be paged
- Any near-miss that surfaces a latent risk

## Publishing

- Save as `/postmortems/YYYY-MM-DD-<brief-title>.md` in the platform-eng repo (or the future internal documentation platform)
- Notify Zach, Clint, and any other affected stakeholders
- Schedule a review meeting within 1 week to walk through action items
