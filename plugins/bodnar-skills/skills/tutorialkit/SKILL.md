---
name: tutorialkit
description: >-
  Turn a documentation page or a docs URL into a hands-on, interactive
  TutorialKit tutorial, lesson, chapter, or workshop. Use this whenever the
  user wants to convert reference docs into a guided editor, terminal, and
  preview exercise, build or extend a TutorialKit course, scaffold an "AI
  Fluency / Agents and Skills" workshop, or runs the tutorialkit new-tutorial
  command. Triggers on phrasings like "make a tutorial from this page",
  "generate a lesson plan and tutorial", "build a TutorialKit
  workshop/chapter/lesson", "turn these docs into an interactive lab", even
  when the user does not say "TutorialKit" by name. ALWAYS produce a lesson
  plan and get approval BEFORE generating any files.
---

# TutorialKit Tutorial Builder

Convert a documentation source into a working, buildable TutorialKit tutorial:
fetch the page, research the surrounding docs, design a lesson plan, get it
approved, generate the content collection deterministically, then confirm it
passes `astro check`.

## The exercise model - read this first (it shapes every lesson)

TutorialKit lessons run in a **WebContainer**: Node.js compiled to run inside
the browser. That has one consequence you must design around:

> **The WebContainer cannot run AI agents.** There is no `claude` CLI, no
> network calls to model APIs, and you must never embed API keys in a public
> workshop. So a workshop *about* agents and skills cannot have learners
> "invoke an agent and watch it work" as the hands-on step.

Instead, every hands-on lesson follows the **author then validate** loop:

1. The learner **authors an artifact** in the editor: a `SKILL.md`, an agent
   prompt, an MCP config, a skill folder structure.
2. The learner **runs a validator** in the terminal (`node validate.mjs`) that
   parses and lints what they wrote.
3. The **terminal shows pass or fail**, turning an abstract concept into
   immediate, checkable feedback.

The `_solution/` folder holds the correct artifact (revealed by the Solve
button). The validator is the grading mechanism. This is the default model;
if the user explicitly wants a different kind of exercise (for example a plain
JS or web coding lesson), follow their direction, but otherwise build author
then validate lessons. See `references/exercise-patterns.md` for the concrete
patterns.

## Workflow

Work through these phases in order. **Phase 3 is a hard stop**: do not write
tutorial files until the plan is approved.

### Phase 1 - Locate the target project

Detect an existing TutorialKit project and write into it rather than scaffolding
a new one:

- Look for `src/content/tutorial/` and `@tutorialkit/types` in `package.json`.
- If found, that is your target. New content goes under `src/content/tutorial/`.
- If not found, ask whether to run `npx @tutorialkit/cli create` first, or to be
  pointed at the project root. Do not invent a project layout.

Read the existing `src/content/tutorial/` tree so new parts and chapters get the
next free numeric prefix and match the established style.

### Phase 2 - Fetch and research the source

- `WebFetch` the URL the user gave. If it does not end in `.md`, try the `.md`
  variant first, since many doc sites serve a clean Markdown twin. Capture the
  core concepts, the procedural steps, the API and config surface, and any
  constraints or gotchas.
- **Follow the linked pages.** Pull the obviously related docs (siblings in the
  same section, "see also" links, referenced concepts) so the tutorial has real
  references and resources rather than a single page's worth of context.
- Collect, for the plan: **related pages**, **techniques** worth a lesson,
  **references** (canonical doc URLs), and **resources** (examples, repos, tools).
- Collect the **prerequisites** the tutorial assumes: the runtime and version, the
  package manager and any version manager, the editor or tooling a hand-off step
  needs, language toolchains, the framework and packages the lessons import, and
  any CLIs, services, or credentials a real-environment step requires. The source
  page rarely lists all of these, so infer them from the commands and imports the
  tutorial will actually use.

### Phase 3 - PLAN FIRST (approval gate)

Write a lesson plan to `.agents/plans/tutorialkit-<slug>.plan.md` and present a
summary in chat. Use this structure:

