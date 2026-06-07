// harness — harness mode.
//
// Input: a build plan in prose. Output: a directory holding a verified agent
// pipeline and the one command that runs it. Drafts and rejected attempts stay
// in memory and are discarded. What remains is small, plain, and self-contained.
//
//   harness <plan-file> [out-dir]      out-dir defaults to .claude/harness
//
// Harness mode is one recursive feedback loop per node: generate, an inner
// deterministic tier, an outer model-backed judge tier, then learn and retry.
// A finding triaged to re-plan routes back to the planner. After the loop
// settles, a chaos stage hardens the agent. The executor is injected, never
// imported, so any provider or the fake backs the same harness. Selection
// happens here, at the edge, by configuration.

import {
  compile,
  loopUntil,
  type AgentSpec,
  type Executor,
  type Schema,
} from "./core.ts";
import { fakeAdapter } from "../adapters/fake.ts";
import { httpJsonAdapter } from "../adapters/http-json.ts";
import * as S from "./stages.ts";

const RETRIES = Number(process.env.HARNESS_RETRIES ?? 5);

const log = (msg: string) => process.stdout.write(`harness: ${msg}\n`);
const fail = (msg: string): never => {
  process.stderr.write(`harness: ${msg}\n`);
  process.exit(1);
};

const [planFile, outArg] = process.argv.slice(2);
if (!planFile || planFile === "--help") {
  process.stdout.write("usage: harness <plan-file> [out-dir]\n");
  process.exit(planFile ? 0 : 1);
}

// --- select the executor at the edge, by configuration ----------------------
//
// HARNESS_ADAPTER picks the adapter. http-json reads its endpoint, headers, and
// credentials from the agent closures and the environment. The fake adapter
// needs a reply module and is mainly for offline runs. The harness below never
// refers to either by name again.
const adapterName = process.env.HARNESS_ADAPTER ?? "http-json";
let exec: Executor;
if (adapterName === "http-json") {
  exec = httpJsonAdapter;
} else if (adapterName === "fake") {
  exec = fakeAdapter((rendered) => rendered);
} else {
  fail(`unknown HARNESS_ADAPTER: ${adapterName}`);
}

const outDir = outArg ?? ".claude/harness";
const planText = await Bun.file(planFile)
  .text()
  .catch(() => fail("cannot read plan"));

// the default closure merged into every agent: the adapter reads these
const baseClosure = {
  endpoint: process.env.HARNESS_ENDPOINT,
  model: process.env.HARNESS_MODEL,
  headers: process.env.HARNESS_HEADERS
    ? JSON.parse(process.env.HARNESS_HEADERS)
    : {},
};
const withBase = (spec: AgentSpec): AgentSpec => ({
  ...spec,
  closure: { ...baseClosure, ...spec.closure },
});

const unwrap = <T>(
  r: { ok: boolean; value?: unknown; error?: string },
  where: string,
): T => {
  if (!r.ok) fail(`${where}: ${r.error}`);
  return r.value as T;
};

// --- the planner: decompose, with re-plan support ----------------------------

type Node = {
  name: string;
  task: string;
  constraints: string[];
  schema: Schema;
};

const runPlanner = async (input: string) => {
  const planner = compile(withBase(S.plannerSpec()), exec);
  const out = unwrap<string>(await planner(input), "planner");
  try {
    return JSON.parse(out.replace(/```json|```/g, "").trim()) as {
      nodes: Node[];
      sample: string;
    };
  } catch {
    return fail("planner did not return usable JSON");
  }
};

let plan = await runPlanner(planText);
log(`planned ${plan.nodes.length} node(s)`);

// --- the per-node loop -------------------------------------------------------
//
// One turn: generate a candidate, run the inner deterministic gate, and only if
// the gate is green run the outer judge bank. Findings are collected and the
// turn returns the next state. loopUntil drives turns until the node is
// satisfied (no new findings) or fuel runs out.

const JUDGES = ["complexity", "clarity", "performance", "security"];

type NodeState = {
  node: Node;
  attempt: number;
  findings: string[];
  satisfied: boolean;
  body: string;
  replan: boolean;
};

const trialSpec = (node: Node, body: string): AgentSpec =>
  withBase({
    name: node.name,
    closure: {},
    constraints: node.constraints,
    body,
    schema: node.schema,
  });

// inner tier: deterministic checks, no model. A real harness runs a build, a
// test runner, and a linter here. This one checks structural invariants that
// hold without a provider, so the gate runs offline.
const innerGate = (body: string): { green: boolean; finding?: string } => {
  if (body.includes("\u2014"))
    return { green: false, finding: "lint: body contains an em-dash" };
  if (!body.includes("{{input}}"))
    return { green: false, finding: "rule: body is missing the {{input}} placeholder" };
  if (body.trim().length === 0)
    return { green: false, finding: "build: body is empty" };
  return { green: true };
};

