#!/usr/bin/env bun
/**
 * cloudflare-compose CLI — root dispatcher.
 *
 * Run directly:
 *   ./scripts/cli                         # list products
 *   ./scripts/cli sandbox                 # list subcommands under sandbox
 *   ./scripts/cli sandbox sandbox-sdk-bridge-worker
 *                                         # print the npm create command
 *   ./scripts/cli sandbox sandbox-sdk-bridge-worker --run
 *                                         # execute it
 *   ./scripts/cli sandbox sandbox-sdk-bridge-worker --json
 *                                         # emit metadata as JSON
 *   ./scripts/cli search agent            # fuzzy-search all commands
 *   ./scripts/cli list --json             # dump full manifest
 *
 * If you want to invoke explicitly via bun instead of relying on the
 * executable bit, use `bun ./scripts/cli` (bun reads the shebang and handles
 * the TypeScript natively — no transpile step, no --experimental flags).
 *
 * Walks `./commands/<product>/<subcommand>/index.ts` at runtime. The
 * filesystem is the command hierarchy; no manual registry, no static imports.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Resolve the commands/ directory in a way that works in both invocation
 * modes:
 *
 * 1. Source mode (`./scripts/cli` or `bun ./scripts/cli`):
 *    `import.meta.url` points at `scripts/cli` on disk, so `commands/`
 *    resolves to `scripts/commands/`.
 *
 * 2. Compiled mode (`bun build --compile`):
 *    `import.meta.url` points into the binary's virtual filesystem
 *    (`file:///$bunfs/root/...`), which doesn't exist on real disk.
 *    Instead we use `process.execPath` — the on-disk path of the
 *    running binary — and look for `commands/` next to it.
 *
 * The $CF_COMPOSE_COMMANDS_DIR environment variable overrides both paths
 * for tests and for users who want to point the cli at a custom catalog.
 */
function resolveCommandsDir(): string {
  const override = process.env.CF_COMPOSE_COMMANDS_DIR;
  if (override) return resolve(override);

  // In compiled mode, `import.meta.url` begins with $bunfs. Treat that
  // as the signal to fall back to process.execPath.
  const metaPath = import.meta.url;
  if (metaPath.includes("$bunfs") || metaPath.includes("/$bunfs/")) {
    // Binary mode: look for commands/ next to the executable.
    const binDir = dirname(process.execPath);
    const candidates = [
      resolve(binDir, "commands"),           // ./cli + ./commands/
      resolve(binDir, "scripts", "commands"),// ./cli + ./scripts/commands/ (old layout)
      resolve(process.cwd(), "commands"),    // cwd + ./commands/
    ];
    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
    return candidates[0]; // will error downstream, but with a real path
  }

  // Source mode.
  return resolve(dirname(fileURLToPath(metaPath)), "commands");
}

const COMMANDS_DIR = resolveCommandsDir();

type Flags = {
  run: boolean;
  json: boolean;
  help: boolean;
  pm?: "npm" | "pnpm" | "yarn" | "bun";
  targetDir?: string;
  positional: string[];
};

function parseArgs(argv: string[]): Flags {
  const flags: Flags = { run: false, json: false, help: false, positional: [] };
  for (const raw of argv) {
    if (raw === "--run") flags.run = true;
    else if (raw === "--json") flags.json = true;
    else if (raw === "--help" || raw === "-h") flags.help = true;
    else if (raw.startsWith("--pm=")) flags.pm = raw.slice("--pm=".length) as Flags["pm"];
    else if (raw.startsWith("--target-dir=")) flags.targetDir = raw.slice("--target-dir=".length);
    else flags.positional.push(raw);
  }
  return flags;
}

