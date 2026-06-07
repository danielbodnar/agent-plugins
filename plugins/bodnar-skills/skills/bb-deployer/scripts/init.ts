#!/usr/bin/env bun
// scripts/init.ts
//
// Bootstrap dispatcher for the bb-deployer toolchain.  Discovers modules under
// scripts/init/<category>/<name>.ts, dynamic-imports each one, and applies them
// in dependency order based on the requires field.
//
// User-facing invocation goes through the ./scripts/init symlink, matching the
// established pattern in cloudflare-compose where the .ts file is the source
// of truth and the extensionless name is the UX.
//
// Usage:
//   ./scripts/init                       Apply the full preset
//   ./scripts/init --preset=full         Apply every module
//   ./scripts/init --preset=minimal      Apply the minimum modules bb-deployer needs
//   ./scripts/init --only=quality,ai     Apply only the listed categories
//   ./scripts/init --skip=editors        Apply everything except the listed categories
//   ./scripts/init quality/biome         Apply a single module by id
//   ./scripts/init --list                Print the catalog and exit
//   ./scripts/init --dry-run             Show what would be written without writing
//   ./scripts/init --force               Overwrite existing files
//   ./scripts/init --cwd=path            Target a directory other than \$PWD

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import type { Context, Module, Preset } from "./init/lib/module.ts";

const SCRIPT_DIR = fileURLToPath(new URL("./init", import.meta.url));
const SKIP_DIRS = new Set(["lib", "node_modules", ".cache"]);

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      preset: { type: "string", default: "full" },
      only: { type: "string" },
      skip: { type: "string" },
      list: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      cwd: { type: "string", default: process.cwd() },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    printHelp();
    return 0;
  }

  const modules = await discoverModules();

  if (values.list) {
    printCatalog(modules);
    return 0;
  }

  const preset = validatePreset(values.preset);
  const selected = selectModules(modules, {
    preset,
    only: csv(values.only),
    skip: csv(values.skip),
    positionals,
  });

  if (selected.length === 0) {
    console.error("No modules matched the selection.  Use --list to see the catalog.");
    return 1;
  }

  const ctx: Context = {
    cwd: values.cwd!,
    dryRun: values["dry-run"] ?? false,
    force: values.force ?? false,
    preset,
    selected: positionals.length > 0 ? new Set(positionals) : undefined,
    log: [],
  };

  console.error(`Target: ${ctx.cwd}`);
  console.error(`Preset: ${preset}`);
  console.error(`Modules: ${selected.map((m) => m.id).join(", ")}`);
  console.error(ctx.dryRun ? "Mode: dry-run\n" : "");

  const ordered = topoSort(selected);
  for (const module of ordered) {
    if (module.applies && !(await module.applies(ctx))) {
      ctx.log.push(`skip   ${module.id} (applies returned false)`);
      continue;
    }
    try {
      await module.apply(ctx);
    } catch (err) {
      ctx.log.push(`error  ${module.id}: ${(err as Error).message}`);
      console.error(ctx.log.join("\n"));
      return 2;
    }
  }

  console.error(ctx.log.join("\n"));
  console.error(`\nDone.  ${selected.length} module(s) processed.`);
  return 0;
}

async function discoverModules(): Promise<Module[]> {
  const found: Module[] = [];
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(path);
        continue;
      }
      if (!entry.name.endsWith(".ts")) continue;
      if (entry.name.startsWith("_")) continue;
      const module = (await import(path)).default as Module | undefined;
      if (!module || !module.id) continue;
      found.push(module);
    }
  };
  await walk(SCRIPT_DIR);
  return found;
}

function selectModules(
  all: Module[],
  options: {
    preset: Preset;
    only: string[];
    skip: string[];
    positionals: string[];
  },
): Module[] {
  if (options.positionals.length > 0) {
    const wanted = new Set(options.positionals);
    return all.filter((m) => wanted.has(m.id));
  }
  return all.filter((m) => {
    if (!m.presets.includes(options.preset)) return false;
    if (options.only.length > 0 && !options.only.includes(m.category)) return false;
    if (options.skip.includes(m.category)) return false;
    return true;
  });
}

function topoSort(modules: Module[]): Module[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const result: Module[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (m: Module): void => {
    if (visited.has(m.id)) return;
    if (visiting.has(m.id)) {
      throw new Error(`Dependency cycle detected at ${m.id}`);
    }
    visiting.add(m.id);
    for (const dep of m.requires ?? []) {
      const next = byId.get(dep);
      if (next) visit(next);
    }
    visiting.delete(m.id);
    visited.add(m.id);
    result.push(m);
  };

  for (const m of modules) visit(m);
  return result;
}

function printCatalog(modules: Module[]): void {
  const byCategory = new Map<string, Module[]>();
  for (const m of modules) {
    if (!byCategory.has(m.category)) byCategory.set(m.category, []);
    byCategory.get(m.category)!.push(m);
  }
  for (const [category, mods] of [...byCategory.entries()].sort()) {
    console.log(`\n${category}`);
    for (const m of mods.sort((a, b) => a.id.localeCompare(b.id))) {
      const presets = m.presets.join(",");
      console.log(`  ${m.id.padEnd(32)} [${presets}]  ${m.description}`);
    }
  }
}

function printHelp(): void {
  console.log(
    `bb-deployer init: project bootstrap dispatcher

Usage:
  ./scripts/init [options] [module-id ...]

Options:
  --preset=full|minimal|custom    Module set to apply (default: full)
  --only=cat1,cat2                Restrict to these categories
  --skip=cat1,cat2                Exclude these categories
  --list                          Print the module catalog and exit
  --dry-run                       Show actions without writing
  --force                         Overwrite existing files
  --cwd=path                      Target a directory other than \$PWD
  --help, -h                      Print this message

Examples:
  ./scripts/init --list
  ./scripts/init --preset=minimal
  ./scripts/init quality/biome ai/claude
  ./scripts/init --only=quality,security --dry-run
`,
  );
}

function csv(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function validatePreset(value: string | undefined): Preset {
  if (value === "full" || value === "minimal" || value === "custom") return value;
  throw new Error(`Invalid preset: ${value}.  Expected full, minimal, or custom.`);
}

const exitCode = await main();
process.exit(exitCode);
