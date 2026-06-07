# The per-node loop and the evolving harness

The control structure of harness mode, settled through design review. Read this
to understand what runs per node, in what order, and why the harness is a value
rather than a frozen build.

## Harness mode is one recursive feedback loop

The planner runs once and produces nodes. Everything after is a single loop per
node: a generator emits a candidate agent, the candidate runs, its output is
evaluated, the findings are recorded, and the generator runs again with those
findings. The retry is the loop. Regeneration with feedback is how improvement
happens, so there is no separate improver and no separate shrink agent.
Simplification is one possible finding among many, not its own stage; a
complexity judge that says the agent is too complex puts that in the feedback,
and the next generation produces a simpler agent.

## Two tiers, divided by whether a step needs a model

The loop has an inner tier and an outer tier. The dividing line is exact: does
the check need a model.

**Inner tier, deterministic, no model.** Does it build, do the test cases pass,
does it lint, does it satisfy the declared rules and expectations. Every check
here is a real function returning pass or fail and spends no tokens. The loop
stays on this tier, regenerating, until the gate is green. An agent that does
not build never reaches a judge.

**Outer tier, model-backed judges.** Engaged only once the inner gate is green.
A judge reads the candidate and its output and returns a finding; it never
mutates the agent. The bank is open; judges are added without changing the
loop's shape. Typical members: a complexity judge, a clarity judge, a
performance reviewer, a security analyst that also acts as a pentester, a
fuzzer, a dependency auditor.

This split reserves token spend for questions only a model can answer, asked
only of artifacts that already work.

## Measure, then learn, then improve

The two tiers are measurement; they only produce findings. Between the judges
and the next generation sits a learn-then-remember step: findings from both
tiers are collected, turned into something durable, and stored, and that store
is what the next generation reads. So a retry is not blind; it carries every
way prior attempts fell short. This is where persistent memory lives: it is the
accumulated findings, bound into the closure ahead of the data argument.

Only the generator writes. Judges measure, the generator regenerates. Never let
an improvement step also judge its own work; that is the failure mode where a
shrink deletes load-bearing code and calls it minimal.

## Finding triage: regenerate or re-plan

A finding has two possible destinations. Most mean regenerate this agent, and
the finding routes back to the generator. Some mean the planner decomposed
wrong, and then the finding escapes the node loop and re-invokes the planner.
The generator may itself escalate: when it sees the decomposition is the fault,
it flags the plan and hands control back to the planner instead of regenerating
a node that was mis-specified. The loop therefore has an inner radius,
regenerate the node, and an outer radius, re-decompose the plan.

## Chaos refinement is the final stage

After the deterministic gate is green and the judges are satisfied, the agent
is exercised against variations of the input prompt, not variations of the
data, and the whole pipeline reruns. The constraint is firm: this refines the
agent without widening its swim lane or growing its complexity. It is
hardening, not scope creep. It surfaces brittleness to phrasings of intent the
agent was not generated against, and the rerun lets the loop absorb that, so
the agent holds its contract across a spread of prompts rather than the one it
was born from.

## Design decisions are nodes, selected by a closure argument

A tech-stack choice, Vue or React, Bash or Nushell, is not a fork in the
pipeline. It is a node. Building the Nushell node is the same act as building
any node: it runs the full battery, the deterministic gate then the judges then
chaos refinement, and earns its place by passing the same standard.

Swapping Bash for Nushell is then swapping one function in a composition.
Nothing downstream is recompiled, because nothing downstream was bound to Bash;
the downstream nodes were composed against a contract, an input shape and an
output contract, and Nushell satisfies the same contract. Composition gives the
substitution for free, which is what `f after g` means: replace `g` with any
`g'` of the same type and `f` neither knows nor cares.

Because data binds last and every node is a higher-order function, the stack
choice is an argument to the harness, bound into the closure alongside the
model and the memory. The stack stops being a property of the pipeline and
becomes a parameter of it. One harness, parameterized, not a Vue harness and a
React harness. The human states intent; the stack is a knob. Anything that is a
choice rather than intent belongs in the closure as an early-bound argument
behind a contract. Provider, memory, and stack are the same kind of thing.

## The harness is a recomposable value

The delivered harness is a value: a curried composition of agent nodes with the
plan as the last argument. A value that is a composition can be recomposed.

Harness mode is a function from a plan to a harness. A composed pipeline is
itself a plan, a refined one that has been through the battery, so harness
mode's input type and output type are the same type at different levels of
refinement. Harness mode can run on its own output. The first pass turns a
prose plan into a verified pipeline; a later pass takes that pipeline, swaps a
node, and reverifies.

Evolution is therefore harness mode applied to a prior harness with one closure
argument changed: a stack swap, a model swap, a memory swap, all the same move.
Nothing is mutated. Each generation is immutable, and the next generation is
composed from it as a sibling, not a patch. The old harness still exists, still
runs, still passes its battery. This is what makes evolution safe: a new
generation is a composition, not an edit, and "stack bound at assembly" versus
"stack open at call time" are the same artifact seen at two moments, because it
can always be recomposed.
