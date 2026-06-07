# Updating Assessment Documents

ACT has a multi-document assessment system. Each document has a distinct audience and scope. Updates must respect those boundaries.

## The Four Documents

| Document | Audience | Scope |
|----------|----------|-------|
| `act-infrastructure-assessment.md` | Management (Zach, Clint) | Issues, recommendations, decisions. Clean. |
| `act-assessment-reference.md` | Daniel (internal) | Topology, key people, Zoho IDs, working notes. |
| `act-assessment-checklist.md` | Daniel (internal) | Every item being tracked or to-be-assessed across full fleet. |
| `act-assessment-cheatsheet.md` | Daniel (internal) | Commands with expected outputs, red/green criteria. |

## Routing Rules

When the user provides new information, decide which doc(s) get updated:

### Goes in the Management Doc
- A new identified issue with title, category, scope, priority, effort, severity, risk, blast radius, current state, ROI, dependencies, owner, status, comments
- An updated status on an existing issue
- A decision or recommendation that needs management visibility

### Goes in the Reference Doc
- A new server, IP, or topology detail
- A person's name and role
- A new Zoho project ID or convention
- An infrastructure service discovery (Zabbix at IP, Grafana host, etc.)
- Working notes that aren't deliverables

### Goes in the Checklist
- A new item to investigate or verify
- A new sub-section of an existing assessment area
- Open questions marked with `[?]` to follow up on

### Goes in the Cheatsheet
- A new command worth recording
- A new red/green diagnostic criterion
- A new section of investigation (with commands)

## Management Doc Rules

**Strict.** This is what Zach and Clint see.

- **No operational metadata they already have in Zoho** (project IDs, key people lists, owner names beyond the Owner column).
- **Issue-focused.** Every row is a tracked issue with the full column set.
- **No first/third person framing.** Use neutral voice. (See `references/zach-style-guide.md`.)
- **No em-dashes.** Use commas or restructure.
- **No embedded priority labels in prose.** Priority lives in the Priority column.

## Column Reference for the Issues Table

```
| ID | Title | Category | Scope | Priority | Effort | Severity | Risk (if unfixed) | Blast Radius (if change fails) | Current State | ROI / Value | Dependencies | Owner | Status | Comments |
```

- **ID**: INT-XX or SY1-XX once created in Zoho; otherwise leave blank
- **Category**: SRE, DBA, Sysadmin, CI/CD, Security, Observability, Automation, Virtualization
- **Scope**: Servers, Applications, Database, Network, Pipeline, VMs
- **Priority**: Critical / High / Medium / Low
- **Effort**: S / M / L / XL / XXL
- **Severity**: Critical / High / Medium / Low (current state risk)
- **Risk (if unfixed)**: One phrase
- **Blast Radius**: One phrase
- **Current State**: What exists today
- **ROI / Value**: Concrete benefit
- **Dependencies**: Other INT/SY1 IDs
- **Owner**: Daniel, Miller, etc.
- **Status**: Not Started / In Progress / Complete / Blocked

## When in Doubt

Ask: "Would Zach want to see this in the assessment report he reviews?" If yes, management doc. If no but it's useful for me, reference doc. If it's commands or technical detail, cheatsheet. If it's a TODO, checklist.
