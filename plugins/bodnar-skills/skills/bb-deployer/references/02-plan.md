# Phase 2: Plan

The goal is a confirmed target stack and a `bb-deployer-spec.json` that the remaining phases execute against deterministically. The Plan phase is where Daniel makes the irreversible decisions, so prompt clearly and confirm explicitly.

## Inputs

The `bb-deployer-analysis.md` from phase 1 and Daniel's answers to the runtime elicitation listed in the top-level `SKILL.md`. Read both before drafting the spec.

Also consult the **Environment snapshot** section of `SKILL.md`. It captures live auth state, installed skills, and project MCPs at invocation. Use it to (a) confirm wrangler is logged into the right account before planning bindings, (b) note whether `gh` is authenticated before planning a GitHub repo, and (c) identify helper skills that could compose into this plan. Surface composition candidates to Daniel explicitly.

## Stack decision tree

### Frontend framework

Use the interactivity score from the analysis.

A score of 0 to 3 indicates a content-shaped artifact: marketing pages, documentation, mostly-static dashboards with a few sparkly bits. Propose Astro + islands. Astro ships less JavaScript and matches the shape.

A score of 8 to 10 indicates an app-shaped artifact: editors, real-time canvases, multi-step interactive flows. Propose Vue 3 + Vite. Vue handles dense state and reactivity better than Astro's island model for this shape.

A score of 4 to 7 is the ambiguous middle. Default to Astro when the artifact reads more like content with interactive sections, and default to Vue when the artifact reads more like an app with content sections. Ask Daniel to confirm either way.

When Daniel overrides the proposal, accept the override without argument unless it conflicts with Sane Defaults (asking for React, for example, is a hard conflict).

### Backend

When the analysis shows no backend signals (no fetches, no implied bindings, no auth), skip the Worker entirely. Serve the frontend through Cloudflare static assets via the Worker assets binding. The repo still gets `apps/api` for future expansion, scaffolded but empty.

When any backend signal is present, plan a Hono Worker. Hono is the default; do not consider alternatives.

### Bindings

For each binding type implied by the analysis, propose a binding name and ask Daniel to confirm.

D1 for relational data, multi-row queries, joins, or anything where the artifact code shows array-of-object state that ought to outlive a session.

KV for config, feature flags, eventual-consistency caches, and session-ish data that does not need transactions.

R2 for file uploads, images, generated PDFs, exports.

Durable Objects for per-entity state, real-time collaboration, WebSocket sessions, anything that wants single-writer guarantees.

Queues for async jobs, fan-out, retry-on-failure work.

Vectorize for semantic search, RAG patterns, embeddings.

Workers AI for inference inside the Worker.

Hyperdrive, Pub/Sub, Workflows, Containers: surface as questions rather than silent additions. These are heavier choices and Daniel will want to confirm explicitly.

### Auth

When the analysis flags auth as required, default to Stytch (Daniel's preference from prior projects, including the filecenter and nealins work). Confirm before adding to the spec.

When auth is not flagged, do not add it. Adding auth speculatively is the kind of friction this skill exists to remove.

## ProjectSpec output

Write `bb-deployer-spec.json` matching this shape exactly. Validate it parses as JSON before saving; the remaining phases will fail noisily if it does not.

```json
{
  "name": "<project-name>",
  "repo": {
    "scope": "new",
    "path": "<absolute path>",
    "createGitHubRepo": true
  },
  "frontend": {
    "framework": "vue",
    "buildTool": "vite",
    "styling": "tailwind"
  },
  "backend": {
    "present": true,
    "framework": "hono",
    "runtime": "workers"
  },
  "bindings": [
    { "type": "d1", "name": "DB", "purpose": "todos table and per-user state" },
    { "type": "kv", "name": "CACHE", "purpose": "feature flags" }
  ],
  "auth": {
    "required": false,
    "provider": null
  },
  "deploy": {
    "account": "bitbuilder",
    "domain": "<project-name>.bitbuilder.cloud",
    "customDomain": null
  },
  "secrets": [
    { "name": "STYTCH_PROJECT_ID", "source": "op-env" }
  ],
  "tokens": {
    "primary": "#...",
    "font": "...",
    "extracted_from_analysis": true
  }
}
```

Valid `frontend.framework` values: `"vue"` or `"astro"`. Valid `secrets[].source` values: `"op-env"`, `"prompt"`, `"later"`. Valid `bindings[].type` values: `"d1"`, `"kv"`, `"r2"`, `"do"`, `"queues"`, `"vectorize"`, `"ai"`, `"hyperdrive"`.

## What to skip in this phase

No scaffolding yet. No code generation. No CLI invocations against Cloudflare. The Plan phase only produces the spec file.

## When to stop and ask

When the analysis suggests something exotic (long-running background processes, raw TCP, GPU inference outside Workers AI), surface it as a Sane Defaults conflict before adding to the spec. Workers is the target; if the artifact wants something Workers cannot do, the conversation needs to happen before scaffolding, not after.

When the artifact uses a library with no clean Cloudflare equivalent (a Node-only npm package, a database client that does not work over HTTP), name the conflict in the spec output and ask Daniel how to resolve it. Common resolutions: swap to a Workers-compatible library, move that surface into a Container, or simplify the feature.

## Verification before moving on

Read `bb-deployer-spec.json` back. The Initialize phase will scaffold from it, the Config phase will generate `wrangler.jsonc` from it, the Implement phase will pick translation rules from it, and the Deploy phase will provision resources from it. Every downstream phase depends on this file being correct, so spend the extra minute confirming it.
