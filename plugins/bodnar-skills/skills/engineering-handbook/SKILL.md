---
name: engineering-handbook
description: Generate or extend an engineering handbook (a folder of markdown files documenting how an engineering org actually operates) modeled after GitLab's public handbook. Use this whenever the user asks to create, scaffold, structure, or revise an engineering handbook, team wiki, engineering wiki, internal engineering docs, dev onboarding documentation, runbook collection, engineering README, team handbook, process documentation, engineering culture doc, on-call playbook, or "the docs that explain how we work." Trigger this even when the user doesn't say the word "handbook" but is clearly asking for the canonical written-down version of their team's processes, values, workflows, incident response, milestone planning, or career ladder. Suitable for solo founders, startups, scale-ups, and enterprise. Output is markdown files in a `handbook/` directory, ready to ship to GitHub Pages, GitLab Wiki, MkDocs, Docusaurus, or Astro Starlight.
---

# Engineering Handbook

A skill for producing the markdown that documents how an engineering team works: values, workflows, incident response, milestone planning, career growth. The reference model is GitLab's public handbook, which is a single source of truth that engineers actually use rather than performative shelfware.

## What this skill produces

A `handbook/` directory of markdown files, one canonical file per topic, structured for navigation and search. Concrete shape:

```
handbook/
├── README.md                       # entry point, table of contents, "how to navigate"
├── 01-direction-and-culture/
│   ├── README.md                   # area overview
│   ├── values.md
│   ├── principles.md
│   ├── three-year-strategy.md
│   └── engineering-excellence.md
├── 02-workflows/
│   ├── README.md
│   ├── issues.md
│   ├── code-review.md
│   ├── merge-requests.md
│   ├── ci-cd.md
│   └── security-review.md
├── 03-planning/
│   ├── README.md
│   ├── milestones.md
│   ├── technical-roadmaps.md
│   ├── prioritization.md
│   └── capacity-planning.md
├── 04-incident-management/
│   ├── README.md
│   ├── broken-master.md
│   ├── feature-change-locks.md
│   ├── on-call.md
│   ├── slos-and-error-budgets.md
│   └── postmortems.md
├── 05-monitoring-and-quality/
│   ├── README.md
│   ├── observability.md
│   ├── technical-debt.md
│   ├── infradev.md
│   └── performance.md
└── publishing.md                   # how this handbook is built and deployed
```

Sections collapse for smaller orgs (see "Pick the structure" below). The numeric prefix is just to enforce navigation order in static-site tooling that sorts alphabetically.

## When to load each reference

The references are detailed templates. Pull them in only as needed; loading all five at once will swamp the context window with content you may not use.

| User is asking about | Load |
|---|---|
| Issues, code review, merge requests, CI/CD, security review | `references/core-workflows.md` |
| Values, principles, career ladders, mentorship, recognition, onboarding | `references/culture-values.md` |
| Broken master, FCL, on-call, postmortems, escalation | `references/incident-management.md` |
| Milestones, roadmaps, prioritization, capacity, scheduling | `references/planning-processes.md` |
| Observability, technical debt, error budgets, infradev, perf | `references/monitoring-quality.md` |
| Cloudflare Workers Observability, Logs Explorer, OTLP, tracing, `wrangler tail`, `cf agent-context`, `bunx skills cloudflare` | `references/cloudflare-observability.md` |
| Static-site setup, GitHub/GitLab Pages, MkDocs, Docusaurus, VitePress, Astro Starlight, EmDash, Cloudflare Workers Static Assets | `references/publishing.md` |

For a comprehensive end-to-end handbook, load all six in sequence as you draft each area. For a startup minimum-viable handbook, you'll usually only need `core-workflows.md` and `culture-values.md`.

## Workflow

### 1. Interview the user (briefly) before generating

Resist the urge to immediately produce 27 markdown files. The right shape depends on three things, and asking takes 30 seconds:

- **Org size.** 1–20 engineers, 21–100, or 100+? This sets which sections matter.
- **Engineering maturity.** Are you early (defining basics), developing (formalizing process), or mature (optimizing and scaling)? This sets the depth.
- **Primary motivation.** What's the actual pain? New hires getting lost during onboarding? No agreement on code review? Production incidents that keep going sideways? Career conversations with no scaffolding? The motivation tells you which area to lead with and write deepest.

If the user has already given you enough context to infer all three (e.g., "I have a 6-person team, we just had a bad outage, write me an incident playbook"), skip the interview and proceed.

### 2. Pick the structure

Match scope to size. The five areas correspond to the five reference files; cut the ones that don't earn their keep.

**Minimum viable (1–20 engineers, early stage).** Direction & culture (just values + principles), workflows (issues + code review + MRs), one-page incident response. Skip planning, skip monitoring depth, skip career ladders. Output is roughly 6–8 files.

