# Architecture

The system is a one-directional build pipeline followed by a presentation layer. Data is fetched from GitHub, transformed into an enriched dataset, indexed for search, and presented through a UI. The presentation serves pre-computed results, which is what keeps the end-user experience fast and the runtime simple.

This reference describes the shape of the pipeline and the contracts between its stages. It does not prescribe which tools fill the stages. The shell, the data-processing library, the search engine, the rendering approach, and the runtime are the owner's choices. Where a choice has well-known candidates, this document names them as options with their tradeoffs so the decision is informed, but the decision itself is not made here.

## Guiding properties

These hold regardless of implementation, and they are the reason the pipeline is shaped the way it is.

The Unix philosophy: each stage does one thing and composes with the next through a clean interface. A stage can be swapped for a different implementation without rewriting its neighbors, because the neighbors depend on the contract, not the tool.

Data immutability: each stage writes new artifacts and never mutates its inputs. This leaves a complete audit trail on disk and lets the pipeline be resumed or partially re-run, because any stage's output can be inspected directly.

Build-time optimization: expensive work (fetching, embedding, indexing, rendering) happens once during the build, so the served experience has no cold start.

Type safety: validate at every stage boundary. A schema at each hand-off catches a malformed artifact at the seam where it is cheapest to fix, rather than letting it propagate.

## The four stages

Fetch. Call the GitHub API and collect the user's starred repositories, including the starring timestamp (which requires the `application/vnd.github.v3.star+json` Accept header). Produce a raw, line-addressable artifact, one repository per record, so the next stage can process incrementally.

Transform. Read the raw artifact, engineer the derived fields the product needs (an activity score, days since last push, topic clusters, a primary topic), and shape the result into both an enriched dataset for the presentation layer and a set of documents for the index.

Index. Load the documents into the search engine, generate whatever the search modes require (for semantic search, vector embeddings over the text fields), and build the index that backs keyword, semantic, hybrid, and natural-language retrieval plus recommendations.

Present. Render the UI from the enriched dataset and wire its search to the index. The presentation can be a static site, a single-page app, an MCP App embedded in a chat host, or several of these over the same data and index. See `references/design-system.md` and `references/app-patterns.md` for the UI itself, and `references/mcp-apps.md` for the embedded-in-a-host delivery path.

## Stage contracts

The hand-offs are where this system is easiest to get wrong and most valuable to get right. Each stage hands the next a clean, typed, native-format artifact, and validation happens at the boundary. When building or changing a stage, be explicit about the shape it consumes and the shape it produces.

Fetch produces records of raw GitHub star data, one repository per record, each carrying the repository metadata and the starring timestamp. Transform consumes those records and produces an enriched, typed dataset plus a derived set of index documents. Index consumes the documents and produces a populated, queryable index (with embeddings if semantic search is in scope). Present consumes both the dataset (for the parts of the UI that are pre-rendered, such as taxonomy or analytics pages) and the live index (for the interactive search) and produces the user-facing surface.

Because each stage writes a new artifact rather than mutating its input, the build is resumable and every intermediate is inspectable.

## The search contract

The product commits to three retrieval modes and recommendations; it does not commit to a particular engine. The contract the UI depends on is what each mode answers, not how it is implemented.

Keyword search answers "find repositories whose text matches these terms," with typo tolerance and sensible tokenization for code. The tokenization detail matters: repository names and topics use hyphens, underscores, and slashes as word boundaries, and symbols like `#` and `+` appear in language names (C#, C++) that must remain searchable, so whichever engine is chosen needs to be configured for that.

Semantic search answers "find repositories that are about this, even if the words differ," via vector similarity over embeddings built from the repository's name, description, and topics.

Hybrid search blends the two, typically as a weighted sum of the keyword and semantic scores with a tunable weight.

Natural-language search answers a plain-English question by interpreting it into a structured query (a language filter, a recency window, a popularity floor, a topic) before retrieval.

Recommendations answer "given this repository, what else is similar," which can come from the engine's own recommendation feature or from similarity over the same embeddings.

Whatever engine provides these, the documents it indexes need the faceted fields the UI's filter tree binds to: language, owner, topics, license, and the derived cluster and primary-topic fields. Numeric fields (stars, an activity score, days since push, the starring timestamp) back sorting and range filters.

## Presentation options

The presentation layer can take more than one form over the same dataset and index, and the choice is the owner's.

A static site pre-renders browseable pages (for example, a page per language and per topic) and ships a thin search client that talks to the index directly with a search-only key. This is fast and cheap to host and collects nothing at serve time.

A single-page app renders the full workbench client-side against the index.

An MCP App embeds the UI inside an AI chat host so it renders inline in a conversation. This reuses the same design system and much of the same view code; see `references/mcp-apps.md`.

These are not mutually exclusive. A reasonable project might ship a static browse site and an MCP App over the same index.

## Deployment and testing

The pipeline and the presentation can be containerized, with the search engine as a long-lived service and the pipeline as a run-once job that populates it. Secrets (the GitHub token, any index admin key) are passed as environment variables and never committed. The GitHub token only needs public read access and is used only during fetch, never exposed to end users; a public search key should be search-only and unable to modify data.

Testing spans unit tests for the clients and transforms, integration tests that stand up a real index instance and exercise the pipeline end to end against realistic data volumes and error cases, and end-to-end tests for the UI covering navigation, the search modes, filters and facets, recommendations, and any analytics views, across browsers and on mobile.
