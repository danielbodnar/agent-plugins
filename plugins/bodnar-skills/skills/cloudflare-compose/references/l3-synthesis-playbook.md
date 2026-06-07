# L3 synthesis playbook

This is the step-by-step for Phase 6 — the deep refactor from `scaffolding/` (a monorepo of independent source templates) into a unified single-codebase architecture.

Follow the steps in order. Do not skip. At each decision point, wait for user confirmation before continuing.

## Prerequisite: ANALYSIS.md exists

`scripts/analyze_scaffold.nu` must have produced `ANALYSIS.md` at the project root. If it hasn't, go back to Phase 5.

Read `ANALYSIS.md` end-to-end before starting this phase. You will reference it continuously.

## Step 1: Choose the unified architecture

Based on what was scaffolded, present the user with 2 to 3 architecture options. Typical patterns:

### Option A: Single-worker monolith

One Worker handles everything. All routes, all queue consumers, all scheduled triggers, all Durable Object classes in one codebase. This is simplest and minimizes cross-worker latency, but the whole thing redeploys together.

Choose when: sources are small and related, no independent scaling needs, user wants simplicity.

### Option B: Service-bindings across separate workers

Multiple Workers, each in `packages/<worker-name>/`, connected via service bindings at the config layer. Each worker deploys independently.

Choose when: sources have genuinely distinct scaling or security boundaries, or when one source is significantly larger than the others.

### Option C: Durable-Object-centric actor model

Primary Worker is a thin router. All business logic lives in DO classes (or Agent classes). State is DO-local. Great for per-user or per-resource partitioning.

Choose when: the scaffolded sources are heavy on DOs or Agents, or the user has expressed a preference for the actor model.

### Decision output

Produce a short architecture decision doc at `docs/ARCHITECTURE.md` containing:

- The chosen option and why (3 to 5 sentences).
- The top-level file layout.
- How queue consumers, cron triggers, and DO classes are organized.
- Any open questions for the user.

Show this to the user. Wait for confirmation or adjustments.

## Step 2: Create the unified root

With the architecture confirmed, create the root files. This is scaffolding, not business-logic migration — that comes in step 5.

### Files to create at root

- `package.json` — Bun workspace root (see `composition-patterns.md` for shape).
- `tsconfig.base.json` — strict TypeScript base (see `composition-patterns.md`).
- `tsconfig.json` — extends base, includes `src/`.
- `wrangler.jsonc` — unified config for primary Worker.
- `.gitignore` — standard plus `.dev.vars`, `.wrangler/`, `dist/`, `node_modules/`.
- `.dev.vars.example` — template for local secrets, committed.
- `.env.example` — public env var documentation, committed.
- `README.md` — project overview, how to dev, how to deploy.
- `src/index.ts` — empty entry point for now, populated in step 7.

### For Option B (separate workers)

Also create `packages/<worker-name>/` for each secondary worker with its own `package.json`, `tsconfig.json`, `wrangler.jsonc`, and `src/`.

## Step 3: Merge bindings into unified `wrangler.jsonc`

Walk each source's `wrangler.{jsonc,toml,json}`. For each binding:

1. If no collision, add it verbatim to the root config.
2. If a binding name collides, rename per `composition-patterns.md` (domain-prefix like `DB_AGENTS`, `DB_ANALYTICS`). Record the rename in `MIGRATIONS.md`.
3. If a DO class name collides, rename the non-canonical one. Update the `class_name`, the `migrations` entry, and prepare to update the source code in step 5.

### Handle each binding type

Work through the types in this order (smallest first, to warm up):

