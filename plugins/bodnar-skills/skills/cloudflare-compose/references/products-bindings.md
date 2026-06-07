# Cloudflare products and their wrangler bindings

Quick reference for detecting products from `wrangler.{jsonc,toml,json}` and for generating unified configuration during L3 synthesis. Binding keys shown as they appear in `wrangler.jsonc`.

## Binding table

| Product | Wrangler key | Minimal binding shape | Notes |
|---|---|---|---|
| D1 | `d1_databases` | `{ binding, database_name, database_id }` | `preview_database_id` for `wrangler dev` |
| R2 | `r2_buckets` | `{ binding, bucket_name }` | `preview_bucket_name` for dev |
| KV | `kv_namespaces` | `{ binding, id }` | `preview_id` for dev |
| Durable Objects | `durable_objects.bindings` | `{ name, class_name, script_name? }` | Requires `migrations` entry |
| Queues (producer) | `queues.producers` | `{ binding, queue }` | |
| Queues (consumer) | `queues.consumers` | `{ queue, max_batch_size?, max_batch_timeout?, dead_letter_queue? }` | Separate from producers |
| Workflows | `workflows` | `{ binding, name, class_name }` | Class exported from worker |
| Vectorize | `vectorize` | `{ binding, index_name }` | |
| Workers AI | `ai` | `{ binding }` | Singleton binding, no extra config |
| AI Gateway | `ai.gateway` | `{ id, skip_cache?, cache_ttl? }` | Attached to the `ai` binding |
| Hyperdrive | `hyperdrive` | `{ binding, id, localConnectionString? }` | Local dev needs direct DB conn |
| Browser Rendering | `browser` | `{ binding }` | Singleton |
| Images | `images` | `{ binding }` | Singleton, Workers Images API |
| Analytics Engine | `analytics_engine_datasets` | `{ binding, dataset }` | |
| Containers | `containers` | `{ class_name, image, max_instances? }` | Backed by Durable Object |
| Service Bindings | `services` | `{ binding, service, environment? }` | Worker-to-worker |
| mTLS | `mtls_certificates` | `{ binding, certificate_id }` | |
| Assets (Workers Sites) | `assets` | `{ directory, binding? }` | Static asset serving |
| Dispatch Namespace | `dispatch_namespaces` | `{ binding, namespace }` | Workers for Platforms |
| Version Metadata | `version_metadata` | `{ binding }` | Build metadata injection |
| Rate Limiting | `unsafe.bindings` | `{ name, type: "ratelimit", namespace_id, simple }` | Unsafe/beta |
| Agents | `durable_objects.bindings` | Same as DO — Agents are DO classes | Detect via `agents` dep in `package.json` |
| Sandboxes | `containers` + `durable_objects` | Combined | Detect via `@cloudflare/sandbox` dep |

## Compatibility flags

Common flags that matter during analysis:

| Flag | Effect |
|---|---|
| `nodejs_compat` | Enables Node.js built-ins (`node:buffer`, `node:stream`, etc.) |
| `nodejs_compat_populate_process_env` | Populates `process.env` from `vars` |
| `experimental` | Enables experimental bindings/APIs |
| `streams_enable_constructors` | Lets userland code construct ReadableStream etc. |
| `no_minimal_subrequests` | Disables subrequest minimization |
| `python_workers` | Required for Python workers |

When merging `compatibility_flags` across sources during synthesis, the union is safe for most flags but conflicts on flag-pairs like `nodejs_compat` vs `no_nodejs_compat` need resolution. Prefer the newer behavior.

## Compatibility dates

Take the latest `compatibility_date` across all merged sources. If the user has strong preference for stability, ask before bumping. Otherwise default to the newest among the inputs.

## Entry points and cron

| Config key | Purpose |
|---|---|
| `main` | Worker entry file path |
| `triggers.crons` | Array of cron expressions |
| `routes` | Custom domain or zone routes |
| `workers_dev` | Whether `*.workers.dev` subdomain is exposed |
| `tail_consumers` | Workers that receive tail events from this worker |

## Env-scoped overrides

Top-level bindings apply to all environments. Per-environment overrides go under `env.<name>.*` — e.g., `env.staging.d1_databases`, `env.production.vars`. During L3 synthesis, preserve per-environment overrides from each source template, even if you have to rename environments to avoid collisions.

## Vars vs secrets

`vars` is public config in `wrangler.jsonc`. `.dev.vars` is local-only, gitignored, for dev secrets. Production secrets live in `wrangler secret put` and don't appear in config at all. When merging:

- Merge all `vars` from all sources into the root `wrangler.jsonc`.
- Merge all `.dev.vars` lines into a single `.dev.vars` at root.
- Produce a `.env.example` with every key documented and values stubbed as `<fill-in>`.
- Do not invent secret values. Do not copy real values — if a source has a `.dev.vars` with real-looking secrets, strip the values and warn the user.

## Detection patterns

From a given source's `wrangler.jsonc`, product tags are extracted like this:

```ts
const productMap = {
  d1_databases: "D1",
  r2_buckets: "R2",
  kv_namespaces: "KV",
  "durable_objects.bindings": "DurableObjects",
  "queues.producers": "Queues",
  "queues.consumers": "Queues",
  workflows: "Workflows",
  vectorize: "Vectorize",
  ai: "WorkersAI",
  hyperdrive: "Hyperdrive",
  browser: "BrowserRendering",
  images: "Images",
  analytics_engine_datasets: "AnalyticsEngine",
  containers: "Containers",
  services: "Workers",
  mtls_certificates: "Workers",
  assets: "Workers",
  dispatch_namespaces: "Workers",
};
```

If the source `package.json` has `agents` as a dependency, add `Agents` regardless of bindings. Same for `@cloudflare/sandbox` — add `Sandboxes`. For `@cloudflare/containers`, add `Containers`.

## Durable Object migrations

Every time a DO class is introduced, a `migrations` entry is required:

```jsonc
"migrations": [
  { "tag": "v1", "new_classes": ["MyDurableObject"] }
]
```

When merging DO classes from multiple sources, preserve each source's migration history and append new entries. Do not renumber migration tags — that breaks deployments.

## Agents and Sandboxes specifics

- **Agents SDK**: Agent classes are Durable Object classes. They require both a `durable_objects.bindings` entry (pointing to the class) and the `agents` package installed. State persistence is handled by the SDK, not by raw DO storage API.
- **Sandboxes**: Container + Durable Object composition. Require `containers` binding, `durable_objects.bindings`, and `@cloudflare/sandbox` package. Image URL points to a Cloudflare-hosted container registry.

Treat Agents and Sandboxes as first-class products during analysis even though they piggyback on Durable Objects in the binding layer.
