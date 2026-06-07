---
name: act-platform-engineering
description: Toolkit for Daniel Bodnar's Animal Care Technologies (ACT) platform engineering, SRE, sysadmin, and DBA work. Use this skill whenever the user mentions ACT, vsurv_production, dbprimary, pimsserver, payment gateway reliability, Zach's Bodnar Tasks, Internal Needs (EC-142), Sysadmin/IAC (EC-120), Zoho Projects task or issue creation, PostgreSQL or ZFS assessment on ACT infrastructure, PVE nodes (10.0.50.1-3), the act-infra repo, WAL shipping, dbhotswap failover, PVE3 failing drives, PowerEdge 730, Pims Garden, Miller, Ben Jumper, the assessment cheatsheet or checklist, observability deployment (Grafana, Netdata), centralized log management, secrets management, or pimsserver branch consolidation. Trigger even when the user uses shorthand like "the assessment", "the checklist", "INT-XX", "SY1-XX", or references infrastructure work without explicit naming. Also use when drafting Zoho tasks/issues, running assessment commands on dbprimary, or generating documentation for ACT infrastructure.
---

# ACT Platform Engineering Skill

A comprehensive toolkit for the Animal Care Technologies infrastructure assessment and remediation work, structured around the actual roles, responsibilities, and recurring tasks Daniel performs as an embedded platform engineer for Patterson Companies at ACT.

## Quick Start

When triggered, identify which mode applies and route to the appropriate resource:

| User Intent | Resource |
|-------------|----------|
| Assess a host or component | `commands/` — one-shot diagnostic commands |
| Draft new Zoho task or issue | `prompts/zoho-task.md`, `prompts/zoho-issue.md` |
| Update assessment docs | `prompts/update-assessment.md` |
| Investigate a problem | `agents/` — role-specific reasoning prompts |
| Look up environment facts | `references/environment.md` |
| Look up command syntax | `references/cheatsheet.md` |

## Operating Principles

These are non-negotiable. They reflect how Daniel works and what he expects.

### Style and tone

- **No em-dashes.** Use commas, parentheses, or restructure the sentence.
- **No first/third person framing in task descriptions.** Phrase as "X is needed", "Y has been overlooked", not "I want" or "we should".
- **Match Zach's conversational-but-professional tone** for task and issue descriptions. Read `references/zach-style-guide.md` for the canonical examples.
- **Management-facing docs are clean.** Omit operational metadata managers already have in Zoho (key people, project IDs, internal tooling notes). Those belong in the working reference doc.
- **Internal reference material is separate from deliverables.** Never collapse them.

### Scope discipline

- A scoping comment about one tool or script does not collapse the broader artifact. The full assessment fleet stays in the checklist; the bash/bun assessment script targets `vsurv_production` on `172.28.2.1` specifically.
- The assessment cheatsheet (`references/cheatsheet.md`) covers the full assessment surface area. The management deliverable stays issue-focused.

### Zoho Projects conventions

- **Tasks** = high-level, abstract project management items (categories).
- **Issues** = lower-level, concrete actionable work items (the bugs API).
- Internal Needs project ID: `1572268000010985429` (EC-142, prefix INT)
- Sysadmin/IAC project ID: `1572268000006485005` (EC-120, prefix SY1)
- Portal ID: `710279869`
- Daniel's zpuid: `1572268000000859032`
- Auth header is `Authorization: Zoho-oauthtoken {token}`, NOT `Bearer`
- Omit the `flag` field on issue creation
- Use exact namespaced tool names like `zoho:ZohoProjects_get_projects_list`

### Technical philosophy

- Simplicity over cleverness. Flat declarative files. Minimal abstractions.
- Overlay-based approaches (sysext, confext, bind mounts) over rebuilding root filesystems.
- Align with upstream platforms. Be thin glue. Data is data (native formats).
- systemd purity. Arch Linux for hosts. Alpine Linux only for portable service rootfs images (does not run systemd, uses OpenRC).
- **STOP and ASK** if a request contradicts these.

