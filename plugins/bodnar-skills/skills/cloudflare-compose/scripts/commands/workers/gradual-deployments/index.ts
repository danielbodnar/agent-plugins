/**
 * workers / gradual-deployments
 *
 * Source page: Gradual deployments
 * Docs subpath: docs/workers/configuration/versions-and-deployments/gradual-deployments.mdx
 *
 * Minimum required Wrangler version: 3.40.0\. Versions before 3.73.0 require you to specify a `--x-versions` flag.
 *
 * Primary command:
 *   npm create cloudflare@latest -- <NAME> -- --type=hello-world
 *
 * Alternate runtimes:
 *   [pnpm] pnpm create cloudflare@latest <NAME> -- --type=hello-world
 *   [yarn] yarn create cloudflare <NAME> -- --type=hello-world
 *
 * Invoke via the dispatcher:
 *   ./scripts/cli workers gradual-deployments           # print
 *   ./scripts/cli workers gradual-deployments --run     # execute
 *   ./scripts/cli workers gradual-deployments --json    # metadata
 *   ./scripts/cli workers gradual-deployments --target-dir=my-project
 *
 * Auto-generated from https://developers.cloudflare.com/llms-full.txt.
 * Regenerate with: ./scripts/regenerate
 */

export const meta = {
  product: "workers",
  subcommand: "gradual-deployments",
  description: "Minimum required Wrangler version: 3.40.0\\. Versions before 3.73.0 require you to specify a `--x-versions` flag.",
  page_title: "Gradual deployments",
  template_id: null,
  target_dir: null,
  primary_runtime: "npm",
  primary_command: "npm create cloudflare@latest -- <NAME> -- --type=hello-world",
  alternates: [
    {
      "runtime": "pnpm",
      "command": "pnpm create cloudflare@latest <NAME> -- --type=hello-world"
    },
    {
      "runtime": "yarn",
      "command": "yarn create cloudflare <NAME> -- --type=hello-world"
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
