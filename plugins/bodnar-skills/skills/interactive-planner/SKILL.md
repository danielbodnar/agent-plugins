---
name: "interactive-planner"
description: "Create iterative, phased implementation plans for new projects through structured research and interactive clarification. Use this skill whenever the user starts a new project, asks for a project plan or roadmap, wants to scaffold or initialize a codebase, or says any variant of 'let's build X', 'plan out X', 'draft an MVP plan', 'choose a framework for X', 'architect X', or 'what stack should I use for X'. Also trigger when the user asks to research tooling options or compare frameworks. Even when the user only says 'new project' or 'I want to build something', reach for this skill. It handles everything from initial research through a schema-validated ProjectSpec with CLI commands, pinned package versions, configuration files, environment variables, and deployment bindings. Skip this skill for one-off scripts, single-file utilities, quick experiments under roughly 50 lines, or when the user is working inside an already-scaffolded project."
---

# Interactive Planner

Build implementation plans through structured, iterative research phases. Each phase follows a strict inner loop (Research, Collect, Clarify, Confirm) before moving to the next. The output is a living `project-spec.json` that grows as phases complete and validates against the ProjectSpec schema bundled with this skill.

## Why This Exists

Starting a project well means making informed decisions early. This skill forces Claude to research before generating, verify before assuming, and ask before proceeding. The goal is a plan where every tool, version, config value, and design choice is grounded in current documentation rather than training data.

The output is a machine-readable, schema-validated project specification that can be consumed directly by CLI agents for fully automated project scaffolding, no interpretation required.

## When NOT to Use This Skill

The full phased process is overkill for small work. Skip it and answer directly when the request is:

- A one-off script or single-file utility (under roughly 50 lines)
- A quick exploratory prototype the user plans to throw away
- An addition or fix inside an already-scaffolded codebase (use regular engineering flow)
- A code snippet, a bug fix, or a refactor of existing code
- A question about syntax, a library, or how to do X in language Y

If the user is clearly scoping a real new project with multiple concerns (runtime, deployment, CI, integrations), this skill applies. When in doubt, ask one clarifying question about scope before starting the full run.

## Bundled Resources

This skill ships with:

| Resource | Purpose |
|---|---|
| `references/project-spec.schema.json` | The full JSON Schema 2020-12 definition. Copy into the generated project's root or a `references/` folder. |
| `references/schema-guide.md` | Human-readable index of the 26 `$defs` plus how phases map to top-level sections. |
| `references/example-run.md` | A realistic Cloudflare walkthrough showing what a normal run produces at each phase. Read when calibrating tone and depth. |
| `scripts/spec-runner.ts` | Zero-dependency Bun CLI. Copy into the generated project's `scripts/` folder and register in `package.json`. |
| `scripts/validate-spec.ts` | Thin wrapper around `bunx ajv-cli` for schema validation. Copy alongside spec-runner. |

When generating a new project, copy the schema file and both scripts into the project root. The schema belongs at `references/project-spec.schema.json` (or wherever the `$schema` field in the spec points to).

## Output Format

The skill produces a single `project-spec.json` file that conforms to the ProjectSpec JSON Schema (see `references/project-spec.schema.json`). This replaces the traditional markdown PRD.

Key properties of the output:

- **Self-describing.** The `$schema` field references the schema for validation.
- **Strongly typed.** Every field has a defined type, pattern, and description.
- **Self-contained.** Contains everything a CLI agent needs: commands, config values, file contents, prompts, directory structure, secrets metadata, deployment bindings, CI/CD workflows.
- **Incrementally built.** Each confirmed phase appends to the `phases` array and populates the corresponding top-level sections.
- **Validated.** After every phase confirmation, the spec is validated against the schema. Invalid specs are fixed before proceeding.

### File Creation

1. After Phase 0 confirmation, create `project-spec.json` with the skeleton (metadata, empty arrays for all sections).
2. After every subsequent phase, update `project-spec.json` with the phase's resolved data.
3. After all phases, validate the final spec and present it.

