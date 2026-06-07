#!/usr/bin/env bun
/**
 * Read `commands.json` and generate the filesystem command hierarchy:
 *
 *   scripts/commands/<product>/<subcommand>/index.ts
 *
 * One file per leaf. The top-of-file JSDoc carries what would otherwise be a
 * sidecar README; the `meta` export carries what would otherwise be a
 * sidecar JSON. The `./scripts/cli` dispatcher walks this tree at runtime,
 * exposing structured meta via `--json` when needed.
 *
 * Entries sharing the same (product, template_id || target_dir) are
 * collapsed: the `npm` variant is preferred as the primary command, and
 * `pnpm`/`yarn`/`bun` alternates are kept in meta.
 *
 * Invoked indirectly by `./scripts/regenerate`. You can also run this
 * directly if `.cache/commands.json` is already present:
 *
 *   ./scripts/_internal_generate_commands.ts .cache/commands.json scripts/commands
 */

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";

type RawEntry = {
  id: string;
  product: string;
  subpath: string;
  page_title: string;
  command_runtime: "npm" | "pnpm" | "yarn" | "bun" | "npx";
  command: string;
  template_id: string | null;
  target_dir: string | null;
  source_line: number;
  context_before: string;
  description: string;
};

type GroupedEntry = {
  product: string;
  subcommand: string;
  page_title: string;
  description: string;
  template_id: string | null;
  target_dir: string | null;
  primary_command: string;
  primary_runtime: string;
  alternates: { runtime: string; command: string }[];
  source_page: string;
  source_subpath: string;
};

const INPUT_JSON = process.argv[2] ?? "./commands.json";
const COMMANDS_DIR = process.argv[3] ?? "./cloudflare-compose/scripts/commands";

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

function groupKey(e: RawEntry): string {
  // Collapse identical logical commands across runtimes.
  const keyPart = e.template_id ?? e.target_dir ?? slug(e.page_title);
  return `${e.product}::${keyPart}`;
}

function subcommandName(e: RawEntry): string {
  // Prefer template_id tail, then target_dir, then a title slug.
  if (e.template_id) {
    const tail = e.template_id.replace(/^cloudflare\//, "").replace(/\//g, "-");
    return slug(tail);
  }
  if (e.target_dir) return slug(e.target_dir);
  return slug(e.page_title);
}

function preferredRuntimeOrder(runtime: string): number {
  // npm first (authoritative in most CF docs), then pnpm, yarn, bun, npx.
  return { npm: 0, pnpm: 1, yarn: 2, bun: 3, npx: 4 }[runtime] ?? 99;
}

function pickDescription(entries: RawEntry[]): string {
  // Find the best single-line description across the group. Prefer a line
  // that looks like real prose: long enough to carry meaning, short enough
  // to fit on one line, and free of the tutorial-Prerequisites boilerplate
  // that appears before almost every `npm create` invocation in the docs.
  const boilerplatePatterns: RegExp[] = [
    /node version manager/i,
    /\bvolta\b/i,
    /\bnvm\b/i,
    /permission issues/i,
    /getting-started/i,
    /\bnpm\b.*\binstall\b/i,
    /install.*\bnode\.js\b/i,
    /prerequisites/i,
    /\bwrangler\b.*\brequires\b/i,
  ];
  const candidates = entries.flatMap((e) =>
    e.context_before
      .split("\n")
      .map((l) => l.trim())
      .filter(
        (l) =>
          l.length >= 60 &&
          l.length <= 400 &&
          !l.startsWith("#") &&
          !l.startsWith("|") &&
          !l.startsWith("```") &&
          !l.startsWith("-") &&
          !l.startsWith("*") &&
          !l.startsWith(">") &&
          !/create\s+cloudflare/i.test(l) &&
          !/create-cloudflare/i.test(l) &&
          !/^\d+\./.test(l) &&
          !boilerplatePatterns.some((p) => p.test(l)),
      ),
  );
  return candidates[0] ?? "";
}

function group(raws: RawEntry[]): GroupedEntry[] {
  const buckets = new Map<string, RawEntry[]>();
  for (const e of raws) {
    const k = groupKey(e);
    const arr = buckets.get(k) ?? [];
    arr.push(e);
    buckets.set(k, arr);
  }

  const grouped: GroupedEntry[] = [];
  for (const [, bucket] of buckets) {
    bucket.sort(
      (a, b) => preferredRuntimeOrder(a.command_runtime) - preferredRuntimeOrder(b.command_runtime),
    );
    const head = bucket[0];
    // Pick the canonical page title: most frequent across the bucket wins,
    // ties broken by shorter title (more likely to be an index page).
    const titleCounts = new Map<string, number>();
    for (const e of bucket) titleCounts.set(e.page_title, (titleCounts.get(e.page_title) ?? 0) + 1);
    const canonicalTitle = [...titleCounts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].length - b[0].length,
    )[0][0];
    // Deduplicate alternates: one per (runtime, command) pair, excluding the
    // primary's exact command string. Docs repeat the same template across
    // many pages with only positional-arg variations, which otherwise flood
    // the alternates list with near-duplicates.
    const seenAlt = new Set<string>();
    seenAlt.add(head.command);
    const alternates: { runtime: string; command: string }[] = [];
    for (const r of bucket.slice(1)) {
      if (seenAlt.has(r.command)) continue;
      seenAlt.add(r.command);
      alternates.push({ runtime: r.command_runtime, command: r.command });
    }
    grouped.push({
      product: head.product,
      subcommand: subcommandName(head),
      page_title: canonicalTitle,
      description: pickDescription(bucket),
      template_id: head.template_id,
      target_dir: head.target_dir,
      primary_command: head.command,
      primary_runtime: head.command_runtime,
      alternates,
      source_page: canonicalTitle,
      source_subpath: head.subpath,
    });
  }

  return grouped.sort(
    (a, b) => a.product.localeCompare(b.product) || a.subcommand.localeCompare(b.subcommand),
  );
}

