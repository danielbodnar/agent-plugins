---
name: bitbuilder-prospector
description: Run the BitBuilder Cloud unsolicited-redesign proposal pipeline end-to-end for a single local business. Use this skill whenever Daniel wants to crawl a business's existing website, build a one-page redesign, deploy it to a password-gated preview at a bitbuilder.cloud subdomain with a Durable Object lifecycle state machine, provision a Stripe Payment Link, and draft the cold outreach email. Trigger on mentions of "prospector", "redesign proposal", "nealins preview", "launch a preview", "bitbuilder outreach", or when Daniel mentions running the pipeline on a specific target URL.
---

# BitBuilder Prospector

Plan-first, phase-gated pipeline for generating and deploying one unsolicited
website redesign proposal at a time. Every phase starts in Plan mode and
waits for explicit human approval before executing.

## Operating principles

Three rules that shape everything this skill does.

**Plan before acting, always.** Every phase begins by reading its
reference doc and producing a written plan describing what it will do,
what files it will touch, what network calls it will make, and what the
acceptance criteria are. Then it stops and waits. Only `go` advances.
Not `yes`, not `looks good`, not `proceed`. Only `go`. `redo` restarts
the current phase. `stop` halts the run.

**Idempotent and resumable.** Every phase writes its state to
`./leads/{slug}/state.json` at completion. A run interrupted mid-phase
can be resumed by re-invoking the skill with the same slug.

**Human-verifiable at every boundary.** Every artifact produced is a
plain file on disk (JSON, Markdown, HTML, TypeScript) that Daniel can
read, edit, or reject. No opaque state lives only in the agent's head.

## Identity (fixed, do not override)

- Operator: Daniel Bodnar, BitBuilder Cloud LLC
- Operator email (all From: headers, footers, contact lines): `daniel@bitbuilder.io`
- Cloudflare account ID: `5dae265f74e6077ad674a3d855bf9853`
- Preview domain: `{slug}.bitbuilder.cloud`
- R2 bucket: `bitbuilder-prospector`
- D1 database: `outreach`
- Writing style: plain, precise, no em-dashes ever, no hyperbolic
  phrases, no "not X but Y" contrasts
- Runtime: Bun + TypeScript (strict). **Never generate Python code.**

## Pipeline at a glance

```
Phase 0  Preflight, opt-out check, infra provision
Phase 1  Intelligence: Radar scan + wget mirror + TLS check
Phase 2  Extract: HTML → structured content
Phase 3  Design plan: hero, palette, sections
Phase 4  Build: dist/index.html + beacon.js + og-image
Phase 5  QA: screenshots, a11y, perf
Phase 5.5 QC reviewer: adversarial pass, ship/revise/halt verdict
Phase 6  Deploy: Worker + DO + Access + Stripe Payment Link
Phase 7  Draft outreach + followup emails (do not send)
```

Each phase has its own reference doc under `references/`. Read the
reference doc for the current phase BEFORE producing the plan.

## How to run

When invoked, follow this sequence exactly:

1. Read `references/overview.md` to load the full pipeline context.
2. Ask Daniel for: `TARGET_URL` (required), `CLIENT_EMAIL` (optional),
   `BUSINESS_NAME` (optional), `LEAD_SOURCE` (optional), `SLUG` (optional).
3. Determine `{slug}`:
   - If `SLUG` was provided explicitly, validate and use it.
   - Otherwise derive from the apex domain (lowercase, dots → hyphens).
   Validation rules:
   - Matches `/^[a-z0-9][a-z0-9-]{0,62}$/` (DNS-safe subdomain label)
   - Does not start or end with hyphen
   - Is not already in use (D1 `leads.slug` uniqueness check in Phase 0)
4. Check for existing `./leads/{slug}/state.json`. If present, read it
   and resume from the recorded phase. Otherwise start at Phase 0.

Explicit slug enables A/B testing and iteration. Same target URL can
be deployed multiple times under different slugs. Examples:
   - `nealins` → `nealins.bitbuilder.cloud`
   - `nealins-com` → `nealins-com.bitbuilder.cloud` (default)
   - `nealins-v3` → `nealins-v3.bitbuilder.cloud`
   - `nealins-claude-code-2026-04-18` → long but legal
5. For the current phase, read `references/phase-{N}.md`.
6. Produce the Plan (see "Plan format" below). Stop and wait.
7. On `go`: execute the phase, write outputs, update `state.json`,
   append to `decisions.log`, print the completion summary, and wait
   at the next phase's Plan stage.
8. Repeat until Phase 7 or until `stop`.

## Plan format

Every phase plan is a Markdown block with these sections. Print it to
the conversation; do not save to file until after execution.

