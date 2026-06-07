# Hands-on Exercise Patterns (WebContainer-safe)

Read this before designing lessons. Every pattern here respects the core
constraint: **the WebContainer runs Node, not AI agents.** The hands-on loop is
always *author an artifact → run a Node validator → read pass/fail*. No model
calls, no API keys, no `claude` CLI.

For each pattern: what the learner does, what goes in `_files/` vs `_solution/`,
and how the validator grades it. Adapt the validator from
`../assets/templates/skill-validator.mjs`.

---

## Pattern A — Author & validate a `SKILL.md`

**Concept:** anatomy of an Agent Skill; name + description as the trigger surface.

- `_files/`: `SKILL.md` with a missing or weak field (e.g. no `description`, or a
  description that doesn't say *when* to use it); plus `validate.mjs`.
- `_solution/`: the corrected `SKILL.md`; identical `validate.mjs`.
- **Validator grades:** frontmatter present; `name` is kebab-case ≤ 64 chars;
  `description` present, ≤ 1024 chars, and mentions when to trigger; body
  non-empty. (This is exactly what the bundled `skill-validator.mjs` checks.)

## Pattern B — Build a skill folder structure

**Concept:** progressive disclosure — `SKILL.md` + `references/` + `scripts/` +
`assets/`.

- `_files/`: a flat `SKILL.md` that inlines everything; an empty `references/`.
- `_solution/`: `SKILL.md` slimmed down with pointers, detail moved into
  `references/<topic>.md`.
- **Validator grades:** `SKILL.md` line count under a threshold; `references/`
  contains ≥ 1 `.md`; `SKILL.md` actually references the file it points to
  (string match on the filename). Teaches that pointers must resolve.

## Pattern C — Mock skill loader / registry

**Concept:** how a host discovers and lists skills from descriptions.

- `_files/`: a `skills/` dir with 2–3 `SKILL.md` files; a stub `load-skills.mjs`
  that should walk the dir and print a registry, but is incomplete.
- `_solution/`: completed `load-skills.mjs` that reads each frontmatter and prints
  `name → description`.
- **Validator grades:** run `load-skills.mjs`, assert its stdout lists every
  skill name. (The validator can `import` or `execSync` the learner's script and
  check output.) Teaches the discovery mechanism concretely.

## Pattern D — Agent prompt / system prompt rubric

**Concept:** what makes an effective agent definition (role, tools, constraints,
output format).

- `_files/`: an `agent.md` prompt missing structure (no explicit tools list, no
  stop conditions).
- `_solution/`: a well-structured agent definition.
- **Validator grades:** presence of required sections via heading/keyword match
  (e.g. contains a tools section, an explicit success/stop criterion, an output
  format). Keep checks structural, not subjective — the rubric is the teaching.

## Pattern E — MCP server config authoring

**Concept:** wiring tools to an agent via an MCP config.

- `_files/`: a `.mcp.json` with a syntax error or a missing required field
  (`command`, `args`).
- `_solution/`: valid JSON config.
- **Validator grades:** `JSON.parse` succeeds; each server entry has `command`
  and an `args` array. Teaches the config contract and that malformed config
  fails fast.

## Pattern F — Description-triggering intuition

**Concept:** why description wording drives whether a skill fires.

- `_files/`: a `SKILL.md` with a vague description plus a `cases.json` of example
  user queries labeled should/shouldn't trigger; a `score.mjs` that keyword-
  matches the description against the queries.
- `_solution/`: a sharper description that scores better.
- **Validator grades:** run `score.mjs`; assert the trigger score crosses a
  threshold. A deterministic keyword scorer (not a model) keeps it WebContainer-
  safe while still teaching the real lesson: be specific about *when*.

---

## Designing a good `_files` → `_solution` gap

- The gap should be **one clear idea per lesson** — a single field, a single
  function, a single structural move. Multiple unrelated edits muddy the diff.
- Put the *answer* only in `_solution/`. The `_files/` stub should compile/run
  enough to produce a *failing* validator result, so the learner sees red → green.
- Keep `validate.mjs` identical in `_files/` and `_solution/` — it's the fixed
  grader, not part of the puzzle.
- After generating both, **diff them** and use the changed lines for the
  `ins={…}` markers in `content.md`.

## Run-command conventions for these lessons

- Root `meta.md`: `mainCommand: ['node validate.mjs', 'Validating']` and no
  `prepareCommands` if the validator has zero dependencies (it should).
- Set `previews: false` at the root — there is no web server to preview; the
  terminal output is the feedback surface.
- If a lesson runs a different entry script (e.g. `load-skills.mjs`), override
  `mainCommand` on that lesson only.
