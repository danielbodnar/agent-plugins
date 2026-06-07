#!/usr/bin/env bun
/**
 * Regenerate the `commands/` tree from Cloudflare's concatenated
 * `llms-full.txt`. Run this whenever Cloudflare publishes new templates or
 * renames existing ones.
 *
 *   ./scripts/regenerate                # uses cached llms-full.txt if present
 *   ./scripts/regenerate --refresh      # force re-download
 *
 * Or, if the executable bit is not set:
 *   bun ./scripts/regenerate
 *
 * Steps:
 *   1. Download https://developers.cloudflare.com/llms-full.txt (~47MB)
 *      into `.cache/llms-full.txt`.
 *   2. Run the extractor → `.cache/commands.json`.
 *   3. Run the generator → `scripts/commands/**`.
 *
 * The `.cache/` directory is gitignore-friendly — only the generated command
 * tree is committed.
 */

import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(HERE, "..");
const CACHE_DIR = resolve(SKILL_ROOT, ".cache");
const LLMS_PATH = resolve(CACHE_DIR, "llms-full.txt");
const COMMANDS_JSON = resolve(CACHE_DIR, "commands.json");
const COMMANDS_DIR = resolve(HERE, "commands");

const SOURCE_URL = "https://developers.cloudflare.com/llms-full.txt";

async function ensureCacheDir(): Promise<void> {
  if (!existsSync(CACHE_DIR)) await mkdir(CACHE_DIR, { recursive: true });
}

async function download(url: string, dest: string): Promise<void> {
  console.log(`Downloading ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  // Bun.write accepts a Response directly and streams to disk without any
  // node:stream plumbing. Returns bytes written.
  const bytes = await Bun.write(dest, res);
  console.log(`Saved ${bytes} bytes to ${dest}`);
}

type Entry = {
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

const CREATE_REGEX =
  /^(?:\s*)(npm|pnpm|yarn|bun)\s+create\s+cloudflare(?:@[^\s]+)?\b.*$|^(?:\s*)npx\s+create-cloudflare(?:@[^\s]+)?\b.*$/;
const EDIT_PATH_REGEX =
  /cloudflare-docs\/edit\/production\/src\/content\/docs\/([^/\s)]+(?:\/[^/\s)]+)*)/;
const TEMPLATE_FLAG_REGEX = /--template(?:=|\s+)(\S+?)(?=\s|$|\\)/;
const POSITIONAL_TARGET_REGEX =
  /create\s+cloudflare(?:@[^\s]+)?\s+(?:--\s+)?([a-z][a-z0-9_-]+)(?=\s|$|\\)/i;

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "untitled";
}

function clean(raw: string): string {
  return raw.replace(/\\\s*$/, "").replace(/\s+$/g, "").replace(/^\s+/, "").replace(/\s{2,}/g, " ");
}

function runtimeOf(cmd: string): Entry["command_runtime"] {
  const head = cmd.trim().split(/\s+/)[0];
  if (head === "npm" || head === "pnpm" || head === "yarn" || head === "bun" || head === "npx") return head;
  return "npm";
}

async function extract(): Promise<void> {
  console.log(`Extracting create commands from ${LLMS_PATH} ...`);
  const stream = createReadStream(LLMS_PATH, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  const buffer: string[] = [];
  const BUFFER_MAX = 40;
  let currentTitle = "";
  let currentProduct = "uncategorized";
  let currentSubpath = "";
  let inFrontmatter = false;
  let sawFrontmatterOpen = false;
  let pendingProductFromEdit = false;

  const entries: Entry[] = [];
  let lineNo = 0;

  for await (const line of rl) {
    lineNo++;

    if (line.trim() === "---") {
      if (!inFrontmatter && !sawFrontmatterOpen) {
        inFrontmatter = true;
        sawFrontmatterOpen = true;
      } else if (inFrontmatter) {
        inFrontmatter = false;
        sawFrontmatterOpen = false;
        pendingProductFromEdit = true;
      }
    } else if (inFrontmatter) {
      const t = line.match(/^title:\s*(.+?)\s*$/);
      if (t) currentTitle = t[1].replace(/^"(.*)"$/, "$1");
    }

    if (pendingProductFromEdit) {
      const m = line.match(EDIT_PATH_REGEX);
      if (m) {
        const parts = m[1].split("/");
        currentProduct = parts[0];
        currentSubpath = parts.slice(1).join("/");
        pendingProductFromEdit = false;
      }
    }

    if (CREATE_REGEX.test(line)) {
      const cmd = clean(line);
      const t = cmd.match(TEMPLATE_FLAG_REGEX);
      const td = cmd.match(POSITIONAL_TARGET_REGEX);
      const templateId = t ? t[1] : null;
      const targetDir = td ? td[1] : null;
      const idBase = templateId
        ? slug(templateId.replace(/^cloudflare\//, ""))
        : targetDir
          ? slug(targetDir)
          : slug(currentTitle);
      entries.push({
        id: `${currentProduct}:${idBase}`,
        product: currentProduct,
        subpath: currentSubpath,
        page_title: currentTitle || "(unknown)",
        command_runtime: runtimeOf(cmd),
        command: cmd,
        template_id: templateId,
        target_dir: targetDir,
        source_line: lineNo,
        context_before: buffer.slice(-15).join("\n").trim(),
        description: "",
      });
    }

    buffer.push(line);
    if (buffer.length > BUFFER_MAX) buffer.shift();
  }

  for (const e of entries) {
    const prose = e.context_before
      .split("\n")
      .map((l) => l.trim())
      .filter(
        (l) =>
          l.length > 40 &&
          l.length < 400 &&
          !l.startsWith("#") &&
          !l.startsWith("|") &&
          !l.startsWith("```") &&
          !l.startsWith("-") &&
          !l.startsWith("*") &&
          !l.startsWith(">") &&
          !/create\s+cloudflare/i.test(l) &&
          !/create-cloudflare/i.test(l) &&
          !/^\d+\./.test(l),
      );
    e.description = prose[prose.length - 1] ?? "";
  }

  const out = {
    generated_at: new Date().toISOString(),
    source: SOURCE_URL,
    total: entries.length,
    entries,
  };
  await writeFile(COMMANDS_JSON, JSON.stringify(out, null, 2), "utf8");
  console.log(`Wrote ${entries.length} matches to ${COMMANDS_JSON}`);
}

async function runGenerate(): Promise<void> {
  // The generator is just a script that runs side effects from its top-level
  // main(). Rather than spawning a second process, import it dynamically with
  // the paths it expects on process.argv. Bun imports TypeScript natively.
  const generatePath = resolve(HERE, "_internal_generate_commands.ts");
  // Temporarily shape argv for the generator, then restore afterwards so the
  // outer script still sees its own flags (like --refresh).
  const savedArgv = process.argv;
  process.argv = [savedArgv[0], generatePath, COMMANDS_JSON, COMMANDS_DIR];
  try {
    // cache-bust the import so repeated runs in the same process re-read the
    // latest generator source
    await import(`${generatePath}?t=${Date.now()}`);
  } finally {
    process.argv = savedArgv;
  }
}

async function main(): Promise<void> {
  await ensureCacheDir();
  if (!existsSync(LLMS_PATH) || process.argv.includes("--refresh")) {
    if (existsSync(LLMS_PATH)) await rm(LLMS_PATH);
    await download(SOURCE_URL, LLMS_PATH);
  } else {
    console.log(`Using cached ${LLMS_PATH} (pass --refresh to redownload).`);
  }
  await extract();
  await runGenerate();
  console.log("Done. Commands available under scripts/commands/.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