Create `project-spec.json` in the working directory (or project root if one exists). Copy to `/mnt/user-data/outputs/project-spec.json` and present via `present_files` after every update. Also create a human-readable `project-spec.md` summary alongside it for quick reference.

### Validation

After every update to `project-spec.json`, validate it. The bundled `scripts/validate-spec.ts` is the preferred path:

```bash
bun run scripts/validate-spec.ts
```

For a fast structural sanity check without full schema validation:

```bash
bun -e "const s=await Bun.file('project-spec.json').json(); console.log('specVersion:', s.specVersion, '| phases:', s.phases?.length ?? 0, '| deps:', (s.dependencies?.production?.length ?? 0) + (s.dependencies?.development?.length ?? 0))"
```

If validation fails, fix the spec before proceeding. Never present an invalid spec.

---

## Core Loop

Every phase follows this inner loop. All four steps are mandatory. Additional steps may be added when the phase demands it (a benchmarking step, a security audit step, and so on), but these four always run.

```
┌─────────────────────────────────────────────────────┐
│                    PHASE N                           │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌──────┐ │
│  │ Research │→ │ Collect  │→ │ Clarify │→ │Confirm│ │
│  └──────────┘  └──────────┘  └─────────┘  └──────┘ │
│       ↑                                      │      │
│       └──────── (revise if rejected) ────────┘      │
│                                              │      │
│                                     ┌────────▼────┐ │
│                                     │ Update Spec │ │
│                                     └────────┬────┘ │
│                                              │      │
└──────────────────────────────────────────────┼──────┘
                                               ▼
                                          PHASE N+1
```

### Step 1: Research

Actively search for current information. Never rely on training data for versions, CLI flags, or API surfaces.

**Platform-first principle.** When the user has a preferred platform (Cloudflare, AWS, Vercel), always search that platform's ecosystem first for forks, wrappers, and native integrations before defaulting to upstream or generic packages. For example, if the project targets Cloudflare Workers, search for `@cloudflare/*` packages before adopting upstream ones. Cloudflare maintains forks of Playwright (`@cloudflare/playwright`), Puppeteer (`@cloudflare/puppeteer`), and Playwright MCP (`@cloudflare/playwright-mcp`) that are purpose-built for their runtime. The platform's documentation, changelog, and GitHub repos are the primary research sources, ahead of blog posts or third-party guides.

**Actions:**

- Use `web_search` to find latest package versions, CLI commands, and changelog entries
- Query Context7 MCP (`resolve-library-id` then `query-docs`) for framework docs and API references
- Query Cloudflare Docs MCP (`search_cloudflare_documentation`) for Workers, D1, R2, KV, Durable Objects, Containers, Agents SDK, Workflows
- Search GitHub for starter templates, reference implementations, and awesome-lists
- Search npm registry for package metadata and latest versions
- Check the MCP registry for relevant connected servers
- Look for existing skills in `/mnt/skills/` that might be relevant

**What to research per phase:**

- Frameworks and runtimes (with version numbers)
- CLI scaffold or init commands with current flags and options
- Configuration file formats and schemas
- Linters, formatters, and their init commands (for example `bunx oxlint@latest --init`, `bunx @biomejs/biome@latest init`)
- Available MCP servers that could help during development
- LSP servers for the chosen languages
- CI/CD tooling and GitHub Actions
- Relevant Cloudflare services and bindings

**Critical rule.** If a web search or MCP query returns no results or ambiguous results for something important, do not guess. Flag it and move to Clarify.

### Step 2: Collect

Organize research findings into structured options. This is where you compile CLI commands, package versions, config file contents, schemas, and reference links.

**Actions:**

- List every discovered tool or framework as a concrete option with version
- Include the exact CLI command to install, init, or scaffold each option
- Note configuration file paths and formats
- Record links to documentation
- Search for and list relevant items from these sources:
  - Platform org repos (`cloudflare/templates`, `cloudflare/workers-sdk`, `cloudflare/agents`)
  - Awesome lists (`awesome-cloudflare-workers`, `awesome-bun`)
  - MCP server directories and registries
  - Skill directories in `/mnt/skills/`

