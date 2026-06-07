# Catalog sources

This document is the source of truth for what goes into `catalog.json` and how to fetch it. Every source resolves to entries matching the normalized shape below.

## Normalized entry shape

```json
{
  "catalog_id": "string (globally unique, prefixed by source: c3:, gh:, ra:, npm:, user:)",
  "name": "string (human-readable)",
  "description": "string",
  "type": "template | starter | reference-arch | demo | doc | custom",
  "source": "c3 | cloudflare-templates | reference-architecture | first-party-repo | user-github | user-added",
  "action": "create-cloudflare | git-clone | fetch-docs | npm-package",
  "products": ["Workers", "D1", "R2", "KV", "DurableObjects", "Queues", "Workflows", "Agents", "Containers", "Sandboxes", "Vectorize", "WorkersAI", "Hyperdrive", "BrowserRendering", "Images", "Stream", "Calls", "Email", "Pages", "Zaraz", "Radar", "AnalyticsEngine"],
  "languages": ["TypeScript", "JavaScript", "Rust", "Python", "Go"],
  "frameworks": ["Hono", "Vue", "React", "Astro", "Next.js", "Qwik", "SvelteKit", "Remix", "None"],
  "fields": {
    "template_id": "c3 template id (only for action=create-cloudflare)",
    "url": "clone url or docs url (for git-clone and fetch-docs)",
    "ref": "branch, tag, or commit (default: main)",
    "subpath": "optional subdir within a monorepo source",
    "package": "npm package name (only for action=npm-package)"
  },
  "meta": {
    "source_url": "canonical URL for humans to inspect",
    "stars": "integer, optional",
    "last_updated": "ISO 8601, optional",
    "official": "boolean — true for Cloudflare-authored sources"
  }
}
```

## Source 1: create-cloudflare templates (c3)

**Canonical source**: `cloudflare/workers-sdk` repo, at `packages/create-cloudflare/templates` and `packages/create-cloudflare/templates-experimental`.

Each template has a `c3.json` metadata file declaring its template id, description, and supported variants (TypeScript, JavaScript, Python).

**Fetch strategy**:

```ts
// scripts/fetch_catalog.ts excerpt
const c3Root = "https://api.github.com/repos/cloudflare/workers-sdk/contents/packages/create-cloudflare/templates";
const dirs = await gh(c3Root);
for (const dir of dirs) {
  const meta = await ghFile(`${c3Root}/${dir.name}/c3.json`);
  // Parse meta, emit catalog entry with action=create-cloudflare, template_id=dir.name
}
```

Use the unauthenticated API if no token is set (60 req/hour, fine for a bootstrap), or the `GITHUB_TOKEN` env var for 5000 req/hour.

**Normalized entries**:
- `catalog_id`: `c3:<template-name>`
- `action`: `create-cloudflare`
- `fields.template_id`: `<template-name>`
- `meta.official`: `true`

## Source 2: cloudflare/templates gallery

**Canonical source**: `cloudflare/templates` repo on GitHub. Each top-level directory is a self-contained, clonable project.

**Fetch strategy**: list top-level directories, read each one's `package.json` or `README.md` for description, detect products from `wrangler.{jsonc,toml}`.

**Normalized entries**:
- `catalog_id`: `gh:cloudflare-templates/<dir-name>`
- `action`: `git-clone`
- `fields.url`: `https://github.com/cloudflare/templates`
- `fields.subpath`: `<dir-name>`
- `meta.official`: `true`

## Source 3: Reference Architectures

**Canonical source**: `developers.cloudflare.com/reference-architecture/diagrams/` and `/reference-architecture/design-guides/`.

These are **documentation pages, not clone-able code**. Catalog them so the user can include them as design references in their monorepo's `docs/reference-architectures/` directory.

**Fetch strategy**: sitemap walk. Start from `https://developers.cloudflare.com/sitemap.xml`, filter URLs matching `/reference-architecture/`, fetch each, extract `<h1>` as name and the first paragraph as description. Detect products by scanning the page body for Cloudflare product names.

**Normalized entries**:
- `catalog_id`: `ra:<slug>`
- `action`: `fetch-docs`
- `type`: `reference-arch`
- `fields.url`: full page URL
- `meta.official`: `true`

## Source 4: Agents SDK, Workers AI, and first-party demo repos

