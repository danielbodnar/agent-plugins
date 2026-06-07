#!/usr/bin/env bun
/**
 * spec-runner.ts: Reads project-spec.json and executes its initialization steps.
 *
 * Zero dependencies. Uses only Bun builtins so it works before `bun install`.
 *
 * Usage:
 *   bun run scripts/spec-runner.ts                   Run all confirmed phase commands
 *   bun run scripts/spec-runner.ts --list            List phases, commands, package.json scripts
 *   bun run scripts/spec-runner.ts --dry-run         Preview commands without executing
 *   bun run scripts/spec-runner.ts --env             Write .env.example from environment.variables
 *   bun run scripts/spec-runner.ts --secrets         Print secret provisioning hints
 *   bun run scripts/spec-runner.ts --phase "Found"   Substring filter on phase names
 *   bun run scripts/spec-runner.ts --spec other.json Use a different spec file
 */

import { spawn } from "bun";

// --------------------------------------------------------------------------
// Types: kept minimal so this file stays self-contained.
// --------------------------------------------------------------------------

type Command = {
  command: string;
  description: string;
  workingDirectory?: string;
  condition?: string;
  idempotent?: boolean;
};

type Decision = {
  topic: string;
  choice: string;
  version?: string;
  rationale: string;
};

type Phase = {
  number: number;
  name: string;
  status: "pending" | "in-progress" | "confirmed" | "skipped";
  decisions: Decision[];
  commands?: Command[];
  openQuestions?: string[];
};

type EnvVar = {
  name: string;
  description: string;
  required?: boolean;
  default?: string;
  scope?: "development" | "staging" | "production" | "all";
};

type Secret = {
  name: string;
  description: string;
  provider:
    | "wrangler-secret"
    | "1password"
    | "env-file"
    | "github-secret"
    | "vault"
    | "manual";
  provisionCommand?: string;
  scope?: "development" | "staging" | "production" | "all";
};

type Script = {
  command: string;
  description: string;
  phase?: string;
};

type Spec = {
  specVersion: string;
  metadata: { name: string; description: string };
  phases?: Phase[];
  environment?: {
    variables?: EnvVar[];
    secrets?: Secret[];
  };
  scripts?: Record<string, Script>;
};

// --------------------------------------------------------------------------
// Arg parsing: simple and explicit, no dependency on a parser library.
// --------------------------------------------------------------------------

type Args = {
  spec: string;
  list: boolean;
  dryRun: boolean;
  env: boolean;
  secrets: boolean;
  phaseFilter: string | null;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    spec: "project-spec.json",
    list: false,
    dryRun: false,
    env: false,
    secrets: false,
    phaseFilter: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--list":
        args.list = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--env":
        args.env = true;
        break;
      case "--secrets":
        args.secrets = true;
        break;
      case "--phase":
        args.phaseFilter = argv[++i] ?? null;
        break;
      case "--spec":
        args.spec = argv[++i] ?? args.spec;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        console.error(`unknown arg: ${a}`);
        printHelp();
        process.exit(2);
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`spec-runner, execute project-spec.json initialization steps

Usage:
  bun run scripts/spec-runner.ts [options]

Options:
  --list              List confirmed phases, commands, and package.json scripts
  --dry-run           Print what would run without executing
  --env               Write .env.example from environment.variables
  --secrets           Print secret provisioning hints from environment.secrets
  --phase <name>      Substring filter on phase name (e.g. --phase "Found")
  --spec <path>       Use a different spec file (default: project-spec.json)
  --help, -h          Show this message`);
}

// --------------------------------------------------------------------------
// Spec loading: no ajv here. This is structural validation only.
// Use scripts/validate-spec.ts for full schema validation.
// --------------------------------------------------------------------------

async function loadSpec(path: string): Promise<Spec> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    console.error(`spec not found: ${path}`);
    process.exit(1);
  }
  try {
    return (await file.json()) as Spec;
  } catch (err) {
    console.error(`failed to parse ${path}: ${(err as Error).message}`);
    process.exit(1);
  }
  throw new Error("unreachable"); // for strict type flow without @types/node
}

function confirmedPhases(spec: Spec, filter: string | null): Phase[] {
  const all = (spec.phases ?? [])
    .filter((p) => p.status === "confirmed")
    .slice()
    .sort((a, b) => a.number - b.number);

  if (!filter) return all;
  const needle = filter.toLowerCase();
  return all.filter((p) => p.name.toLowerCase().includes(needle));
}

