# Runbook Template

A runbook is an actionable playbook for a specific operational task: failover, restore from backup, replace a drive, provision a user, etc. It's written for someone other than the author to follow under pressure.

## Structure

```markdown
# Runbook: [Specific Operation]

| Field | Value |
|-------|-------|
| Last Verified | YYYY-MM-DD |
| Owner | [Name] |
| Estimated Time | [Realistic duration including safety checks] |
| Risk Level | Low / Medium / High |

## When to Use This Runbook

[Specific triggering condition. Not "for failover" but "when dbprimary becomes unresponsive for more than 5 minutes and dbhotswap shows healthy replication."]

## When NOT to Use This Runbook

[Conditions where a different runbook applies, or where you should escalate instead of executing.]

## Prerequisites

- [Required access: WireGuard, SSH key, sudo, etc.]
- [Required tools installed locally]
- [Required information on hand: target hostname, IDs, etc.]

## Safety Checks Before Starting

- [ ] [Specific verification, e.g., "Confirm replication is currently streaming on dbhotswap with replay_lag < 5s"]
- [ ] [Another check]
- [ ] [Etc.]

If any safety check fails, STOP and escalate to [person/channel].

## Steps

### 1. [Step Name]

\`\`\`bash
# Specific command with exact arguments
command --with --flags
\`\`\`

**Expected output:** [What you should see]
**If it fails:** [What to do]

### 2. [Step Name]

\`\`\`bash
command
\`\`\`

[... continue ...]

## Verification

After completing all steps, verify:

- [ ] [Specific check, e.g., "Application can connect: `psql -h newprimary -d vsurv_production -c 'SELECT 1'`"]
- [ ] [Specific check]
- [ ] [Specific check]

## Rollback

If something goes wrong, rollback procedure:

1. [Step 1]
2. [Step 2]
3. [Step 3]

If rollback isn't possible, escalation contact: [name/channel].

## Common Issues and Fixes

### Issue: [Specific error message or symptom]
**Cause:** [Brief explanation]
**Fix:**
\`\`\`bash
fix-command
\`\`\`

### Issue: [Another common problem]
...

## Notification

After successful completion, notify:

- [ ] [Stakeholders to inform, e.g., "Post in #ops Slack channel"]
- [ ] [Records to update, e.g., "Update Zoho issue INT-XX to Complete"]
- [ ] [Documentation to revise if anything changed]

## Last Verified

This runbook was last executed in [test environment / production] on [date] by [person]. The procedure worked as documented.
```

## Style Rules

- **Imperative voice.** "Run this command", not "you should run this command."
- **Specific commands with real flags.** Generic examples are useless under pressure.
- **Show expected output.** People need to know if the command worked.
- **One action per step.** Don't combine "run X and check Y."
- **Include rollback even if you think it won't be needed.** Especially then.
- **No em-dashes.**

## When to Write a Runbook

- Any operational task that has been done more than twice (or you expect to do again)
- Any task that's complex enough to forget steps under pressure
- Any task that needs to be handed off to someone else
- Any post-incident remediation that produced a clear procedure

## Where Runbooks Live

- During the assessment phase: in the platform-eng `act-infra` repo under `/runbooks/`
- Long-term: in the chosen internal documentation platform (TBD; one of the open Zoho issues)
- Reference from Zoho issues that involve executing the runbook