**Present discovered options as multi-select choices.** Use `ask_user_input_v0` to let the user pick from found skills, MCP servers, linters, formatters, and agents. Group related options together.

Example (adapt to actual findings):

```
Question: "Which linting/formatting tools should we include?"
Options: ["OxLint + Biome (recommended)", "ESLint + Prettier", "dprint", "Biome only"]
Type: multi_select

Question: "Found these relevant MCP servers. Which should we use?"
Options: ["Cloudflare Developer Platform", "Context7 (docs lookup)", "GitHub MCP", "Playwright MCP"]
Type: multi_select
```

### Step 3: Clarify

Ask the user about every decision that cannot be resolved from research alone. This is where tech stack, config values, design choices, and trade-offs get resolved.

**What to clarify:**

- Runtime and framework choices when multiple viable options exist
- Configuration values that are project-specific (which browsers for Playwright, which Cloudflare zone)
- Naming conventions, directory structure preferences
- Deployment targets and environments
- Secrets management approach
- Any gaps flagged during Research

Use `ask_user_input_v0` for bounded choices. Use conversational questions for open-ended decisions (project name, domain, and so on).

**Hard stop rule.** If you cannot resolve a decision that downstream phases depend on, STOP. Do not proceed with assumptions. Tell the user exactly what is blocking and what you need from them.

### Step 4: Confirm

Present a summary of the phase's decisions and wait for explicit approval before proceeding.

Format the confirmation as:

1. Brief prose summary of what was decided
2. Key decisions table (tool → choice → version → rationale)
3. CLI commands that will be run in this phase
4. Preview of the JSON that will be added to `project-spec.json`
5. Any open questions carried forward to the next phase

Do not proceed to the next phase until the user confirms. If they reject or want changes, loop back to the appropriate step (Research if new options are needed, Clarify if different choices are needed).

After confirmation:

1. Update `project-spec.json`, adding the phase to `phases[]` and populating the corresponding top-level sections
2. Validate the updated spec
3. Copy to `/mnt/user-data/outputs/project-spec.json`
4. Present via `present_files`

After every spec update, present it to the user. The spec is the primary deliverable, so the user should always be looking at the latest version.

---

## Phase Discovery

Phases are determined dynamically based on project scope. Do not use a rigid phase list. Discover what is needed based on the project.

Most projects will include some variant of these:

| Phase | Focus | Typical Inner Loop Emphasis |
|-------|-------|-----------------------------|
| Project Foundation | Runtime, package manager, repo init, git config | Research + Clarify |
| Tooling & DX | Linters, formatters, LSP, editor config, pre-commit hooks | Collect + Clarify |
| Architecture | Service boundaries, data flow, Cloudflare bindings, state management | Research + Clarify |
| Infrastructure | Deployment, CI/CD, environments, secrets, observability | Research + Collect |
| Agent Ecosystem | MCP servers, skills, slash commands, CLAUDE.md, prompts | Collect + Clarify |
| Implementation | Feature breakdown, task ordering, test strategy | Clarify + Confirm |
| Testing & QA | Test frameworks, coverage targets, E2E setup | Research + Collect |

### Phase 0: Discovery (always runs first)

Phase 0 is itself a phase with the same Research / Collect / Clarify / Confirm loop. The subject of Phase 0 is the project roadmap itself, not implementation. In Phase 0 you:

1. Understand what the user wants to build (high level)
2. Identify the major domains and concerns
3. Propose a phase list with brief descriptions
4. Get user confirmation on the phase plan itself

Phase 0 is recorded in `phases[]` like any other phase, with `number: 0` and its decisions about scope and roadmap. Phases 1 through N are the implementation phases identified during Phase 0.

This ensures the user sees the full roadmap before diving into details.