**Known repos** (baseline — add more as Cloudflare publishes):
- `cloudflare/agents-starter`
- `cloudflare/agents` (the SDK itself, includes examples)
- `cloudflare/ai` (Workers AI examples)
- `cloudflare/workers-ai-notebooks`
- `cloudflare/workflows-starter`
- `cloudflare/durable-objects-typescript-rollup-esbuild`
- `cloudflare/worker-sites-template`
- `cloudflare/worker-typescript-template`
- `cloudflare/pages-functions-template`
- `cloudflare/stream-demo`

**Fetch strategy**: For each known repo, fetch repo metadata (description, default branch, stars, last push), fetch `wrangler.{jsonc,toml,json}` and `package.json` to detect products, emit as a single catalog entry. If the repo contains an `examples/` directory at root, each subdirectory becomes its own entry with `fields.subpath` set.

**Normalized entries**:
- `catalog_id`: `gh:<owner>/<repo>[#<subpath>]`
- `action`: `git-clone`
- `meta.official`: `true` for `cloudflare/*` repos

## Source 5: User's GitHub (danielbodnar)

**Fetch strategy**: 
1. `GET /users/danielbodnar/repos?per_page=100&type=owner` — user's own repos
2. `GET /users/danielbodnar/starred?per_page=100` — starred repos
3. For each, fetch `wrangler.{jsonc,toml,json}` or check `package.json` for `wrangler` in deps/devDeps. If present, include in catalog. Otherwise skip.

**Normalized entries**:
- `catalog_id`: `gh:<owner>/<repo>`
- `type`: `custom` (with `meta.user_owned: true` or `meta.user_starred: true`)
- `action`: `git-clone`
- `meta.official`: `false`

## Source 6: User-added sources (runtime)

Added through the selector artifact's "Add custom source" panel. Accepts three input forms:

1. **GitHub URL**: `https://github.com/<owner>/<repo>[/tree/<ref>/<subpath>]` — parse into owner, repo, ref, subpath. Fetch metadata and detect products. Emit as `git-clone`.
2. **NPM package**: `<package-name>` or `<package-name>@<version>` — fetch from `https://registry.npmjs.org/<package>`. Emit as `npm-package`.
3. **Docs URL**: any http(s) URL not matching patterns 1 or 2 — fetch, convert HTML to Markdown, emit as `fetch-docs`.

**Normalized entries**:
- `catalog_id`: `user:<hash-of-url-or-package>`
- `type`: `custom`
- `meta.user_added_at`: ISO timestamp
- `meta.official`: `false`

Before adding to the catalog, Claude fetches the source and briefly describes it to the user (name, stars if GitHub, product detection, first paragraph of README or docs). The user confirms before it gets added to the active selection.

## Product detection

When a source doesn't self-declare its product tags, detect them by:

1. Reading `wrangler.{jsonc,toml,json}` bindings. Each binding type maps to a product (see `products-bindings.md`).
2. Reading `package.json` dependencies. `@cloudflare/workers-types` indicates Workers; `@cloudflare/ai` indicates Workers AI; `agents` indicates Agents SDK; `@cloudflare/containers` indicates Containers.
3. Reading the README. Keyword scan for product names.

If detection yields nothing, tag `products: ["Workers"]` as the default (since everything in this catalog is Workers-adjacent).

## Catalog file structure

Write the merged catalog to `references/catalog.json`:

```json
{
  "meta": {
    "fetched_at": "2026-04-16T12:00:00Z",
    "sources_fetched": ["c3", "cloudflare-templates", "reference-architecture", "first-party-repo", "user-github"],
    "sources_failed": [],
    "entry_count": 147
  },
  "entries": [ /* normalized entries */ ]
}
```

## Fetch failure handling

Each source fetch is independent. If one fails:

1. Log the failure to `meta.sources_failed` with reason.
2. Keep the prior catalog's entries for that source (if any).
3. Continue with the other sources.
4. Surface the failure to the user after the overall fetch completes, not silently.

## Rate limits

The GitHub unauthenticated API is 60 req/hour per IP. A full fetch of all six sources hits well above 60 requests. Detect rate-limit responses (`X-RateLimit-Remaining: 0`) and either:

1. Use `GITHUB_TOKEN` from env if present.
2. Back off and tell the user to re-run the fetch with a token, or use the cached catalog.
