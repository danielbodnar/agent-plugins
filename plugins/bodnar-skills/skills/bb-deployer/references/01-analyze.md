# Phase 1: Analyze

The goal is a structured analysis of the artifact that the Plan phase can consume without re-reading the source. Analysis is read-only; no scaffolding, no code translation, no proposals yet.

## Input detection

Check in this order and use the first one that matches.

Files under `/mnt/user-data/uploads/` with extensions `.html`, `.jsx`, `.tsx`, `.vue`, `.astro`, or `.zip`. Read them directly with `view` for source files or unpack archives into the workspace first.

Substantial code blocks in recent conversation turns. Extract the most recent artifact that looks like a complete app, not a snippet.

A `claude.ai/share/...` URL provided by Daniel. Fetch it with `web_fetch`. If the fetch returns a rendering-only page rather than source, fall back to asking Daniel for the artifact source directly.

If none of the three modes is present, ask Daniel how he wants to provide the artifact before going further.

## Signals to extract

Read the artifact carefully and capture each of the following. The downstream phases all depend on this being complete and accurate.

**Framework.** React, Vue, Astro, or plain HTML. Almost always React for claude.ai artifacts. Note the version and any framework-specific features (Server Components, Suspense boundaries).

**Component graph.** Every component, its props, its children, and a one-sentence purpose. Capture the file path or location in the artifact source. Order from leaves to roots so the Implement phase can translate bottom-up.

**State model.** Every `useState`, `useReducer`, `useContext`, and external store. For each: what it holds, who reads it, who writes it, and whether it survives across components or pages.

**Routing.** React Router routes, page-level conditional rendering, or single-page. Capture the route table even when it lives inside a switch statement.

**Data flow.** Every place data originates: literals, `fetch` calls, computed transforms, posted forms. For each fetch, capture URL, method, request shape, and response shape. Even when the artifact mocks the API with local arrays, capture the shape; the Plan phase needs it for binding inference.

**External dependencies.** Imports from `shadcn/ui`, `recharts`, `lucide-react`, `framer-motion`, custom fonts, custom CSS files, any non-React libraries. The Implement phase needs to know what to find replacements for.

**Design tokens.** Dominant colors, font stacks, spacing scale, border radii, shadows. Extract from inline Tailwind classes, from any `tailwind.config` if present, and from custom CSS. The Config phase will encode these into `tailwind.config.js`.

**Interactivity score.** A single integer from 0 to 10. Zero is a static landing page; ten is a real-time multiplayer canvas. This score drives the Vue-vs-Astro proposal in the Plan phase. Justify the score in one sentence so Daniel can argue with it.

**Implied backend.** Any state that would need to persist across users or sessions, any data that should not live in client memory, any fetch to an external API. For each, propose a Cloudflare binding: D1 for relational, KV for config or feature flags, R2 for blobs, Durable Objects for per-entity or real-time state, Queues for async fan-out, Vectorize for semantic search, Workers AI for inference.

**Auth requirements.** Login UI, gated content, user-scoped state. If present, capture the apparent auth model (email, OAuth, magic link, session cookies).

## Output format

Write the analysis to `bb-deployer-analysis.md` in the conversation workspace. Use the following structure verbatim so the Plan phase can parse it predictably.

```markdown
# Artifact Analysis: <name>

## Framework
React + Tailwind (or whatever was detected)

## Components
- ComponentName: one-sentence purpose. Props: prop1, prop2. Children: ...

## State
- hookOrStoreName: what it holds, scope, writers

## Routes
- /path: component, what it does

## Data flow
- Source: literal | fetch | computed | posted. Shape: ...

## Dependencies
- package@version: what it does

## Design tokens
- Primary color: #...
- Secondary: #...
- Font: ...
- Spacing scale: ...
- Border radius default: ...

## Interactivity score
N out of 10 because <one sentence>

## Implied backend
- Binding type: name, purpose, evidence in the artifact

## Auth
- Required: yes or no
- Model: <if required>
```

## What to skip in this phase

Do not translate any code. Do not propose a target framework yet. Do not generate scaffold files. Do not ask Daniel about configuration (the Plan phase owns elicitation). Do not edit the artifact source.

## When to stop and ask

If the artifact references APIs whose shape cannot be inferred, ask Daniel for an example request and response. If design tokens appear load-bearing but extraction is ambiguous (a custom palette versus default Tailwind, for example), ask which colors and fonts are intentional. Guessing on either point poisons every downstream phase.

## Verification before moving on

Re-read `bb-deployer-analysis.md` once it is written. The Component graph, State, and Data flow sections in particular should be specific enough that the Implement phase could rebuild the artifact from them alone. If any section reads vague, go back to the source and tighten it before advancing.
