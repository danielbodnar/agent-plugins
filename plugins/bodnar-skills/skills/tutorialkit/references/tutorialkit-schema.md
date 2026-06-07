# TutorialKit Schema & Syntax Reference

Read this before writing any frontmatter, code block, or callout.

## Table of contents
1. [Content hierarchy & folders](#1-content-hierarchy--folders)
2. [Frontmatter properties (all levels)](#2-frontmatter-properties)
3. [Inheritance](#3-inheritance)
4. [Lesson files: `_files` and `_solution`](#4-lesson-files-_files-and-_solution)
5. [Code block annotations (Expressive Code)](#5-code-block-annotations)
6. [File shortcodes](#6-file-shortcodes)
7. [Callouts](#7-callouts)
8. [Minimal examples](#8-minimal-examples)

---

## 1. Content hierarchy & folders

Four levels, each a numbered folder. Numeric prefixes set order and are stripped
from the display.

```
src/content/tutorial/
├── meta.md                         # type: tutorial   (root config + run commands)
├── 1-basics/                       # Part
│   ├── meta.md                     # type: part
│   ├── 1-introduction/             # Chapter
│   │   ├── meta.md                 # type: chapter
│   │   └── 1-welcome/              # Lesson
│   │       ├── content.md          # type: lesson + the markdown body
│   │       ├── _files/             # starting state shown in the editor
│   │       └── _solution/          # completed state (revealed by "Solve")
└── src/templates/<name>/           # shared starter files referenced by `template:`
```

Only **lessons** have body content (`content.md`). Parts and chapters carry only
a `meta.md`. The tutorial root `meta.md` typically defines `mainCommand` and
`prepareCommands` that every lesson inherits.

## 2. Frontmatter properties

| Property | Type | Level(s) | Inherited | Purpose |
|----------|------|----------|-----------|---------|
| `type` | `tutorial`\|`part`\|`chapter`\|`lesson` | all | no | Declares the level. Required. |
| `title` | string | all | no | Display name. Required (except root). |
| `slug` | string | all | no | Custom URL segment. |
| `focus` | string (path) | chapter/lesson | yes | File opened in the editor by default, e.g. `/SKILL.md`. |
| `editor` | boolean \| object | all | yes | Show/hide editor; `allowEdits` glob patterns. |
| `previews` | `Preview[]` \| `false` | all | yes | Ports/preview panes for a dev server. For author→validate lessons set `previews: false` (there's no web preview). |
| `terminal` | object | chapter/lesson | yes | Terminal panels; `allowCommands`, `allowRedirects`. |
| `mainCommand` | `[cmd, readyText]` | chapter/lesson | yes | Primary command run after prepare. e.g. `['node validate.mjs', 'Validating']`. |
| `prepareCommands` | `[cmd, label][]` | chapter/lesson | yes | Setup steps, e.g. `[['npm install', 'Installing']]`. |
| `template` | string | all | yes | Folder under `src/templates/` to seed files from. |
| `filesystem` | `{ watch }` | chapter/lesson | yes | Reflect WebContainer file changes into the editor. |
| `autoReload` | boolean | chapter/lesson | yes | Force preview reload on navigation. |
| `openInStackBlitz` | boolean \| object | chapter/lesson | yes | "Open in StackBlitz" button. |
| `downloadAsZip` | boolean \| object | chapter/lesson | yes | ZIP download button. |
| `i18n` | object | all | yes | Localized UI strings. |
| `editPageLink` | string \| false | all | yes | "Edit this page" link; `${path}` substituted. |
| `meta` | object | all | yes | Open Graph / Twitter metadata. |
| `custom` | record | all | yes | Arbitrary fields for programmatic use. |

The authoritative schema is `contentSchema` from `@tutorialkit/types`; `astro
check` validates against it.

## 3. Inheritance

Inheritable properties cascade **tutorial → part → chapter → lesson**, and lower
levels override. Set `mainCommand`/`prepareCommands` once at the root; only
repeat them on a lesson that genuinely needs different commands.

## 4. Lesson files: `_files` and `_solution`

- `_files/` is the editor's starting state. Paths are mirrored from the folder
  root, so `_files/SKILL.md` appears as `/SKILL.md` in the editor.
- `_solution/` is the completed state. The **Solve** button swaps the editor to
  these files; **Reset** restores `_files/`. `_solution/` usually mirrors
  `_files/` structure, with the gaps filled in (and may add files).
- `focus` should name a file that exists in `_files/`.
- Files common to many lessons can live in a `src/templates/<name>/` folder
  referenced via `template:`; lesson `_files/` are layered on top.

## 5. Code block annotations

TutorialKit renders code with **Expressive Code**. Annotations go on the fence:

| Marker | Meaning |
|--------|---------|
| `{6,10-18}` | Highlight lines 6 and 10–18 |
| `ins={4}` | Mark lines as inserted (green) |
| `del={5}` | Mark lines as deleted (red) |
| `"text"` | Highlight exact matching text |
| `/re[gex]/` | Highlight regex matches |
| `add=/add[12]/` `del=/rm/` | Text-level insert/delete marks |
| `collapse={1-5}` | Collapse a line range |
| `title="file.js"` | Show a filename tab |
| `{"Label":5}` | Attach a label to a line |

Example:

````md
```js title="counter.js" ins={9} {1}
export function setupCounter(element) {
  let counter = 0;
  const setCounter = (count) => {
    counter = count;
    element.innerHTML = `count is ${counter}`;
  };
  element.addEventListener('click', () => setCounter(counter + 1));
  setCounter(0);
}
```
````

**Always derive `ins`/`del` line numbers from a real diff between `_files` and
`_solution`.** Generate both files first, diff them, then translate the changed
lines into markers. Hand-counted line numbers drift and teach the wrong edit.

## 6. File shortcodes

Inline a file's contents into the lesson prose:

- `file:` → reads from `_files/` (or the active `template`)
- `solution:` → reads from `_solution/`

````md
```file:/SKILL.md
```
````

## 7. Callouts

```md
:::tip
Helpful nudge.
:::

:::info
Neutral context. Supports **markdown**.
:::

:::warn
Watch out for this.
:::

:::danger
This will break things.
:::

:::success
Confirmation / what success looks like.
:::
```

## 8. Minimal examples

Root `meta.md`:

```md
---
type: tutorial
mainCommand: ['node validate.mjs', 'Validating']
prepareCommands:
  - ['npm install', 'Installing dependencies']
---
```

Lesson `content.md` (author→validate, no web preview):

```md
---
type: lesson
title: Your first SKILL.md
focus: /SKILL.md
previews: false
---

# Your first SKILL.md

Write the frontmatter, then run `node validate.mjs` in the terminal.
```
