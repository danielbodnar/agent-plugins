# Drafting a Zoho Task (High-Level Category)

A Zoho **Task** at ACT is a high-level, abstract project management item. It's a category, not a unit of concrete work. Issues live underneath tasks.

## When to Use This

- Grouping related Issues under a coherent theme (e.g., "Platform Engineering & Automation")
- Creating a tracking container for an ongoing area of work
- Establishing priority for a domain (Tasks carry the priority field; Issues describe the concrete work)

## When NOT to Use This

If the user is describing a specific actionable piece of work ("fix the failing drives in PVE3"), that's an **Issue**, not a Task. Use `prompts/zoho-issue.md` instead.

## Template

```
Title: [Domain or Category Name]
Description: [One sentence summary of the domain. List the kinds of work that fall under it.]
Priority: [Critical / High / Medium / Low / None]
```

## Examples (Current State)

```
Title: Platform Engineering & Automation
Description: Infrastructure-as-code, server config management, script consolidation, and provisioning automation.
Priority: High
```

```
Title: Reliability & Failover
Description: Failover readiness, backup restoration, database HA, horizontal scaling, alerting, and DNS/routing.
Priority: High
```

```
Title: Database Performance & Scaling
Description: Query optimization, filesystem tuning, report automation, and long-term scaling strategy.
Priority: Medium
```

```
Title: Observability & Monitoring
Description: Grafana, Netdata, centralized logging, and alerting across all infrastructure.
Priority: High
```

## Style Rules

- Title is a noun phrase, title case, with ampersand allowed
- Description is one or two sentences listing what falls under this category
- No em-dashes
- No first or third person
- Match Zach's tone (read `references/zach-style-guide.md`)
- Avoid duplicating existing tasks in `references/bodnar-tasks.md`

## How to Submit

For one-off creation, draft and present to the user for review.

For batch creation, append to a JSON file consumed by `scripts/zoho-create.sh`:

```json
{
  "type": "task",
  "title": "Category Name",
  "description": "What falls under this category.",
  "priority": "High"
}
```
