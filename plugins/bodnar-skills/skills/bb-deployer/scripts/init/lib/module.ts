// scripts/init/lib/module.ts
//
// Shared types and helpers used by every module under scripts/init/.
//
// A module is a TypeScript file under scripts/init/<category>/<name>.ts that
// default-exports the result of defineModule().  The dispatcher walks the
// filesystem, dynamic-imports each module, and applies them in dependency
// order based on the requires field.

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile as fsWriteFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type Preset = "full" | "minimal" | "custom";

export type Context = {
  /** Absolute path to the target project root. */
  cwd: string;
  /** When true, print actions without writing files or running commands. */
  dryRun: boolean;
  /** When true, overwrite existing files instead of skipping them. */
  force: boolean;
  /** Active preset for this run. */
  preset: Preset;
  /** Set of module ids explicitly selected when preset is "custom". */
  selected?: Set<string>;
  /** Accumulating log of actions taken, surfaced at the end of the run. */
  log: string[];
};

export type Module = {
  /** Slug used in CLI selection and dependency graphs.  Format: category/name. */
  id: string;
  /** Top-level grouping used by --list and the interactive picker. */
  category: string;
  /** One-line description shown by --list. */
  description: string;
  /** Presets that include this module by default. */
  presets: Preset[];
  /** Optional list of module ids that must run before this one. */
  requires?: string[];
  /** Optional gate: skip when this returns false. */
  applies?: (ctx: Context) => Promise<boolean>;
  /** Idempotent setup logic. */
  apply: (ctx: Context) => Promise<void>;
};

/** Identity helper that preserves type inference and gives modules a single export. */
export function defineModule(m: Module): Module {
  return m;
}

/**
 * Write a file relative to ctx.cwd.  Respects dryRun and force.
 * Creates parent directories as needed.
 */
export async function writeFile(
  relativePath: string,
  content: string,
  ctx: Context,
): Promise<void> {
  const absolute = join(ctx.cwd, relativePath);
  if (existsSync(absolute) && !ctx.force) {
    ctx.log.push(`skip   ${relativePath} (exists, use --force to overwrite)`);
    return;
  }
  if (ctx.dryRun) {
    ctx.log.push(`would write ${relativePath} (${content.length} bytes)`);
    return;
  }
  await mkdir(dirname(absolute), { recursive: true });
  await fsWriteFile(absolute, content, "utf8");
  ctx.log.push(`write  ${relativePath}`);
}

/**
 * Merge into an existing package.json.  Deep-merges objects, replaces scalars.
 * Creates the file if it does not exist.
 */
export async function updatePackageJson(
  patch: PackageJsonPatch,
  ctx: Context,
): Promise<void> {
  const path = join(ctx.cwd, "package.json");
  const existing = existsSync(path)
    ? JSON.parse(await readFile(path, "utf8"))
    : { name: "project", version: "0.0.0", private: true };
  const merged = deepMerge(existing, patch);
  if (ctx.dryRun) {
    ctx.log.push(`would patch package.json with ${Object.keys(patch).join(", ")}`);
    return;
  }
  await fsWriteFile(path, JSON.stringify(merged, null, 2) + "\n", "utf8");
  ctx.log.push(`patch  package.json`);
}

export type PackageJsonPatch = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};

/**
 * Add entries to .gitignore if they are not already present.
 * Creates the file if it does not exist.
 */
export async function addGitignoreEntries(
  entries: string[],
  ctx: Context,
): Promise<void> {
  const path = join(ctx.cwd, ".gitignore");
  const existing = existsSync(path) ? await readFile(path, "utf8") : "";
  const existingLines = new Set(
    existing.split("\n").map((l) => l.trim()).filter(Boolean),
  );
  const missing = entries.filter((e) => !existingLines.has(e.trim()));
  if (missing.length === 0) {
    ctx.log.push(`skip   .gitignore (all entries present)`);
    return;
  }
  const content = existing +
    (existing && !existing.endsWith("\n") ? "\n" : "") +
    missing.join("\n") + "\n";
  if (ctx.dryRun) {
    ctx.log.push(`would append ${missing.length} entries to .gitignore`);
    return;
  }
  await fsWriteFile(path, content, "utf8");
  ctx.log.push(`patch  .gitignore (added ${missing.length} entries)`);
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = out[key];
    if (
      value && typeof value === "object" && !Array.isArray(value) &&
      existing && typeof existing === "object" && !Array.isArray(existing)
    ) {
      out[key] = deepMerge(
        existing as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}