**Calibrate effort per phase.** Not every phase needs deep research. Foundation phases (repo init, git setup, editorconfig) are well-understood, so spend minimal time on Research and more on Collect and Clarify. Architecture and integration phases (agent framework, browser automation, AI providers) need heavy Research because they involve rapidly evolving APIs and platform-specific forks. Match the depth of each step to what the phase actually demands and skip ceremony for its own sake.

See `references/example-run.md` for a realistic walkthrough showing what this tempo looks like in practice.

---

## Spec Structure: How Phases Populate Sections

Each phase populates specific top-level sections of the ProjectSpec. See `references/schema-guide.md` for the full phase-to-section mapping. Short version:

| Phase | Populates |
|-------|-----------|
| Project Foundation | `metadata`, `stack.runtime`, `stack.packageManager`, `stack.languages`, `directory`, `standards.branchStrategy` |
| Tooling & DX | `stack.tools`, `dependencies.development`, `configuration`, `standards.codingConventions`, `scripts` |
| Architecture | `stack.frameworks`, `stack.databases`, `stack.platforms`, `dependencies.production`, `deployment.targets[].bindings` |
| Infrastructure | `cicd`, `deployment`, `environment`, `scripts` (deploy, preview) |
| Agent Ecosystem | `agents`, `configuration` (CLAUDE.md, .claude/ files) |
| Implementation | `phases` (task breakdown), `scripts` (dev, build, test) |
| Testing & QA | `dependencies.development`, `configuration` (test config), `scripts` (test, coverage) |

Every phase also:

- Adds itself to `phases[]` with decisions, commands, and status
- Adds discovered links to `references[]`

---

## Initial Skeleton (created after Phase 0)

After Phase 0 confirmation, create `project-spec.json` with this structure. Populate metadata from Phase 0 decisions and leave other sections as empty arrays or objects:

```json
{
  "$schema": "./references/project-spec.schema.json",
  "specVersion": "1.0.0",
  "metadata": {
    "name": "<resolved>",
    "description": "<resolved>",
    "version": "0.1.0",
    "status": "in-progress",
    "created": "<ISO 8601>",
    "authors": [{ "name": "Daniel Bodnar", "email": "daniel@bodnar.sh", "role": "lead" }],
    "repository": "<resolved or empty>",
    "license": "MIT"
  },
  "stack": {
    "runtime": { "name": "<resolved>", "version": "<resolved>", "purpose": "Primary runtime" },
    "packageManager": { "name": "<resolved>", "version": "<resolved>", "purpose": "Package management" },
    "languages": [],
    "frameworks": [],
    "databases": [],
    "platforms": [],
    "tools": []
  },
  "directory": { "root": ".", "entries": [] },
  "dependencies": { "production": [], "development": [] },
  "configuration": [],
  "environment": { "variables": [], "secrets": [], "files": [] },
  "scripts": {},
  "phases": [],
  "agents": { "mcpServers": [], "skills": [], "commands": [], "prompts": [] },
  "cicd": { "provider": "github-actions", "workflows": [] },
  "deployment": { "targets": [] },
  "standards": {},
  "references": []
}
```

If the user's identity differs from the default shown, replace the `authors` entry accordingly. The default matches the skill author's environment.

---

## MCP Server Usage

Actively use available MCP servers during Research and Collect steps. Check which servers are connected before starting.

| MCP Server | When to Use |
|-----------|-------------|
| Cloudflare Developer Platform | Bindings, D1/R2/KV schemas, Workers config, container setup |
| Cloudflare API | Search Cloudflare OpenAPI spec, execute API calls |
| Cloudflare Docs | Search official Cloudflare documentation |
| Context7 | Look up any npm package docs. Resolve library ID first, then query |
| GitHub (gitlab MCP) | Search repos, find templates, check CI/CD configs |
| Nushell | When the project involves Nushell scripts or tooling |

If a useful MCP server is available but not connected, use `search_mcp_registry` and `suggest_connectors` to recommend it.

