# Examples

Two examples, smallest first.

## kernel-test

A single executable that exercises the combinator kernel with the fake adapter,
so it runs offline with no provider and lands on the same result every time.
It is the proof that `pipe`, `loopUntil`, and `validate` behave, and a worked
reference for each. Run it directly:

```
./kernel-test
```

Expected last line: `all passed`.

## extract-deps

A finished pipeline of the shape the `harness` command emits. It reads a
`package.json` on stdin and writes a reviewer summary on stdout, in three
stages: parse the manifest, classify each dependency, render the summary.

```
cat package.json | ./extract-deps/run
```

The runner selects an executor at the edge. With `HARNESS_ADAPTER=fake` it runs
offline. With the default `http-json` adapter it calls a model server, and
reads the endpoint, headers, and credentials from configuration; no provider is
named in the agent files.

Each stage is one file under `agents/`. Open `01-classify-deps.md`: the `# `
heading names the agent, the `json` block is the closure plus the output
schema, and the prose below is the task. `pipeline.json` lists the stages in
order. `run` loads the files, builds an agent from each, and pipes them.
Nothing is hidden; the whole pipeline is four small text files.

A real `harness` build also vendors `core.ts` and the adapters into the output
directory, so it stands alone. This example imports them from the skill
instead, to keep one source of truth.

## Inspecting and editing

Because a stage is a plain file, you can run one in isolation, diff a change,
or hand-edit a constraint and rerun. To tighten the summary, edit the
constraints in `02-render-summary.md`; no code changes.
