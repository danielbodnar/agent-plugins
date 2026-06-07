---
name: cloudflare-compose
description: Discover, select, and compose Cloudflare templates, starters, reference architectures, demos, and GitHub repos into a unified new project. Use whenever the user wants to start a Cloudflare project combining multiple products (Workers, D1, R2, KV, Durable Objects, Queues, Workflows, Agents, Containers, Sandboxes, Vectorize, Workers AI, Hyperdrive, etc.), mentions "create-cloudflare", "npm create cloudflare", "new cf project", "compose templates", "scaffold cf monorepo", "reference architecture", asks for the exact `npm create cloudflare` invocation or the `cf agent-context` for any cf product, or names the cf services a concept will use. Produces an interactive selector artifact, a `setup.ts` scaffold script, and a deep refactor to a unified codebase. Ships a filesystem-routed CLI under `scripts/commands/` carrying every `npm create cloudflare` invocation from the docs, plus runtime hooks for `cf agent-context`, `npx skills find/add`, and `npx autoskills`.
---

# cloudflare-compose

A multi-phase skill for turning a concept plus a known set of Cloudflare products into a fully composed, unified project.

## What you are doing

The user has an idea and knows which Cloudflare primitives it will use. Your job is to:

1. Present them the full catalog of Cloudflare templates, starters, reference architectures, and demos, plus let them add arbitrary GitHub repos, NPM packages, or docs URLs.
2. Capture their selection through an interactive artifact.
3. Scaffold every selection into a monorepo.
4. Analyze the resulting codebases.
5. Deep-refactor everything into one coherent project (L3 synthesis — unified `wrangler.jsonc`, Bun-workspace root `package.json`, consolidated `tsconfig.json`, restructured `src/`, documented migrations).

## Environment awareness

This skill runs in two places:

- **claude.ai**: Render the selector artifact (phases 1 through 3), emit `setup.ts`, optionally scaffold inside the claude.ai container for analysis, then present artifacts and files back.
- **Claude Code**: Same selector (opened in a browser or copy-pasted payload), then run `setup.ts` on the user's real filesystem, analyze, and perform L3 synthesis in-place.

Detect which you are in by checking whether you can create HTML artifacts (claude.ai) or run bash against the user's working directory (Claude Code). The skill body is identical; only the execution surface differs.

### Script language: default to TypeScript (Bun), gate Nushell

All scripts in this skill are TypeScript, invoked through their `#!/usr/bin/env bun` shebang (e.g. `./scripts/cli`, `./scripts/regenerate`). Bun strips TypeScript natively — no transpile step, no `--experimental` flags. If Bun is not installed, run `./scripts/init` first; it installs Bun globally via npm, then installs `cf@latest` and `wrangler@latest` globally via Bun. Every script the skill **generates** for the user (the scaffold init script) also defaults to TypeScript run by Bun.

Only emit Nushell (`.nu`) scripts when one of these conditions holds:

1. You have verified `nu` is on PATH in the execution environment via `bash -c "command -v nu"`.
2. The user has explicitly asked for Nushell output in this session.

If neither holds, produce `setup.ts` and, if a shell fallback is wanted, `setup.sh`. When in doubt, ask. Do not emit `.nu` speculatively.

This matches Daniel's standing preference: Bun-first in browser/non-tty contexts; Nushell only with confirmed availability or explicit request.

## Environment bootstrap

The skill assumes Bun is on PATH and that `cf` and `wrangler` are globally installed. If this is the first time running the skill on a given machine, run the bootstrap once:

```sh
./scripts/init
```

What it does:

