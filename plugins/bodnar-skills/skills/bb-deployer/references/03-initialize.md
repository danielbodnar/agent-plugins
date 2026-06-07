# Phase 3: Initialize

The goal is a scaffolded monorepo where `bun run dev` boots cleanly with no application code. Use upstream CLIs exclusively. Inventing a custom scaffolder violates Sane Defaults.

## Read the spec first

Open `bb-deployer-spec.json`. Every command in this phase branches off it. If the spec is missing or invalid, stop and go back to Plan.

## Step 1: Repo root

When `repo.scope` is `"new"`, create the directory and initialize Bun:

```bash
mkdir <project-name>
cd <project-name>
bun init -y
```

Then rewrite `package.json` as a Bun workspace root. Keep the version `0.0.0` and mark the package private. The workspace globs are `apps/*` and `packages/*`. Add cross-package scripts that fan out via `bun --filter`:

```json
{
  "name": "<project-name>",
  "private": true,
  "version": "0.0.0",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "bun --filter '*' dev",
    "build": "bun --filter '*' build",
    "deploy": "cd apps/api && bunx wrangler deploy",
    "lint": "biome check .",
    "format": "biome format --write ."
  }
}
```

When `repo.scope` is `"merge"`, `cd` into the existing repo path and skip to step 2. Do not overwrite the existing `package.json`; instead, confirm the existing root supports workspaces and add the new apps under the existing layout.

## Step 2: Scaffold the Worker

Use Cloudflare's upstream CLI. The flags below produce a Hono Worker with TypeScript, no git (we already have one at the root), and no auto-deploy.

```bash
mkdir -p apps
cd apps
bunx create-cloudflare@latest api \
  --type=hello-world \
  --framework=hono \
  --ts \
  --git=false \
  --deploy=false \
  --no-open
cd ..
```

The result is `apps/api/` containing `src/index.ts` (a minimal Hono app), `wrangler.jsonc`, and `package.json`. Phase 4 will edit `wrangler.jsonc` from the spec. Do not edit it now.

When the spec sets `backend.present` to `false`, still run this scaffold; Phase 4 will convert the Worker to a pure static-assets server. The Worker shell stays useful as future expansion room.

## Step 3: Scaffold the frontend

Branch on `frontend.framework`.

When the value is `"vue"`:

```bash
cd apps
bun create vue@latest web -- \
  --typescript \
  --router \
  --pinia \
  --eslint=false \
  --prettier=false
cd web
bun install
cd ../..
```

When the value is `"astro"`:

```bash
cd apps
bun create astro@latest web -- \
  --template basics \
  --typescript strict \
  --install \
  --no-git
cd ../..
```

The result is `apps/web/` with a working framework starter. Do not customize it yet; phase 5 will translate the artifact components into this shell.

## Step 4: Shared types package

```bash
mkdir -p packages/shared/src
cd packages/shared
bun init -y
```

Rewrite `packages/shared/package.json` as a library:

```json
{
  "name": "@<project-name>/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
```

Add an empty `src/index.ts` so the package imports cleanly. Phase 5 will fill it with Zod schemas shared between the Worker and the frontend.

Wire `apps/api/package.json` and `apps/web/package.json` to depend on the shared package:

```json
"dependencies": {
  "@<project-name>/shared": "workspace:*"
}
```

Then run `bun install` from the repo root to link the workspace dependencies.

## Step 5: Tailwind

The artifact uses Tailwind. Install per the framework's official guide; do not invent a custom Tailwind setup.

For Vue + Vite, follow https://tailwindcss.com/docs/guides/vite.

For Astro, follow https://docs.astro.build/en/guides/integrations-guide/tailwind/.

In both cases the result is a `tailwind.config.js` (or `.ts`), a CSS file with the `@tailwind` directives, and the frontend's build pipeline aware of Tailwind. Phase 4 will extend the config with the design tokens from analysis. Phase 5 will translate Tailwind classes from the artifact.

## Step 6: Git

```bash
cd <repo-root>
git init -b main
git add -A
git commit -m "chore: initial scaffold via bb-deployer"
```

When `repo.createGitHubRepo` is `true` and `gh` is on PATH:

```bash
gh repo create <project-name> --private --source=. --remote=origin --push
```

When `gh` is not available, surface that as a note for Daniel to create the remote manually. Do not block the rest of the skill on it.

## Verification

Run these and make sure both boot without errors before moving to Phase 4:

```bash
cd apps/api && bun install && bun run dev &
WORKER_PID=$!
cd ../..
cd apps/web && bun install && bun run dev &
WEB_PID=$!
cd ../..
sleep 5
curl -sS http://localhost:8787/ | head -5
curl -sS http://localhost:5173/ | head -5  # or :4321 for Astro
kill $WORKER_PID $WEB_PID
```

Both `curl` calls should return real responses. If either fails, fix the scaffold before advancing.

## What to skip in this phase

No application code. No linter or CI configuration (Phase 4 owns those). No bindings provisioning in Cloudflare (Phase 7 owns that). No tests (Phase 6 owns those). The Initialize phase produces empty, working starter shells and stops.
