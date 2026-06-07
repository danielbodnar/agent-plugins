// core.ts — the harness combinator kernel.
//
// An agent is a Kleisli arrow: text in, validated value out, failure as a
// value. Composition is built around that one shape. The kernel is pure: the
// single effect, asking a model for a completion, is injected as an Executor,
// so the entire kernel runs offline against a fake executor. The kernel names
// no provider and imports no adapter.

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (error: string): Result<never> => ({ ok: false, error });

// An agent: text in, validated value out. Always string input so stages chain
// uniformly; structured values are serialized between stages by `asInput`.
export type Agent<B> = (input: string) => Promise<Result<B>>;

// The captured environment of an agent: the model name, sampling settings,
// domain constants. Opaque to the kernel; meaningful only to an adapter.
export type Closure = Record<string, unknown>;

// The one effect in the system. A rendered instruction plus the closure go in,
// completion text comes out. Every provider is an executor; so is the fake.
export type Executor = (rendered: string, closure: Closure) => Promise<string>;

// A schema is free text, or a flat record of field name to type tag. Flat on
// purpose: the budget a model can fill is exactly the shape it is shown.
export type Schema =
  | "text"
  | Record<string, "string" | "number" | "boolean" | "string[]">;

export type AgentSpec = {
  name: string;
  closure: Closure;
  constraints: string[];
  body: string; // task text; may contain the {{input}} placeholder
  schema: Schema;
};

// --- rendering and validation -------------------------------------------------

const schemaHint = (s: Schema): string =>
  s === "text"
    ? "Respond with the result only. No preamble, no fences, no commentary."
    : `Respond with one JSON object and nothing else, with exactly these keys: ${Object.entries(
        s,
      )
        .map(([k, t]) => `${k} (${t})`)
        .join(", ")}.`;

// Build the instruction sent to the executor: constraints, task, then budget.
export const render = (spec: AgentSpec, input: string): string => {
  const task = spec.body.includes("{{input}}")
    ? spec.body.replaceAll("{{input}}", input)
    : `${spec.body}\n\nINPUT:\n${input}`;
  const rules = spec.constraints.length
    ? `Constraints:\n${spec.constraints.map((c) => `- ${c}`).join("\n")}\n\n`
    : "";
  return `${rules}${task}\n\n${schemaHint(spec.schema)}`;
};

export const stripFences = (text: string): string => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
};

// Check raw completion text against the schema. Returns the parsed value or a
// reason. This is the contract at every seam; composition exists because of it.
export const validate = (schema: Schema, raw: string): Result<unknown> => {
  const text = raw.trim();
  if (schema === "text")
    return text.length ? ok(text) : err("empty text output");
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    return err("output was not valid JSON");
  }
  for (const [key, tag] of Object.entries(schema)) {
    const v = parsed[key];
    const fits =
      tag === "string[]"
        ? Array.isArray(v)
        : tag === "number"
          ? typeof v === "number"
          : tag === "boolean"
            ? typeof v === "boolean"
            : typeof v === "string";
    if (!fits) return err(`field "${key}" is missing or not ${tag}`);
  }
  return ok(parsed);
};

// Serialize any stage output back into the string input the next stage expects.
export const asInput = (v: unknown): string =>
  typeof v === "string" ? v : JSON.stringify(v, null, 2);

// --- building agents ----------------------------------------------------------

// Turn a spec plus an executor into an agent. The executor is captured in the
// closure, so the agent is a self-contained unit you can pass around freely.
export const compile = (spec: AgentSpec, exec: Executor): Agent<unknown> => {
  return async (input) => {
    const raw = await exec(render(spec, input), spec.closure);
    return validate(spec.schema, raw);
  };
};