**Growth (21–100 engineers).** Add planning processes (milestones, capacity), broader incident management (on-call rotation, postmortems), monitoring basics, and a first-pass career ladder. Output is roughly 15–20 files.

**Scale (100+ engineers).** Full GitLab-style coverage: Feature Change Locks, error budgets, infradev, cross-functional prioritization matrices, formal SLOs, multi-track career paths. Output is the full tree above.

When in doubt, lean smaller. A handbook that's too thin invites contributions; a handbook that's too thick gets ignored.

### 3. Generate the files

A starter folder skeleton lives in `assets/handbook-skeleton/` with the full directory tree pre-built: every page is a stub with the canonical structure (DRI, "Why this exists" with a real one-paragraph explanation already filled in, body TBD, success criteria TBD, cross-links to neighbors). A canonical `_TEMPLATE.md` at the skeleton root shows the page format any new page should follow.

The bundled `scripts/init-handbook.sh` copies the skeleton to a target directory with optional scope pruning:

```bash
# Default: growth-stage scope (~22 files)
bash <skill-path>/scripts/init-handbook.sh ./handbook

# Small team: drops planning, FCL, infradev, etc. (~10 files)
bash <skill-path>/scripts/init-handbook.sh ./handbook --scope minimum

# Full GitLab-style tree (27+ files)
bash <skill-path>/scripts/init-handbook.sh ./handbook --scope scale
```

After scaffolding, fill in the `[TBD]` placeholders in each page using the relevant reference file as source material. Adapt the templates to:

- **The user's actual tools.** GitHub vs. GitLab vs. Bitbucket; Linear vs. Zoho Projects vs. native issue trackers; Slack vs. Discord vs. Teams. The reference files are GitLab-flavored by design, but the *shape* of a code review process is tool-agnostic. Rewrite terminology to match what the team uses: "PR" for GitHub teams, "MR" for GitLab teams, "issue" universally, "task" for Zoho-using teams.
- **The user's actual stack.** A Rust shop and a Rails shop have different CI examples. If the user has told you what they run, use it. If not, pick a sensible default and call it out as a placeholder. For Cloudflare Workers shops specifically, load `cloudflare-observability.md` alongside `monitoring-quality.md` so the observability section uses the team's actual platform (`wrangler.jsonc`, Logs Explorer, OTLP export) rather than generic guidance that requires translation.
- **The user's actual size.** A two-person team doesn't need a "Director of Engineering" escalation tier. Strip role names that don't exist on the team.

Write each file as if it has one author and one DRI, even if it doesn't yet. Naming a placeholder like `**DRI:** [TBD]` at the top of every file is a forcing function: someone will eventually fill it in, or the file will get deleted, and either outcome is good.

After you finish drafting, run `bash <skill-path>/scripts/validate-handbook.sh ./handbook` to check the output against the quality gates (DRI presence, "Why this exists" sections, success criteria, cross-links, no em-dashes, no over-long unbroken sections).

### 4. Wire it for publishing

A handbook that lives only as files in a repo is half-done. The other half is making it browsable and searchable for the people who need it. See `references/publishing.md` for concrete options. Defaults that work well:

- **Already on GitHub:** GitHub Pages + MkDocs Material. Five-minute setup, full-text search, dark mode, looks great.
- **Already on GitLab:** GitLab Wiki for raw markdown, or GitLab Pages + MkDocs/Docusaurus for a polished site.
- **Already on Cloudflare:** Cloudflare Workers Static Assets with any generator. Single `wrangler.jsonc`, edge caching, Access for SSO. Pair with `references/cloudflare-observability.md` so deploy logs and traces flow into Workers Observability automatically.
- **Vue shop:** VitePress. Components in markdown, Vite-fast dev server, clean default theme.
- **Want maximum polish:** Astro Starlight. Modern, fast, interactive components.
- **Need a CMS-style editing experience:** EmDash CMS (Cloudflare-native, Astro-first, v0.1.0 preview as of April 2026). Worth a look if non-engineers contribute and you are already on Cloudflare; treat as early-adopter.

Generator config templates live in `assets/configs/` and can be copied as-is:

| File | What it configures |
|---|---|
| `wrangler.jsonc` | Cloudflare Workers Static Assets deploy with observability enabled |
| `mkdocs.yml` | MkDocs Material with full-text search, dark mode, git-revision dates |
| `vitepress-config.ts` | VitePress with explicit sidebar matching the skeleton structure |
| `astro.config.mjs` | Astro Starlight with autogenerated sidebars per area |
| `github-pages-deploy.yml` | GitHub Actions workflow for GitHub Pages deployment |
| `gitlab-ci.yml` | GitLab CI/CD for GitLab Pages, with optional Cloudflare deploy block |

