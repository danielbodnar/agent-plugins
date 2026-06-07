# TutorialKit lesson and meta config

Set these in the frontmatter of a lesson's `content.md`, or in a `meta.md` for a part, chapter, or tutorial. Many options are inherited: a value set on a part flows to its chapters and lessons unless overridden lower down.

## Identity

- `type` (required): `part`, `chapter`, or `lesson`.
- `title` (required): the display title.
- `slug`: overrides the URL segment, which is otherwise the folder name.

## Editor and files

- `focus`: the file opened in the editor by default when the lesson loads. Point it at a file that exists in the lesson. Inherited.
- `editor`: set to `false` to hide the editor. To keep the editor but hide the file tree, use `fileTree: false`. To let students create files from the tree, set `fileTree.allowEdits` to `true` or to a glob or list of globs that scope where edits are allowed, for example `"/src/**"`.

## Running code

- `template`: which folder under `src/templates/` is the base project. Inherited.
- `prepareCommands`: a list of commands run in sequence before the lesson, typically installs or setup. Each entry is a string, a `[command, title]` pair, or `{ command, title }`.
- `mainCommand`: the command run after `prepareCommands`, typically the dev server.
- `previews`: which ports surface as preview tabs. A number, a `"port/path"` string, a `[port, title]` pair, or `{ port, title, pathname }`. Set to `false` to hide the preview panel.
- `autoReload`: reload the preview on navigation to the lesson. Needed only when the server lacks HMR.

## Terminal

- `terminal`: configures one or more panels.
  - A panel `type` is `terminal` (interactive) or `output` (read-only). There can be only one `output` panel.
  - `allowCommands`: a list of commands the student is permitted to run. Anything else is blocked. Use this to keep a lesson on rails, and include only webcontainer-runnable commands.
  - `allowRedirects`: interactive terminals disable output redirection by default so students cannot clobber lesson files with `echo x > file`. Enable per panel or globally only when the lesson needs it.
  - `open`: start with the terminal open.
  - `activePanel`: index of the panel active by default.
  - `id`: give a panel a stable `id` and reuse it across lessons to keep one terminal session alive between them.

Example:

```yaml
terminal:
  open: true
  panels:
    - ['output', 'Dev Server']
    - type: terminal
      id: cmds
      title: Command Line
      allowCommands:
        - ls
        - cat
        - npm
```

## Filesystem reflection

- `filesystem.watch`: whether edits made outside the editor (for example by a command) appear in the editor. Default `false` for performance. Set `true`, or an array of globs, when a lesson expects the student to change files from the terminal.

## Escape hatches and metadata

- `openInStackBlitz`: show a link to open the lesson in StackBlitz. `true`, or an object with `projectTitle`, `projectDescription`, `projectTemplate`. Use this for lessons whose real work happens outside the WebContainer.
- `downloadAsZip`: show a button to download the lesson as a zip. Useful as a hand-off for real-environment steps.
- `editPageLink`: a URL pattern with `${path}` for an "edit this page" link, typically pointing at the source repo.
- `meta`: Open Graph and Twitter tags (`image`, `title`, `description`).
- `custom`: arbitrary key-value data readable from the `tutorial` content collection, for custom features.

## Frontmatter constraints worth honoring

These come from the Agent Skills and TutorialKit conventions and keep the output valid:

- Titles are plain strings. Keep them short and descriptive.
- Folder names are number-prefixed and kebab-case.
- A lesson's `focus` and any `file:`/`solution:` shortcodes must reference files that actually exist in that lesson.
