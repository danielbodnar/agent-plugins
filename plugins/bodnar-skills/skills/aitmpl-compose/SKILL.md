---
name: aitmpl-compose
description: Author and compose `claude-code-templates` (aitmpl.com) workflows. Use whenever the user wants to bundle catalog components (agents, commands, MCPs, hooks, settings, skills) into a reusable `workflow.yaml` or `template.json`, merge multiple templates or workflows, expand Bodnar `pack` macros, validate a workflow against the live catalog, or scaffold `.claude/workflows/`. Trigger on "aitmpl", "claude-code-templates", "compose templates", "merge templates", "scaffold a workflow", "share my Claude Code setup", "author a workflow", "author a template", "make a pack", "new pack", "expand pack", "validate workflow.yaml", or any mention of `npx claude-code-templates@latest --workflow` or `--template`. Also use when the user lists components to assemble, or describes a project intent (such as a Cloudflare Worker scaffold with security hardening) that should resolve to a concrete component bundle. Output is upstream-native YAML in `.claude/workflows/`; never invent a parallel bundle format.
---

# aitmpl-compose

Author and compose [claude-code-templates](https://docs.aitmpl.com) workflows. Two modes share one selector primitive.

| Mode | Input | Output |
|------|-------|--------|
| **author** | Intent ("Cloudflare Worker scaffold with security hardening") | `.claude/workflows/<name>.yaml` |
| **compose** | N templates + N workflows + cherry-picks + packs | `.claude/workflows/<name>.yaml` (merged) |

The emitted YAML is upstream-native and installs via `npx claude-code-templates@latest --workflow .claude/workflows/<name>.yaml`.

## Sane Defaults

- Emit upstream YAML. Never invent a parallel bundle format.
- Validate every component name against the live catalog before emission.
- Project-local by default. Workflows live in `.claude/workflows/`.
- Packs are Bodnar-side syntactic sugar; they always expand to upstream components before YAML hits disk.
- If the project's tech stack is detectable, pre-suggest matching components — but never auto-add without selection.

## When this skill triggers

If you (Claude) see any of the following, load and run this skill:

1. User asks to "compose", "merge", "bundle", "stack", or "combine" multiple templates or workflows.
2. User describes a project intent and asks what Claude Code setup it should have.
3. User asks to author a `workflow.yaml`, `template.json`, or `pack`.
4. User mentions `aitmpl`, `claude-code-templates`, or `npx claude-code-templates`.
5. User asks to set up or scaffold `.claude/workflows/` for a project.
6. User asks to validate a workflow or expand pack references.

## Workflow

### Step 1 — Bootstrap and load the catalog

```sh
bash scripts/init                          # Ensures bun + yaml deps; idempotent.
scripts/aitmpl-compose catalog refresh     # Fetches the upstream catalog; cached at ~/.cache/aitmpl-compose/catalog.json.
```

The catalog is refreshed at most once per 24 hours by default. Use `--force` to bypass.

### Step 2 — Capture intent

Ask the user, or extract from the conversation:

- **Workflow name** (kebab-case): e.g. `cf-worker-secure`.
- **Mode**: author from scratch, or compose from existing templates/workflows.
- **Sources** (compose only): which existing templates (`fullstack-web`, `security-hardened`, etc.) and/or workflow YAMLs to merge in.
- **Packs**: any Bodnar packs to include (`bodnar/cf-platform`, `lauren/content-creator`, etc.). List available packs with `scripts/aitmpl-compose packs list`.
- **Cherry-picks**: any individual components on top.

If the user is in claude.ai, prefer the **interactive selector** (Step 3a). In Claude Code, ask conversationally and pass selections as args.

### Step 3a — Interactive selector (claude.ai only)

Read `assets/selector.html`. Substitute the catalog JSON and stack-detection results into the template's `__CATALOG__` and `__DETECTED__` markers, then render with `visualize:show_widget`. The user checks boxes; submitting calls `sendPrompt()` with a JSON selection. Parse the next user message and pass the selection to `scripts/aitmpl-compose compose --selection-file <path>`.

### Step 3b — CLI selection (Claude Code)

Run `scripts/aitmpl-compose detect` to surface a stack-suggestion list. Discuss it with the user, then build the component selection conversationally. Invoke `scripts/aitmpl-compose compose --name <name> --components <component-list>` once you have a final list.

### Step 4 — Compose and emit

```sh
scripts/aitmpl-compose compose \
  --name <workflow-name> \
  --templates fullstack-web,security-hardened \
  --workflows path/to/existing.yaml \
  --packs bodnar/cf-platform \
  --add agent:development-team/rust-systems-expert \
  --add skill:cloudflare-compose \
  --out .claude/workflows/<name>.yaml
```

Composition rules (see `references/composition-rules.md` for full spec):

1. Resolve all template names to their component lists (via the cached catalog's template definitions).
2. Resolve all pack references to their component lists.
3. Union all components by `(type, name)`; first occurrence wins for ordering.
4. Sort within each type group; preserve type order: `agent → command → mcp → setting → hook → skill`.
5. Validate every name against the catalog. Unknown components fail loudly with fuzzy-match suggestions.
6. Emit YAML with a header comment noting source templates/packs and a `# from pack: <name>` trailing comment on each pack-expanded entry.

### Step 5 — Verify

```sh
scripts/aitmpl-compose validate .claude/workflows/<name>.yaml
```

Cross-checks every component against the catalog. Exits non-zero on unknown components.

Optionally dry-run the install:

```sh
npx claude-code-templates@latest --workflow .claude/workflows/<name>.yaml --dry-run --yes
```

### Step 6 — Tell the user what was written

Show the path of the emitted YAML, the component count by type, and the next step (`npx claude-code-templates@latest --workflow <path> --yes`).

## Subcommands

| Command | Purpose |
|---------|---------|
| `catalog refresh` | Refresh the local catalog cache from upstream |
| `catalog list [--type agent\|command\|...]` | List catalog components, optionally filtered by type |
| `catalog search <query>` | Fuzzy search the catalog |
| `packs list` | List available packs (project → user → bundled) |
| `packs show <name>` | Print a pack's expanded component list |
| `new-pack` | Interactively author a new pack (writes to `~/.config/aitmpl-compose/packs/`) |
| `compose` | Compose a workflow.yaml (the main path) |
| `validate <file>` | Validate a workflow.yaml against the catalog |
| `expand <file>` | Expand `pack:` references in a workflow.yaml, write to stdout |
| `detect` | Detect tech stack from the current project (package.json, Cargo.toml, wrangler.toml, etc.) |

Full flag reference: `scripts/aitmpl-compose --help` (or any subcommand with `--help`).

## Authoring packs

A pack is a reusable named component bundle. Format and discovery cascade: see `references/pack-format.md`. Quick start:

```sh
scripts/aitmpl-compose new-pack
# Prompts for: name, description, components. Writes to ~/.config/aitmpl-compose/packs/<scope>/<name>.yaml.
```

Seed packs ship in `packs/` and serve as starting templates. Daniel can fork these to user-global via:

```sh
scripts/aitmpl-compose packs fork bodnar/cf-platform
```

## Authoring upstream templates (rare)

The skill primarily emits workflows. To contribute a curated bundle back to the upstream catalog as a Template (the 14 starred bundles in the docs), use:

```sh
scripts/aitmpl-compose compose --emit-template --out template.json
```

This emits the upstream `template.json` shape instead of `workflow.yaml`. See `references/workflow-schema.md` for the schema difference.

## Tech-stack detection

`scripts/aitmpl-compose detect` reads (in order):

- `package.json` → checks `dependencies` and `devDependencies` for: react, vue, astro, hono, next, bun, vitest, playwright
- `Cargo.toml` → marks the project as Rust; checks for `tokio`, `axum`, `workers-rs`, `aya`
- `wrangler.toml` / `wrangler.jsonc` → marks as Cloudflare Workers
- `pyproject.toml` → Python (not Daniel's preference, but flagged for honesty)
- `flake.nix`, `shell.nix` → Nix
- `.tool-versions`, `mise.toml` → mise runtime targets

Output is a JSON document of `{ stacks, suggested_components }`. The interactive selector pre-checks suggested components.

## References

Read the reference files in `references/` as needed. They contain detail that doesn't fit in this top-level instructions file.

- `references/workflow-schema.md` — Full upstream YAML schema and `template.json` shape
- `references/pack-format.md` — Pack file format, discovery cascade, fork semantics
- `references/composition-rules.md` — Dedup, ordering, conflict resolution rules
- `references/catalog-discovery.md` — How the catalog is fetched and cached

## Bodnar conventions respected

- No em-dashes in any emitted YAML, comments, or scripts.
- Sane Defaults: thin glue, upstream-native output, no parallel formats.
- Bun-first: TS scripts ship as `#!/usr/bin/env bun` executables, no `.ts` extension, chmod +x.
- Errors are explicit and actionable; fuzzy-match suggestions on unknown component names.
