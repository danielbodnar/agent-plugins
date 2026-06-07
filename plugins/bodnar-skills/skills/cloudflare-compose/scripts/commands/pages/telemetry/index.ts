/**
 * pages / telemetry
 *
 * Source page: C3 CLI
 * Docs subpath: docs/pages/get-started/c3.mdx
 * Default target dir: telemetry
 *
 * All the boolean options above can be specified with or without a value, for example `--open` and `--open true` have the same effect, prefixing `no-` to the option's name negates it, so for example `--no-open` and `--open false` have the same effect.
 *
 * Primary command:
 *   npm create cloudflare@latest -- telemetry disable
 *
 * Alternate runtimes:
 *   [npm] npm create cloudflare@latest -- telemetry status
 *   [npm] npm create cloudflare@latest -- telemetry enable
 *   [pnpm] pnpm create cloudflare@latest telemetry disable
 *   [pnpm] pnpm create cloudflare@latest telemetry status
 *   [pnpm] pnpm create cloudflare@latest telemetry enable
 *   [yarn] yarn create cloudflare telemetry disable
 *   [yarn] yarn create cloudflare telemetry status
 *   [yarn] yarn create cloudflare telemetry enable
 *
 * Invoke via the dispatcher:
 *   ./scripts/cli pages telemetry           # print
 *   ./scripts/cli pages telemetry --run     # execute
 *   ./scripts/cli pages telemetry --json    # metadata
 *   ./scripts/cli pages telemetry --target-dir=my-project
 *
 * Auto-generated from https://developers.cloudflare.com/llms-full.txt.
 * Regenerate with: ./scripts/regenerate
 */

export const meta = {
  product: "pages",
  subcommand: "telemetry",
  description: "All the boolean options above can be specified with or without a value, for example `--open` and `--open true` have the same effect, prefixing `no-` to the option's name negates it, so for example `--no-open` and `--open false` have the same effect.",
  page_title: "C3 CLI",
  template_id: null,
  target_dir: "telemetry",
  primary_runtime: "npm",
  primary_command: "npm create cloudflare@latest -- telemetry disable",
  alternates: [
    {
      "runtime": "npm",
      "command": "npm create cloudflare@latest -- telemetry status"
    },
    {
      "runtime": "npm",
      "command": "npm create cloudflare@latest -- telemetry enable"
    },
    {
      "runtime": "pnpm",
      "command": "pnpm create cloudflare@latest telemetry disable"
    },
    {
      "runtime": "pnpm",
      "command": "pnpm create cloudflare@latest telemetry status"
    },
    {
      "runtime": "pnpm",
      "command": "pnpm create cloudflare@latest telemetry enable"
    },
    {
      "runtime": "yarn",
      "command": "yarn create cloudflare telemetry disable"
    },
    {
      "runtime": "yarn",
      "command": "yarn create cloudflare telemetry status"
    },
    {
      "runtime": "yarn",
      "command": "yarn create cloudflare telemetry enable"
    }
  ],
} as const;

type RunOptions = {
  run?: boolean;           // actually execute the command
  pm?: "npm" | "pnpm" | "yarn" | "bun"; // package manager to use
  json?: boolean;          // emit meta as JSON
  targetDir?: string;      // override target directory
};

export default async function handler(opts: RunOptions = {}): Promise<void> {
  if (opts.json) {
    console.log(JSON.stringify(meta, null, 2));
    return;
  }

  const command = resolveCommand(opts.pm ?? meta.primary_runtime, opts.targetDir);

  if (!opts.run) {
    console.log(`# ${meta.product} / ${meta.subcommand}`);
    if (meta.page_title && meta.page_title !== meta.description) {
      console.log(`# ${meta.page_title}`);
    }
    if (meta.description) console.log(`# ${meta.description}`);
    console.log("");
    console.log(command);
    if (meta.alternates.length > 0) {
      console.log("");
      console.log("# Alternate runtimes:");
      for (const alt of meta.alternates) console.log(`#   ${alt.command}`);
    }
    return;
  }

  console.error(`Running: ${command}`);
  // Bun's native `$` shell runs the command string as a real shell pipeline,
  // inheriting stdio. Equivalent to spawnSync but without the split-and-spawn
  // dance for commands that contain quoted args or redirections.
  const { $ } = await import("bun");
  const proc = await $`sh -c ${command}`.nothrow();
  if (proc.exitCode !== 0) process.exit(proc.exitCode);
}

function resolveCommand(pm: string, override?: string): string {
  const match = meta.alternates.find((a) => a.runtime === pm);
  let cmd = pm === meta.primary_runtime ? meta.primary_command : match?.command ?? meta.primary_command;
  if (!override) return cmd;
  if (meta.target_dir) {
    // Canonical command has a target dir; substitute in place.
    return cmd.split(meta.target_dir).join(override);
  }
  // No target dir in canonical command. Insert one. The shape is:
  //   npm  create cloudflare@latest [target] -- --template X
  //   pnpm create cloudflare@latest [target] --template X
  //   yarn create cloudflare         [target] --template X
  //   npx  create-cloudflare@latest  [target] --template X
  //   bun  create cloudflare@latest  [target] --template X
  const patterns: [RegExp, (target: string) => string][] = [
    [/^(npm\s+create\s+cloudflare@latest)(\s+--\s+)/, (t) => `$1 ${t}$2`],
    [/^(npm\s+create\s+cloudflare@latest)(\s+)/, (t) => `$1 ${t}$2`],
    [/^(pnpm\s+create\s+cloudflare@latest)(\s+)/, (t) => `$1 ${t}$2`],
    [/^(yarn\s+create\s+cloudflare)(\s+)/, (t) => `$1 ${t}$2`],
    [/^(npx\s+create-cloudflare@latest)(\s+)/, (t) => `$1 ${t}$2`],
    [/^(bun\s+create\s+cloudflare@latest)(\s+)/, (t) => `$1 ${t}$2`],
  ];
  for (const [pat, replacer] of patterns) {
    if (pat.test(cmd)) return cmd.replace(pat, replacer(override));
  }
  return cmd;
}
