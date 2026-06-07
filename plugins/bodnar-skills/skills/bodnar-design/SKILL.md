---
name: bodnar-design
description: Daniel Bodnar's unified house design and frontend skill for high-fidelity, interactive, and visually distinctive web work on the Astro 6 + Vue 3 + Cloudflare Workers + Bun + oxlint stack. Use this whenever building, designing, prototyping, scaffolding, or styling any web UI such as landing pages, portfolios, dashboards, components, slide decks, marketing sites, resumes, or frontend artifacts. Also use it any time a design needs an aesthetic direction and no brand or design system is supplied, since the skill ships the terminal-first "bodnar.sh" system (four themes, JetBrains Mono primary, a system-software-literate component vocabulary, motion language, and a real print mode) as the default house style. Trigger on phrases like "build a site", "design a page", "make a prototype", "scaffold a frontend", "style this UI", "make me a landing page / dashboard / portfolio", "redesign this", or any hi-fi, interactive, or distinctive web work, even when the user never says the word "design".
---

# bodnar-design

Daniel Bodnar's house skill for design and frontend work. It covers three jobs that usually overlap: producing polished hi-fi design output, building interactive prototypes that behave like real apps, and giving a project a distinctive aesthetic direction when no brand exists.

The production target is a fixed stack: Astro 6.3 islands, Vue 3 with the Composition API, Cloudflare Workers via Wrangler, Bun as the runtime and package manager, and oxlint for linting. When no brand or design system is supplied, the skill defaults to the terminal-first **bodnar.sh** system, which ships its own tokens, four themes, component vocabulary, motion language, and print mode.

## Pick a mode

Three modes. Pick one for the ask, or combine them. Read the matching section of `references/modes.md` before building.

| Mode | Use when |
|------|----------|
| **Hi-fi design** (§1) | The ask is polished, pixel-precise visual output: color, type, static layout, or a clickable hi-fi mock with variants exposed as Tweaks. |
| **Interactive prototype** (§2) | The ask should behave like a working app: real state, real transitions, real edge cases, server endpoints running on Workers. |
| **Frontend design** (§3) | No brand or design system is supplied and the work needs an aesthetic direction. Default to the bodnar.sh house style, or commit to one off-system extreme. |

A purely visual ask (one element, color and type only) wants a `design_canvas` with options laid side by side. Anything with interactions, flows, or multiple options wants the full Astro + Vue scaffold with variants exposed as Tweaks.

## The stack

For a working prototype or a real project scaffold, lay down the Astro + Vue + Workers structure first. The full project layout, every config file, and the rationale behind each setting live in `references/stack-baseline.md`. Copy-ready versions of every config file are in `assets/scaffold/`, so the scaffold step is a copy rather than a retype.

Two fixed rules for this stack:

- Bun only. Tell the user `bun install && bun run dev`. Never emit `npm install`, `npx`, `pnpm`, or `yarn`.
- oxlint only. Never generate `.eslintrc*` files.

For pure design canvases or static decks, skip the build tooling entirely and write plain HTML.

## The default house style

When there is no design system or brand to follow, reach for the **bodnar.sh** system. It is the house style baked into this skill: terminal-first, JetBrains Mono primary with Inter for long copy, four swappable themes (dark, light, editorial, blueprint), and a deep library of system-software-flavored components so there is an idiomatic answer ready instead of inventing from zero.

The full system (tokens, themes, section grammar, status bar, component vocabulary, primitives, motion, texture, copy voice, print mode, and Astro wiring) is documented in `references/bodnar-system.md`. The CSS token block ships as `assets/tokens.css`, and the core primitives ship as `assets/primitives/`.

If the user signals a different mood (luxury minimal, brutalist, art deco, retro-futuristic, soft pastel, and so on), take the custom path in `references/modes.md` §3 instead: commit to one extreme and execute it with precision.

## Content and quality rules

These apply to all three modes.

