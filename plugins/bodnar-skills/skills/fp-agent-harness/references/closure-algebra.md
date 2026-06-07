# Closure algebra

The reasoning behind `scripts/lib/core.ts`. Read this when you want to extend
the kernel, add a combinator, or explain why a pipeline behaves as it does.

## The honest type of a prompt

A prompt is not `string -> string`. Under a fixed model and sampling settings
it is `Context -> Result<Output>`: it can fail to produce a valid answer, and
that failure is a value you can branch on. The kernel writes this as:

```
Prompt<B> = (input: string) => Promise<Result<B>>
```

This is a Kleisli arrow over `Promise` and `Result`. Composition exists only
because the arrow carries a schema. Two prompts compose when the output schema
of the first matches the input the second expects. Without a declared schema
you have a transcript, and transcripts do not compose.

## The closure

A prompt node has a captured environment: model, temperature, token budget, and
any domain constants. That environment is the closure in the functional sense,
partially applied when the prompt is built. Data arrives last, as the call
argument. This is the same shape as a curried function with config bound and
the payload free, which keeps every node a reusable unit.

## The executor is injected

The kernel performs no effects. It asks for an `Executor`, the one function
that calls a model. `sdk.ts` supplies a real executor and a fake one. The fake
makes the entire kernel and any pipeline runnable offline and deterministically,
which is how `examples/kernel-test` proves the combinators with no API key.

## The combinator set

| Combinator | Role | Algebraic shape |
|------------|------|-----------------|
| `compile`  | spec plus executor becomes an agent | constructor |
| `pipe`     | run stages left to right, stop on first failure | Kleisli composition |
| `fanout`   | run one agent over every element of a list | map |
| `route`    | pick one branch by key | sum-type dispatch |
| `orElse`   | try primary, fall through on failure | Alternative |
| `retry`    | re-sample until valid or out of tries | Alternative over self |
| `cached`   | content-addressed memo, persisted to JSON | identity with a store |
| `loopUntil`| run a turn until the state is done | bounded fold |

`pipe` short-circuits: the first failing stage returns its own error, so a
broken pipeline names the stage that broke instead of cascading into noise.

## Where concision comes from

Composition contains verbosity and makes it attributable. It does not remove
verbosity. A twelve-stage pipeline where every stage runs long is still long.

Generation has no fixed point. There is always one more helpful-seeming addition,
so a generate-more loop never converges; it has no base case. The per-node loop
converges instead. Each turn the judges measure the candidate, a complexity
finding among them, and the next generation produces a tighter agent in
response. The loop's fixed point is the candidate that passes the deterministic
gate and draws no further actionable findings. That fixed point is the base
case, and it is the only honest definition of concise.

Concision is therefore exactly as trustworthy as the checks gating the loop. A
model is a poor judge of whether its own deletion was faithful, so the gate
should be a real function wherever one exists: a build, a passing test, a lint
rule, a line or `ast-grep` node count. Use a model judge only where no real
function can be written, and never let a judge edit the agent; it reports, and
the generator regenerates.

## Error compounding

Stage error multiplies. Five stages each correct 95 percent of the time give a
pipeline correct about 77 percent of the time. This is why every stage declares
a schema and why the harness gates each generated node with a real test before
admitting it. Composition without per-stage verification is unverified
composition.

## The model is an unstable runtime

A pure function means the same thing in ten years. A prompt is compiled against
a model whose behavior shifts between versions. Pin the model in the closure;
treat that pin as a dependency version. The promise this kernel makes is
functional reproducibility: repeated runs land on equivalent outputs at a
consistent quality bar, verified by the schema and the tests, rather than
byte-identical outputs.
