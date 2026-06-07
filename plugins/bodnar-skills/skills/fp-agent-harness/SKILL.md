---
name: fp-agent-harness
description: Compile a plan into a composable pipeline of executable prompt files. Use this whenever the user wants composable, chainable, or executable prompts; a prompt or agent pipeline; "harness mode"; prompts treated as curried functions; or wants to compile a plan into a runnable pipeline that produces functionally reproducible output at a consistent quality and simplicity bar. Trigger on mentions of composable prompts, executable prompts, prompt pipelines, chaining prompts, prompt-as-a-function, agent pipelines, functional prompt composition, or turning a plan into a single runnable command. Also use when the user wants to constrain an agent from over-generating and instead emit small, verified, self-contained prompt artifacts.
---

# FP agent harness

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

For the full algebra and the combinator laws, read
`references/closure-algebra.md`. For the loop architecture, the two tiers, and
why concision is the loop's fixed point, read `references/loop-architecture.md`.
For the design constraints, read `references/unix-17.md`.

## The prompt file format

A prompt node is one markdown file. Plain text keeps it greppable, diffable,
and editable by hand, which is the rule of transparency in practice.

~~~markdown
# classify-deps

```json
{
  "name": "classify-deps",
  "closure": { "temperature": 0 },
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
model, is injected as an `Executor`, and it names no provider. The executor
comes from an adapter in `scripts/adapters/`, each adapter a small module for
one backend, none special. The fake adapter is a peer of the rest and runs the
whole kernel offline.

| Combinator | Use |
|------------|-----|
| `compile(spec, exec)` | an agent spec plus an executor becomes an agent |
| `fromFile(path, exec)` | load an agent file into an agent |
| `pipe(...stages)` | run stages left to right, stop at the first failure |
| `fanout(stage)` | run one agent over every element of a list |
| `route(pick, table)` | dispatch to one branch by key |
| `orElse(a, b)` | try `a`, fall through to `b` on failure |
| `retry(stage, n)` | re-sample until valid or out of tries |
| `cached(stage, store)` | content-addressed memo, persisted to JSON |
| `loopUntil(turn, done, fuel)` | run a turn until the state is done |

Build a pipeline by hand in a few lines. The executor is chosen at the edge:

```typescript
import { fromFile, pipe, asInput } from "./lib/core.ts";
import { httpJsonAdapter } from "./adapters/http-json.ts";

const exec = httpJsonAdapter; // or fakeAdapter for offline runs
const stages = await Promise.all(
  ["00-parse", "01-classify", "02-render"].map((n) =>
    fromFile(`agents/${n}.md`, exec)),
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

Harness mode is one recursive feedback loop, not a list of stages. The planner
runs once and produces nodes. Everything after is a single loop per node: a
generator emits a candidate agent, the candidate runs, its output is evaluated,
the findings are recorded, and the generator runs again with those findings.
Regeneration with feedback is how improvement happens, so there is no separate
improver and no separate shrink agent; a simpler agent is just what the next
generation produces after a complexity finding.

The loop has two tiers, divided by whether a check needs a model.

The **inner tier** is deterministic and spends no tokens: does it build, do the
test cases pass, does it lint, does it satisfy the declared rules. The loop
stays here, regenerating, until the gate is green. An agent that does not build
never reaches a judge.

The **outer tier** is the model-backed judges, engaged only once the inner gate
is green: a complexity judge, a clarity judge, a performance reviewer, a
security analyst and pentester, a fuzzer, a dependency auditor. The bank is
open. A judge reads the candidate and returns a finding; it never mutates the
agent. Only the generator writes.

Between the tiers and the next generation sits a learn-then-remember step:
findings from both tiers are collected, made durable, and stored, and that
store is what the next generation reads. A finding is then triaged. Most route
back to the generator. Some mean the planner decomposed wrong and route back to
the planner, and the generator may itself escalate a plan it judges faulty. The
loop has an inner radius, regenerate the node, and an outer radius, re-plan.

After the gate is green and the judges are satisfied, a final chaos-refinement
stage exercises the agent against variations of the input prompt, not the data,
and reruns the pipeline. This hardens the agent without widening its swim lane
or growing its complexity.

The output directory holds `agents/` (one file per node), `pipeline.json`
(the wiring), `run` (the single executable), `PLAN.md`, `.cache.json` (the
recorded findings), and a vendored `lib/` so it stands alone. Run it with
`echo "<input>" | .claude/harness/run`.

A delivered harness is a value: a curried composition of agent nodes with the
plan as the last argument. Harness mode is a function from a plan to a harness,
and a composed pipeline is itself a refined plan, so harness mode can run on
its own output. Evolution is harness mode applied to a prior harness with one
closure argument changed, a stack swap or a model swap, producing an immutable
sibling rather than a patch. A design decision, Vue or React, Bash or Nushell,
is a node selected by a closure argument, never a fork in the pipeline.

Read `references/loop-architecture.md` for the full loop, the triage routing,
the chaos stage, and the recomposable-harness model.

The harness needs an executor and Bun. The executor is injected, so any
provider or a fake backs the same harness. The output runs locally, or deploys
behind a Hono route or a Hono MCP server on Cloudflare Workers, since `run` is
plain stdin to stdout.

## The provider boundary

A harness has no provider. It defines stages, composition, and verification;
a model vendor is one way to execute a stage, not part of what a harness is.

There is exactly one effect in the system: take a rendered instruction plus a
captured environment, return completion text. That operation is the executor,
and its type is the whole provider interface. The kernel, the harness stages,
and the prompt files are pure and never name a vendor; they call an executor
they are handed. A provider is a value passed in, never a module imported.

The system has three tiers. The kernel defines the stage, contract, and
executor type. The harness orchestrates the build flow against an injected
executor. Adapters are small independent modules, one per provider, none
special, the fake among them as a peer; configuration at the edge picks one.

The executor type is closed under composition, so a function from executor to
executor is itself an executor. Four concerns live at this one seam: the
provider boundary, the test seam, a memoizing wrapper that returns a stored
completion on a repeated input, and a purity router that runs a synthesized
pure function when a node's contract turns out to be decidable. Because all
four share the shape, they compose at the edge and the harness never knows.

Persistent memory follows the same rule as every other capability: it binds
into the closure ahead of the data argument. Data, the prompt text or the
prior stage's output, is always the last argument. That curry signature is
what lets a parent pass memory, or itself, into a child harness closure.

Read `references/provider-boundary.md` for the full layering, the purity
gradient, and the crystallize step that demotes decidable nodes off the model.

## Where concision comes from

Composition contains verbosity and makes it attributable to a node. It does not
remove verbosity. Generation has no fixed point; there is always one more
helpful-seeming addition, so a generate-more loop never converges.

The per-node loop converges instead. Each iteration the judges measure the
candidate, a complexity finding among them, and the next generation produces a
tighter agent in response. The loop's fixed point is the candidate that passes
the deterministic gate and draws no further actionable findings. That fixed
point is the only honest definition of concise: the smallest agent that still
satisfies its contract.

Concision is therefore exactly as trustworthy as the checks gating the loop.
Gate on a real function wherever one exists: a build, a passing test, a lint
rule, a line or node count. Use a model judge only where no real function can
be written. A judge never edits the agent; it only reports, and the generator
regenerates. That separation is what stops an improvement step from deleting
load-bearing code and calling it minimal.

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