const buildNode = async (node: Node, sample: string): Promise<NodeState> => {
  const turn = async (state: NodeState): Promise<NodeState> => {
    // generate, folding every prior finding into the request
    const genInput = JSON.stringify({ node, findings: state.findings });
    const gen = await compile(withBase(S.generatorSpec()), exec)(genInput);
    if (!gen.ok)
      return { ...state, attempt: state.attempt + 1, findings: [...state.findings, gen.error] };
    const body = gen.value as string;

    // inner tier: deterministic gate, no tokens
    const gate = innerGate(body);
    if (!gate.green)
      return {
        node,
        attempt: state.attempt + 1,
        findings: [...state.findings, gate.finding!],
        satisfied: false,
        body,
        replan: false,
      };

    // outer tier: judge bank, runs only past a green gate
    const candidate = await compile(trialSpec(node, body), exec)(sample);
    const newFindings: string[] = [];
    let replan = false;
    if (!candidate.ok) {
      newFindings.push(`run: ${candidate.error}`);
    } else {
      for (const concern of JUDGES) {
        const judge = await compile(withBase(S.judgeSpec(concern)), exec)(body);
        if (judge.ok) {
          const fs = (judge.value as { findings: string[] }).findings ?? [];
          for (const f of fs) {
            newFindings.push(`${concern}: ${f}`);
            if (/mis-specified|decomposi/i.test(f)) replan = true;
          }
        }
      }
    }

    // learn and remember: the durable findings list feeds the next turn
    return {
      node,
      attempt: state.attempt + 1,
      findings: [...state.findings, ...newFindings],
      satisfied: newFindings.length === 0,
      body,
      replan,
    };
  };

  const settled = await loopUntil<NodeState>(
    turn,
    (s) => s.satisfied || s.replan,
    RETRIES,
  )({ node, attempt: 0, findings: [], satisfied: false, body: "", replan: false });

  log(
    `node ${node.name}: ${settled.satisfied ? "satisfied" : settled.replan ? "needs re-plan" : "out of retries"} after attempt ${settled.attempt}`,
  );
  return settled;
};

// --- run every node, re-planning once if a finding asks for it ---------------

let states: NodeState[] = [];
let sample = plan.sample;
for (const node of plan.nodes) {
  const state = await buildNode(node, sample);
  states.push(state);
  sample = state.body;
}

if (states.some((s) => s.replan)) {
  log("a finding asked for a re-plan; re-running the planner once");
  const findings = states.flatMap((s) => s.findings);
  plan = await runPlanner(`${planText}\n\nPRIOR FINDINGS:\n${findings.join("\n")}`);
  states = [];
  sample = plan.sample;
  for (const node of plan.nodes) {
    const state = await buildNode(node, sample);
    states.push(state);
    sample = state.body;
  }
}

// --- chaos refinement: harden against prompt variations ----------------------

const chaos = await compile(withBase(S.chaosSpec()), exec)(planText);
const variations = chaos.ok
  ? (chaos.value as { variations: string[] }).variations ?? []
  : [];
log(`chaos refinement: ${variations.length} prompt variation(s) recorded`);

// --- emit the verified pipeline ----------------------------------------------

const pipeline: string[] = [];
for (const [i, state] of states.entries()) {
  const slug = `${String(i).padStart(2, "0")}-${state.node.name}`;
  const meta = {
    name: state.node.name,
    closure: {},
    constraints: state.node.constraints,
    schema: state.node.schema,
  };
  await Bun.write(
    `${outDir}/agents/${slug}.md`,
    `# ${state.node.name}\n\n\`\`\`json\n${JSON.stringify(meta, null, 2)}\n\`\`\`\n\n${state.body}\n`,
  );
  pipeline.push(slug);
}

const recompiler = compile(withBase(S.recompilerSpec()), exec);
const summary = states.map((s) => `${s.node.name}: ${s.node.task}`).join("\n");
const executablePlan = unwrap<string>(await recompiler(summary), "recompiler");

await Bun.write(
  `${outDir}/pipeline.json`,
  JSON.stringify({ pipeline }, null, 2) + "\n",
);
await Bun.write(`${outDir}/PLAN.md`, executablePlan + "\n");
await Bun.write(
  `${outDir}/.findings.json`,
  JSON.stringify(
    {
      hardenedAgainst: variations,
      findings: Object.fromEntries(states.map((s) => [s.node.name, s.findings])),
      builtAt: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);

// vendor the kernel and adapters so the output directory stands alone
// vendor the kernel and adapters so the output directory stands alone.
// import.meta.dir is the lib/ directory holding this implementation.
const vendor: Array<[string, string]> = [
  ["core.ts", "lib/core.ts"],
  ["../adapters/fake.ts", "adapters/fake.ts"],
  ["../adapters/http-json.ts", "adapters/http-json.ts"],
];
for (const [src, dest] of vendor) {
  await Bun.write(
    `${outDir}/${dest}`,
    await Bun.file(`${import.meta.dir}/${src}`).text(),
  );
}
await Bun.write(
  `${outDir}/run`,
  `#!/usr/bin/env bun
// run — execute the compiled pipeline. stdin -> stdout.
// The executor is selected here, at the edge, by configuration. The pipeline
// agents below never name a provider.
import { fromFile, pipe, asInput } from "./core.ts";
import { fakeAdapter } from "../adapters/fake.ts";
import { httpJsonAdapter } from "../adapters/http-json.ts";

const exec =
  (process.env.HARNESS_ADAPTER ?? "http-json") === "fake"
    ? fakeAdapter((r) => r)
    : httpJsonAdapter;

const { pipeline } = await Bun.file(\`\${import.meta.dir}/pipeline.json\`).json();
const stages = await Promise.all(
  pipeline.map((n: string) =>
    fromFile(\`\${import.meta.dir}/agents/\${n}.md\`, exec)),
);
const result = await pipe(...stages)(await Bun.stdin.text());
if (result.ok) process.stdout.write(asInput(result.value) + "\\n");
else {
  process.stderr.write(\`pipeline: \${result.error}\\n\`);
  process.exit(1);
}
`,
);
await Bun.$`chmod +x ${outDir}/run`.quiet();

log(`done. pipeline written to ${outDir}`);
log(`run it with: echo "<input>" | ${outDir}/run`);