```markdown
## Plan: Phase {N}: {phase name}

### Objective
One sentence describing the goal of this phase.

### Inputs
What this phase reads. List every file path and every MCP call.

### Actions
Numbered list of what will happen in order. Each action names the
specific command, tool, or MCP method.

### Outputs
Every file that will be created or modified, with its full path.

### Network activity
Every external call: MCP server, domain fetched, API called. If none,
say "None."

### Acceptance criteria
Concrete, checkable conditions that define success.

### Risks or open questions
Anything ambiguous, any decision the agent is making on behalf of
Daniel that he might want to override.

---
**Awaiting confirmation. Reply `go`, `redo`, or `stop`.**
```

Never proceed without the literal word `go`. If the user gives any
other response (questions, tweaks, partial confirmations), treat it as
feedback: revise the plan and re-present for approval.

## Opt-out discipline (non-negotiable)

Phase 0 runs an opt-out check against D1 `outreach.opt_outs` keyed on
the apex domain. If any row exists, ABORT the run. Not "confirm and
proceed," not "escalate to Daniel". Abort. Opt-outs are sacred and
cannot be overridden from within the pipeline. If Daniel genuinely
wants to re-engage an opted-out domain, that requires manual D1 deletion
outside the skill.

## Phase-specific guidance

Each phase has detailed instructions in its reference file. Read these
just-in-time, one at a time, not all upfront.

- `references/phase-0-preflight.md`: opt-out, provisioning, state init
- `references/phase-1-intel.md`: Radar, wget, TLS, R2 upload
- `references/phase-2-extract.md`: HTML parsing → extracted.json
- `references/phase-3-design.md`: palette, typography, sections
- `references/phase-4-build.md`: dist/index.html + beacon.js
- `references/phase-5-qa.md`: screenshots, a11y, perf
- `references/phase-5.5-qc.md`: adversarial review rubric
- `references/phase-6-deploy.md`: Worker + DO + Access + Stripe
- `references/phase-7-outreach.md`: email drafts (never send)
- `references/lifecycle-state-machine.md`: the DO state transitions
- `references/success-metrics.md`: quality gates, KPIs, SLOs

## Templates

Pre-built scaffolds under `templates/`:

- `worker.ts.tmpl`: Worker + DO skeleton
- `wrangler.jsonc.tmpl`: deploy config skeleton
- `beacon.js.tmpl`: review-tracking script
- `outreach.eml.tmpl`: cold email structure
- `followup.eml.tmpl`: 4-day nudge
- `goodbye.html.tmpl`: soft-deleted landing page

Templates contain `{{PLACEHOLDERS}}`. Phase 4 and Phase 6 fill them in.

## Helper scripts

Deterministic utilities under `scripts/`. Run these instead of
reimplementing their logic in-conversation.

- `scripts/setup-infrastructure.ts`: create R2 bucket + D1 database + tables
- `scripts/opt-out-check.ts`: query D1 for a domain
- `scripts/crawl.sh`: wget wrapper with the correct flags
- `scripts/compliance-check.ts`: regex checks for em-dashes, Python, stock URLs
- `scripts/stripe-provision.ts`: create per-slug Payment Link
- `scripts/deploy.ts`: wrangler deploy + DNS + Access app creation

All scripts are Bun-compatible TypeScript (except `crawl.sh`). None
import Python anything.

## Guardrails

- Never skip the Phase 0 opt-out check
- Never modify `./leads/{slug}/mirror/` after Phase 1
- Never send email
- Never deploy without showing the filled-in templates for approval
- Never use a subdomain other than `{slug}.bitbuilder.cloud`
- Never generate Python code
- Never use em-dashes in any output
- If franchise/chain trademarks are detected, stop and ask
- Every non-obvious decision appends a line to `decisions.log` with
  ISO timestamp, phase, decision, reasoning

## Error recovery

Mid-phase failure rolls back that phase's outputs:
- Phase 1 fail: remove `mirror/` and `rendered/`
- Phase 4 fail: remove `dist/`
- Phase 6 fail: remove Worker, DNS record, Access app, and Stripe
  Payment Link if any were partially created

`state.json` is the resume anchor. On restart, read it and continue
from the last completed phase.

## When to stop and ask rather than decide

- The target URL is clearly outside the local-SMB target (publicly
  traded, 500+ employees, Fortune-ranked)
- Franchise or chain trademarks detected in crawl
- Radar scan reveals enterprise-grade infra (Akamai, Fastly origin
  shield, Cloudflare Enterprise)
- The extracted content is implausibly sparse (under 100 words total)
- Any phase's acceptance criteria cannot be met after one `redo`