---

## Discovery: Finding External Resources

When researching, actively search for resources beyond what is immediately obvious. This is the *how* of the Research step. Without it, you will produce generic web searches instead of targeted ecosystem discovery.

### Platform-first search order

Before searching for any upstream or generic package, check whether the user's target platform has a fork or native integration.

Search order for every dependency:

1. Platform's own packages first (`@cloudflare/*`, `@vercel/*`, `@aws-sdk/*`)
2. Platform's documentation and changelog for supported integrations
3. Platform's GitHub org for forks and starter templates
4. Only then: upstream or generic packages from npm

For example, if the project targets Cloudflare Workers and needs Playwright, search for `@cloudflare/playwright` and `@cloudflare/playwright-mcp` first. Do not default to `@playwright/mcp`, since it will not work on Workers without the CF fork. Check `developers.cloudflare.com` for canonical docs.

### Where to search

**GitHub repos and templates.** Search the platform org first: `cloudflare/templates`, `cloudflare/workers-sdk`, `cloudflare/agents`, `cloudflare/sandbox-sdk`, `cloudflare/containers`. Search for starters: `site:github.com [FRAMEWORK] starter template [YEAR]`. Check star count (adoption), last commit (maintained?), license, README quality.

**Awesome lists.** Search `awesome-[TECHNOLOGY]` repos on GitHub. Key ones include `awesome-cloudflare-workers`, `awesome-bun`, `awesome-nu`, `awesome-hono`, `awesome-mcp-servers`, `awesome-astro`. Scan them for tools in the user's chosen stack, alternatives, and infrastructure helpers.

**MCP servers and registries.**

1. Check connected servers first: `search_mcp_registry`
2. Search the registry with project-domain keywords
3. Suggest connections: `suggest_connectors` for useful unconnected servers
4. GitHub search: `site:github.com mcp-server [DOMAIN]` for community servers

**npm and package registries.** Use `bun info [PACKAGE]` or web search for latest versions. Use the Context7 MCP two-step flow (`resolve-library-id` then `query-docs`) for current API docs and CLI flags. Never trust training data for versions. Always verify.

**Local skills.** Scan `/mnt/skills/user/`, `/mnt/skills/public/`, `/mnt/skills/examples/` for existing skills. Read the SKILL.md frontmatter to understand what each does. Present relevant ones as options.

**Skills and agents on GitHub.** Search for `site:github.com claude-code skill SKILL.md`, `site:github.com ".claude/commands"`, `site:github.com "claude.md" [DOMAIN]` for reusable skills, slash commands, and agents.

**Cloudflare service selection** (when the project targets Cloudflare). Research which services fit the need: Workers, Durable Objects, D1, R2, KV, Queues, Workflows, Browser Rendering, Workers AI, AI Gateway, Vectorize, Containers, Agents SDK. Use the Cloudflare Docs MCP or `developers.cloudflare.com` to match needs to services.

### Search strategies

**For a new project type.** Start broad (`[PROJECT_TYPE] starter template [YEAR]`), find the ecosystem (`awesome-[FRAMEWORK]`), narrow to tooling (`[FRAMEWORK] [TOOL_CATEGORY] recommended`), verify versions via Context7 or npm, find examples (`site:github.com [FRAMEWORK] example [FEATURE]`).

**For comparing alternatives.** Search `[TOOL_A] vs [TOOL_B] [YEAR]`, check npm download counts, check GitHub stars and activity, look for benchmarks, present findings as multi-select with differentiators.

**When research hits a dead end.** Try the tool's official docs URL directly (`web_fetch`), try the GitHub repo README, try `[TOOL] changelog [VERSION]`. If still nothing, STOP and tell the user. Do not guess.

Always present discoveries as choices. Do not silently adopt tools. Let the user see what is available and pick. Use `ask_user_input_v0` with `multi_select` for tool categories with 2 to 4 good options.

---

## Important Behaviors