1. `ai` — singleton, no conflict possible beyond binding name (usually `AI`).
2. `browser` — singleton, binding name (usually `BROWSER`).
3. `images` — singleton, binding name (usually `IMAGES`).
4. `kv_namespaces` — array, merge by binding name.
5. `r2_buckets` — array, merge by binding name.
6. `d1_databases` — array, merge by binding name.
7. `vectorize` — array, merge by binding name.
8. `hyperdrive` — array, merge by binding name. Handle `localConnectionString` carefully — these are dev-only.
9. `queues.producers` — array, merge. Unique queue names required at the Cloudflare level.
10. `queues.consumers` — array. Each consumer references a queue by name. Multiple consumers across sources can consume the same queue only if the logic is being merged; otherwise rename queues to avoid one consumer eating another's messages.
11. `workflows` — array, merge by binding name. Each references a class — ensure class name uniqueness.
12. `analytics_engine_datasets` — array, merge by binding name.
13. `services` — array, merge. Service bindings reference other Workers by name. Under Option A (monolith), service bindings that pointed to now-merged workers become direct function calls — drop them and refactor in step 5. Under Option B, keep them and update target names.
14. `containers` — array. Each wraps a DO class. Merge with DO class handling.
15. `durable_objects.bindings` — array. Merge by binding name. Class names must be unique across the merged worker. Preserve `migrations` from every source — append, never renumber.
16. `mtls_certificates` — array, merge by binding name.
17. `assets` — singleton (or one per worker under Option B). Only one can win under Option A. Merge `directory` paths by choosing one canonical `public/` and moving content into it.

### Env-scoped overrides

After top-level merging, handle `env.*` blocks. If multiple sources have `env.production`, merge those too. Under Option A, all sources share one production environment; under Option B, each worker keeps its own.

### Migrations array

The `migrations` array records the evolution of DO classes. Merge by concatenating, not interleaving. Each source contributes its migration history prefixed by that source's highest tag. For example:

```jsonc
// From agents-starter (had migrations v1, v2)
// From analytics-worker (had migrations v1)

"migrations": [
  // Preserve agents-starter history
  { "tag": "v1", "new_classes": ["MyAgent"] },
  { "tag": "v2", "renamed_classes": [{ "from": "MyAgent", "to": "ChatAgent" }] },
  // Append analytics-worker as new entries, renumbered to extend the sequence
  { "tag": "v3", "new_classes": ["AnalyticsDO"] }
]
```

This is safe because the unified worker has never been deployed before — the migration history is only about DO class lineage as a single unit from now on. Document this reset in `MIGRATIONS.md`.

## Step 4: Consolidate dependencies

Read every source's `package.json`. Build a unified dependency map:

```
package-name → { versions: [v-from-source-a, v-from-source-b], winner: v-to-use }
```

Apply the version resolution rules from `composition-patterns.md`:

1. Same major → newer wins silently.
2. Different majors → ask user.
3. Cloudflare packages → latest stable.
4. Peer-dependency conflicts → surface and ask.

Write the unified `package.json`. Remove duplicate deps from any preserved workspace packages (they inherit from root under Bun).

Run `bun install`. Surface any resolution errors to the user.

## Step 5: Restructure `src/`

This is the mechanical bulk of the work. For each source template in `scaffolding/<name>/`:

1. Decide its target domain under `src/`. Usually `src/<kebab-case-source-name>/`.
2. Move its source files into the target domain, preserving subdirectory structure within that domain.
3. Update every import path:
   - Internal imports (within the source) become relative imports inside the new domain.
   - Cross-domain imports (if the source was already importing from another source — rare but possible) become `../<other-domain>/...`.
4. Update every `env.<BINDING>` reference to match any binding renames done in step 3.
5. Update every DO class reference to match any renames.
6. Update every service-binding call to match Option A (direct call) or Option B (updated service name).

### Shared code

Identify code that's genuinely cross-domain (auth middleware, logging, type definitions for a shared schema). Move it to `src/shared/`. Don't over-eagerly share — leave domain-local code in its domain.

### Type for `Env`

After bindings are merged and types regenerated (`bun run wrangler types`), `worker-configuration.d.ts` has the canonical `Env` interface. Use it consistently. Don't hand-write alternate `Env` types per domain.

### Delete `scaffolding/` only after validation