1. Checks whether `bun` is already on PATH. If yes, skip to step 3.
2. If not, shells out to `npm install --global bun@latest`. If neither `bun` nor `npm` is available, it errors out with a pointer to Node.js/npm install docs.
3. Runs `bun install --global cf@latest wrangler@latest` to install the Cloudflare CLI preview (`cf`, from Agents Week April 2026, the one that validates the "Compile-to-Cloudflare target" framing in Daniel's SE pitch) and the canonical `wrangler` Workers/bindings CLI.
4. Probes `bun pm bin --global` and prints a PATH hint if Bun's global bin directory isn't on PATH yet.

The script is POSIX `sh`, not Bun, because it has to run before any JavaScript runtime is guaranteed to be available. It is idempotent — safe to re-run; on a fully-set-up machine it just verifies versions and exits.

If `cf` or `wrangler` are already managed through a different mechanism (mise, volta, Homebrew), skip `./scripts/init` and invoke the skill's TypeScript tools directly via their shebangs.

## Runtime skill discovery

Before and during composition, pull in domain-relevant skills on demand rather than carrying every possible helper in static context. Use the open `skills` CLI ecosystem for this. The general pattern is search → install → let Claude consult the newly available skill.

Three commands cover the flow:

```sh
# Find skills by keyword. Matches against the public skill registries
# (Vercel Labs' registry, skills.sh, Claude's marketplace, and others).
# Daniel may use "search" in conversation; the actual subcommand is `find`.
npx skills find <query>

# Install a skill from a GitHub owner/repo shorthand, a full URL, or a
# local path. The CLI auto-detects which agents are present and wires
# the skill into each (project-scoped by default; `-g` for user-global).
# Two install syntaxes, both work:
npx skills add <owner/repo@skill>             # newer, canonical form
npx skills add <owner/repo> --skill <name>    # older, explicit form
npx skills add <owner/repo> --list            # show available skills without installing
npx skills add <owner/repo> -g                # install globally (~/.claude/skills)

# Scan the current project, detect the tech stack from package.json,
# lockfiles, Gradle, and other config files, then auto-install matching
# skills from skills.sh. Generates CLAUDE.md when Claude Code is detected.
npx autoskills
npx autoskills --dry-run                      # preview without installing
npx autoskills -y                             # non-interactive
```

### When to run each

Run `npx autoskills` once after Phase 4 (scaffolding). The scaffolded monorepo's `package.json`, `wrangler.jsonc`, and bindings are strong stack signals; autoskills picks up the Cloudflare products in use and pulls matching skills before analysis and synthesis begin.

Run `npx skills find <query>` whenever you hit a specific gap mid-task: a template uses a product you're rusty on (Vectorize, Workflows, Containers), an architectural pattern keeps recurring (actor model over Durable Objects, fan-out queues), or the user asks for deep guidance on one primitive. Keep queries short and specific.

Run `npx skills add <owner/repo>` when you already know the skill you want, usually because a previous search surfaced it or the user named it.

### Composition heuristic

Before starting L3 synthesis (Phase 6), consider a targeted search pass:

```sh
npx skills find "cloudflare d1"
npx skills find "durable objects actor"
npx skills find "wrangler migrations"
```

Install what looks genuinely useful for the composition at hand, then proceed. Do not bulk-install speculatively; Claude's context is not free.

### Cloudflare product context via `cf agent-context`

Orthogonal to skill discovery: `cf agent-context <product>` emits a ~1.5–25KB markdown skill file covering that product's full CLI/API surface (auth conventions, `--dry-run` safety, every Read/Create/Update/Delete operation with its one-line OpenAPI description). It is generated from Cloudflare's OpenAPI spec, so it stays current automatically.

```sh
cf agent-context --list              # all ~107 supported products
cf agent-context d1                  # one product's agent guide
cf agent-context workers > w.md      # pipe to file for reference
```

When to reach for it:

- **Phase 5 (Analyze) / Phase 6 (Synthesis):** after bindings inventory, load the `cf agent-context` for each product that appears in `wrangler.jsonc`. The CLI command surface is the authoritative answer to "how do I manage this binding at runtime" — more reliable than scraping docs pages.
- **When the user asks operational questions** about a product that has an existing binding in the scaffolded monorepo.
- **When generating `MIGRATIONS.md`:** for each product whose binding name changed, include the `cf` command the user will run to verify the binding still works.

What it does **not** cover: the `npm create cloudflare` templates. That is a separate concern — project scaffolding happens before you have anything for `cf` to manage. The `scripts/commands/` catalog in this skill handles scaffolding; `cf agent-context` handles the post-scaffold runtime CLI surface. Use both.

Two other `cf` introspection commands worth knowing:

```sh
cf schema --list                     # all 2,787 API commands as JSON
cf schema d1 create                  # full request/response schema for one command
```

Use `cf schema` when you need the exact JSON body shape for a `--body '{...}'` call, or when drafting a Worker that calls the Cloudflare API directly.

### Gating and honesty

Only run these commands when a real filesystem is available (Claude Code or the claude.ai container with network access). Do not claim to install skills in environments where the CLI cannot actually run. If a command fails (rate limit, offline, private repo without a token), surface the failure to the user, note what you were trying to fetch, and continue with the skills already in context.

For `cf agent-context` specifically: it runs purely against the CLI binary's embedded OpenAPI spec, so it works offline and without auth. If it returns `Product "X" not found.`, the product name likely differs from what the user said — `cf agent-context --list` shows the canonical names.

## Pre-baked create-cloudflare command catalog

The skill ships a second, narrower catalog alongside the broader one in `references/catalog.json`: every `npm create cloudflare` invocation extracted verbatim from Cloudflare's official `llms-full.txt`. It lives under `scripts/commands/` as a filesystem-routed command hierarchy, with one directory per product namespace and one subdirectory per unique `(product, template_id)` pair.

### Shape

```
scripts/commands/
├── manifest.json                       # summary of every product/subcommand
├── agents/
│   ├── agents-starter/
│   │   └── index.ts                    # exports `meta` + default handler; JSDoc doubles as README
│   └── ai-demos-remote-mcp-authless/
│       └── index.ts
├── d1/
├── durable-objects/
├── r2/
├── sandbox/
├── vectorize/
├── workers/
├── workers-ai/
└── ... (24 products total, ~140 unique commands)
```

Each leaf is a single `index.ts` that exports a `meta` constant (template id, target dir, runtimes, alternates, docs page title, description, source subpath) plus a default handler. The top-of-file JSDoc absorbs the README content — source page, template, all alternate-runtime invocations, CLI usage examples, and regeneration instructions — so `cat scripts/commands/<product>/<subcommand>/index.ts` shows the full context. The root dispatcher `./scripts/cli` walks the tree with `readdir` and dynamic-imports leaves on demand; there is no static import registry, no per-product index file, and no hand-maintained command list.

### Using the CLI

```sh
# Inspect available products
./scripts/cli

# List all commands under a product
./scripts/cli sandbox

# Print the canonical invocation for one template
./scripts/cli sandbox sandbox-sdk-bridge-worker

# Emit structured metadata (for programmatic composition)
./scripts/cli sandbox sandbox-sdk-bridge-worker --json

# Actually run the create command
./scripts/cli sandbox sandbox-sdk-bridge-worker --run

# Override the default target directory
./scripts/cli sandbox sandbox-sdk-bridge-worker --run --target-dir=my-sandbox

# Switch package manager (falls back to npm if no pnpm/yarn/bun alternate was captured)
./scripts/cli sandbox sandbox-sdk-bridge-worker --run --pm=pnpm

# Fuzzy search across all commands
./scripts/cli search "vectorize embeddings"

# Dump the full manifest as JSON
./scripts/cli list --json
```

If the executable bit has been stripped, invoke as `bun ./scripts/cli`.

### Standalone binary distribution

The cli can be compiled to a single-file Bun executable that bundles the full Bun runtime (~97 MB). The resulting binary has no runtime dependencies — not bun, not node, not npm. Distribute it alongside the `commands/` directory and it works on any machine of the same target.

```sh
# Compile for the current host architecture (default: ./bin/cf-compose)
./scripts/build

# Custom output path
./scripts/build --outfile=./dist/cf-compose

# Cross-compile for macOS, Linux (x64 + arm64), and Windows
./scripts/build --all-targets
# Produces:
#   ./bin/cf-compose-linux-x64
#   ./bin/cf-compose-linux-arm64
#   ./bin/cf-compose-darwin-x64
#   ./bin/cf-compose-darwin-arm64
#   ./bin/cf-compose-windows-x64.exe
```

Cross-compile downloads the target's Bun runtime on first use. Subsequent builds are cached.

At runtime the binary looks for its `commands/` directory in this order:

1. `$CF_COMPOSE_COMMANDS_DIR` (explicit override)
2. `<dirname(binary)>/commands/`
3. `<dirname(binary)>/scripts/commands/` (source-tree layout)
4. `$PWD/commands/`

The typical distribution is a two-entry folder:

```
cf-compose-dist/
├── cf-compose          # compiled binary
└── commands/           # product hierarchy (copied from scripts/commands/)
```

Zip that, share it, done. The recipient needs zero toolchain setup.

**When to compile vs. run from source.** Source mode (`./scripts/cli`) is the right default — instant changes, no build step, the source IS the distribution. Compile when distributing to users who don't have Bun installed (or won't install it), when packaging for a container image, or when shipping as part of a larger release artifact.