1. **Never assume versions.** Always verify via web search, npm registry, or Context7. Training data is stale.
2. **Never skip Clarify.** Even when the research phase answered everything, confirm your understanding with the user.
3. **Never skip Confirm.** Every phase needs explicit user approval before appending to the spec.
4. **Hard stop on insufficient info.** If you cannot find reliable information about a critical dependency, stop and tell the user what is missing.
5. **Prefer scaffold commands over hand-writing config.** If `bunx wrangler@latest init` or `bunx oxlint@latest --init` exists, use it instead of writing config files manually. Record the command in the `generatedBy` field of the ConfigFile entry.
6. **Present options, do not prescribe.** Research should surface multiple viable paths. Let the user decide.
7. **Keep the spec as the source of truth.** Every decision goes in `project-spec.json`. If it is not in the spec, it was not decided.
8. **Present the spec after every update.** Use `present_files` after every phase confirmation.
9. **Search platform-first.** When the user has a target platform, search that platform's ecosystem for forks and native packages before adopting upstream or generic alternatives.
10. **Validate after every update.** The spec must always be valid against the schema. Fix before proceeding.
11. **Respect the skip-cases.** If the request matches the "When NOT to use" criteria, answer directly instead of running the full phased process.

---

## Spec Runner

The bundled `scripts/spec-runner.ts` is a zero-dependency Bun CLI that reads `project-spec.json` and executes its initialization steps. It is the canonical way to bootstrap a new project from a spec.

### When to generate it

After the final phase is confirmed (or when the user says "generate the init script"), copy `scripts/spec-runner.ts` from this skill into the project root's `scripts/` folder and register it in `package.json`.

Copy `scripts/validate-spec.ts` alongside it so the project can run schema validation without a separate install step.

### package.json registration

Add these entries to the project's `scripts` section in `package.json`:

```json
{
  "scripts": {
    "spec:init":     "bun run scripts/spec-runner.ts",
    "spec:list":     "bun run scripts/spec-runner.ts --list",
    "spec:dry-run":  "bun run scripts/spec-runner.ts --dry-run",
    "spec:env":      "bun run scripts/spec-runner.ts --env",
    "spec:secrets":  "bun run scripts/spec-runner.ts --secrets",
    "spec:validate": "bun run scripts/validate-spec.ts"
  }
}
```

Mirror them into the `scripts` section of `project-spec.json` itself (see the file for description strings).

### CLI summary

| Command | Description |
|---------|-------------|
| `bun run spec:init` | Run all confirmed phase commands in order |
| `bun run spec:init -- --phase "Foundation"` | Run only commands from phases matching a name substring |
| `bun run spec:dry-run` | Preview what would run without executing |
| `bun run spec:list` | List all phases, commands, and package.json scripts |
| `bun run spec:env` | Write `.env.example` from `environment.variables` |
| `bun run spec:secrets` | Print secret provisioning commands from `environment.secrets` |
| `bun run spec:validate` | Validate `project-spec.json` against the schema |

See the header comment in `scripts/spec-runner.ts` for full flag documentation and behavior notes (fail-noisy, dry-run safety, phase substring match).

### Adding the runner to `directory` in the spec

When registering the runner, add entries to `directory.entries`:

```json
[
  { "path": "scripts/spec-runner.ts", "kind": "file", "purpose": "Bun CLI that executes project-spec.json initialization steps. Run via spec:* package.json scripts." },
  { "path": "scripts/validate-spec.ts", "kind": "file", "purpose": "Bun CLI that validates project-spec.json against the ProjectSpec schema." },
  { "path": "references/project-spec.schema.json", "kind": "file", "purpose": "JSON Schema 2020-12 definition of the ProjectSpec. Referenced by $schema in project-spec.json." }
]
```

---

## Full Walkthrough

For a realistic end-to-end example of a planning run (Cloudflare URL shortener, 5 phases plus Phase 0), see `references/example-run.md`. It shows what each step of the loop actually produces, the tempo of a normal run, and how the spec grows after each phase.
