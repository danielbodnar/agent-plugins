# ProjectSpec Schema Guide

The full schema lives at `project-spec.schema.json`. This file summarizes what each `$def` covers and when each section of the spec gets populated during a planning run.

- **Schema ID:** `https://bitbuilder.cloud/schemas/project-spec/v1.0.0`
- **Draft:** JSON Schema 2020-12
- **Definitions:** 26 reusable types via `$defs`

## Definition summary

| Definition | Purpose |
|---|---|
| `Metadata` | Project identity, status, authors, license |
| `Stack` | Runtime, languages, frameworks, databases, platforms, tools (all versioned) |
| `VersionedTool` | A tool with pinned version, registry, purpose, URL |
| `DirectoryTree` / `DirectoryEntry` | Recursive project file tree with purpose annotations |
| `Dependencies` / `Dependency` | Production and dev dependencies with versions |
| `ConfigFile` | Config files with path, format, schema ref, generated-by command, resolved values |
| `Environment` / `EnvVar` / `Secret` | Environment variables, secrets (metadata only), and .env files |
| `Script` | Named project scripts (dev, build, test, deploy) |
| `Phase` / `Decision` / `Command` | Planning phases with decisions, commands, and open questions |
| `Agents` | Agent ecosystem: MCP servers, skills, slash commands, prompts |
| `MCPServer` | MCP server connections with transport, URL/command, tools list |
| `AgentSkill` | Agent skill definitions with triggers |
| `SlashCommand` | Slash commands with prompts and arguments |
| `Prompt` | System prompts, agent instructions, CLAUDE.md, READMEs |
| `CICD` / `Workflow` | CI/CD provider, workflow files, triggers, steps |
| `Deployment` / `DeployTarget` | Deploy targets with platform, bindings, routes, commands |
| `Standards` | Coding conventions, commit convention, branch strategy, release strategy |
| `Reference` | External docs, repos, templates, specs |

## How phases map to top-level sections

Each phase populates specific top-level sections of the ProjectSpec. This mapping ensures the spec grows coherently:

| Phase | Populates |
|---|---|
| Project Foundation | `metadata`, `stack.runtime`, `stack.packageManager`, `stack.languages`, `directory` (skeleton), `standards.branchStrategy`, `standards.commitConvention` |
| Tooling & DX | `stack.tools`, `dependencies.development`, `configuration` (linter/formatter configs), `standards.codingConventions`, `scripts` (lint, format, check) |
| Architecture | `stack.frameworks`, `stack.databases`, `stack.platforms`, `directory` (expanded), `dependencies.production`, `deployment.targets[].bindings` |
| Infrastructure | `cicd`, `deployment`, `environment`, `scripts` (deploy, preview) |
| Agent Ecosystem | `agents` (mcpServers, skills, commands, prompts), `configuration` (CLAUDE.md, .claude/ files) |
| Implementation | `phases` (task breakdown), `scripts` (dev, build, test) |
| Testing & QA | `dependencies.development` (test deps), `configuration` (test config), `scripts` (test, coverage) |

**Every phase also:**

- Adds itself to `phases[]` with decisions, commands, and status
- Adds discovered links to `references[]`

## Required top-level fields

The schema enforces these required keys at the root: `specVersion`, `metadata`, `stack`, `directory`, `dependencies`, `configuration`, `environment`, `scripts`, `standards`. Any valid spec has all nine, even when the arrays inside them are empty.

## Key constraints worth knowing

- `metadata.name` pattern: `^[a-z][a-z0-9-]*$` (lowercase kebab, no digits first)
- `metadata.status` enum: `draft | in-progress | ready | archived`
- `specVersion` is pinned `const: "1.0.0"`, bump intentionally via new schema URL
- `stack.languages` requires `minItems: 1`
- `EnvVar.name` and `Secret.name` pattern: `^[A-Z_][A-Z0-9_]*$` (SCREAMING_SNAKE_CASE)
- `Phase.status` enum: `pending | in-progress | confirmed | skipped` (only `confirmed` phases run via `spec-runner.ts`)
- All top-level objects use `additionalProperties: false`, unknown keys fail validation

## Validation

Use the bundled script:

```bash
bun run scripts/validate-spec.ts
# or with explicit paths
bun run scripts/validate-spec.ts --spec project-spec.json --schema references/project-spec.schema.json
```

Or call ajv-cli directly:

```bash
bunx ajv-cli@latest validate --spec=draft2020 \
  -s references/project-spec.schema.json \
  -d project-spec.json
```

For a fast structural sanity check without schema validation:

```bash
bun -e "const s=await Bun.file('project-spec.json').json(); console.log('specVersion:', s.specVersion, '| phases:', s.phases?.length ?? 0)"
```