### Source file layout note

The actual TypeScript source files are `scripts/cli.ts`, `scripts/regenerate.ts`, and `scripts/build.ts`. The unversioned names `scripts/cli`, `scripts/regenerate`, and `scripts/build` are symlinks to the `.ts` files. Bun's bundler requires the entrypoint to have a recognized TS extension for `bun build --compile` to work correctly, but the symlinks preserve the `./scripts/cli` user-facing UX. Both paths are supported:

```sh
./scripts/cli agents agents-starter          # via symlink
./scripts/cli.ts agents agents-starter       # direct
bun ./scripts/cli.ts agents agents-starter   # explicit bun invocation
```

### How it composes with the rest of the skill

The catalog is a lookup source. When the user says "scaffold me the agents-starter" or "give me the npm create command for the D1 chat-app template", consult `scripts/commands/` first — it has the exact invocation straight from the docs. When generating `setup.ts` in Phase 3, each `action: "create-cloudflare"` selection can look up its canonical command by running `./scripts/cli <product> <subcommand> --json` (or by importing `meta` directly from `scripts/commands/<product>/<subcommand>/index.ts`) rather than reconstructing the flag shape by hand.

### Refreshing the catalog

Cloudflare ships new templates regularly. Regenerate when the user asks, or when a command you need is missing:

