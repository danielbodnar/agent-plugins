# Plan and scaffold

Phase 4 generates the tutorial tree from an approved plan rather than writing folders by hand. Once the Phase 3 plan is approved, express it as a `plan.json` and run the scaffold script. This keeps generation deterministic and separates the structure (data in the plan) from the prose (written into the generated files afterward).

## When to use the generator versus writing by hand

Use the generator for any tutorial with more than two or three lessons, where hand-writing the tree is slow and error prone. For a single small lesson, writing the files directly from the templates in `assets/templates/` is fine. Either way, the layout produced must match `references/tutorialkit-schema.md`.

## Running it

```
bun scripts/scaffold.ts plan.json --out src/content/tutorial
```

Flags:

- `--out <dir>`: target content directory. Default `src/content/tutorial`. Point it at the existing project located in Phase 1.
- `--force`: overwrite files that already exist. Off by default, so re-running is safe and only fills gaps.

The script runs under Bun directly. Under Node it needs `node --experimental-strip-types scripts/scaffold.ts`.

## What it writes

- A root `meta.md` with `type: tutorial` and any `mainCommand` and `prepareCommands` from the plan, which every lesson inherits.
- A `meta.md` for each part and chapter.
- Per lesson: `content.md` with frontmatter and a title, plus `_files/` and `_solution/` populated from the plan's file maps.
- For lessons marked `validateExercise: true`, a copy of the bundled `assets/validate.mjs` into both `_files/validate.mjs` and `_solution/validate.mjs`, and `previews: false` by default.

The script never writes lesson prose. It leaves a TODO marker in `content.md` unless the plan supplies a `body`. Fill the narrative, and complete the `_files` and `_solution` gaps, after scaffolding.

## plan.json shape

```json
{
  "kind": "tutorial",
  "title": "Building a Claude Code Plugin",
  "template": "default",
  "source": "https://code.claude.com/docs/en/plugins.md",
  "mainCommand": ["node validate.mjs", "Validating"],
  "prepareCommands": [],
  "parts": [
    {
      "dir": "1-plugin-basics",
      "title": "Plugin basics",
      "chapters": [
        {
          "dir": "1-anatomy",
          "title": "Anatomy of a skill",
          "lessons": [
            {
              "dir": "1-first-skill",
              "title": "Your first SKILL.md",
              "focus": "/SKILL.md",
              "validateExercise": true,
              "allowCommands": ["node", "cat", "ls"],
              "files": { "/SKILL.md": "---\ndescription:\n---\n" },
              "solution": { "/SKILL.md": "---\nname: hello\ndescription: Use when greeting\n---\n\nGreet warmly.\n" },
              "body": "Lesson narrative goes here, or omit to get a TODO."
            }
          ]
        }
      ]
    }
  ]
}
```

For a single lesson:

```json
{
  "kind": "lesson",
  "source": "https://...",
  "mainCommand": ["node validate.mjs", "Validating"],
  "lesson": {
    "dir": "create-a-skill",
    "title": "Create a skill",
    "focus": "/SKILL.md",
    "validateExercise": true,
    "allowCommands": ["node", "cat", "ls"],
    "files": { "/SKILL.md": "---\ndescription:\n---\n" },
    "solution": { "/SKILL.md": "---\nname: hello\ndescription: Use when greeting\n---\n\nGreet warmly.\n" }
  }
}
```

## Field reference

Plan-level: `kind` (`tutorial` or `lesson`), `title`, `template`, `source`, `mainCommand`, `prepareCommands`, then `parts` (tutorial) or `lesson` (single).

Part: `dir`, `title`, optional `template`, then `chapters` or `lessons` directly.

Chapter: `dir`, `title`, optional `template`, `lessons`.

Lesson:

- `dir`, `title`: folder name and display title.
- `focus`: file open by default. Must exist in `files`.
- `validateExercise`: copy the validator into `_files` and `_solution` and default `previews` to false.
- `allowCommands`: terminal allow list. For author-validate lessons this is the small set the learner runs, for example `node`, `cat`, `ls`.
- `mainCommand`, `prepareCommands`: override the inherited run commands for this lesson only.
- `previews`, `openInStackBlitz`, `downloadAsZip`: as in the schema reference.
- `files`, `solution`: maps of absolute in-lesson paths to contents. The script writes them into `_files/` and `_solution/`.
- `body`: optional narrative. Omit to leave a TODO for hand-authoring.

## How this fits the workflow

The approved Phase 3 plan maps directly onto this shape: parts, chapters, and lessons become the JSON tree, and each lesson's author-validate design becomes its `files`, `solution`, and `validateExercise`. Generate the skeleton, then return to the lessons to write the prose, refine the `_files` to `_solution` gap to a single clear idea, and derive the Expressive Code `ins` and `del` markers from a real diff as `references/tutorialkit-schema.md` requires. Finish with the Phase 5 build check.
