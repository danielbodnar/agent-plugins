---
name: bb-deployer
description: Translate a Claude artifact (claude.ai prototype or React + Tailwind interactive artifact) into a production monorepo on Daniel's stack (Bun, TypeScript strict, Vue 3 or Astro, Hono, Cloudflare Workers) and deploy to BitBuilder Cloud. Use this skill whenever Daniel mentions deploying or shipping a Claude artifact, productionizing a prototype, handing off a design to Claude Code, taking a claude.ai build to Cloudflare, turning a prototype into a real project, "bb-deployer", "bb-deploy", "bb-handoff", "make this real", "ship this", "deploy this", or migrating React artifacts to his preferred stack. Walks eight phases (Analyze, Plan, Initialize, Config, Implement, Test, Deploy, Review) and prompts for the configuration it cannot infer. Trigger even on phrases like "let's productionize this", "wire this up to BitBuilder", or "let's get this on Cloudflare" referring to a prototype, and when Daniel uploads an artifact or shares a claude.ai link while talking about deploying it.
argument-hint: '[artifact-url-or-path]'
allowed-tools: Bash(wrangler *), Bash(gh *), Bash(ls *), Bash(cat *), Bash(jq *), Bash(npx *)
---

# bb-deployer

A Cloudflare-Orange-style codex for shipping a Claude artifact to production on BitBuilder Cloud. The skill walks eight phases in order, with each phase pointing at a focused reference that says how to do that one thing well. Phases can be entered out of order when Daniel says "skip ahead to deploy" or "we already analyzed, go to plan".

## What this skill solves

Artifacts from claude.ai are built in React and Tailwind because that is what the artifact runtime gives Claude. Daniel ships on Bun, TypeScript strict, Vue 3 or Astro, Hono, and Cloudflare Workers, deployed to BitBuilder Cloud. The handoff between those two stacks is toilsome and recurring. This skill is the bridge: ingest the artifact, confirm the stack, scaffold the monorepo via upstream CLIs, translate the prototype, configure tooling, test, deploy, and reflect.

## Sane defaults reminder

If a step in this skill contradicts Daniel's Sane Defaults Philosophy, stop and surface the conflict before proceeding. The skill orchestrates upstream tools (`bun init`, `bunx create-cloudflare`, `bun create vue`, `bun create astro`, `bunx wrangler`, `bunx biome`); it never re-implements them. If a phase reference reads like a parallel competing system, treat that as a bug in the reference, not a feature.

## Artifact source

$ARGUMENTS

When the section above is empty or just literal `$ARGUMENTS` (no substitution happened), fall back to the input-detection rules in `references/01-analyze.md`: uploaded files first, then pasted code in the conversation, then a `claude.ai/share` URL Daniel provides.

## Environment snapshot

Captured at skill invocation. Phase 2 (Plan) consults this to propose bindings, decide on GitHub repo creation, and identify helper skills worth composing in. Phase 7 (Deploy) re-checks the wrangler account before provisioning. If a command shows an error or "not authenticated", surface it to Daniel during Plan rather than discovering it at Deploy.

### Cloudflare and GitHub auth

- Wrangler account: !`wrangler whoami 2>&1 | head -5 || echo "wrangler not authenticated"`
- GitHub auth: !`gh auth status 2>&1 | head -3 || echo "gh not authenticated"`

### Locally available helper skills and agents

- Personal skills (`~/.claude/skills/`): !`ls -1 ~/.claude/skills/ 2>/dev/null | tr '\n' ',' | sed 's/,$//' | grep . || echo "none"`
- Project skills (`.claude/skills/`): !`ls -1 .claude/skills/ 2>/dev/null | tr '\n' ',' | sed 's/,$//' | grep . || echo "none"`
- Project agents (`.claude/agents/`): !`ls -1 .claude/agents/ 2>/dev/null | tr '\n' ',' | sed 's/,$//' | grep . || echo "none"`
- Project MCPs: !`cat .mcp.json 2>/dev/null | jq -r '.mcpServers | keys | join(",")' 2>/dev/null || echo "none"`

### Composition candidates

During Phase 2, scan the personal and project skill lists above for names that fit this artifact's inferred stack. Likely candidates and what they bring:

- `cloudflare-compose`: product-aware scaffolding when the artifact spans multiple Cloudflare primitives.
- `aitmpl-compose`: bundle agents, commands, MCPs, hooks, and skills into a project workflow.
- `nushell`: when Daniel asks for shell tooling alongside the project.
- `interactive-planner`: richer ProjectSpec capture if the Plan phase is going to be long-lived.
- `hallmark`: design audit or redesign pass before translation.
- `engineering-handbook`: scaffolding a docs/ handbook alongside the deploy.

Propose composition explicitly during Plan rather than silently invoking. Composition is a Sane Defaults decision and Daniel owns it.

## Bundled tooling

The skill ships a modular bootstrap dispatcher at `scripts/init.ts` plus a module library under `scripts/init/`. The dispatcher applies tooling (linters, formatters, CI workflows, AI assistant config, security scanners, git hygiene, editor settings) to the target project in idempotent passes. Phase 4 (Config) invokes it; the module catalog and build status live in `scripts/init/MODULES.md`. Read that file before Phase 4 to know which tools are dispatcher-driven and which still follow the prose in `references/04-config.md`.

