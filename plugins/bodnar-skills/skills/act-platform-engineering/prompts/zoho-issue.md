# Drafting a Zoho Issue (Concrete Actionable Work)

A Zoho **Issue** at ACT is a concrete, actionable unit of work. Issues are the day-to-day items engineers actually pick up and complete.

## When to Use This

- A specific piece of work has been identified
- Findings from an assessment need to be tracked
- A bug, request, or feature has a clear scope
- A meeting or conversation produced an action item

## Template

```
Title: [Action-oriented or state-describing phrase]
Description:
[Paragraph 1: Describe the current situation. What is the problem or what has been observed?]

[Paragraph 2: Describe what done looks like. What needs to happen? What's the expected outcome?]

[Optional paragraph 3: Context, dependencies, or who to work with. Mention Miller, Zach, or other people by name when relevant.]
```

## Examples (Current State)

```
Title: Failing Hard Drives in PVE3
Description:
PVE3 has drives that are failing or already failed. Replacements need to go in and pool health needs to be verified after resilver.

Work with Miller.
```

```
Title: Filesystem Tuning on DB Primary
Description:
When dbprimary was upgraded to add storage, several significant filesystem tuning mechanisms were overlooked. ZFS recordsize, compression, kernel parameters, all of which directly impact database performance.

Current settings need to be audited against best practices and a remediation plan developed. Some changes require careful planning.
```

```
Title: Automatic Database Failover
Description:
If dbprimary goes down, failover is currently manual or undefined. Automated promotion and connection routing are needed so there is no scramble during an outage.

Ties directly into the broader failover and reliability work.
```

## Style Rules

- **No em-dashes.** Use commas or restructure.
- **No first/third person framing.** Phrase as "X is needed", "Y has been overlooked", not "I want" or "we should".
- **No priority labels embedded in text.** Priority is the Zoho field, not prose content.
- **Contractions without apostrophes are fine** ("thats", "dont", "its") to match Zach's tone.
- **Reference real people by name when relevant** (Miller, Zach, Clint, Ben Jumper).
- **Match Zach's tone** (read `references/zach-style-guide.md` for canonical examples).
- **Avoid duplicating existing issues** in `references/bodnar-tasks.md`.

## Common Pitfalls

| Bad | Good |
|-----|------|
| "I want to fix the failing drives in PVE3" | "PVE3 has drives that are failing or already failed. Replacements need to go in." |
| "It's extremely manual to provision a user" | "Sysadmin and server management lacks automation. Provisioning a new user requires significant manual effort." |
| "We should set up monitoring" | "There is no centralized visibility into the infrastructure. Grafana, Netdata, and centralized log management need to be deployed." |
| "This is a priority 1 issue" | (Remove from prose; set priority field on the Task that contains this issue.) |

## How to Submit

For one-off creation, draft and present to the user for review.

For batch creation, append to a JSON file consumed by `scripts/zoho-create.sh`:

```json
{
  "type": "issue",
  "title": "Issue Title",
  "description": "Description with <br> for line breaks."
}
```

Note: when the issue body has paragraphs, replace blank lines with `<br><br>` for the API.

## Linking to Other Issues

If an issue depends on or relates to another, mention it in the description by INT-XX or SY1-XX number. Zoho does not auto-link these by default but humans reading the description will recognize the reference.
