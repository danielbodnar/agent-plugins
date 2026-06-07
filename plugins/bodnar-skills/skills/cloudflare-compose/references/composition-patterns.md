# Composition patterns

Patterns for merging configuration files from multiple scaffolded templates into a unified project. Read this before executing Phase 6 synthesis.

## Merging `wrangler.jsonc`

### The root config

The unified project has one primary worker whose config lives at `wrangler.jsonc` in the project root. Secondary workers (if kept as separate services) live at `packages/<n>/wrangler.jsonc`.

The root config structure:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "<project_name>",
  "main": "src/index.ts",
  "compatibility_date": "<newest across sources>",
  "compatibility_flags": [ /* union, conflicts resolved toward newer */ ],
  "workers_dev": true,

  // Bindings — merged across all sources
  "d1_databases": [ /* ... */ ],
  "r2_buckets": [ /* ... */ ],
  "kv_namespaces": [ /* ... */ ],
  "durable_objects": { "bindings": [ /* ... */ ] },
  "queues": { "producers": [ /* ... */ ], "consumers": [ /* ... */ ] },
  "workflows": [ /* ... */ ],
  "vectorize": [ /* ... */ ],
  "ai": { "binding": "AI" },
  "hyperdrive": [ /* ... */ ],
  "browser": { "binding": "BROWSER" },
  "images": { "binding": "IMAGES" },
  "services": [ /* ... */ ],
  "containers": [ /* ... */ ],

  "migrations": [ /* DO migrations, preserved from each source */ ],

  "vars": { /* merged public config */ },

  "triggers": { "crons": [ /* merged cron expressions */ ] },

  "env": {
    "staging": { /* per-env overrides */ },
    "production": { /* per-env overrides */ }
  }
}
```

### Binding name collisions

When two sources define the same binding name (e.g., both have `"binding": "DB"` for D1), rename with a domain prefix derived from the source name:

**Before** (collision):
```jsonc
// source A (agents-starter)
{ "binding": "DB", "database_name": "agents_db", "database_id": "abc..." }

// source B (analytics-worker)
{ "binding": "DB", "database_name": "analytics_db", "database_id": "xyz..." }
```

**After** (resolved):
```jsonc
{ "binding": "DB_AGENTS", "database_name": "agents_db", "database_id": "abc..." },
{ "binding": "DB_ANALYTICS", "database_name": "analytics_db", "database_id": "xyz..." }
```

Update every import of `env.DB` in the merged source code accordingly. Log every rename to `MIGRATIONS.md` with the form:

```
DB → DB_AGENTS (from agents-starter)
  Files updated: src/agents/store.ts, src/agents/handler.ts
DB → DB_ANALYTICS (from analytics-worker)
  Files updated: src/analytics/ingest.ts, src/analytics/query.ts
```

### Durable Object class collisions

If two sources define a DO class with the same name, rename one (prefer the less-canonical source — e.g., keep the Cloudflare-official class name, rename the third-party). Update:

1. The `class_name` in `durable_objects.bindings`.
2. The `migrations[].new_classes` entry.
3. The class declaration in source code.
4. Every `import` of that class.
5. Every `env.<BINDING>.idFromName(...)` call referring to it.

### Route collisions

If two sources both claim `/api/*` or the same cron schedule, ask the user to choose. Don't silently drop one.

### Compatibility flag conflicts

The only genuine conflict is paired flags like `nodejs_compat` vs `no_nodejs_compat`. Prefer the newer/more-compatible flag. For non-paired flags, union.

### Compatibility date

Take the max across all sources. If the delta is large (more than 6 months), flag it to the user — newer dates can change behavior.

## Merging `package.json`

### Strategy

The root `package.json` is a Bun workspace root. It owns all shared dependencies. Each workspace package has its own `package.json` but only for workspace-local overrides.

```jsonc
{
  "name": "<project_name>",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit",
    "build": "wrangler deploy --dry-run --outdir=dist"
  },
  "dependencies": { /* union of all sources' deps, version resolved */ },
  "devDependencies": { /* same, dev */ },
  "engines": { "bun": ">=1.1.0" }
}
```

### Version conflict resolution

When two sources pin the same package to different versions:

1. Pick the **newer** version if it's same major.
2. If major versions differ, **ask the user**. Don't silently upgrade major versions.
3. For Cloudflare-ecosystem packages (`wrangler`, `@cloudflare/workers-types`, `@cloudflare/vitest-pool-workers`, `@cloudflare/workers-shared`, `hono`), default to the latest stable at synthesis time.
4. For TypeScript, pick the latest across sources unless the user specified otherwise.

Log every version change in `MIGRATIONS.md`.

### Scripts merging

Scripts from multiple sources will collide on common names (`dev`, `build`, `test`). Do not silently pick one. Instead:

- `dev`, `build`, `deploy`: define at root, targeting the merged config.
- Source-specific scripts get prefixed: `dev:agents`, `test:analytics`.

## Merging `tsconfig.json`

Create `tsconfig.base.json` at root with strict settings:

```jsonc
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*", "worker-configuration.d.ts"]
}
```

Each workspace extends it with `{ "extends": "../../tsconfig.base.json" }` and only declares overrides.

### Strictness negotiation

If source templates have `"strict": false` or disable specific strictness flags, **do not silently loosen the unified config**. Keep the strict base and expect to fix type errors during synthesis. Document any `@ts-expect-error` pragmas you have to add.

## Merging environment variables

### `.dev.vars`

Single file at project root. Concatenate entries from each source's `.dev.vars` (if present), deduplicate keys, warn on value conflicts (don't overwrite silently — ask the user).

### `.env.example`

Produce one at the root with every public variable documented:

```
# Agents
AGENTS_MODEL=<model-id>         # Default model for agents