## The codex

When you need to **read and understand the artifact** (component graph, state model, data flow, design tokens, implied bindings), follow `references/01-analyze.md`. Output: `bb-deployer-analysis.md` in the conversation workspace.

When you need to **confirm the target stack and produce a ProjectSpec** (frontend framework, bindings, auth, domain, secrets), follow `references/02-plan.md`. Output: `bb-deployer-spec.json` validated against the schema described in that file.

When you need to **scaffold the empty monorepo** using upstream CLIs (`bun init`, `bunx create-cloudflare`, `bun create vue` or `bun create astro`, Bun workspaces, Tailwind, git), follow `references/03-initialize.md`. Output: a repo on disk where `bun run dev` boots cleanly with no application code yet.

When you need to **configure tooling** (Biome, tsconfig strict, wrangler.jsonc, GitHub Actions CI and deploy, Dependabot, `.env.example`, op-env wiring, claude.yml, README skeleton), follow `references/04-config.md`. Output: a lint-clean, CI-ready repo.

When you need to **translate the artifact** into the configured monorepo (React-to-Vue or React-to-Astro components, API calls into Hono routes, shared types via Zod, Tailwind config from extracted tokens), follow `references/05-implement.md`. Output: a working local app at functional parity with the artifact.

When you need to **add a regression net** (Vitest unit tests for shared schemas and Hono handlers, a Playwright smoke test, optional `testgen-action` integration), follow `references/06-test.md`. Output: `bun test` and `bunx playwright test` both green.

When you need to **deploy to BitBuilder Cloud** (account selection, binding provisioning, secrets via op-env, `wrangler deploy`, custom domain on bitbuilder.cloud, smoke verify), follow `references/07-deploy.md`. Output: a live URL serving the translated app.

When you need to **reflect and capture improvements** for the next handoff and for the skill itself, follow `references/08-review.md`. Output: a History entry in the project README and, where warranted, a proposed change to this skill for Daniel to accept.

## Locked-in defaults

Do not ask Daniel about these. They are his preferences from CLAUDE.md and his project memory, and re-asking them on every invocation is friction the skill exists to remove.

Runtime and package manager: Bun. Language: TypeScript strict. Backend framework: Hono on Cloudflare Workers. Styling: Tailwind, preserved from the artifact. Linter and formatter: Biome. Schema and validation: Zod. Secrets: 1Password via op-env. Deploy target: Cloudflare account associated with BitBuilder Cloud. Default domain: `<project-name>.bitbuilder.cloud`.

If Daniel asks for something outside this list (Python backend, Vercel deploy, ESLint instead of Biome), treat it as a Sane Defaults conflict, surface it, and wait for an explicit override before proceeding.

## Runtime elicitation

After the Analyze phase produces `bb-deployer-analysis.md`, ask Daniel for the following before moving to Plan. Bundle the questions; one round-trip beats seven.

The project name (used for repo directory, Worker name, and subdomain). Propose a default derived from the artifact and let him override.

Repo scope: new standalone repo, or merge into an existing repo. Default to new standalone.

Frontend framework: Vue 3 + Vite or Astro + islands. The analyze phase produces an interactivity score (0 to 10) and the plan reference has a decision tree mapping the score to a proposal. Confirm before scaffolding.

Bindings to provision. List what the analysis inferred (D1, KV, R2, Durable Objects, Queues, Vectorize, Workers AI) and ask him to confirm, add, or remove.

Custom domain. Default to `<project-name>.bitbuilder.cloud`; allow override to an existing domain or to `*.workers.dev` for throwaway tests.

Secrets handling. For each secret the analysis surfaces, ask whether to wire it through op-env now, prompt at deploy time, or leave for later.

GitHub repo creation. Create now via `gh repo create`, or stay local-only for the first iteration.

## Cross-phase notes

**Artifact ingestion.** The Analyze phase accepts three input modes: a `claude.ai/share` URL fetched via `web_fetch`, pasted artifact source from the conversation, or an uploaded file under `/mnt/user-data/uploads/`. The skill auto-detects which mode applies. When more than one is present, prefer uploaded files first, then pasted code, then URL.

**Monorepo layout.** Default is a flat Bun workspace with `apps/web` (frontend) and `apps/api` (Worker + Hono), and shared types under `packages/shared`. When the artifact is small enough to live in a single Worker with static assets, collapse to a single-package layout and skip workspace overhead.

**Naming conventions.** Repo, Worker, and subdomain share the same `<project-name>` slug. Local dev ports follow upstream defaults: 8787 for the Worker, 5173 for Vite, 4321 for Astro.

**When this skill ends.** After phase 8 finishes, the artifact is live, the README has a History entry, and any proposed skill improvements are surfaced for Daniel to accept. If patterns emerged across multiple invocations that look identical, note them as candidates for extraction into a standalone Bun script (the next stage in the skill, then scripts, then CLI, then MCP progression).

## Quick start

For a linear invocation, work phases 1 through 8 in order, reading each reference as you reach it. The references are sized to load on demand without bloating context up front. If Daniel says "we already did X, skip to Y", honor that and start at the named phase.
