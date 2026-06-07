---
name: prompt-harness
description: Compile a plan into a composable pipeline of executable prompt files. Use this whenever the user wants composable, chainable, or executable prompts; a prompt or agent pipeline; "harness mode"; prompts treated as curried functions; or wants to compile a plan into a runnable pipeline that produces functionally reproducible output at a consistent quality and simplicity bar. Trigger on mentions of composable prompts, executable prompts, prompt pipelines, chaining prompts, prompt-as-a-function, agent pipelines, functional prompt composition, or turning a plan into a single runnable command. Also use when the user wants to constrain an agent from over-generating and instead emit small, verified, self-contained prompt artifacts.
---

# Prompt harness

Build prompt pipelines the way you build a Unix pipeline: small parts, each
doing one thing well, each expecting the output of an unknown upstream part.
A prompt is a function. Config is captured in its closure, data arrives last,
failure is a value. Pipelines are built by composing these functions.

The skill ships a working kernel and a harness mode that compiles a plan into a
runnable pipeline. Hold to the restraint the skill teaches: the artifact you
produce should be as small as the job allows. Verbosity is the failure mode to
design against.

## The mental model

A prompt has the type `(input: string) => Promise<Result<B>>`. It is a Kleisli
arrow: it can fail, and the failure is a value you branch on. Two prompts
compose when one declares an output schema the next can consume. The schema is
the contract that makes composition exist; without it you have a transcript.

A prompt node carries a closure: the model, the sampling settings, the domain
constants, partially applied when the prompt is built. The task data is the
last argument. This is a curried function with config bound and the payload
free, which is what keeps every node reusable.

For the full algebra, the combinator laws, and why shrink is the only honest
source of concision, read `references/closure-algebra.md`. For the design
constraints, read `references/unix-17.md`.

## The prompt file format

A prompt node is one markdown file. Plain text keeps it greppable, diffable,
and editable by hand, which is the rule of transparency in practice.

~~~markdown
# classify-deps

```json
{
  "name": "classify-deps",
  "closure": { "model": "claude-sonnet-4-20250514", "temperature": 0 },
  "constraints": ["Every input package appears in exactly one list."],
  "schema": { "runtime": "string[]", "tooling": "string[]" }
}
```

Sort these package names into runtime and tooling.

{{input}}
~~~

The heading names the node. The single `json` block is the captured closure
plus the output schema. The prose below is the task; `{{input}}` marks where
the input lands. A schema is either the word `text`, or a flat record of field
names to one of `string`, `number`, `boolean`, `string[]`. Flat on purpose:
the budget a model can fill is exactly the shape it is shown, so a tight schema
makes verbosity structurally hard.

## The combinator kernel

`scripts/lib/core.ts` is the kernel. It is pure; the one effect, calling a
model, is injected as an `Executor`, so the whole kernel runs offline against
the fake executor in `scripts/lib/sdk.ts`.

| Combinator | Use |
|------------|-----|
| `compile(spec, exec)` | a prompt spec plus an executor becomes a prompt |
| `fromFile(path, exec)` | load a prompt file into a prompt |
| `pipe(...stages)` | run stages left to right, stop at the first failure |
| `fanout(stage)` | run one prompt over every element of a list |
| `route(pick, table)` | dispatch to one branch by key |
| `orElse(a, b)` | try `a`, fall through to `b` on failure |
| `retry(stage, n)` | re-sample until valid or out of tries |
| `cached(stage, store)` | content-addressed memo, persisted to JSON |
| `shrink(step, done, fuel)` | recurse toward a fixed point |

Build a pipeline by hand in a few lines:

```typescript
import { fromFile, pipe, asInput } from "./lib/core.ts";
import { claudeExecutor } from "./lib/sdk.ts";

const stages = await Promise.all(
  ["00-parse", "01-classify", "02-render"].map((n) =>
    fromFile(`prompts/${n}.md`, claudeExecutor)),
);
const result = await pipe(...stages)(await Bun.stdin.text());
process.stdout.write(result.ok ? asInput(result.value) : `error: ${result.error}`);
```

## Harness mode

`scripts/harness` is harness mode. It takes a plan in prose and writes a
directory holding the pipeline and the one command that runs it. Everything
produced along the way, the drafts and the rejected attempts, stays in memory
and is discarded. What remains is small and self-contained.

```
harness <plan-file> [out-dir]      # out-dir defaults to .claude/harness
```

A run is six stages, each one a prompt built from the kernel, so the tool that
makes pipelines is made of its own parts:

1. **Plan into nodes.** The plan becomes an ordered list of single-purpose
   nodes plus one sample input to thread through verification.
2. **Generate.** Each node spec becomes the task body of a prompt file.
3. **Test.** The generated prompt runs on the sample; a tester judges the
   output against the node task. A failure is recorded and fed back into the
   next attempt, so each retry carries what the last one got wrong.
4. **Stress.** The passing prompt runs across input variations to confirm it
   holds its contract beyond one happy path.
5. **Shrink.** The prompt is driven toward its smallest form that still passes
   the test. This is the concision stage.
6. **Rewrite.** The plan is rewritten as a short executable plan, `PLAN.md`,
   describing the finished pipeline and its run command.

The output directory holds `prompts/` (one file per node), `pipeline.json`
(the wiring), `run` (the single executable), `PLAN.md`, `.cache.json` (the
recorded rejections), and a vendored `lib/` so it stands alone. Run it with
`echo "<input>" | .claude/harness/run`.

The harness needs `ANTHROPIC_API_KEY` and Bun. It builds on Bun, ES template
literals, and a direct `fetch` to the Claude API, with no other dependency. The
output runs locally, or deploys behind a Hono route or a Hono MCP server on
Cloudflare Workers, since `run` is plain stdin to stdout.

## Why shrink, and only shrink, gives concision

Composition contains verbosity and makes it attributable to a stage. It does
not remove verbosity. Generation has no fixed point; there is always one more
helpful-seeming addition, so a generate-more loop never converges.

Run the recursion the other way. Generate once, then shrink: remove what is not
load-bearing, and if the contract still holds, shrink again. Shrinking has a
fixed point, the state where removing any token breaks the test. That fixed
point is the base case and the only honest definition of concise.

A shrink is therefore exactly as trustworthy as the predicate gating it. Gate
on a real function wherever one exists: a line count, an `ast-grep` node count,
a typecheck, a passing test. Use a model as the predicate only where no real
function can be written.

## Building or extending this skill

When you add a combinator, keep the kernel pure and the new piece small; place
any effect behind the executor. When you change the prompt file format or the
pipeline format, stop first: those formats are stable on purpose, and a request
to grow them usually wants a new combinator or a new prompt file instead. State
the assumption and ask before expanding a format.

Verify before you trust. `examples/kernel-test` runs the kernel offline; run it
after any kernel change. The promise is functional reproducibility: repeated
runs land on equivalent outputs at a consistent quality bar, checked by the
schema and the tests, rather than byte-identical output.
