# Phase 4: Config

The goal is a lint-clean, CI-ready repo before any application code lands. Linters, formatters, env conventions, GitHub Actions, Dependabot, and Claude Code configuration all get wired here so the Implement phase can focus on translation.

## Preferred path: run scripts/init

The bb-deployer skill ships a modular bootstrap dispatcher at `scripts/init.ts` that owns most of this phase. Prefer it over the manual steps below when the dispatcher covers a given tool, since the dispatcher's modules are idempotent, respect `--dry-run` and `--force`, and stay maintained in one place rather than duplicated across the reference prose.

```bash
# From the bb-deployer skill directory, targeting the new project:
bun /path/to/bb-deployer/scripts/init.ts --cwd=<project-root> --list
bun /path/to/bb-deployer/scripts/init.ts --cwd=<project-root> --preset=minimal
bun /path/to/bb-deployer/scripts/init.ts --cwd=<project-root> --preset=full --dry-run
```

Read `scripts/init/MODULES.md` for the module catalog and current build status. The dispatcher's `quality/biome` module is the canonical implementation of the Biome section below; the rest of the modules in MODULES.md are either built or scoped with enough detail to follow.

The remaining prose in this reference covers the cases the dispatcher does not yet handle, and serves as the specification a module should follow when it gets built.

## Read the spec first

Open `bb-deployer-spec.json`. The `bindings`, `secrets`, `deploy`, and `tokens` sections drive most of the configuration in this phase.

## Biome

Install at the repo root, not per-app. Biome handles both linting and formatting and replaces ESLint + Prettier for new Daniel projects.

```bash
bun add -D -E @biomejs/biome
bunx biome init
```

Replace the generated `biome.json` with:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignoreUnknown": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "es5"
    }
  }
}
```

## TypeScript strict

In `apps/api/tsconfig.json` and `apps/web/tsconfig.json`, ensure the `compilerOptions` block includes:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "moduleResolution": "Bundler",
  "module": "ESNext",
  "target": "ES2022"
}
```

These are the standard strict settings; do not invent custom flags. Keep framework-specific options (lib arrays, JSX settings) as the scaffolder generated them.

## wrangler.jsonc

The Worker scaffold from Phase 3 includes a `wrangler.jsonc`. Edit it from the spec.

Set `name` to the project name. Set `main` to `src/index.ts`. Set `compatibility_date` to today's date in ISO form. Add `compatibility_flags: ["nodejs_compat"]` only when the spec or analysis flags a need for Node.js compatibility (a library that depends on it, for example).

For each binding in `spec.bindings`, add the corresponding block. IDs are placeholders until Phase 7 creates the remote resources.

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "<project-name>",
  "main": "src/index.ts",
  "compatibility_date": "2026-XX-XX",
  "assets": {
    "directory": "../web/dist",
    "binding": "ASSETS"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "<project-name>-db",
      "database_id": "REPLACE_IN_DEPLOY_PHASE"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "REPLACE_IN_DEPLOY_PHASE"
    }
  ]
}
```

After editing, regenerate the typed `Env` interface:

```bash
cd apps/api
bunx wrangler types
cd ../..
```

This writes `apps/api/worker-configuration.d.ts`. Commit it; Hono handlers will import from it.

## Env vars and secrets

Create `.env.example` at the repo root listing every secret from `spec.secrets`, with empty values:

```
STYTCH_PROJECT_ID=
STYTCH_SECRET=
```

For every secret whose `source` is `"op-env"`, create `.op-env` (gitignored) with op-style references:

```
STYTCH_PROJECT_ID=op://Vault/<item>/project_id
STYTCH_SECRET=op://Vault/<item>/secret
```

Ensure `.gitignore` excludes:

```
.env
.env.local
.env.*.local
.op-env
.dev.vars
node_modules
.wrangler/
dist/
.astro/
```

## GitHub Actions: CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun test
      - run: bun run build
```

## GitHub Actions: Deploy

Create `.github/workflows/deploy.yml` for production deploys on main:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/api
```

Note that `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are GitHub repo secrets, set by Daniel via `gh secret set` or the web UI. Phase 7 will remind him.

## Dependabot

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule: { interval: "weekly" }
    groups:
      cloudflare:
        patterns: ["@cloudflare/*", "wrangler"]
      types:
        patterns: ["@types/*"]
      vue:
        patterns: ["vue", "@vue/*", "pinia", "vue-router"]
      astro:
        patterns: ["astro", "@astrojs/*"]
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule: { interval: "monthly" }
```

## Claude Code conventions

Create `.claude/settings.json` with minimum project config:

```json
{
  "model": "claude-opus-4-7",
  "skills": {
    "search_paths": ["./.claude/skills", "~/.claude/skills"]
  }
}
```

When Daniel has a `claude.yml` pattern from existing repos (for GitHub Claude actions), copy that pattern. Do not invent a config schema; check his other repos first.

## Tailwind config

Open the frontend's `tailwind.config.js` (or `.ts`) and extend it with the design tokens from `spec.tokens`:

```js
export default {
  content: ["./index.html", "./src/**/*.{vue,astro,ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: "<from tokens.primary>",
      },
      fontFamily: {
        sans: ["<from tokens.font>", "system-ui", "sans-serif"],
      }
    }
  }
}
```

Use only the tokens that came out of the analysis as load-bearing. Avoid over-extending the theme on a first pass; Phase 5 may surface more tokens that get added later.

## README

Generate `README.md` at the repo root with this skeleton:

```markdown
# <project-name>

<one-sentence description derived from the analysis>

## Stack

- Bun, TypeScript strict
- <Vue 3 + Vite | Astro + islands>, Tailwind
- Hono on Cloudflare Workers
- Bindings: <list from spec>
- Deployed at https://<project-name>.bitbuilder.cloud

## Local development

```bash
bun install
bun run dev
```

## Deploy

```bash
bun run deploy
```

## History

This section captures bb-deployer handoffs over time. Phase 8 of bb-deployer appends entries here.
```

## Verification

```bash
bun run lint
bun run build
```

Both should pass on the empty scaffold. When `lint` complains, fix the complaints before moving on; lint debt that piles up while application code lands becomes hard to untangle.

Commit:

```bash
git add -A
git commit -m "chore: configure tooling, CI, conventions, and design tokens"
```

## What to skip in this phase

No application code yet. No bindings created remotely (Phase 7). No tests (Phase 6). The repo at the end of Phase 4 still has only scaffolder-generated app code.
