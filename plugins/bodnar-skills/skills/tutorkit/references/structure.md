# TutorialKit content structure

## The hierarchy

Content is divided into parts, which contain chapters, which contain lessons. Any level can be omitted, so a small tutorial can be lessons only, or parts and lessons without chapters.

```
src/content/tutorial/
├── meta.md                     # tutorial-level config (type: tutorial)
├── 1-basics/                   # a part
│   ├── meta.md                 # part-level config (type: part)
│   ├── 1-introduction/         # a chapter
│   │   ├── meta.md             # chapter-level config (type: chapter)
│   │   ├── 1-welcome/          # a lesson
│   │   │   ├── content.md      # lesson narrative + frontmatter (type: lesson)
│   │   │   ├── _files/         # starting state shown in the editor
│   │   │   └── _solution/      # solved state revealed by the Solve button
│   │   └── 2-why/
│   │       └── ...
│   └── 2-first-project/
│       └── ...
└── 2-cli/
    └── ...
```

Folder names are number-prefixed. The number sets order; the rest of the name becomes the URL segment unless overridden by a `slug` in frontmatter.

## Lessons

A lesson folder holds three things:

- `content.md`: a Markdown or MDX file with a frontmatter block (`type: lesson`, `title`, and any config) followed by the narrative.
- `_files/`: the code the lesson starts with. These files appear in the editor and run in the preview. They are applied on top of the template, so they hold only what the lesson changes, not the whole project.
- `_solution/`: the same files in their solved state, revealed by the Solve button. Must differ from `_files` and should satisfy the lesson's verification.

## Templates

A template is a complete, working base project under `src/templates/`. TutorialKit applies a lesson's `_files` (or `_solution`) on top of the template to produce the running app, so boilerplate lives in the template instead of being copied into every lesson.

- The default template is `src/templates/default`.
- Select a template with the `template` frontmatter key at the lesson, chapter, part, or tutorial level (it inherits downward).
- Templates can share a base via a `.tk-config.json` with `{ "extends": "../shared-template" }`, overriding individual files by name.

## meta.md

Parts, chapters, and the tutorial root use a `meta.md` whose frontmatter sets `type` (`part`, `chapter`) and `title`, plus any inherited config (`template`, `terminal`, `editor`, and so on). Values set here flow down to children unless a child overrides them.

## plan.json shape

The scaffold script reads a plan with this shape. Keep it dependency-free JSON.

```json
{
  "kind": "tutorial",
  "template": "default",
  "title": "Building a Claude Code Plugin",
  "source": "https://code.claude.com/docs/en/plugins.md",
  "parts": [
    {
      "dir": "1-plugin-basics",
      "title": "Plugin basics",
      "type": "part",
      "chapters": [
        {
          "dir": "1-anatomy",
          "title": "Anatomy of a plugin",
          "lessons": [
            {
              "dir": "1-what-is-a-plugin",
              "title": "What is a plugin",
              "focus": "/README.md",
              "prepareCommands": [],
              "allowCommands": ["ls", "cat"],
              "previews": false,
              "files": { "/README.md": "# starting content\n" },
              "solution": { "/README.md": "# solved content\n" }
            }
          ]
        }
      ]
    }
  ]
}
```

For a single lesson, use:

```json
{
  "kind": "lesson",
  "template": "default",
  "source": "https://code.claude.com/docs/en/plugins.md",
  "lesson": {
    "dir": "create-a-plugin",
    "title": "Create a plugin",
    "focus": "/plugin.json",
    "allowCommands": ["ls", "cat", "npm"],
    "files": { "/plugin.json": "{}\n" },
    "solution": { "/plugin.json": "{ \"name\": \"example\" }\n" }
  }
}
```

Field notes:

- `files` and `solution` are maps of absolute in-lesson paths to file contents. The script writes them into `_files/` and `_solution/`.
- Omit `chapters` to make a part hold lessons directly. Omit `parts` and use `lesson` for the single-lesson case.
- `allowCommands`, `previews`, `prepareCommands`, `focus`, and `template` map straight to the frontmatter documented in `config.md`.
