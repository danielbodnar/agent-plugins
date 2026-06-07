# bb-deployer init: module catalog

A modular bootstrap dispatcher for project tooling, structured as a filesystem-routed CLI under `scripts/init/`. Each module is a TypeScript file that default-exports a single `Module` object via `defineModule()`, declaring its category, description, applicable presets, dependencies, and an idempotent `apply` function. The dispatcher walks the directory, dynamic-imports each module, resolves dependency order, and applies the selected subset to the target project root.

## Invocation

The user-facing entrypoint is `./scripts/init`, a symlink to `scripts/init.ts`. The dispatcher accepts a preset, category filters, individual module ids, and the usual dry-run and force flags. Running it with no arguments applies the `full` preset to the current working directory.

## Presets

The `full` preset applies every module marked production-ready and represents the canonical Bodnar-flavored project setup. The `minimal` preset narrows to what bb-deployer itself requires for a clean Cloudflare Worker handoff, omitting editor configs, security scanners, and the heavier git hygiene tooling. The `custom` preset triggers an interactive picker for ad-hoc selection.

## Module shape

Every module under `scripts/init/<category>/<name>.ts` exports a `Module` with stable metadata, a gating `applies` function that returns false to skip cleanly when prerequisites are unmet or output already exists, and an `apply` function that performs the actual setup. Modules write files through the shared `writeFile`, `updatePackageJson`, and `addGitignoreEntries` helpers in `lib/module.ts`, which respect dry-run and force flags uniformly and accumulate a structured action log surfaced at the end of every run.

## Catalog

The catalog below enumerates the planned modules, their current implementation status, and design notes that resolved or remain open. The Biome module is built out as the canonical exemplar for the pattern; the remaining modules are listed with enough specificity that filling each one in becomes a mechanical exercise once the open questions are resolved.

### ai

This category installs configuration directories for AI assistants and editor-side AI tooling. Each module writes only the project-local files for its assistant, leaving user-level configuration to chezmoi or to the user's own dotfiles workflow.

- `ai/claude` (planned): `.claude/settings.json`, `.claude/skills/`, `.claude/agents/`, `.claude/commands/`, `.claude/hooks/`, and a `CLAUDE.md` skeleton at the project root. Pulls Daniel's standing preferences from a shared header file.
- `ai/copilot` (planned): `.github/copilot-instructions.md` plus `.vscode/settings.json` Copilot tuning. Less file-tree, more documentation.
- `ai/opencode` (planned): `.opencode/` directory with tool config and a starter prompt aligned to the project's tech stack.
- `ai/zed` (planned): `.zed/` directory with assistant config; overlaps with `editors/zed` and the two should share a helper.
- `ai/vscode-ai` (planned): VSCode-side AI extension settings, distinct from `editors/vscode` which handles the editor itself.
- `ai/mcp` (planned): `.mcp.json` with the curated server list. Default servers include Cloudflare's official MCP, GitHub, filesystem scoped to the project root, fetch, and Playwright. Linear and other project-specific servers are added by flag rather than baked into the template.

### runtime

- `runtime/mise` (planned): `mise.toml` pinning Bun, Node when needed for tooling that lacks Bun support, and any project-specific runtimes detected from existing config files.
- `runtime/packages` (planned): seeds the package.json devDependencies that the rest of the toolchain assumes are present, so module ordering does not matter for install correctness.

### tasks

- `tasks/just` (planned): a modular `justfile` that imports from `.just/*.just` modules, mirroring Daniel's filesystem-routed CLI pattern at the task-runner layer. Default modules cover the dev lifecycle: `install`, `dev`, `build`, `test`, `lint`, `format`, `typecheck`, `deploy`, `clean`. Each `.just` file is small and single-purpose.

### editors

- `editors/vscode` (planned): `.vscode/settings.json`, `.vscode/extensions.json`, and a launch configuration tuned to the detected stack.
- `editors/nvim` (planned): `.nvim.lua` or a LazyVim project override file with project-level LSP and formatter settings.
- `editors/zed` (planned): `.zed/settings.json` with the project's language settings.
- `editors/helix` (planned, opt-in): a `languages.toml` and per-language LSP entries. Lower priority than the other three but listed since Helix sits in Daniel's secondary slot.

### quality

- `quality/biome` (**built**): see `scripts/init/quality/biome.ts` for the canonical implementation. Handles JS, TS, JSON, JSX, TSX. Sets defaults aligned to Daniel's writing preferences: double quotes, semicolons always, ES5 trailing commas, 100-column lines, two-space indent.
- `quality/dprint` (planned): handles every format Biome does not, including Markdown, TOML, YAML, and Astro or Vue templates with plugins. Ships a `dprint.json` that activates plugins per detected file type.
- `quality/oxlint` (planned, opt-in): adds oxlint as a fast pre-commit feedback loop. Not redundant with Biome in that role since oxlint's sub-second feedback covers the working-loop case while Biome handles the CI completeness case.

