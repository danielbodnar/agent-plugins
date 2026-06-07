# Stack baseline

Apply this layout to every working prototype or real project scaffold. For pure design canvases or static decks, skip the build tooling and write plain HTML instead.

The fixed stack: **Astro 6.3** (Islands, Server Endpoints, View Transitions, `astro:env`), **Vue 3** as Astro islands via `@astrojs/vue` with `<script setup lang="ts">` and the Composition API, **Cloudflare Workers** via **Wrangler** with the `@astrojs/cloudflare` adapter, **Bun** as the package manager and local runtime, and **oxlint** for linting.

Copy-ready versions of every config file below live in `assets/scaffold/`. Copy them into a new project rather than retyping. The notes here explain what each setting does and why.

## Project layout

```
.
├── astro.config.mjs
├── wrangler.toml
├── package.json
├── tsconfig.json
├── .oxlintrc.json
├── bunfig.toml
├── public/
└── src/
    ├── components/        # .vue islands + .astro layout pieces
    ├── layouts/
    ├── pages/             # file-based routing
    ├── styles/
    └── lib/               # pure TS helpers (Worker-safe, no node: imports)
```

## package.json

Use Bun, never npm, pnpm, or yarn. The `preview` script runs Wrangler against the built worker so local preview matches production. Always tell the user `bun install && bun run dev`. Never emit `npm install` or `npx` in instructions for this stack.

```json
{
  "name": "app",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "wrangler dev ./dist/_worker.js/index.js --assets ./dist",
    "deploy": "astro build && wrangler deploy",
    "lint": "oxlint .",
    "lint:fix": "oxlint --fix .",
    "typecheck": "astro check && tsc --noEmit"
  },
  "dependencies": {
    "astro": "^6.3.0",
    "@astrojs/vue": "^5.0.0",
    "@astrojs/cloudflare": "^12.0.0",
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "oxlint": "^0.15.0",
    "wrangler": "^3.90.0",
    "typescript": "^5.6.0"
  },
  "packageManager": "bun@1.2.0"
}
```

## astro.config.mjs

`output: 'server'` plus the Cloudflare adapter. `platformProxy.enabled` is what gives `locals.runtime.env` access during `astro dev`. The explicit Vite `conditions` keep `react-dom/server` out of the Workers bundle. Astro 6.3 handles this, but being explicit avoids surprises.

```js
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true }, // gives `locals.runtime.env` in dev
    imageService: 'compile',
  }),
  integrations: [
    vue({ appEntrypoint: '/src/lib/vue-app.ts' }),
  ],
  vite: {
    resolve: {
      conditions: ['workerd', 'worker', 'browser'],
    },
  },
});
```

## wrangler.toml

Declare all bindings here, then type them via `src/env.d.ts`. Keep `compatibility_date` current and `nodejs_compat` on.

```toml
name = "app"
compatibility_date = "2026-05-01"
compatibility_flags = ["nodejs_compat"]
main = "./dist/_worker.js/index.js"
assets = { directory = "./dist", binding = "ASSETS" }

# Bindings — declare here, type via `src/env.d.ts`
# [[kv_namespaces]]
# binding = "SESSIONS"
# id = "..."

# [[d1_databases]]
# binding = "DB"
# database_name = "app"
# database_id = "..."
```

## src/env.d.ts

The type glue between the `wrangler.toml` bindings and the code. Every binding declared in `wrangler.toml` gets a typed field in `Env`, which then surfaces as `Astro.locals.runtime.env` with full types.

```ts
/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

interface Env {
  // SESSIONS: KVNamespace;
  // DB: D1Database;
  ASSETS: Fetcher;
}

declare namespace App {
  interface Locals {
    runtime: Runtime;
  }
}
```

## .oxlintrc.json

oxlint is the linter: fast, Rust-based, ESLint-rule-compatible. Do not generate `.eslintrc*` files for this stack.

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "import", "vue"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "perf": "warn",
    "style": "off"
  },
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "typescript/no-explicit-any": "warn"
  },
  "ignorePatterns": ["dist", ".astro", ".wrangler", "node_modules"]
}
```

## bunfig.toml

```toml
[install]
exact = false
frozenLockfile = false

[install.cache]
disable = false
```

## tsconfig.json

Extends Astro's strict config. The `~/*` path alias maps to `src/*`, so imports read `~/components/...` rather than long relative paths.

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "preserve",
    "types": ["astro/client", "@cloudflare/workers-types"],
    "baseUrl": ".",
    "paths": { "~/*": ["src/*"] }
  },
  "include": ["src", ".astro/types.d.ts"]
}
```

## scripts/init

A POSIX `sh` bootstrap that checks for Bun, installs it if missing, then installs the project deps and the `cf` and `wrangler` CLIs. Ships in `assets/scaffold/scripts/init`. Make it executable with `chmod +x scripts/init`.