# Analytics
ANALYTICS_FLUSH_INTERVAL=<ms>   # How often to flush analytics buffers

# Workers AI (no env vars — uses ai binding directly)
```

Group by source domain. Add inline comments explaining each variable.

### Secrets

Never copy real secret values across. If a source has a `.dev.vars` that looks like it contains real credentials (keys with high-entropy values, tokens with recognizable formats like `sk_...`, `cf_...`), strip and replace with `<fill-in>`. Warn the user clearly.

## File layout — `src/`

Default to a domain-oriented layout:

```
src/
├── index.ts                 # Root Hono app, mounts all routes
├── <domain-1>/              # one per original source
│   ├── routes.ts            # Route definitions
│   ├── handler.ts           # Handler logic
│   ├── types.ts             # Domain types
│   └── (other files moved from scaffold)
├── <domain-2>/
├── shared/                  # Cross-domain utilities
│   ├── middleware.ts
│   ├── env.ts               # Typed env interface
│   └── types.ts
└── queue-consumers/         # Queue consumer handlers (if any)
```

Each domain gets a folder named for its original source (kebab-cased). Move all files. Update imports. Do not leave dead files.

## Root `src/index.ts` assembly

One entry point wires everything together:

```ts
import { Hono } from "hono";
import { agentsRoutes } from "./agents/routes";
import { analyticsRoutes } from "./analytics/routes";

export { MyAgent } from "./agents/agent";         // DO class re-export
export { AnalyticsDO } from "./analytics/do";      // DO class re-export

const app = new Hono<{ Bindings: Env }>();

app.route("/agents", agentsRoutes);
app.route("/analytics", analyticsRoutes);

export default {
  fetch: app.fetch,
  async queue(batch, env, ctx) {
    // Dispatch to queue consumers by queue name
    switch (batch.queue) {
      case "agents-queue": return import("./agents/queue").then(m => m.handleBatch(batch, env, ctx));
      case "analytics-queue": return import("./analytics/queue").then(m => m.handleBatch(batch, env, ctx));
    }
  },
  async scheduled(event, env, ctx) {
    // Dispatch by cron expression
    if (event.cron === "0 * * * *") await import("./agents/scheduled").then(m => m.hourly(env, ctx));
  }
} satisfies ExportedHandler<Env>;
```

All DO classes must be re-exported from the main module or Workers won't find them.

## Type generation

After merging `wrangler.jsonc`, regenerate types:

```bash
bun run wrangler types
```

This writes `worker-configuration.d.ts` with the `Env` interface matching current bindings. Commit it. Re-run any time bindings change.

## Validation gate

Before declaring Phase 6 complete, run all of:

1. `bun install` — resolves the merged dep graph.
2. `bun run wrangler types` — regenerates `Env`.
3. `bun run typecheck` — catches binding-name renames that missed a file.
4. `bun run build` (or `wrangler deploy --dry-run`) — catches config errors.

Every one must pass. If not, fix before handing back to the user.