Do not `rm -rf scaffolding/` until step 9's validation gate passes. Until then, `scaffolding/` is your reference for verifying the migration is correct.

## Step 6: Unify configuration files

### `.dev.vars`

Concatenate source `.dev.vars` files, deduplicate keys, warn on conflicts. Strip anything that looks like a real secret (see `composition-patterns.md`).

### `.env.example`

Produce one at root. Group by domain. Every key has a comment.

### Other config files

- `.gitignore` — merge, dedupe.
- `.vscode/settings.json` — if sources had them, merge carefully. Editor config is optional; skip if uncertain.
- `biome.json` / `.eslintrc` / `prettier.config.js` — pick one linter/formatter for the unified project. Default to Biome if any source used it, otherwise the user's preference.
- Vitest/testing config — if sources had tests, unify under a single `vitest.config.ts` at root. Move test files alongside source under `__tests__/` or `*.test.ts` following the source's existing pattern.

## Step 7: Assemble `src/index.ts`

One entry point. See the template in `composition-patterns.md`. Key responsibilities:

1. Construct the Hono (or chosen framework) app.
2. Mount each domain's routes.
3. Re-export every DO class (required — Workers runtime looks them up by name from the module's exports).
4. Implement the `fetch`, `queue`, and `scheduled` handlers, dispatching to domain handlers.
5. Implement any `tail` or `email` handlers if sources used them.

Name the re-exported DO classes exactly as declared in `wrangler.jsonc` `class_name` fields. Mismatch = deployment error.

## Step 8: Write `MIGRATIONS.md`

Comprehensive record at project root:

```markdown
# Migration log

## Bindings renamed

| Original | New | From source | Files updated |
|---|---|---|---|
| DB | DB_AGENTS | agents-starter | src/agents/*.ts |
| DB | DB_ANALYTICS | analytics-worker | src/analytics/*.ts |

## Durable Object classes renamed

| Original | New | Reason |
|---|---|---|
| ChatAgent | AgentChatAgent | Collision with analytics-worker ChatAgent |

## Dependency versions changed

| Package | From | To | Reason |
|---|---|---|---|
| wrangler | 3.78.0 (agents) / 3.80.1 (analytics) | 3.85.0 | Latest stable at synthesis |
| hono | 4.5.0 | 4.7.0 | Bump to latest |

## Files removed from scaffolds

List of files that existed in the source scaffolds but are not present in the unified codebase, with reasons.

## Compatibility flags changed

Any diff from what each source had.

## Open follow-ups

Items the user should review — usually flagged collisions or non-obvious decisions.
```

## Step 9: Validation gate

All must pass:

1. `bun install` — clean install.
2. `bun run wrangler types` — regenerate `Env`.
3. `bun run typecheck` — zero errors.
4. `bun run build` or `wrangler deploy --dry-run` — config parses, entry points resolve.

If any step fails:

- Fix trivial issues silently (import path typos, missing type annotations).
- Surface non-trivial issues to the user with the failing step's output and your proposed fix.
- Do not proceed to step 10 with a failing gate.

## Step 10: Present results

Once the gate passes:

1. Delete `scaffolding/` (the source templates are no longer needed).
2. Summarize what was produced: directory tree, merged binding count, file counts per domain, link to `MIGRATIONS.md` and `docs/ARCHITECTURE.md`.
3. Offer next steps: `bun run dev` to start local dev, provisioning any Cloudflare resources that need creation (D1 databases, R2 buckets, etc.), committing the initial state.
4. Do not deploy. Deployment is the user's decision.

## When to stop and ask

- Major version bumps in shared dependencies.
- Irreconcilable binding or class collisions.
- Conflicting compatibility flags with no clear winner.
- Queue consumer collisions that could cause message loss.
- When any source's code exceeds what you can confidently refactor (large, unfamiliar frameworks; generated code; bespoke build systems).

Default posture is to proceed with clear communication. Escalate only when a decision genuinely affects the project's shape.