async function listProducts(): Promise<string[]> {
  const entries = await readdir(COMMANDS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

async function listSubcommands(product: string): Promise<string[]> {
  const dir = join(COMMANDS_DIR, product);
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

type LeafMeta = {
  product: string;
  subcommand: string;
  page_title: string;
  description: string;
  template_id: string | null;
  target_dir: string | null;
  primary_runtime: string;
  primary_command: string;
};

async function loadLeafMeta(product: string, subcommand: string): Promise<LeafMeta | null> {
  const leafPath = join(COMMANDS_DIR, product, subcommand, "index.ts");
  if (!existsSync(leafPath)) return null;
  try {
    const mod = await import(pathToFileURL(leafPath).href);
    return mod.meta as LeafMeta;
  } catch {
    return null;
  }
}

async function loadManifest(): Promise<LeafMeta[]> {
  const products = await listProducts();
  const all: LeafMeta[] = [];
  for (const p of products) {
    const subs = await listSubcommands(p);
    for (const s of subs) {
      const m = await loadLeafMeta(p, s);
      if (m) all.push(m);
    }
  }
  return all;
}

async function runLeaf(product: string, subcommand: string, flags: Flags): Promise<void> {
  const leafPath = join(COMMANDS_DIR, product, subcommand, "index.ts");
  if (!existsSync(leafPath)) {
    console.error(`Command not found: ${product} ${subcommand}`);
    const nearby = await listSubcommands(product);
    if (nearby.length > 0) {
      console.error(`Available under "${product}":`);
      for (const n of nearby) console.error(`  ${n}`);
    }
    process.exit(1);
  }
  const mod = await import(pathToFileURL(leafPath).href);
  const handler = mod.default as (opts: {
    run?: boolean;
    json?: boolean;
    pm?: Flags["pm"];
    targetDir?: string;
  }) => void;
  handler({ run: flags.run, json: flags.json, pm: flags.pm, targetDir: flags.targetDir });
}

async function runProductIndex(product: string): Promise<void> {
  const productDir = join(COMMANDS_DIR, product);
  if (!existsSync(productDir)) {
    console.error(`Unknown product: ${product}`);
    await printProductList();
    process.exit(1);
  }
  const subs = await listSubcommands(product);
  console.log(`# ${product}`);
  console.log(`${subs.length} subcommand(s)`);
  console.log("");
  for (const name of subs) {
    const m = await loadLeafMeta(product, name);
    const tag = m?.template_id ? ` [${m.template_id}]` : "";
    console.log(`  ${name}${tag}`);
    if (m?.description) {
      const short = m.description.length > 120 ? m.description.slice(0, 117) + "..." : m.description;
      console.log(`    ${short}`);
    }
  }
}

async function printProductList(): Promise<void> {
  const products = await listProducts();
  console.log("cloudflare-compose — product namespaces");
  console.log("");
  for (const p of products) {
    const subs = await listSubcommands(p);
    console.log(`  ${p.padEnd(24)}  ${subs.length} subcommand(s)`);
  }
  console.log("");
  console.log("Usage:");
  console.log("  ./scripts/cli <product>                         list subcommands");
  console.log("  ./scripts/cli <product> <subcommand>            print the create command");
  console.log("  ./scripts/cli <product> <subcommand> --run      execute it");
  console.log("  ./scripts/cli search <query>                    fuzzy-search all commands");
}

async function search(query: string, flags: Flags): Promise<void> {
  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  const manifest = await loadManifest();
  const scored = manifest
    .map((m) => {
      const structured = [m.product, m.subcommand, m.template_id ?? "", m.target_dir ?? ""]
        .join(" ")
        .toLowerCase();
      const title = m.page_title.toLowerCase();
      const desc = (m.description ?? "").toLowerCase();
      let score = 0;
      // Full-query phrase hits rank highest.
      if (structured.includes(q)) score += 25;
      else if (title.includes(q)) score += 15;
      else if (desc.includes(q)) score += 5;
      // Per-token bonuses, weighted by field.
      for (const t of tokens) {
        if (structured.includes(t)) score += 5;
        if (title.includes(t)) score += 3;
        if (desc.includes(t)) score += 1;
      }
      return { m, score };
    })
    // Require either a phrase hit (score >= 5) or hits on multiple tokens.
    .filter((s) => s.score >= Math.max(5, tokens.length * 3))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  if (flags.json) {
    console.log(JSON.stringify(scored.map((s) => s.m), null, 2));
    return;
  }
  if (scored.length === 0) {
    console.log(`No commands match "${query}".`);
    return;
  }
  for (const { m } of scored) {
    const tag = m.template_id ? ` [${m.template_id}]` : "";
    console.log(`  ${m.product}/${m.subcommand}${tag}`);
    if (m.description) {
      const short = m.description.length > 120 ? m.description.slice(0, 117) + "..." : m.description;
      console.log(`    ${short}`);
    }
  }
}

async function listAll(flags: Flags): Promise<void> {
  const manifest = await loadManifest();
  if (flags.json) {
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }
  for (const m of manifest) {
    const tag = m.template_id ? ` [${m.template_id}]` : "";
    console.log(`${m.product}/${m.subcommand}${tag}`);
  }
}

function printHelp(): void {
  console.log(`cloudflare-compose — catalog of npm create cloudflare commands

Usage:
  ./scripts/cli                                   list all product namespaces
  ./scripts/cli list [--json]                     list every command (flat)
  ./scripts/cli search <query> [--json]           fuzzy search
  ./scripts/cli <product>                         list subcommands in a product
  ./scripts/cli <product> <subcommand>            print the create command
  ./scripts/cli <product> <subcommand> --run      execute the create command
  ./scripts/cli <product> <subcommand> --json     emit metadata as JSON

Flags:
  --run                 execute the command (default: print only)
  --json                machine-readable output
  --pm=<npm|pnpm|yarn>  choose package manager (default: npm)
  --target-dir=<name>   override the default target directory
  --help, -h            this help
`);
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) return printHelp();

  const [first, second] = flags.positional;

  if (!first) return printProductList();
  if (first === "list") return listAll(flags);
  if (first === "search") {
    if (!second) {
      console.error("Usage: ./scripts/cli search <query>");
      process.exit(1);
    }
    return search(flags.positional.slice(1).join(" "), flags);
  }

  if (!second) return runProductIndex(first);
  return runLeaf(first, second, flags);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