Prettier and oxfmt are intentionally omitted. Prettier overlaps with Biome on the JS family and with dprint on the rest, contributing only contention between formatters. oxfmt occupies Biome's niche with the additional handicap of being JS and TS only.

### security

- `security/bun-audit` (planned): wires `bun audit` into the lint pipeline and the CI workflow.
- `security/trivy` (planned): `trivy.yaml` configuration plus a GitHub Actions workflow for filesystem scanning and, when a Dockerfile is present, container image scanning.
- `security/osv-scanner` (planned): `osv-scanner.toml` configuration plus a GitHub Actions workflow running `osv-scanner scan --all-vulns --allow-no-lockfiles --no-ignore -r .` on a schedule and on pull requests.
- `security/trufflehog` (planned): GitHub Actions workflow for secret scanning on push and pull request, with sensible exclusions for the repo's expected fixtures.
- `security/renovate` (planned): `renovate.json` with grouping rules that mirror Daniel's existing Dependabot pattern. Cloudflare-namespaced packages share a group; types packages share a group; framework families share groups; GitHub Actions update on a monthly schedule.
- `security/nyx` (status pending): identity of the tool needs confirmation before this module can be specified. Candidates include `mooltiverse/nyx` for semantic versioning and release automation, in which case it overlaps with `git/semantic-release` and one of the two should be selected rather than both.

### hooks

- `hooks/lefthook` (planned): `lefthook.yml` configuring pre-commit to run Biome and optionally oxlint on staged files, commit-msg to run commitlint, and pre-push to run typecheck and tests. Lefthook's native file-pattern matching makes a separate `lint-staged` install redundant.

### git

- `git/commitlint` (planned): `commitlint.config.js` with the conventional commits preset, wired into the lefthook commit-msg hook.
- `git/semantic-release` (planned): `.releaserc.json` using the `semantic-release-npm-github-publish` preset Daniel referenced. Generates the GitHub Actions release workflow as a side effect.

### github

The `github/workflows/` modules each write a single workflow file. They share a helper in `lib/workflow.ts` for the common header and trigger boilerplate.

- `github/workflows/ci` (planned): runs install, lint, typecheck, test, build on push and pull request.
- `github/workflows/claude` (planned): builds the workflow file by fetching `anthropics/claude-code-action` at runtime, parsing its action.yml, and producing a template that reflects the action's current schema rather than baking in a snapshot. This is the only workflow module that does live remote fetching at apply time.
- `github/workflows/opencode` (planned): equivalent for the OpenCode action.
- `github/workflows/osv-scanner` (planned): scheduled and PR-triggered OSV scan.
- `github/workflows/trivy` (planned): filesystem and image scan workflow.
- `github/workflows/trufflehog` (planned): secret-scan workflow.
- `github/workflows/renovate` (planned): self-hosted Renovate runner configuration for projects that prefer it to the GitHub App.
- `github/workflows/deploy` (planned): the Cloudflare Workers deploy workflow already documented in bb-deployer's Phase 4 reference, extracted here so other projects can use it.
- `github/templates` (planned): issue and PR templates, CODEOWNERS, security policy.
- `github/setup-copilot` (planned): the project-side configuration the GitHub Copilot ecosystem expects, distinct from `ai/copilot` which handles the editor-side files.

## Open design questions

The two questions blocking full build-out are surfaced in the chat reply rather than encoded here, since their answers shape module shape rather than module catalog. The disposition of Prettier, oxfmt, and lint-staged is recorded above as omitted, with reasoning; if any of those should be added back, the relevant module is straightforward to write and the omission should be reversed in this document at the same time.

## Conventions

Every generated file omits em-dashes from prose, follows Daniel's writing style preferences for any embedded documentation, and uses tabs or two-space indents per the target format's own community defaults. Every module is idempotent: running the dispatcher twice in a row should produce no diff on the second invocation. Every module respects the dry-run flag without exception, which means commands that mutate the filesystem outside of `writeFile`, `updatePackageJson`, and `addGitignoreEntries` need explicit dry-run guards in their own bodies.

## Extending the catalog

Adding a new module is a single file under `scripts/init/<category>/<name>.ts` that default-exports a `Module`. The dispatcher discovers it automatically on the next run. No registry update, no manifest edit, no central import list. This matches the filesystem-routed pattern established in cloudflare-compose and keeps the cost of adding a new tool proportional to the tool itself.