- **No filler.** Never pad with placeholder paragraphs or dummy sections to fill space. Every element earns its place. If a section feels empty, fix the layout rather than inventing copy.
- **Ask before adding.** If more sections, pages, or content would help, ask first. The user knows their audience.
- **Declare the system out loud.** After exploring assets, state the type pairing, color scale, and layout grammar you will use, then stick to it.
- **Scale minimums.** 1920x1080 slides use a 24px minimum body. Print uses a 12pt minimum. Mobile hit targets are 44px minimum.
- **Layout discipline.** Use flex and grid with `gap`, not whitespace nodes or margin on every child. This survives DOM edits cleanly.
- **Canonical HTML.** Close every non-void element. Double-quote every attribute. No self-closing non-void tags.
- **Modern CSS is encouraged.** `text-wrap: pretty`, container queries, subgrid, `:has()`, anchor positioning, view transitions, and scroll-driven animations are all in budget. This stack targets evergreen browsers.
- **Placeholders beat bad assets.** When an asset is unavailable, use a subtly striped SVG placeholder with a monospace explainer label such as `[product shot 1200x800]`. Never hand-draw illustrative SVG.

## Workflow checklist

1. **Understand the ask.** New or ambiguous work uses `questions_v2` first. Ask about existing system or brand, target devices, fidelity, variant count, tone, content constraints, and what specifically should be tweakable.
2. **Gather context.** Read existing components, design tokens, brand assets, and screenshots. Copy what you need into the project. Never reference cross-project paths from HTML.
3. **State the system.** One short paragraph covering type, color, spacing, motion, and layout grammar. This is the guardrail for the rest of the session.
4. **Scaffold.** For prototypes, lay down the Astro + Vue + Workers structure from `references/stack-baseline.md`. For pure visual exploration, open a `design_canvas`.
5. **Build progressively.** Ship a viewable file early, even if rough, then iterate. Show the user via `done`.
6. **Lint and typecheck before declaring complete.** Run `bun run lint && bun run typecheck`.
7. **Verify.** Call `done` with the entry HTML or Astro page. If clean, fork the verifier agent.
8. **Summarize briefly.** Caveats and next steps only, no recap.

## Things to avoid

- `npm`, `npx`, `pnpm`, or `yarn` commands. This stack is Bun.
- ESLint configs. This stack is oxlint.
- Node-specific APIs inside `src/pages/api/*`. That code runs on the Workers runtime, not Node.
- `process.env` in client code. Use `import.meta.env` in Astro, or `Astro.locals.runtime.env` on the server.
- Generating React components for new work. Vue is the island framework. Astro can host React, but do not mix without a reason.
- Stock SaaS aesthetics: the rounded card with a left accent border, the gradient hero with floating shapes, emoji as iconography, Inter at every size.
- Recreating copyrighted or branded UI. Produce originals unless the user works at that company, which their email domain will indicate.

## Quick command reference

```bash
bun install            # install deps
bun run dev            # astro dev with the cloudflare platform proxy
bun run build          # astro build into dist/_worker.js/
bun run preview        # wrangler dev against the built worker
bun run deploy         # build then wrangler deploy
bun run lint           # oxlint .
bun run lint:fix       # oxlint --fix .
bun run typecheck      # astro check then tsc --noEmit
bunx wrangler kv:namespace create SESSIONS
bunx wrangler d1 create app
bunx wrangler tail     # live logs from the deployed worker
```

## Reference files

Read the reference that matches the task. Do not load all of them at once.

- `references/stack-baseline.md` — the Astro + Vue + Workers + Bun + oxlint project scaffold, every config file explained, and the bindings type-glue. Read this before scaffolding a real project.
- `references/modes.md` — the three modes in full: hi-fi design (§1), interactive prototype (§2), and frontend design with the no-brand custom path (§3). Read the section that matches the ask.
- `references/bodnar-system.md` — the complete bodnar.sh house style: type pairing, four themes, section grammar, status bar, component vocabulary, motion, texture, copy voice, print mode, and Astro wiring. Read this whenever building with the default house style.

## Assets

- `assets/scaffold/` — copy-ready config files: `package.json`, `astro.config.mjs`, `wrangler.toml`, `tsconfig.json`, `.oxlintrc.json`, `bunfig.toml`, `src/env.d.ts`, and a POSIX `scripts/init` bootstrap. Copy these into a new project rather than retyping them.
- `assets/tokens.css` — the full bodnar.sh CSS variable block: all four themes, spacing scale, radii, and the texture overlay. Import once from the base layout.
- `assets/primitives/` — the core bodnar.sh components (`SectionFrame`, `Bar`, `Sparkline`, `Caret`, `FlexRule`) in both a React reference file and Vue single-file components, with identical prop names so a prototype-to-production port is mechanical.