Ship a `publishing.md` in the handbook itself documenting which choice was made and how to update the site. The deployment story is part of the handbook, not separate from it.

## Customization principles

These are the design principles behind the GitLab-style handbook approach, distilled. Each handbook should embody them, not just describe them.

**Single source of truth.** Each topic has exactly one canonical file. If on-call rotation rules also live in a Google Doc, the doc is wrong by definition. Cross-link aggressively, but don't duplicate.

**Async-first.** The handbook should answer most questions a new engineer would ask, without anyone needing to be online. This is the load-bearing claim of the whole approach: the handbook offsets meeting cost and onboarding cost.

**Action-oriented voice.** Write "Open an issue and tag the security team" rather than "Issues should be opened with security tags." Imperative voice tells the reader what to do; passive voice tells them what's true. Both have a place, but the handbook leans heavily imperative.

**Explain the why.** Processes that exist without their reasoning get cargo-culted, then resented. Every non-obvious process gets a one-paragraph "why this exists" near the top. When the reason expires, the process can be retired.

**Living document.** Each file has a DRI and a review cadence. Files without an owner rot. The handbook's home repo should accept PRs from anyone on the team; the DRI gates merging.

**Concrete over abstract.** Real examples beat templates. Where a reference file gives you `[Brief description]`, replace it with a real description from the user's actual product if you have it.

## Tone and conventions

- **Imperative voice** for processes; descriptive voice for context.
- **Concrete examples** over abstract statements. If you can't write an example, the rule is probably too vague.
- **Named DRIs** at the top of every process file, even if placeholder.
- **Defined success criteria** where the file describes a process. "How do we know this worked?" is a question every process file should answer.
- **No em-dashes** in prose. Use commas, semicolons, colons, or parentheses. Two patterns where em-dashes sneak in even when the rule is stated: (1) cross-link descriptions like `[file.md](./file.md): description` should use a colon or just a space (`[file.md](./file.md): description` or break onto a new line), and (2) email signature lines (`— Author`) should use no separator or a different glyph. (This is good practice generally and a stated preference for this user.)
- **Cross-links** between related files. A reader following one process should be one click from every related process.

## Quality gates

Before declaring a section "done", check:

1. Does the file have a DRI and review cadence at the top?
2. Does the file explain *why* this process exists, not just *what* it is?
3. Are there concrete examples or sample artifacts?
4. Are success criteria or SLOs stated where the file describes a process?
5. Does the file link to its 2–3 most-related neighbors?
6. Is the page scannable? (Headings every ~15 lines, lists where appropriate, no walls of text.)

Items 1, 2, and 5 are the ones most often missed and most predictive of whether the file gets used.

## Common adaptations

**GitHub-native team.** Replace "Merge Request" with "Pull Request" everywhere. Reference Actions where references say "GitLab CI." Issues map 1:1; labels work the same way; the process shape is identical.

**GitLab-native team.** No translation work needed; the references already speak your language. A few things to make explicit in the handbook: which group/subgroup hierarchy mirrors your team structure, whether you use the built-in Issue Boards or external tools, and how `.gitlab-ci.yml` lives in each repo versus a centralized CI config.

**Linear-using team.** Map Issue → Issue, Project → Epic, Cycle → Milestone or sprint. Linear's bidirectional linking and clean issue model means cross-linking is less manual work than in older trackers; lean into that.

**Zoho Projects-using team.** Code hosting and project tracking are separate systems (Zoho Projects + GitHub/GitLab/Bitbucket for code), so the handbook needs to be explicit about which artifact lives where. Map: Project → Project (1:1), Phase → Milestone or release group, Task List → Epic or feature, Task → Issue/Story, Issue (bug-type) → bug ticket, Milestone → Milestone (1:1), Time Log → built-in time tracking. The cross-linking principle becomes more work because Tasks in Zoho do not auto-link to commits or PRs the way GitHub Issues do; document the convention your team uses (commit message references, manual linking from Zoho task comments, or a webhook integration). Workflow files like `code-review.md` should clarify that the canonical artifact for a unit of work is the Zoho Task while the canonical artifact for the change itself is the PR/MR in your Git host.

**Solo founder / very small team.** Most of "team structure" collapses. Keep values, workflows, incident response, postmortems. Skip the career ladder until you're hiring engineer #3.

## What this skill does not do

- **It does not generate non-engineering org docs.** For HR handbooks, marketing playbooks, or general company values, this skill is the wrong tool. A general doc-coauthoring skill is better.
- **It does not generate code.** It documents the processes and culture around the code.
- **It does not replace human judgment about culture.** It scaffolds the *form*; the user supplies the actual values and decisions.
