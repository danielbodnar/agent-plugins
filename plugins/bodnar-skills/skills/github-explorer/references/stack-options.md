# Stack Options

The technology stack is the owner's decision. This reference exists to make that decision informed, not to make it. For each stage of the pipeline and each part of the build, it lays out realistic candidates and their tradeoffs. When a request reaches a point where a tool must be chosen, present the relevant options and the reasoning, then let the owner choose. Do not assert a default or encode a particular tool as the project's settled answer.

The one cross-cutting bias worth stating, because it is a design value rather than a tool choice, is functional-compositional with strong types: prefer structure that prevents bugs and parts that stay freely recombinable, whichever specific tools deliver that.

## What the choice has to satisfy

Before weighing tools, anchor on what the stage's contract requires, because that is what narrows the field. The contracts are in `references/architecture.md`. A shell choice has to fetch from an API and orchestrate stages. A data-processing choice has to engineer derived fields over a few thousand to a few tens of thousands of records. A search choice has to provide keyword, semantic, hybrid, and natural-language retrieval plus recommendations, with code-aware tokenization. A rendering choice has to produce the workbench UI and bind it to the index. A runtime choice has to host the tooling and any CLI. Match the tool to the contract first; preference comes second.

## Shell and orchestration

The fetch and the stage orchestration need a shell or a script runner. Candidates worth putting in front of the owner span the structured-data shells (which keep API responses as typed records rather than text to be re-parsed, fitting the keep-data-structured principle), the traditional POSIX shells (ubiquitous, but string-oriented, which fights the structured-data principle), and writing the orchestration directly in the chosen runtime's language (no separate shell, at the cost of more boilerplate for what a shell does concisely). The tradeoff axis is how well the option preserves structure across the fetch-to-transform boundary versus how universally available and familiar it is.

## Data processing

Transform engineers derived fields over the fetched records. Candidates span the high-performance dataframe libraries (columnar, lazy, fast, strong for the kind of feature engineering and aggregation this stage does), the embedded analytical databases (SQL over local files, excellent for the aggregation and the taxonomy counts), and plain in-language data manipulation (no dependency, fine at this data scale, more manual). At a few thousand to a few tens of thousands of repositories the dataset is not large, so raw throughput matters less than how cleanly the option expresses the transforms and how well it preserves types across the boundary. Present the options against the actual data scale rather than defaulting to the heaviest tool.

## Search engine

Search has to deliver the contract in `references/architecture.md`: keyword with code-aware tokenization, semantic via embeddings, hybrid, natural-language, and recommendations. Candidates span the self-hostable search engines that provide most of these out of the box (least application code, one more service to run), the embedded or library search options (no separate service, but more of the semantic and hybrid logic falls to the application), and a database with a vector extension (consolidates storage and search, with keyword and semantic both expressible but neither as turnkey). The axis is how much of the five-part contract the engine satisfies natively versus how much operational surface it adds. Whichever is chosen, confirm it can be configured for code-aware tokenization (hyphen, underscore, slash separators; `#` and `+` indexable).

## Rendering and presentation

The presentation can be a static site, a single-page app, an MCP App, or several over the same index; see the presentation-options section of `references/architecture.md` and, for the embedded path, `references/mcp-apps.md`. Candidates for static rendering span the single-binary site generators (fast, taxonomy-aware, simple to host) and the JavaScript-framework static builders (richer interactivity at the cost of a heavier toolchain). For the interactive client, the candidates are the mainstream component frameworks. The design system in `assets/design-system/` is deliberately framework-agnostic CSS plus one TypeScript config, so it drops into any of these; the rendering choice does not constrain the visual layer.

## Runtime and tooling

The runtime hosts the build tooling, the search client, and any CLI. Candidates span the consolidated JavaScript runtimes that bundle the package manager, test runner, and bundler into one tool, and the established runtime with its separate-tool ecosystem. The axis is consolidation and speed versus ecosystem maturity and familiarity.

## The owner's stated preferences

Separately from the per-stage candidates above, the project owner has standing preferences that are theirs, not this skill's, and that should be respected as defaults to offer rather than choices to impose: a functional-compositional style with strong types, Vue over React for component work, Astro for content sites, Hono as a universal web framework, Alpine or petite-vue for zero-build interactivity, Tailwind or UnoCSS for styling, and Zod plus JSON Schema for validation. When presenting options, lead with the ones that fit these preferences, but still present the alternatives so the choice stays the owner's. If the owner reopens a preference, follow the new direction.

## How to present a choice

When the work reaches a decision point, name the two or three candidates that actually fit the stage's contract and the data scale, state the tradeoff in a sentence each, note which fits the owner's stated preferences, and ask. Avoid the failure mode of quietly picking one and building on it as though it were settled; that is the specific thing this skill exists to prevent.