// An agent file is plain markdown: an optional `# name` heading, one ```json
// metadata block, then the task body. Plain text keeps agents greppable,
// diffable, and editable by hand. This is the rule of transparency in practice.
export const parseAgentFile = (text: string, fallback: string): AgentSpec => {
  const fence = text.match(/```json\s*([\s\S]*?)```/);
  const meta = fence ? JSON.parse(fence[1]) : {};
  const body = (
    fence ? text.slice(text.indexOf(fence[0]) + fence[0].length) : text
  ).trim();
  const heading = text.match(/^#\s+(.+)$/m);
  return {
    name: meta.name ?? heading?.[1]?.trim() ?? fallback,
    closure: meta.closure ?? {},
    constraints: meta.constraints ?? [],
    schema: meta.schema ?? "text",
    body,
  };
};

export const fromFile = async (
  path: string,
  exec: Executor,
): Promise<Agent<unknown>> => {
  const text = await Bun.file(path).text();
  const name = (path.split("/").pop() ?? path).replace(/\.md$/, "");
  return compile(parseAgentFile(text, name), exec);
};

// --- combinators --------------------------------------------------------------

// Kleisli composition, left to right. Short-circuits on the first failure, so
// errors carry their origin instead of cascading into noise.
export const pipe =
  (...stages: Agent<unknown>[]): Agent<unknown> =>
  async (input) => {
    let acc: Result<unknown> = ok(input);
    for (const stage of stages) {
      if (!acc.ok) return acc;
      acc = await stage(asInput(acc.value));
    }
    return acc;
  };

// The map combinator: run one agent over every element of a JSON array.
export const fanout =
  (stage: Agent<unknown>): Agent<unknown[]> =>
  async (input) => {
    let items: unknown[];
    try {
      const v = JSON.parse(input);
      items = Array.isArray(v) ? v : [v];
    } catch {
      items = [input];
    }
    const results = await Promise.all(items.map((i) => stage(asInput(i))));
    const failed = results.find((r) => !r.ok);
    if (failed && !failed.ok) return failed;
    return ok(results.map((r) => (r.ok ? r.value : null)));
  };

// Sum-type dispatch: pick a branch by key, run only that branch.
export const route =
  (
    pick: (input: string) => string,
    table: Record<string, Agent<unknown>>,
  ): Agent<unknown> =>
  async (input) => {
    const branch = table[pick(input)];
    return branch ? branch(input) : err(`route: no branch for that input`);
  };

// Alternative: try the primary, fall through to the fallback on any failure.
export const orElse =
  (primary: Agent<unknown>, fallback: Agent<unknown>): Agent<unknown> =>
  async (input) => {
    const r = await primary(input);
    return r.ok ? r : fallback(input);
  };

// Re-sample the same stage until it yields a schema-valid result or runs out.
export const retry =
  (stage: Agent<unknown>, times = 3): Agent<unknown> =>
  async (input) => {
    let last: Result<unknown> = err("retry: zero attempts");
    for (let i = 0; i < times; i++) {
      last = await stage(input);
      if (last.ok) return last;
    }
    return last;
  };

// The per-node feedback loop. Run `turn` on a state, check `done`, and if the
// state is not done feed it back into `turn`, up to a fuel limit. This is the
// loop that is harness mode: `turn` regenerates and evaluates a node, `done`
// reports when the node is satisfied. Improvement happens by regeneration with
// feedback, so there is no separate improver and no shrink stage; a simpler
// agent is just what the next turn produces after a complexity finding.
export const loopUntil = <S>(
  turn: (state: S) => Promise<S>,
  done: (state: S) => boolean,
  fuel = 6,
): ((state: S) => Promise<S>) => {
  const go = async (state: S, left: number): Promise<S> => {
    if (left <= 0 || done(state)) return state;
    return go(await turn(state), left - 1);
  };
  return (state) => go(state, fuel);
};

// Content-addressed memo, persisted to a JSON file. Equal input, equal output,
// zero extra calls. This is what makes a harness run cheap to repeat.
export const cached =
  (stage: Agent<unknown>, store: string): Agent<unknown> =>
  async (input) => {
    const key = Bun.hash(input).toString(16);
    const file = Bun.file(store);
    const cache: Record<string, unknown> = (await file.exists())
      ? await file.json()
      : {};
    if (key in cache) return ok(cache[key]);
    const r = await stage(input);
    if (r.ok) {
      cache[key] = r.value;
      await Bun.write(store, JSON.stringify(cache, null, 2));
    }
    return r;
  };
