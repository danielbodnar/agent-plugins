---
name: tutorkit
description: Generate TutorialKit content (a full tutorial or a single lesson) from a documentation URL. Fetches the docs, extracts the teachable structure, classifies each step against the WebContainer execution boundary, and writes TutorialKit parts, chapters, and lessons with their _files, _solution, and lesson config. Use this whenever the user wants to turn documentation into an interactive TutorialKit tutorial or lesson, runs /tutorkit or /tutorkit:new, asks to turn docs into a tutorial, scaffold a lesson, build interactive courseware from a docs page, or mentions TutorialKit, WebContainer lessons, or StackBlitz tutorials. Use it even when the user only gives a docs URL and says "make a tutorial out of this".
---

# tutorkit

Turn a documentation page into TutorialKit content: either a full tutorial (a part with chapters and lessons) or a single lesson. The output is a directory tree under the project's `src/content/tutorial/` that TutorialKit renders without further wiring.

## Invocation

```
/tutorkit new [tutorial|lesson] <docs-url> [out-dir]
```

The colon form `/tutorkit:new ...` is identical and appears when this skill is wrapped in a Claude Code plugin named `tutorkit`. Either way, parse `$ARGUMENTS` like this:

- If the first token is `new`, drop it. It is the action keyword and carries no other meaning.
- The next token is the **type**: `tutorial` or `lesson`. If it is a URL instead, default the type to `tutorial`.
- The next token is the **docs URL**. This is required. If it is missing, ask for it and stop.
- Any remaining token is the **output directory**. Default to `src/content/tutorial`.

## Workflow

Run these steps in order. Read the reference files where the step says to; they hold the details that keep the output valid.

### 1. Fetch

Retrieve the documentation.

- If the URL does not already end in `.md`, try the `.md` variant first (many doc sites serve a clean Markdown twin at the same path plus `.md`). If that fails, fetch the HTML and work from the main content, ignoring navigation and chrome.
- Keep the original URL. It becomes the lesson's "source" reference and, where useful, an `editPageLink`.

### 2. Extract

From the fetched content, pull out and write down, as a working list:

- Prerequisites and assumed knowledge.
- Core concepts, each with the one or two sentences that define it.
- Step-by-step procedures, in order, with the exact commands or code each step uses.
- Code examples worth reproducing as starting files or solutions.
- Gotchas: the environment-specific facts that defy a reasonable default. These become callouts and the most valuable part of a lesson.
- Verification steps: how the reader knows a step worked.

### 3. Classify against the WebContainer boundary

This step is mandatory and shapes everything after it. TutorialKit lessons execute inside a browser WebContainer, which runs Node and npm tooling, dev servers, tests, and file edits, and nothing else. It does not run native binaries or external agent CLIs, and its network egress is a constrained proxy rather than open outbound.

Mark every procedure from step 2 as one of:

- **webcontainer-runnable**: pure Node or npm tooling, file edits, dev servers, tests. These become live hands-on steps with a real terminal and `_solution`.
- **real-environment**: anything that runs a native binary, an external agent CLI, or a call that needs secrets or open network egress. These cannot run in the lesson. Render them as a `:::warn` or `:::info` callout with the command shown as a copyable code block, and offer `openInStackBlitz` or `downloadAsZip` so the reader can continue in a full environment. Never place a real-environment command in a terminal `allowCommands` list, because the lesson cannot honor it.

When in doubt, classify as real-environment. A blocked command that silently fails is worse than an honest callout.

### 4. Plan

Map the extracted, classified material onto TutorialKit's structure. Read `references/structure.md` and `references/config.md` first.

- For `tutorial`: produce one **part** containing **chapters**, each containing **lessons**. One concept or one procedure per lesson. Order lessons so each builds on the last.
- For `lesson`: produce a single lesson folder.
- Choose a `template` for shared boilerplate so it is not copied into every lesson.
- For each lesson decide: the `focus` file, the `prepareCommands`, the terminal `allowCommands` (webcontainer-runnable commands only), and the `previews` ports if the lesson runs an app.
- Write the plan to a `plan.json` matching the shape in `references/structure.md`. The scaffold script consumes it.

### 5. Generate

Create the files. Use the scaffold script for the skeleton, then fill in real content.

```
bun scripts/scaffold.ts plan.json --out <out-dir>
```

The script creates the numbered folders, `meta.md` files, and per-lesson `content.md`, `_files/`, and `_solution/`. After it runs, write the real content into each file:

- `content.md`: frontmatter from the plan, then the lesson narrative. Lead with the point, keep one concept per lesson, put gotchas in callouts, and reference starting files with the `file:` shortcode and solved files with the `solution:` shortcode rather than pasting code twice.
- `_files/`: the starting state. It must be a working application against the chosen template, even before the lesson's change.
- `_solution/`: the solved state. It must differ from `_files` and must pass whatever the lesson tells the reader to run.

See `references/authoring-patterns.md` for the docs-to-lesson mapping, callout syntax, and the code-import shortcodes.

### 6. Verify

Before reporting done, check:

- Every lesson has `type`, `title`, and a `content.md`. Parts and chapters have a `meta.md` with `type` and `title`.
- Folder numbering orders the lessons the way the plan intends.
- Each `_solution` differs from its `_files` and would pass the lesson's stated verification.
- Every command the lesson asks the reader to run is either in that lesson's `allowCommands` (webcontainer-runnable) or presented as a real-environment callout. No command is asked for and then blocked.
- `focus` points at a file that exists in the lesson.
- Frontmatter names and descriptions follow the constraints in `references/config.md`.

Then report what was generated: the tree, the lessons, and any steps marked real-environment so the user knows where the agent hand-offs are.

## Output conventions

- Write under the resolved output directory, default `src/content/tutorial/`.
- Use kebab-case, number-prefixed folder names (`1-introduction`, `2-first-plugin`).
- Do not invent specifics the docs do not contain. If the docs omit a version or a command, leave it out rather than guessing.

## References

- `references/structure.md`: the parts, chapters, lessons content model; the `_files` and `_solution` folders; templates; and the `plan.json` shape the scaffold script reads.
- `references/config.md`: lesson and meta frontmatter options, condensed, with the constraints that keep them valid.
- `references/authoring-patterns.md`: how to turn extracted docs into lessons, callout and code-import syntax, and how to handle real-environment steps.