function disambiguate(grouped: GroupedEntry[]): GroupedEntry[] {
  // Two entries in the same product can collide on subcommand. Append an
  // index suffix to later collisions.
  const seen = new Map<string, number>();
  return grouped.map((g) => {
    const key = `${g.product}/${g.subcommand}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    if (n === 0) return g;
    return { ...g, subcommand: `${g.subcommand}-${n + 1}` };
  });
}

function renderIndexTs(g: GroupedEntry): string {
  // Each leaf file exports `meta` (structured metadata readable by the
  // dispatcher's --json mode) and a default handler. --run executes the
  // resolved command through Bun's $ shell, inheriting stdio.
  const alternatesJson = JSON.stringify(g.alternates, null, 2).replace(/\n/g, "\n  ");
  const altDocLines = g.alternates.length
    ? "\n *\n * Alternate runtimes:\n" +
      g.alternates.map((a) => ` *   [${a.runtime}] ${a.command}`).join("\n")
    : "";
  const descDoc = g.description ? `\n * ${g.description.replace(/\n/g, " ")}` : "";
  return `/**
 * ${g.product} / ${g.subcommand}
 *
 * Source page: ${g.page_title}
 * Docs subpath: docs/${g.product}/${g.source_subpath}
${g.template_id ? ` * Template: ${g.template_id}\n` : ""}${g.target_dir ? ` * Default target dir: ${g.target_dir}\n` : ""} *${descDoc}
 *
 * Primary command:
 *   ${g.primary_command}${altDocLines}
 *
 * Invoke via the dispatcher:
 *   ./scripts/cli ${g.product} ${g.subcommand}           # print
 *   ./scripts/cli ${g.product} ${g.subcommand} --run     # execute
 *   ./scripts/cli ${g.product} ${g.subcommand} --json    # metadata
 *   ./scripts/cli ${g.product} ${g.subcommand} --target-dir=my-project
 *
 * Auto-generated from https://developers.cloudflare.com/llms-full.txt.
 * Regenerate with: ./scripts/regenerate
 */

export const meta = {
  product: ${JSON.stringify(g.product)},
  subcommand: ${JSON.stringify(g.subcommand)},
  description: ${JSON.stringify(g.description)},
  page_title: ${JSON.stringify(g.page_title)},
  template_id: ${JSON.stringify(g.template_id)},
  target_dir: ${JSON.stringify(g.target_dir)},
  primary_runtime: ${JSON.stringify(g.primary_runtime)},
  primary_command: ${JSON.stringify(g.primary_command)},
  alternates: ${alternatesJson},
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
    console.log(\`# \${meta.product} / \${meta.subcommand}\`);
    if (meta.page_title && meta.page_title !== meta.description) {
      console.log(\`# \${meta.page_title}\`);
    }
    if (meta.description) console.log(\`# \${meta.description}\`);
    console.log("");
    console.log(command);
    if (meta.alternates.length > 0) {
      console.log("");
      console.log("# Alternate runtimes:");
      for (const alt of meta.alternates) console.log(\`#   \${alt.command}\`);
    }
    return;
  }

  console.error(\`Running: \${command}\`);
  // Bun's native \`$\` shell runs the command string as a real shell pipeline,
  // inheriting stdio. Equivalent to spawnSync but without the split-and-spawn
  // dance for commands that contain quoted args or redirections.
  const { $ } = await import("bun");
  const proc = await $\`sh -c \${command}\`.nothrow();
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
    [/^(npm\\s+create\\s+cloudflare@latest)(\\s+--\\s+)/, (t) => \`$1 \${t}$2\`],
    [/^(npm\\s+create\\s+cloudflare@latest)(\\s+)/, (t) => \`$1 \${t}$2\`],
    [/^(pnpm\\s+create\\s+cloudflare@latest)(\\s+)/, (t) => \`$1 \${t}$2\`],
    [/^(yarn\\s+create\\s+cloudflare)(\\s+)/, (t) => \`$1 \${t}$2\`],
    [/^(npx\\s+create-cloudflare@latest)(\\s+)/, (t) => \`$1 \${t}$2\`],
    [/^(bun\\s+create\\s+cloudflare@latest)(\\s+)/, (t) => \`$1 \${t}$2\`],
  ];
  for (const [pat, replacer] of patterns) {
    if (pat.test(cmd)) return cmd.replace(pat, replacer(override));
  }
  return cmd;
}
`;
}



async function ensureDir(path: string): Promise<void> {
  if (!existsSync(path)) await mkdir(path, { recursive: true });
}

async function main(): Promise<void> {
  const raw = JSON.parse(await readFile(INPUT_JSON, "utf8")) as {
    entries: RawEntry[];
  };
  const grouped = disambiguate(group(raw.entries));

  // Clean target directory to avoid stale commands from a previous run.
  if (existsSync(COMMANDS_DIR)) await rm(COMMANDS_DIR, { recursive: true });
  await ensureDir(COMMANDS_DIR);

  // Group by product for product-level index files.
  const byProduct = new Map<string, GroupedEntry[]>();
  for (const g of grouped) {
    const arr = byProduct.get(g.product) ?? [];
    arr.push(g);
    byProduct.set(g.product, arr);
  }

  for (const [product, children] of byProduct) {
    const productDir = join(COMMANDS_DIR, product);
    await ensureDir(productDir);
    for (const child of children) {
      const leafDir = join(productDir, child.subcommand);
      await ensureDir(leafDir);
      // Single source of truth per leaf: index.ts exports `meta` and a
      // default handler. The top-of-file JSDoc absorbs what would otherwise
      // be a sidecar README. The `--json` flag on the dispatcher exposes
      // structured meta for any tool that needs it.
      await writeFile(join(leafDir, "index.ts"), renderIndexTs(child), "utf8");
    }
  }

  // Summary manifest — useful for search/indexing and as a build artifact.
  await writeFile(
    join(COMMANDS_DIR, "manifest.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source: "https://developers.cloudflare.com/llms-full.txt",
        total_products: byProduct.size,
        total_commands: grouped.length,
        products: [...byProduct.entries()].map(([product, cmds]) => ({
          product,
          count: cmds.length,
          subcommands: cmds.map((c) => c.subcommand),
        })),
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Generated ${grouped.length} commands across ${byProduct.size} products.`);
  console.log(`Root: ${COMMANDS_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