## Directory Map

```
act-platform-engineering/
├── SKILL.md                       (you are here)
├── commands/                       (one-shot diagnostic commands)
│   ├── assess-postgres.md
│   ├── assess-zfs.md
│   ├── assess-replication.md
│   ├── assess-backups.md
│   ├── assess-kernel.md
│   ├── assess-disks.md
│   ├── assess-pve.md
│   ├── triage-dbprimary.md
│   └── grafana-netdata-status.md
├── agents/                         (role-specific reasoning prompts)
│   ├── dba.md
│   ├── sre.md
│   ├── sysadmin.md
│   ├── platform-engineer.md
│   ├── observability-engineer.md
│   ├── security-engineer.md
│   ├── incident-responder.md
│   └── reporting-analyst.md
├── prompts/                        (templates for recurring outputs)
│   ├── zoho-task.md
│   ├── zoho-issue.md
│   ├── update-assessment.md
│   ├── update-checklist.md
│   ├── update-cheatsheet.md
│   ├── weekly-status.md
│   ├── incident-postmortem.md
│   └── runbook.md
├── references/                     (lookup material)
│   ├── environment.md              (full server inventory and topology)
│   ├── cheatsheet.md               (assessment commands with red/green criteria)
│   ├── zach-style-guide.md         (tone reference)
│   ├── bodnar-tasks.md             (current task list, neutral voice)
│   ├── internal-needs-issues.md    (current issues queue)
│   └── zoho-api.md                 (API quirks and gotchas)
└── scripts/                        (executable utilities)
    ├── zoho-create.sh              (generic Tasks/Issues creator)
    └── triage-dbprimary.sh         (10-command read on dbprimary)
```

## How to Use

### When the user asks to assess something

1. Identify the host and component.
2. Look up the relevant command file in `commands/`.
3. Run the commands or output them with red/green diagnostic criteria from `references/cheatsheet.md`.
4. If findings warrant a new issue, draft it using `prompts/zoho-issue.md`.

### When the user asks to draft a Zoho task or issue

1. Read `prompts/zoho-task.md` or `prompts/zoho-issue.md`.
2. Read `references/zach-style-guide.md` for tone.
3. Read `references/bodnar-tasks.md` to ensure no duplication.
4. Draft the item in neutral voice, no em-dashes, story-based framing.
5. If creating in Zoho, use `scripts/zoho-create.sh` with a JSON or CSV input.

### When the user asks to update assessment docs

1. Identify which doc: management-facing (`act-infrastructure-assessment.md`), working reference (`act-assessment-reference.md`), checklist (`act-assessment-checklist.md`), or cheatsheet (`act-assessment-cheatsheet.md`).
2. Read `prompts/update-assessment.md` for the conventions specific to each doc.
3. Apply changes precisely. Do not collapse scope.

### When the user asks for advice in a specific role

1. Read the matching agent file in `agents/`.
2. The agent file describes how that role thinks, what it prioritizes, and what it would do next.
3. Respond from that role's perspective.

### When the user needs a refresher on the environment

1. Read `references/environment.md` for the topology, IPs, hostnames, and known issues.
2. Read `references/cheatsheet.md` for command syntax.

## Critical Reminders

- **Bash scripting gotcha**: avoid `((var++))` with `set -euo pipefail` when incrementing from 0. Use `var=$((var + 1))` instead.
- **CSV parsing**: use Python3 `csv.DictReader` for fields with quoted commas.
- **Excalidraw diagrams**: `cameraUpdate` element sets viewport and goes first; labels use nested `{text, fontSize}` objects; arrows require `points` arrays; rounded rectangles use `roundness: {"type":3}`.
- **GitLab**: internal instance at `gitlab.4act.com` (WireGuard-accessible).
- **act-infra repo**: systemd v260+ GitOps IaC, Arch Linux hosts, Alpine only for portable service rootfs images.
