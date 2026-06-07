# Updating the Assessment Checklist

The checklist (`act-assessment-checklist.md`) is the living to-do list of everything to investigate or verify across the full ACT infrastructure. It's Daniel-internal, not a management deliverable.

## Workflow

The checklist evolves through four phases:

1. **Capture** — User dumps items in any order, any format. Slot them into existing sections or create new ones.
2. **Expand** — Suggest related items, adjacent investigations, and questions worth asking. Mark items needing user input with `[?]`.
3. **Detail** — When user says "add details" on a section, expand bullet points into structured subsections with commands, expected output, and red/green criteria. (This often moves into the cheatsheet.)
4. **Polish** — Reorganize, consolidate, restructure as patterns emerge.

## Item State Legend

```
[ ] Not yet assessed
[~] In progress
[x] Assessed
[?] Needs more info from team
[!] Issue found (logged in main assessment)
```

## Section Structure

Each section should have:
- A heading (e.g., `## PostgreSQL`, `## ZFS & Storage`)
- An optional scope note in blockquote (e.g., `> **Scope:** dbprimary, db2, dbhotswap, pg3, appserver`)
- One or more subsections with bullet-pointed checklist items
- `[?]` items where the user owes input

## Existing Sections (as of latest update)

1. PostgreSQL (Performance, Backups & Recovery, Replication & HA, Data Traffic & Load)
2. ZFS & Storage (Pool Health, Auto Snapshots, Tuning, Disk Health)
3. Kernel & System Tuning (sysctl, Resource Limits, OS & Kernel)
4. Observability & Monitoring (Zabbix audit, Grafana, Netdata, Alerting, Logging)
5. Network & DNS
6. Security & Access Management (WireGuard, SSH, Patching)
7. CI/CD & Deployment
8. Virtualization — Proxmox VE (Cluster Health, VM Inventory, Storage)
9. Scripts & Reports Consolidation
10. Pimsserver Branch Consolidation

## When the User Dumps Items

1. Identify which section(s) the items belong to.
2. Add them as `[ ]` checklist items.
3. **Brainstorm adjacent items.** If they mention PostgreSQL queries, suggest ZFS recordsize, kernel parameters, and disk health checks. The mental model is: one item often unlocks a dozen others.
4. **Ask follow-up questions.** What hardware, what kernel, what PostgreSQL version, what backup target? Mark assumptions with `[?]` so the user can confirm.

## When the User Says "Add Details"

1. Pick the relevant section.
2. Turn bullet points into structured subsections with:
   - A heading
   - Commands in fenced code blocks
   - Expected output description
   - Red/green diagnostic criteria
3. This usually means promoting content to the cheatsheet (`references/cheatsheet.md`).

## Scope Discipline

- A scoping comment about one tool ("the script targets `vsurv_production` on `172.28.2.1`") does not narrow the checklist. The checklist tracks the full fleet.
- The cheatsheet (`references/cheatsheet.md`) is the reverse: it can be scoped tightly to a primary target because that's its purpose.

## Cross-References

When an item moves from checklist to "issue found", mark it `[!]` and reference the INT-XX or SY1-XX ID it became.

When an item is detailed in the cheatsheet, reference the section: `(see cheatsheet §5.1)`.
