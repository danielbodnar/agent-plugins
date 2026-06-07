#!/usr/bin/env bun
/**
 * validate-spec.ts: Validate project-spec.json against the ProjectSpec schema.
 *
 * Thin wrapper around `bunx ajv-cli@latest validate`. Uses `bunx` so no install
 * step is required. Provides nicer defaults and output than raw ajv-cli.
 *
 * Usage:
 *   bun run scripts/validate-spec.ts
 *   bun run scripts/validate-spec.ts --spec project-spec.json --schema references/project-spec.schema.json
 *
 * Exit codes:
 *   0: spec is valid
 *   1: spec is invalid, or a file is missing
 *   2: argument error
 */

import { spawn } from "bun";

type Args = {
  spec: string;
  schema: string;
  strict: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    spec: "project-spec.json",
    schema: "references/project-spec.schema.json",
    strict: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--spec":
        args.spec = argv[++i] ?? args.spec;
        break;
      case "--schema":
        args.schema = argv[++i] ?? args.schema;
        break;
      case "--strict":
        args.strict = true;
        break;
      case "--help":
      case "-h":
        console.log(`validate-spec, validate project-spec.json against ProjectSpec schema

Usage:
  bun run scripts/validate-spec.ts [options]

Options:
  --spec <path>      Path to the spec (default: project-spec.json)
  --schema <path>    Path to the schema (default: references/project-spec.schema.json)
  --strict           Enable ajv strict mode (stricter keyword and format checking)
  --help, -h         Show this message`);
        process.exit(0);
      default:
        console.error(`unknown arg: ${a}`);
        process.exit(2);
    }
  }
  return args;
}

async function fileExists(path: string): Promise<boolean> {
  return await Bun.file(path).exists();
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!(await fileExists(args.spec))) {
    console.error(`spec not found: ${args.spec}`);
    process.exit(1);
  }
  if (!(await fileExists(args.schema))) {
    console.error(`schema not found: ${args.schema}`);
    console.error(`(expected at ${args.schema}, pass --schema if it's elsewhere)`);
    process.exit(1);
  }

  const cmd = [
    "bunx",
    "ajv-cli@latest",
    "validate",
    "--spec=draft2020",
    "-s",
    args.schema,
    "-d",
    args.spec,
    ...(args.strict ? ["--strict=true"] : ["--strict=false"]),
  ];

  const proc = spawn({
    cmd,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;

  if (code === 0) {
    console.log(`✓ ${args.spec} is valid against ${args.schema}`);
  } else {
    console.error(`\n✗ validation failed (exit code ${code})`);
  }
  process.exit(code);
}

await main();