```markdown
# Lesson Plan: <Workshop / Tutorial title>
Source: <url>   .   Target: <part path, e.g. src/content/tutorial/2-skills/>

## Learning objectives
- <objective 1>

## Prerequisites
List everything required to complete or run the tutorial, grouped by where it is
needed. Be specific with versions where they matter; omit a version rather than
guess one.

### To run the TutorialKit project (the courseware host)
- Node.js <version>, <npm|pnpm> as the package manager, the TutorialKit packages
  (`@tutorialkit/*`).

### Inside the WebContainer (per lesson)
- Packages installed via a lesson's `prepareCommands`, each with the reason it is
  needed; or "none" for zero-dependency author-then-validate lessons.

### Real environment (hand-off steps the WebContainer cannot run)
- Editor: <VS Code | Zed | Neovim | other>.
- JS runtime: <Node | Bun> <version>.
- Version manager and toolchains: <mise | asdf | nvm>, plus any language toolchains.
- CLIs and services: <agent CLI, git, others a hand-off step invokes>.
- Credentials: <API keys or auth a step needs>, never embedded in the workshop.

## Structure
### Part: <name>
  #### Chapter: <name>
    - Lesson: <name> - <one-line goal>
      - Concept taught:
      - Hands-on (author then validate): learner writes <artifact>, validator checks <X>
      - _files starting state:    _solution:

## Techniques covered
-

## References (canonical docs)
- [<title>](<url>)

## Resources (examples, tools, repos)
-

## Open questions for the author
-
```

Then **stop and ask for approval or edits.** Surface real choices: scope, depth,
how many lessons, which doc sections to skip. Do not proceed past this gate on
your own.

### Phase 4 - Generate the tutorial

Once approved, turn the plan into a `plan.json` and generate the tree with the
scaffold script, then fill in the prose and the file gaps. This keeps structure
deterministic and separates it from the writing.

1. Read `references/plan-and-scaffold.md` for the `plan.json` shape, and
   `references/tutorialkit-schema.md` for exact frontmatter and folder rules.
2. Write the approved plan as `plan.json`: parts, chapters, and lessons, with
   each author-then-validate lesson marked `validateExercise: true` and given
   its `files` (starting stub) and `solution` (completed artifact).
3. Generate the skeleton:

   ```
   bun scripts/scaffold.ts plan.json --out src/content/tutorial
   ```

   This writes the numbered folders, the `meta.md` files, and per-lesson
   `content.md`, `_files/`, and `_solution/`. For lessons marked
   `validateExercise`, it copies `assets/validate.mjs` into both `_files/` and
   `_solution/` as `validate.mjs` and sets `previews: false`.
4. Fill in each lesson's narrative and complete the `_files` to `_solution` gap.
   Keep the gap to one clear idea per lesson.
5. **Derive every code annotation from a real diff** between `_files` and
   `_solution`. Never hand-count line numbers: generate both versions, diff them,
   and translate the changed lines into Expressive Code markers (`ins={...}`,
   `del={...}`). Mismatched line refs are the most common way a tutorial builds
   but teaches the wrong thing.
6. Use `:::tip`, `:::info`, `:::warn`, `:::danger`, `:::success` callouts for
   guidance, and the `file:` and `solution:` shortcodes to inline code into prose.

For a single small lesson you can skip the generator and write the files by hand
from the templates in `assets/templates/` (`meta-part.md`, `meta-chapter.md`,
`meta-lesson.md`). The layout must still match `references/tutorialkit-schema.md`.

Set `mainCommand` and `prepareCommands` once at the tutorial root so every lesson
inherits them; override on a lesson only when it genuinely needs different
commands.

### Phase 5 - Verify the build

A generated tutorial that does not build is wrong. Before declaring done:

- Run `bun run build` (which is `astro check && astro build`), or at minimum
  `bunx astro check`, in the project root.
- Frontmatter must conform to `contentSchema` from `@tutorialkit/types`; fix any
  schema or type errors until the check is green.
- Sanity-check that each lesson's `focus` file exists in `_files/`, that
  `_solution/` mirrors `_files/`, and that the validator actually passes against
  the `_solution/` artifact: run `node _solution/validate.mjs` against the solved
  file.

Report what was created (the tree), the build result, and the plan file location.

## Conventions quick reference

| Level | Folder file | `type:` |
|-------|-------------|---------|
| Tutorial (root) | `meta.md` | `tutorial` |
| Part | `<n>-name/meta.md` | `part` |
| Chapter | `<n>-name/meta.md` | `chapter` |
| Lesson | `<n>-name/content.md` | `lesson` |

Full property tables, inheritance rules, code-annotation grammar, callouts, and
shortcodes live in **`references/tutorialkit-schema.md`**: read it before writing
frontmatter or code blocks.

Hands-on exercise patterns for Agents and Skills (author-then-validate recipes,
what to put in `_files` versus `_solution`, validator ideas) live in
**`references/exercise-patterns.md`**: read it before designing lessons.

The `plan.json` shape and the generator are documented in
**`references/plan-and-scaffold.md`**.

## Invocation

```
/tutorialkit new-tutorial <docs-url>
```

The colon form `/tutorialkit:new-tutorial <docs-url>` appears when this skill is
wrapped in a Claude Code plugin named `tutorialkit`. A leading `new-tutorial` is
the action keyword; the next token is the docs URL.
