# Publishing Reference

How to take a `handbook/` directory of markdown files and turn it into a browsable, searchable site that people on the team will actually use.

## Contents

- [Decision matrix](#decision-matrix)
- [GitHub Pages + MkDocs Material](#github-pages--mkdocs-material)
- [GitLab Wiki](#gitlab-wiki)
- [GitLab Pages + MkDocs](#gitlab-pages--mkdocs)
- [Docusaurus](#docusaurus)
- [Astro Starlight](#astro-starlight)
- [VitePress](#vitepress)
- [EmDash CMS](#emdash-cms)
- [Cloudflare Workers (Static Assets)](#cloudflare-workers-static-assets)
- [The deploy contract](#the-deploy-contract)

## Decision matrix

| Constraint | Pick |
|---|---|
| Code lives on GitHub, want fastest path to "looks good" | GitHub Pages + MkDocs Material |
| Code lives on GitLab, want zero setup | GitLab Wiki |
| Code lives on GitLab, want a real site | GitLab Pages + MkDocs Material |
| Need rich interactive components, MDX support | Docusaurus or Astro Starlight |
| Want bleeding-edge speed, modern stack, Astro ecosystem | Astro Starlight |
| Vue shop, want first-class Vue components in markdown | VitePress |
| Already on Cloudflare, want full edge control | Astro Starlight or VitePress on Cloudflare Workers (Static Assets) |
| Want a CMS-style editing experience for non-engineers | EmDash CMS (Cloudflare-native, Astro-first, v0.1.0 preview) |
| Internal-only, behind SSO | Cloudflare Workers + Access, or self-hosted MkDocs behind VPN |
| Want full-text search out of the box | All of the above support it; MkDocs Material is the simplest |

## GitHub Pages + MkDocs Material

Five minutes from `handbook/` to live site. Recommended default for GitHub-hosted teams.

**Setup:**

```bash
pip install mkdocs-material
cd <repo-root>
mkdocs new .
# Move handbook/ into docs/ (or configure docs_dir: handbook in mkdocs.yml)
```

**`mkdocs.yml`:**

```yaml
site_name: Engineering Handbook
site_url: https://your-org.github.io/handbook/
docs_dir: handbook
theme:
  name: material
  features:
    - navigation.instant
    - navigation.sections
    - navigation.expand
    - toc.integrate
    - search.suggest
    - search.highlight
  palette:
    - media: "(prefers-color-scheme: light)"
      scheme: default
      toggle: { icon: material/brightness-7, name: Switch to dark mode }
    - media: "(prefers-color-scheme: dark)"
      scheme: slate
      toggle: { icon: material/brightness-4, name: Switch to light mode }
plugins:
  - search
  - git-revision-date-localized
markdown_extensions:
  - admonition
  - pymdownx.details
  - pymdownx.superfences
  - pymdownx.tabbed:
      alternate_style: true
  - tables
  - toc:
      permalink: true
```

**`.github/workflows/deploy.yml`:**

```yaml
name: Deploy handbook
on:
  push:
    branches: [main]
    paths: ['handbook/**', 'mkdocs.yml']
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.x' }
      - run: pip install mkdocs-material mkdocs-git-revision-date-localized-plugin
      - run: mkdocs build
      - uses: actions/upload-pages-artifact@v3
        with: { path: site }
      - uses: actions/deploy-pages@v4
```

Enable Pages in repo settings, set source to "GitHub Actions". Site goes live at `https://<org>.github.io/<repo>/`.

## GitLab Wiki

Zero-setup option for GitLab teams. The wiki accepts the same markdown files, supports nested directories, has built-in editing and history.

**Tradeoffs:** No theming, no custom navigation beyond what GitLab provides, no full-text search across many wikis. Fine for small teams; outgrown quickly.

**Workflow:** push the contents of `handbook/` into the project's wiki repo (separate from the code repo, accessed at `<repo>/-/wikis`). Use a sync script or GitLab CI job if you want the wiki to track the code repo's `handbook/` directory.

## GitLab Pages + MkDocs

Same MkDocs Material setup as GitHub Pages. Different CI config:

**`.gitlab-ci.yml`:**

```yaml
pages:
  stage: deploy
  image: python:3.12-slim
  script:
    - pip install mkdocs-material mkdocs-git-revision-date-localized-plugin
    - mkdocs build -d public
  artifacts:
    paths: [public]
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      changes: ['handbook/**', 'mkdocs.yml']
```

Site lives at `https://<group>.gitlab.io/<project>/`.

## Docusaurus

Meta's React-based documentation framework. Strong choice when you want MDX (markdown with embedded React components), versioned docs, or i18n.

**Setup:**

```bash
npx create-docusaurus@latest site classic --typescript
# Configure docusaurus.config.ts to point docs path at ../handbook
```

**Strengths:** First-class search via Algolia DocSearch (free for open-source docs), versioning, blog integration, plugin ecosystem.

**Weaknesses:** React build complexity, slower than MkDocs for pure-markdown handbooks, opinionated about file structure (sidebars defined in JS).

## Astro Starlight

Astro's official documentation theme. Modern, fast, supports MDX, ships with full-text search (Pagefind) and built-in dark mode.

**Setup:**

```bash
npm create astro@latest -- --template starlight
# Move handbook/*.md into src/content/docs/
# Configure astro.config.mjs for sidebar
```

**`astro.config.mjs`:**

```javascript
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Engineering Handbook',
      sidebar: [
        { label: 'Direction & Culture', autogenerate: { directory: '01-direction-and-culture' } },
        { label: 'Workflows', autogenerate: { directory: '02-workflows' } },
        { label: 'Planning', autogenerate: { directory: '03-planning' } },
        { label: 'Incidents', autogenerate: { directory: '04-incident-management' } },
        { label: 'Monitoring', autogenerate: { directory: '05-monitoring-and-quality' } },
      ],
    }),
  ],
});
```

**Strengths:** Excellent default styling, Pagefind search works offline and at the edge, MDX components, fast cold builds, deploys cleanly to Cloudflare Workers via Static Assets.

## VitePress

Vue-team-built static site generator from the Vite project. Markdown-first, Vue components in markdown via `<script setup>`, ships with full-text search (Algolia or local), excellent default theme that's quietly become the standard look for technical docs across the JavaScript ecosystem.

**Setup:**

```bash
bun add -D vitepress
bun vitepress init
# Point srcDir at ../handbook in .vitepress/config.ts
```

**`.vitepress/config.ts`:**

```typescript
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Engineering Handbook',
  description: 'How we work',
  srcDir: '../handbook',
  themeConfig: {
    search: { provider: 'local' },
    nav: [
      { text: 'Direction & Culture', link: '/01-direction-and-culture/' },
      { text: 'Workflows', link: '/02-workflows/' },
      { text: 'Planning', link: '/03-planning/' },
      { text: 'Incidents', link: '/04-incident-management/' },
      { text: 'Monitoring', link: '/05-monitoring-and-quality/' },
    ],
    sidebar: 'auto',
  },
})
```

**Strengths:** Vue components inline in markdown without ceremony (useful for live diagrams, calculators, decision tools embedded in process docs); fast Vite-powered dev server; small build output; clean default theme. **Weaknesses:** less discoverable plugin ecosystem than Docusaurus; if your team is React-shaped, MDX in Docusaurus or Starlight may feel more natural.

Build output goes to `.vitepress/dist`, ready to deploy as static assets anywhere.

## EmDash CMS

Cloudflare's open-source CMS, launched April 1, 2026 as a v0.1.0 preview (MIT licensed, [github.com/emdash-cms/emdash](https://github.com/emdash-cms/emdash), guide site at [emdashcms.dev](https://www.emdashcms.dev/)). TypeScript and Astro under the hood, Cloudflare-native deployment, with a capability-scoped plugin model that runs each plugin inside its own isolation boundary rather than the WordPress all-access trust model.

**Why it might fit a handbook:** structured content out of the box, a CMS-style editing UI for non-engineers (useful when the handbook needs contributions from people who do not live in PRs), Cloudflare deployment that pairs cleanly with the rest of the stack if you are already there, and an Astro frontend so the rendering story is already familiar if you know Starlight.

**Why it might not fit yet:** v0.1.0 preview as of this writing. The architectural direction is compelling but the ecosystem (third-party themes, plugins, long production track records) is early. For a 100-person engineering org with low risk tolerance, the safer pick is a mature generator like MkDocs Material or VitePress. For a small team that already runs on Cloudflare and wants to be early on a Cloudflare-native CMS, EmDash is worth a serious look, especially if non-engineer contribution to the handbook is a real requirement.

**Setup:**

```bash
# Try the playground first to confirm it fits
# Visit https://emdashcms.com/

# Then bootstrap a new EmDash site
bunx create-emdash@latest my-handbook
cd my-handbook
# Import existing markdown content from handbook/ via the WordPress import path
# (EmDash also accepts plain markdown imports)
```

The migration page at [emdashcms.dev/migration](https://www.emdashcms.dev/migration) covers practical considerations. Treat any EmDash deployment as an early-adopter call: you are getting a clean architectural slate in exchange for limited ecosystem breadth and the chance of breaking changes during the preview period.

## Cloudflare Workers (Static Assets)

The default deployment target if your team is already on Cloudflare. Workers Static Assets serves your built handbook site from Cloudflare's global edge with the same `wrangler.jsonc` mental model used for the rest of your Workers, free tier covers small handbooks, and Cloudflare Access gates it behind SSO without changing the build.

**Setup with any static generator (MkDocs, Starlight, VitePress, Docusaurus):**

`wrangler.jsonc`:

```jsonc
{
  "name": "engineering-handbook",
  "compatibility_date": "2026-04-01",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  },
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

Set `directory` to wherever your generator writes its build output (`site/` for MkDocs, `dist/` for Starlight, `.vitepress/dist/` for VitePress, `build/` for Docusaurus).

**Deploy:**

```bash
# Build the site
bun run build

# Deploy via Wrangler
bunx wrangler@latest deploy

# Or, using the unified Cloudflare CLI (technical preview as of April 2026)
bunx cf@latest deploy
```

**Tail logs in real time:**

```bash
bunx wrangler@latest tail engineering-handbook
```

**Loading Cloudflare-aware context for AI agents working with this deploy:**

```bash
# Load Cloudflare's Skills bundle once per project
bunx skills cloudflare

# Pull product context on demand
bunx cf@latest agent-context
```

The Skills bundle ([github.com/cloudflare/skills](https://github.com/cloudflare/skills)) covers Workers, Pages, KV, D1, R2, Workers AI, the Agents SDK, Wrangler CLI, and MCP server patterns. `cf agent-context` returns scoped context blocks for whichever Cloudflare product the agent is working with, optimized for token efficiency. Both are useful when an engineer (or an agent) needs to update the handbook deploy without reloading every Cloudflare doc into context.

**Access control:** Cloudflare Access (Zero Trust) gates the site behind your identity provider without changing the build. Add an Access policy on the Worker route, point it at your Google Workspace, GitHub org, or Okta, and the handbook becomes employee-only.

**Edge search:** Pagefind (Starlight, can be added to MkDocs and VitePress) generates a static search index that works at the edge with no server. Algolia DocSearch is the alternative if you want hosted search with analytics.

**Observability:** Workers Static Assets respects the `observability` block in `wrangler.jsonc`, so deploy logs and request logs flow into Workers Logs automatically. See `references/cloudflare-observability.md` for the full picture, including OpenTelemetry export, Logs Explorer, and Workers Tracing.

## The deploy contract

Whichever generator you pick, document this in `handbook/publishing.md` so future maintainers know how the site updates:

```markdown
# Publishing this handbook

**Generator:** MkDocs Material (or VitePress, Starlight, Docusaurus, EmDash, etc.)
**Hosting:** Cloudflare Workers Static Assets (or GitHub Pages, GitLab Pages, etc.)
**Live URL:** https://...
**Source of truth:** `handbook/` directory in this repo
**Deploy trigger:** push to `main` that touches `handbook/**` or `wrangler.jsonc`
**Build time:** ~30 seconds
**DRI:** [name]

To update content: edit a markdown file in `handbook/`, open a PR, get review, merge. Deployment is automatic.

To change the site theme or structure: edit the generator config (`mkdocs.yml`, `.vitepress/config.ts`, `astro.config.mjs`, etc.), test locally, open a PR.

To roll back: revert the merge commit. The previous build redeploys.
```

This document is a forcing function: anyone who breaks the deploy is on the hook to update the contract, which means the contract stays accurate.