```sh
./scripts/regenerate           # uses cached llms-full.txt if present
./scripts/regenerate --refresh # force re-download
```

The script downloads `https://developers.cloudflare.com/llms-full.txt` into `.cache/`, extracts every `npm|pnpm|yarn|bun create cloudflare` and `npx create-cloudflare` invocation, collapses runtime variants into a single subcommand with alternates held in meta, and rewrites `scripts/commands/`. Safe to run repeatedly.

### Known limitations

- Descriptions are scraped from the prose preceding each command in the docs, so quality varies. Tutorial-Prerequisites boilerplate ("Use a Node version manager like Volta...", "install Node.js") is filtered out, but coverage is imperfect. The `page_title` field is always accurate; treat it as the primary human label. When no usable description survives filtering, the field is empty rather than fabricated.
- Commands that appear in docs only as inline mentions (not in fenced code blocks) may be missed. The extractor targets line-leading invocations for precision over recall.
- The catalog does not deduplicate across multiple pages that document the same template; if one template ships with a Pages variant and a Workers variant, both may appear under different products.
- Some tutorial entries (e.g., `d1/d1-tutorial`, `queues/producer-worker`) have `template_id: null` — the docs describe them as "scaffold an empty Worker, then add the product-specific code manually" rather than as one-shot templates. The canonical command is still accurate; it's just a generic Worker scaffold rather than a templated one.
- When a canonical command has no positional target-dir and the user supplies one via `--target-dir=`, the CLI inserts it at the correct position for each package manager (`npm create cloudflare@latest <target> -- --template <id>`, `pnpm create cloudflare@latest <target> --template <id>`, etc.).

## The catalog

Claude pulls from these sources (defined in detail in `references/sources.md`):

