#!/usr/bin/env bun
/**
 * Compile the cli to a standalone Bun executable.
 *
 * Usage:
 *   ./scripts/build                  # compile for current host (default: ./bin/cf-compose)
 *   ./scripts/build --outfile=PATH   # write to a specific path
 *   ./scripts/build --all-targets    # cross-compile for macOS, Linux, and Windows
 *   ./scripts/build --no-minify      # easier to debug the binary
 *
 * The compiled binary has the full Bun runtime embedded (~95MB), so the
 * resulting artifact is self-contained — it does not need bun, node, npm,
 * or anything else on the user's machine. It still reads the `commands/`
 * directory at runtime, so the binary travels with that folder (or points
 * at it via the $CF_COMPOSE_COMMANDS_DIR env var).
 *
 * Cross-compilation targets use Bun's downloader to fetch the right runtime
 * for each platform on demand. First run per target takes longer.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(HERE, "..");
const ENTRY = resolve(HERE, "cli.ts");
const DEFAULT_OUTDIR = resolve(SKILL_ROOT, "bin");

type Target = {
  label: string;
  triple: string;
  ext: string;
};

const CROSS_TARGETS: Target[] = [
  { label: "linux-x64",    triple: "bun-linux-x64-modern",   ext: "" },
  { label: "linux-arm64",  triple: "bun-linux-arm64",        ext: "" },
  { label: "darwin-x64",   triple: "bun-darwin-x64",         ext: "" },
  { label: "darwin-arm64", triple: "bun-darwin-arm64",       ext: "" },
  { label: "windows-x64",  triple: "bun-windows-x64-modern", ext: ".exe" },
];

function parseArgs(): {
  outfile?: string;
  allTargets: boolean;
  minify: boolean;
  sourcemap: boolean;
} {
  const args = process.argv.slice(2);
  const out: ReturnType<typeof parseArgs> = {
    allTargets: false,
    minify: true,
    sourcemap: true,
  };
  for (const a of args) {
    if (a === "--all-targets") out.allTargets = true;
    else if (a === "--no-minify") out.minify = false;
    else if (a === "--no-sourcemap") out.sourcemap = false;
    else if (a.startsWith("--outfile=")) out.outfile = a.slice("--outfile=".length);
  }
  return out;
}

async function ensureOutdir(path: string): Promise<void> {
  const dir = dirname(path);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

async function compileOne(outfile: string, opts: {
  minify: boolean;
  sourcemap: boolean;
  target?: string;
}): Promise<void> {
  await ensureOutdir(outfile);
  const { $ } = await import("bun");
  const flags: string[] = ["build", "--compile", "--target=bun"];
  if (opts.minify) flags.push("--minify");
  if (opts.sourcemap) flags.push("--sourcemap");
  if (opts.target) flags.push(`--target=${opts.target}`);
  flags.push(`--outfile=${outfile}`);
  flags.push(ENTRY);
  console.log(`[build] bun ${flags.join(" ")}`);
  const proc = await $`bun ${flags}`.nothrow();
  if (proc.exitCode !== 0) {
    throw new Error(`bun build failed with exit code ${proc.exitCode}`);
  }
  const { size } = await Bun.file(outfile).stat();
  const mb = (size / 1024 / 1024).toFixed(1);
  console.log(`[build] wrote ${outfile} (${mb} MB)`);
}

async function main(): Promise<void> {
  const opts = parseArgs();

  if (opts.allTargets) {
    for (const t of CROSS_TARGETS) {
      const outfile = resolve(DEFAULT_OUTDIR, `cf-compose-${t.label}${t.ext}`);
      await compileOne(outfile, {
        minify: opts.minify,
        sourcemap: opts.sourcemap,
        target: t.triple,
      });
    }
    console.log(`[build] cross-compilation complete. Artifacts in ${DEFAULT_OUTDIR}/`);
    return;
  }

  const outfile = opts.outfile ?? resolve(DEFAULT_OUTDIR, "cf-compose");
  await compileOne(outfile, {
    minify: opts.minify,
    sourcemap: opts.sourcemap,
  });
  console.log(`[build] done. Run it: ${outfile}`);
  console.log(`[build] note: the binary expects a commands/ directory next to it,`);
  console.log(`[build]       or $CF_COMPOSE_COMMANDS_DIR pointing at one.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
