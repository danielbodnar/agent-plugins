// stages.ts — the meta-agents that run during harness mode.
//
// Harness mode is itself a pipeline of agents that builds pipelines of agents,
// so the tool is made of its own parts. Each function here is an AgentSpec
// builder. The harness compiles them with an injected executor; no provider is
// named, and the closure carries only opaque sampling settings.

import type { AgentSpec, Schema } from "./lib/core.ts";

// opaque sampling settings; an adapter decides what they mean
const tuning = (maxTokens = 1024) => ({ temperature: 0, maxTokens });

// 1. Planner. A plan in prose becomes an ordered list of single-purpose nodes,
//    plus one sample input. Runs once at the start, and again when a finding is
//    triaged back to it; on a re-plan it receives prior findings to correct a
//    decomposition mistake.
export const plannerSpec = (): AgentSpec => ({
  name: "harness-planner",
  closure: tuning(2048),
  constraints: [
    "Decompose the plan into the fewest nodes that each do one thing well.",
    "Every node takes one text input and produces one output.",
    "Surface any decision the plan did not authorize as an open question, do not silently assume it.",
    "Choose a node schema of either the word text, or a flat object of field names to one of: string, number, boolean, string[].",
  ],
  schema: "text",
  body: `Decompose this build plan into a prompt pipeline.

Return a JSON object with two keys:
- nodes: an array of objects, each with name (kebab-case), task (at most five lines), constraints (array of short imperative rules), and schema.
- sample: one realistic example input for the first node, as a string.

PLAN:
{{input}}`,
});

// 2. Generator. A node spec, plus the findings accumulated by the loop, becomes
//    the task body of an agent. The only writer in the loop. On a retry it
//    folds every prior finding in, so each attempt carries what the last
//    attempt got wrong.
export const generatorSpec = (): AgentSpec => ({
  name: "harness-agent-generator",
  closure: tuning(1024),
  constraints: [
    "Write only the task instruction a model will follow.",
    "Include the literal placeholder {{input}} where the input belongs.",
    "Address every prior finding supplied with the node.",
    "Assert no decision the node spec did not authorize; flag it instead.",
  ],
  schema: "text",
  body: `Write the task body for this pipeline node, addressing every prior finding.

NODE AND FINDINGS:
{{input}}`,
});

// 3. Inner-tier verifier. The deterministic gate has no model in a real
//    harness; this spec exists for the cases where a check genuinely needs a
//    judgment (does the output satisfy the node task) that no function covers.
export const verifierSpec = (): AgentSpec => ({
  name: "harness-verifier",
  closure: tuning(512),
  constraints: [
    "Judge only whether the output satisfies the stated node task and constraints.",
    "pass is true only when the output is correct and within every constraint.",
    "reason is one sentence naming the single most important problem, or the word fine.",
  ],
  schema: { pass: "boolean", reason: "string" },
  body: `Evaluate whether this output satisfies the node task.

TASK AND OUTPUT:
{{input}}`,
});

// 4. A judge. One member of the open outer-tier bank. A judge reads a candidate
//    and returns findings; it never edits the candidate. Pass the judge's
//    concern in the closure so one spec serves the whole bank.
export const judgeSpec = (concern: string): AgentSpec => ({
  name: `harness-judge-${concern}`,
  closure: tuning(512),
  constraints: [
    `Assess the candidate agent only for: ${concern}.`,
    "Return findings, not edits.",
    "An empty findings array means the candidate is clean on this concern.",
  ],
  schema: { findings: "string[]" },
  body: `Judge this candidate agent for ${concern} and list any findings.

CANDIDATE:
{{input}}`,
});

// 5. Chaos refiner. After the loop settles, produce variations of the input
//    prompt to harden the agent against, without widening its swim lane.
export const chaosSpec = (): AgentSpec => ({
  name: "harness-chaos-refiner",
  closure: tuning(768),
  constraints: [
    "Each variation rephrases the original intent, it does not extend it.",
    "Cover a terse phrasing, a verbose phrasing, and an oblique phrasing.",
    "Do not widen the agent's scope; this is hardening, not new behavior.",
  ],
  schema: { variations: "string[]" },
  body: `Given this build plan, write three rephrasings of it for hardening.

PLAN:
{{input}}`,
});

// 6. Recompiler. The verified node list becomes a concise executable plan.
export const recompilerSpec = (): AgentSpec => ({
  name: "harness-recompiler",
  closure: tuning(1024),
  constraints: [
    "Describe the finished pipeline in plain prose.",
    "List the stages in order, one line each.",
    "End with the single command that runs the pipeline.",
    "Stay under twenty lines.",
  ],
  schema: "text",
  body: `Rewrite this build plan as a short executable plan for the compiled pipeline.

NODES:
{{input}}`,
});

export type { Schema };
