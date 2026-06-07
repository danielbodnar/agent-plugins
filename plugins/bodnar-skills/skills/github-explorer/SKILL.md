---
name: github-explorer
description: "Build the GitHub Stars Explorer, a system for organizing, searching, and analyzing starred GitHub repositories. Use this skill whenever the work involves the Stars Explorer or Stars Workbench project: its data pipeline (fetch from GitHub, transform, index, present), its Quiet design system and theme.config.ts tokens, its workbench UI (the resizable three-pane layout, the datagrid, the file-browser and README pane, the collapsible filter tree, the Discover view), or delivering any of it as an MCP App (interactive UI embedded in Claude, ChatGPT, or another MCP host via the ext-apps protocol and the mcp-ui SDK). Also use it when building any repository-discovery, starred-repo organization, full-text or semantic or natural-language search over repos, or repo recommendation feature for this project, even when it is not named explicitly. Trigger on mentions of stars explorer, repo search, the workbench layout, the Quiet theme, or building an MCP App or mcp-ui view for this project."
---

# GitHub Stars Explorer

A system that turns GitHub's flat list of starred repositories into a searchable, organized knowledge base. This skill carries the parts of the project that are settled, so that any new piece is built consistently with the rest. It deliberately does not settle the technology stack: which shell, search engine, static site generator, runtime, or data tooling to use are decisions for the project owner to make, and this skill presents options and the reasoning behind them rather than prescribing a choice.

The project has two audiences in mind at once: an end user who wants better discovery and organization than GitHub's native starring gives them, and a staff-level engineer who needs the architecture to be legible and sound. Both are served by the same principle: be thin glue over capable upstream tools, treat data as data in native formats, and follow the Unix philosophy of small composable parts with clean contracts.

## How to use this skill

First, work out which part of the project the request touches, then read the matching reference. The references are the substance; this file is the map.

- Building or styling any UI (the app, a component, a page) — read `references/design-system.md`, and use the ready-made token files in `assets/design-system/`. This is the most common entry point and the most reusable artifact, and it is independent of any framework or stack choice.
- Delivering the UI as an interactive surface embedded in an AI chat host (Claude, ChatGPT, VS Code, and others) — read `references/mcp-apps.md`. This covers the MCP Apps protocol (the `ext-apps` standard) and the mcp-ui SDK that implements it.
- Designing the data pipeline (how repository data is fetched, shaped, indexed, and presented) — read `references/architecture.md` for the shape of the flow and the contracts between stages, written so the specific tools remain the owner's choice.
- Building or extending the application interface (layout, datagrid, file browser, filter tree, Discover, keyboard and resize behavior) — read `references/app-patterns.md`.
- Choosing a tool for any stage (the shell, the data-processing library, the search engine, the rendering approach, the runtime) — read `references/stack-options.md`, which presents the candidates and tradeoffs so the owner can decide. Do not pick for them.

When a request spans several of these, read the relevant references together. They are written to compose.

## What is settled, and what is not

Settled are the product shape, the visual language, and the interaction patterns. These are the parts that make the Stars Explorer recognizably itself, and new work should honor them unless the owner reopens one.

Not settled, and not for this skill to settle, is the technology stack. The pipeline stages, the search engine, the rendering approach, the runtime, and the data tooling are the owner's decisions. Where the references discuss tools, they do so as options with tradeoffs, and they describe the pipeline in terms of the contracts between stages rather than the implementations that fill them. If a request asks which tool to use, present the candidates and the reasoning and let the owner decide, rather than asserting a default.

The settled pieces:

The product is a repository knowledge base built from a one-directional flow: repository data is fetched from GitHub, transformed and enriched, indexed for search, and presented through a UI. Each stage hands the next a clean, typed artifact and no stage reaches backward. The flow is a build pipeline; the presentation serves pre-computed results.

The search experience offers three modes (keyword, semantic, natural language) plus recommendations, regardless of which engine provides them. The UI exposes these as distinct modes because they answer different kinds of question.

The visual language is the Quiet design system: a near-white paper surface, a cool blue-grey ink ramp, and a single chromatic accent at hue 244, all in OKLCH. Dark mode is a separately authored scheme, not a filter. The system is tokenized in `theme.config.ts` and compiled to CSS custom properties; components reference tokens by name and never hardcode a value. Type is three faces: Inter Tight for display, Inter for body, JetBrains Mono for the technical register.

The application is a workbench: a top bar, a resizable left sidebar that holds the Stars and Discover navigation above a collapsible filter tree, a main pane that defaults to a datagrid, and a right pane that opens into a file browser and README view when a repository is selected. Selection collapses the datagrid to a narrow master list. Multi-select uses click, Ctrl or Cmd click, and Shift click rather than checkboxes.

## Bundled assets

`assets/design-system/` is the complete, validated design system, ready to copy into a project: the typed `theme.config.ts` source, the `build-tokens.ts` compiler, the compiled `styles/hallmark/` CSS layer (tokens, base, primitives, index), portable exports (DTCG `tokens.json`, Tailwind v4 `@theme`, shadcn variables), and `design.md` documenting all of it. Prefer copying and extending these over regenerating them; they already match the shipped UI exactly. The design system is stack-agnostic CSS and one TypeScript config, so it drops into any frontend approach the owner chooses.

`assets/examples/app.html` and `assets/examples/marketing-site.html` are working, self-contained references for the application interface and the marketing site. Read them when you need to see how a pattern is actually wired rather than how it is described. They are illustrative, not files to edit in place.

## Working principles for this project

Align with upstream rather than competing with it. Whatever tools the owner chooses, new code should be the thin connective layer between them, not a reimplementation of their jobs.

Keep data structured end to end. Repository data should stay as typed records and tables through the pipeline rather than being flattened into strings and re-parsed at each step. A stage that emits structured data its successor can consume directly is doing its job; one that emits text the next stage has to re-parse is a smell. This principle holds regardless of which tools implement the stages.

Tokens are locked. Once the design system defines a value, the UI references it by name. If a needed value does not exist as a token, add it to `theme.config.ts` and recompile, then reference it. This is what keeps every surface visually identical without sharing a stylesheet beyond the token layer. Read `references/design-system.md` before introducing any new color, font, or spacing value.

Explain pipeline contracts at the boundaries. The hand-offs between fetch, transform, index, and present are where this system is easiest to get wrong and most valuable to get right. When you build or change a stage, be explicit about the shape it consumes and the shape it produces.

Stack choices belong to the owner. When the work reaches a point where a tool must be picked, surface the realistic options and their tradeoffs and let the owner choose. Do not encode a particular tool as the project's settled answer in any artifact this skill produces.

Prefer prose and complete sentences in any documentation or comments the project produces, keep document content separate from commentary about the work, and do not use em-dashes. The project's written artifacts follow these conventions throughout.
