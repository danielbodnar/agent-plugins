// Resolve the .claude/ scope directories and skill/repo roots.
// Sane default: operate on the project scope (cwd/.claude) unless --personal is passed.

import { homedir } from "node:os";
import { join } from "node:path";

export type Scope = "project" | "personal" | "plugin";

export function scopeRoot(scope: Scope = "project"): string {
  if (scope === "personal") return join(homedir(), ".claude");
  return join(process.cwd(), ".claude");
}

export function scopeFor(argv: string[]): Scope {
  if (argv.includes("--personal")) return "personal";
  if (argv.includes("--plugin")) return "plugin";
  return "project";
}

// .claude/<kind>/ for the given scope. kind is a directory like "agents", "commands", "skills".
export function claudeDir(kind: string, scope: Scope = "project"): string {
  return join(scopeRoot(scope), kind);
}

// Strip flags (--foo) from argv, returning positional args only.
export function positional(argv: string[]): string[] {
  return argv.filter((a) => !a.startsWith("--"));
}

// Read a --key=value or --key value flag.
export function flag(argv: string[], key: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`--${key}=`));
  if (eq) return eq.slice(key.length + 3);
  const idx = argv.indexOf(`--${key}`);
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith("--")) return argv[idx + 1];
  return undefined;
}