// --------------------------------------------------------------------------
// Command execution: sh -c via Bun.spawn, streams stdio, aborts on failure.
// --------------------------------------------------------------------------

async function runCommand(cmd: Command): Promise<number> {
  const cwd = cmd.workingDirectory ?? ".";
  const proc = spawn({
    cmd: ["sh", "-c", cmd.command],
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
  return await proc.exited;
}

// --------------------------------------------------------------------------
// Actions.
// --------------------------------------------------------------------------

function actionList(spec: Spec, phases: Phase[]): void {
  console.log(`${spec.metadata.name}, spec v${spec.specVersion}`);
  console.log();
  console.log(`Confirmed phases (${phases.length}):`);
  for (const p of phases) {
    console.log(`  ${p.number}. ${p.name}  [${p.status}]`);
    for (const c of p.commands ?? []) {
      const cwd = c.workingDirectory && c.workingDirectory !== "." ? ` (cwd: ${c.workingDirectory})` : "";
      console.log(`     $ ${c.command}${cwd}`);
      if (c.description) console.log(`       ${c.description}`);
    }
  }
  const scripts = Object.entries(spec.scripts ?? {});
  if (scripts.length > 0) {
    console.log();
    console.log(`Scripts (${scripts.length}):`);
    for (const [name, s] of scripts) {
      console.log(`  ${name.padEnd(16)} ${s.command}`);
      if (s.description) console.log(`  ${" ".repeat(16)} ${s.description}`);
    }
  }
}

function actionEnv(spec: Spec): void {
  const vars = spec.environment?.variables ?? [];
  if (vars.length === 0) {
    console.error("no environment.variables defined in spec");
    return;
  }
  const lines: string[] = [
    `# Generated by scripts/spec-runner.ts from ${spec.metadata.name}`,
    `# Do not edit by hand. Copy to .env and fill in values.`,
    ``,
  ];
  for (const v of vars) {
    lines.push(`# ${v.description}`);
    if (v.scope && v.scope !== "all") lines.push(`# scope: ${v.scope}`);
    if (v.required === false) lines.push(`# optional`);
    lines.push(`${v.name}=${v.default ?? ""}`);
    lines.push(``);
  }
  Bun.write(".env.example", lines.join("\n"));
  console.log(`wrote .env.example (${vars.length} variables)`);
}

function actionSecrets(spec: Spec): void {
  const secrets = spec.environment?.secrets ?? [];
  if (secrets.length === 0) {
    console.error("no environment.secrets defined in spec");
    return;
  }
  console.log(`Secret provisioning steps (${secrets.length}):`);
  for (const s of secrets) {
    console.log();
    console.log(`  ${s.name}  [${s.provider}${s.scope && s.scope !== "all" ? `, ${s.scope}` : ""}]`);
    console.log(`    ${s.description}`);
    if (s.provisionCommand) {
      console.log(`    $ ${s.provisionCommand}`);
    } else {
      console.log(`    (no provisionCommand specified, provision manually via ${s.provider})`);
    }
  }
}

async function actionRun(phases: Phase[], dryRun: boolean): Promise<void> {
  if (phases.length === 0) {
    console.error("no confirmed phases to run");
    return;
  }

  for (const p of phases) {
    const commands = p.commands ?? [];
    if (commands.length === 0) continue;

    console.log(`\n── Phase ${p.number}: ${p.name} ──`);
    for (const c of commands) {
      const cwd = c.workingDirectory && c.workingDirectory !== "." ? ` (cwd: ${c.workingDirectory})` : "";
      console.log(`$ ${c.command}${cwd}`);
      if (c.description) console.log(`  ${c.description}`);

      if (dryRun) continue;

      const code = await runCommand(c);
      if (code !== 0) {
        const tag = c.idempotent === false ? "non-idempotent command" : "command";
        console.error(`\n${tag} failed with exit code ${code}: ${c.command}`);
        process.exit(code);
      }
    }
  }

  console.log(`\ndone. ${dryRun ? "(dry-run, nothing executed)" : `${phases.length} phase(s) completed`}`);
}

// --------------------------------------------------------------------------
// Entry.
// --------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const spec = await loadSpec(args.spec);
  const phases = confirmedPhases(spec, args.phaseFilter);

  if (args.list) return actionList(spec, phases);
  if (args.env) return actionEnv(spec);
  if (args.secrets) return actionSecrets(spec);

  await actionRun(phases, args.dryRun);
}

await main();
