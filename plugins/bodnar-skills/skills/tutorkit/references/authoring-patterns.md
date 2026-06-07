# Authoring patterns: docs to lessons

## Mapping doc content to lesson parts

Documentation and a good lesson are not the same shape. Docs explain; lessons make someone do. Translate, do not copy.

| In the docs | In the lesson |
| --- | --- |
| A concept or definition | A short narrative paragraph, then a concrete example in `_files` the reader can look at |
| A procedure or numbered steps | A hands-on lesson: starting `_files`, a task in the narrative, a `_solution`, and a verification command |
| A code example | A starting file in `_files` and the finished version in `_solution`, imported with shortcodes rather than pasted |
| A warning or non-obvious fact | A callout (`:::warn`, `:::danger`, `:::info`), kept close to the step it affects |
| A prerequisite | A line in the chapter or part `meta.md` narrative, or a `prepareCommands` entry if it is an install |
| A verification ("you should see ...") | A command in `allowCommands` plus a sentence telling the reader what success looks like |

## One concept per lesson

Keep each lesson to a single idea or a single procedure. If a doc section covers three things, it usually becomes three lessons. Short lessons let a reader who falls behind rejoin at the next one, which is the whole point of the lesson-by-lesson model.

## Callouts

```
:::tip
A helpful aside.
:::

:::warn
Something that will bite the reader if ignored.
:::

:::danger
A destructive or irreversible action.
:::
```

Available types: `tip`, `info`, `warn`, `danger`, `success`.

## Importing code instead of pasting it

Reference files from `_files` and `_solution` so the prose and the running code never drift apart.

- `` ```file:/path/to/file.ext ``` ``  inserts the file from `_files`.
- `` ```solution:/path/to/file.ext ``` `` inserts the file from `_solution`.

Expressive Code attributes work in fenced blocks: `title`, `frame="terminal"`, `showLineNumbers`, line markers like `{4}`, `ins={5}`, `del={6}`, and text marking with strings or regexes.

## Starting files must already run

The `_files` state is applied on top of the template and must produce a working app before the reader makes any change. A lesson that opens with a broken build teaches the wrong lesson. Put the working baseline in `_files` and the change the lesson teaches in `_solution`.

## Handling real-environment steps

Some procedures cannot run in the WebContainer: anything that invokes a native binary, an external agent CLI, or a network call needing secrets or open egress. Do not pretend these run in the lesson.

For each such step:

1. Write it as a callout that names plainly what has to happen outside the lesson.
2. Show the command as a copyable code block with `frame="terminal"`, but do not add it to `allowCommands`.
3. Offer a hand-off: set `openInStackBlitz: true` or `downloadAsZip: true` on the lesson so the reader can continue the work in a full environment.
4. Where possible, split the step so the parts that can run in the WebContainer (editing a config file, running a Node-based validator) stay live, and only the actual external invocation is the hand-off.

Example callout for an agent step:

```
:::warn
The next step runs an agent CLI, which needs a real shell and network access, so it runs outside this lesson. Open this lesson in your real environment and run:

```bash frame="terminal"
your-agent-cli --do-the-thing
```
:::
```

This keeps the lesson honest about where work happens while still teaching the full procedure.

## Verification closes the loop

End a hands-on lesson with a way to know it worked: a test command, a expected line of output, or a visible change in the preview. A reader who cannot tell whether they succeeded will assume they failed.