1. **create-cloudflare templates** — the canonical `npm create cloudflare@latest` catalog (from `cloudflare/workers-sdk` plus the c3 CLI's own registry). These have first-class `--template=<id>` support.
2. **cloudflare/templates gallery** — the standalone templates repo, each subdirectory is a self-contained project.
3. **Reference Architectures** — pages under `developers.cloudflare.com/reference-architecture/`. Not clone-able; treated as design guidance fetched as Markdown into `docs/reference-architectures/`.
4. **Agents SDK, Workers AI, demos** — `cloudflare/agents-starter`, `cloudflare/ai`, `cloudflare/workers-ai-notebooks`, and other first-party example repos.
5. **User's GitHub** — fetched from `danielbodnar`'s repos and starred list, filtered to Cloudflare-related projects (detected by `wrangler` in `package.json` or `wrangler.{toml,json,jsonc}` at repo root).
6. **User-added sources** — arbitrary GitHub repo URLs, NPM package names, or documentation URLs the user pastes into the selector at runtime. These are fetched and inspected before incorporation.

Each catalog entry is normalized into a common shape (see `references/sources.md`). The merged catalog lives at `references/catalog.json`.

### Catalog freshness

The cached catalog is used by default. Refresh when:
- The user says "refresh the catalog" or similar.
- The cached `catalog.json` is older than 14 days (check `meta.fetched_at`).
- A specific source the user asked about isn't present.

To refresh, run `scripts/fetch_catalog.ts`. It queries every source in parallel, normalizes, merges, and writes back to `references/catalog.json`. If a source fails (network, rate-limit), fall back to the previous cached entries for that source and note it in the response.

```bash
bun run scripts/fetch_catalog.ts
# or, if Bun is not installed:
bun scripts/fetch_catalog.ts
```

## Phase 1: Render the selector

Load `references/catalog.json`. Read `assets/selector-template.html` for the artifact skeleton. Populate the catalog into the template by replacing the `/*@@CATALOG@@*/` placeholder with the JSON (parsed and re-serialized, not string-concatenated).

Before rendering the artifact, read `/mnt/skills/public/frontend-design/SKILL.md` — the selector is a UI artifact and should follow that skill's design tokens and patterns. The supplied template is already dark and utilitarian; do not redesign unless the user asks.

The artifact provides:
- A search bar that matches against name, description, products, and languages.
- Filter chips for product (D1, R2, KV, DO, Queues, Workflows, Agents, Containers, Vectorize, Workers AI, Hyperdrive, Browser Rendering, Images, Stream, Calls, Email, Pages, Zaraz, Radar, Analytics Engine, Sandboxes), language (TypeScript, Rust, Python, Go, JavaScript), framework (Hono, Vue, React, Astro, Next.js, Qwik, SvelteKit, Remix), and type (template, starter, reference-arch, demo, doc, custom).
- A grouped list with checkboxes. Group by type by default; allow regroup by product.
- An "Add custom source" panel accepting a GitHub URL, NPM name, or docs URL. Added entries join the catalog for the current session and are persisted to `window.storage`.
- A selection sidebar showing running count and the selected items.
- A persistence layer using `window.storage` so the user can close and resume.
- A "Done — send to Claude" button that writes the final `selection.json` to storage under the key `cf-compose:selection:<project-slug>` and surfaces a payload the user can copy.

Render the artifact. Then pause and ask: "Make your selection in the artifact. When you're done, paste the selection payload back here, or tell me the project slug you used and I'll read it from storage."

## Phase 2: Capture the selection

The selection payload shape (produced by the artifact and read back by Claude):

```json
{
  "project_name": "my-cf-project",
  "project_slug": "my-cf-project",
  "monorepo_root": "./scaffolding",
  "selections": [
    {
      "catalog_id": "c3:hello-world-worker",
      "name": "hello-world-worker",
      "type": "template",
      "action": "create-cloudflare",
      "template_id": "hello-world",
      "target_dir": "hello-world-worker"
    },
    {
      "catalog_id": "gh:cloudflare/agents-starter",
      "name": "agents-starter",
      "type": "demo",
      "action": "git-clone",
      "url": "https://github.com/cloudflare/agents-starter",
      "ref": "main",
      "target_dir": "agents-starter"
    },
    {
      "catalog_id": "ra:scheduled-digests",
      "name": "scheduled-digests",
      "type": "reference-arch",
      "action": "fetch-docs",
      "url": "https://developers.cloudflare.com/reference-architecture/diagrams/serverless/scheduled-digests/",
      "target_dir": "docs/reference-architectures/scheduled-digests.md"
    }
  ],
  "user_notes": "Optional freeform description of project intent and composition hints."
}
```

Validate the payload. If malformed, explain what's wrong and ask for a clean version.

## Phase 3: Generate the init script

Run `scripts/generate_init_script.ts` with the validated selection JSON. It emits `setup.ts` by default — a Bun/Node-compatible TypeScript script that:

1. Creates `monorepo_root/`, `docs/reference-architectures/`, and a session log file.
2. For each `create-cloudflare` action: runs `bun create cloudflare@latest <target_dir> -- --template=<template_id> --no-deploy --no-git --no-open`. When the `(product, template_id)` pair exists under `scripts/commands/`, prefer the canonical command string from the leaf's exported `meta` constant (dynamic-import `scripts/commands/<product>/<subcommand>/index.ts`) to match the docs-verified invocation exactly.
3. For each `git-clone` action: runs `git clone --depth=1 --branch=<ref> <url> <target_dir>` into `monorepo_root/`. If a `subpath` is specified, lifts its contents to the target root.
4. For each `fetch-docs` action: fetches the URL, converts to Markdown via `pandoc` if available (falls back to raw HTML), writes to `docs/reference-architectures/<slug>.md`.
5. For each `npm-package` action: runs `bun init -y` in a fresh workspace, then `bun add <package>`.
6. Logs every step to `scaffolding/.setup.log`.
7. On completion, prints a summary.

Invocation:

```bash
bun run scripts/generate_init_script.ts selection.json
# or from stdin:
cat selection.json | bun run scripts/generate_init_script.ts
```

Flags:
- `--nu` — also emit `setup.nu` (use only if `nu` is on PATH or the user explicitly asked).
- `--sh` — also emit `setup.sh` bash fallback.
- `--output-dir=<path>` — where to write the setup scripts (default: `.`).

### Gating `--nu`

Before passing `--nu`, verify Nushell is available:

```bash
command -v nu > /dev/null && echo "nushell available" || echo "nushell not found"
```

If the command prints "nushell available", or if the user said something like "give me the Nushell version" or "I want setup.nu", then pass `--nu`. Otherwise stick with `setup.ts` alone (optionally plus `--sh` if a shell fallback is useful).

## Phase 4: Scaffold

- **Claude Code**: Execute `setup.ts` directly. Watch the log. If any step fails, surface it, suggest a fix, and offer to retry just the failed step.
- **claude.ai**: Execute `setup.ts` in the container. Present the setup log and the resulting tree as a file listing.

Run with:

```bash
bun run setup.ts
# or, if Bun is not installed:
bun setup.ts
```

After scaffolding, the working tree looks like:

```
<project_name>/
├── scaffolding/
│   ├── hello-world-worker/
│   ├── agents-starter/
│   └── ...
├── docs/
│   └── reference-architectures/
│       └── scheduled-digests.md
├── setup.ts
└── selection.json
```

At this point the scaffolded monorepo has enough stack signal for `npx autoskills` to do useful work. Run it once before Phase 5 to pull in product-specific best-practice skills that will sharpen analysis and synthesis:

```sh
npx autoskills --dry-run   # preview what will be installed
npx autoskills -y          # install non-interactively
```

If the scan turns up skills that are already installed or clearly irrelevant, skip the install and proceed.

Then, for each Cloudflare product that appears in the bindings inventory, pull its `cf agent-context` to load the authoritative CLI/API surface:

```sh
# Parse bindings out of wrangler.jsonc, then for each one:
cf agent-context d1 > docs/cf-context/d1.md
cf agent-context workers > docs/cf-context/workers.md
cf agent-context durable-objects > docs/cf-context/durable-objects.md
# ...etc
```

These files are reference material during Phase 5 and 6, and become part of the final project's `docs/` directory so the user has product-specific CLI guidance at hand without needing to re-fetch.

## Phase 5: Analyze

Run `scripts/analyze_scaffold.ts` over `scaffolding/`. It walks each subdirectory and produces `ANALYSIS.md` at the project root with:

- **Bindings inventory**: every `d1_databases`, `r2_buckets`, `kv_namespaces`, `durable_objects`, `queues`, `workflows`, `vectorize`, `ai`, `services`, `browser`, `images`, `hyperdrive`, `containers`, and `mtls_certificates` entry found across all `wrangler.{jsonc,toml,json}` files, grouped by source template.
- **Compatibility flags**: all `compatibility_date` and `compatibility_flags` values, with the oldest date and any conflicts flagged.
- **Dependencies**: merged `package.json` dependency list with version-conflict callouts.
- **Scripts**: every `scripts.*` entry in each `package.json`, tagged by origin.
- **Routes and entry points**: `main`, `module`, worker entry, route patterns, cron triggers, queue consumers, Durable Object class names.
- **Environment variables**: every `vars`, `.dev.vars` entry, and `.env.example`.
- **Collision report**: binding names, DO class names, queue names, or env keys that appear in multiple sources.

Invocation:

```bash
bun run scripts/analyze_scaffold.ts --root=./scaffolding --output=./ANALYSIS.md
```

`ANALYSIS.md` is both a human artifact and your working memory for Phase 6.

## Phase 6: L3 synthesis (deep refactor to unified codebase)

This is the heaviest phase. Follow `references/l3-synthesis-playbook.md` step-by-step. High-level structure:

1. **Decide the unified architecture**. Present two or three options to the user based on what was scaffolded — typically (a) single-worker monolith with internal routing, (b) service-bindings between separate workers, or (c) Durable-Object-centric actor model. Recommend one. Wait for confirmation before proceeding.

2. **Create the unified root**. Write a Bun workspace `package.json` at the project root, a shared `tsconfig.base.json`, a root `wrangler.jsonc` for the primary worker, and `packages/` for anything that genuinely wants independence (shared libs, separate workers kept as services).

3. **Merge bindings**. For every binding type, produce a single declaration at the appropriate scope. Resolve name collisions by renaming with a source-prefix (e.g., `DB_AGENTS` vs `DB_ANALYTICS`) and update every reference. Log every rename to `MIGRATIONS.md`.

4. **Consolidate dependencies**. Root `package.json` owns the version-of-record for each dep. Pin TypeScript, Wrangler, `@cloudflare/workers-types`, and Hono at latest stable. Remove duplicates.

5. **Restructure `src/`**. Move code from each scaffolded project into a domain-oriented layout under `src/`. Naming: `src/<domain>/<feature>.ts`. Update all imports. Delete the `scaffolding/` directory only after the user confirms the merged code builds and tests pass.

6. **Unify configuration**. Single `.dev.vars`, single `.env.example`, single `wrangler.jsonc` with `env.*` overrides for staging/production if multiple deployment targets existed.

7. **Rewrite the entry point**. One `src/index.ts` that constructs a Hono (or chosen framework) app, mounts all merged routes, wires queue consumers, exports Durable Object classes, and registers scheduled handlers.

8. **Write `MIGRATIONS.md`**. Every rename, every removed file, every changed binding name, every changed import path. This is the record the user needs to understand what happened.

9. **Run `bun install && bun run typecheck && bun run build`**. Surface any errors. Fix or document.

10. **Present the final tree and a diff summary** versus the scaffolded state.

## Writing style

The user (Daniel) dislikes em-dashes and hyperbole. Write plain, precise prose. Use full words over abbreviations in generated code and docs. No sales voice. This applies to all generated files: `setup.ts`, `ANALYSIS.md`, `MIGRATIONS.md`, and commit messages.

## Nushell conventions (only when emitting Nushell)

When emitting Nushell (after confirming availability or explicit request): shebang `#!/usr/bin/env -S nu --stdin`, kebab-case commands, snake_case variables, one space before and after `|`, no space before closure params (`{|el|` not `{ |el|`), full words over abbreviations, and `error make` with `metadata` spans for source-aware errors.

## Sane Defaults alignment

This skill is thin glue over Cloudflare's own catalog. Do not reinvent what create-cloudflare already does. Do not build a competing template format. Do not cache aggressively enough to hide upstream changes. If the user's request contradicts this — for instance, asking to fork and modify Cloudflare's templates wholesale rather than use them as upstream sources — **stop and ask** before proceeding.

## When to read what

- **Always read `references/sources.md`** before fetching the catalog.
- **Read `references/products-bindings.md`** during Phase 5 (analysis) and Phase 6 (synthesis) for the product-to-binding reference.
- **Read `references/composition-patterns.md`** before merging `wrangler.jsonc` or `package.json` files.
- **Read `references/l3-synthesis-playbook.md`** at the start of Phase 6 and follow it step-by-step.
- **Read `assets/selector-template.html`** only when rendering the Phase 1 artifact.
- **Consult `scripts/commands/manifest.json`** to answer "what `npm create cloudflare` invocations are available" without walking the filesystem yourself.
- **Read `scripts/commands/<product>/<subcommand>/index.ts`** whenever you need the exact docs-verified invocation for one template; the exported `meta` constant has all the structured data, and the JSDoc header has the human-readable context.

## What this skill does not do

- It does not deploy. Deployment is the user's call and should happen after they have reviewed the unified codebase.
- It does not run tests it did not write. It runs `bun run typecheck` and `bun run build`; anything else is the user's workflow.
- It does not modify anything outside the target project directory without explicit confirmation.
- It does not make Cloudflare account or API changes. The user handles `wrangler login` and any account-level resource creation (D1 database provisioning, R2 bucket creation, etc.) separately.
