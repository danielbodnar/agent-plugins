#!/usr/bin/env bun
/**
 * scaffold.ts - generate a TutorialKit content skeleton from a plan.json.
 *
 * Usage:
 *   bun scripts/scaffold.ts <plan.json> [--out src/content/tutorial] [--force]
 *
 * The plan shape is documented in references/plan-and-scaffold.md. This script
 * writes the folder tree the uploaded skill's schema describes: a root meta.md,
 * a meta.md per part and chapter, and per-lesson content.md, _files/, and
 * _solution/. It does not invent prose: it writes frontmatter from the plan and
 * any file bodies the plan provides, leaving narratives for the author to fill.
 *
 * For author-validate lessons (`validateExercise: true`) it copies the bundled
 * validator from ../assets/validate.mjs into both _files/ and _solution/ as
 * validate.mjs and defaults previews to false, matching the exercise model.
 *
 * Runs under both Bun and Node (Node needs --experimental-strip-types): the
 * only platform calls are node: built-ins.
 */

import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

type FileMap = Record<string, string>;
type CommandSpec = string | [command: string, title: string];

interface Lesson {
  dir: string;
  title: string;
  focus?: string;
  template?: string;
  prepareCommands?: CommandSpec[];
  mainCommand?: CommandSpec;
  allowCommands?: string[];
  previews?: unknown;
  openInStackBlitz?: boolean;
  downloadAsZip?: boolean;
  /** Copy the bundled validator into _files/ and _solution/, set previews:false. */
  validateExercise?: boolean;
  files?: FileMap;
  solution?: FileMap;
  /** Optional narrative appended under the frontmatter in content.md. */
  body?: string;
}

interface Chapter {
  dir: string;
  title: string;
  template?: string;
  lessons: Lesson[];
}

interface Part {
  dir: string;
  title: string;
  template?: string;
  chapters?: Chapter[];
  lessons?: Lesson[];
}

interface Plan {
  kind: "tutorial" | "lesson";
  title?: string;
  template?: string;
  source?: string;
  mainCommand?: CommandSpec;
  prepareCommands?: CommandSpec[];
  parts?: Part[];
  lesson?: Lesson;
}

interface Args {
  planPath: string;
  out: string;
  force: boolean;
}

const VALIDATOR_PATH = fileURLToPath(new URL("../assets/validate.mjs", import.meta.url));

function parseArgs(argv: string[]): Args {
  const rest = argv.slice(2);
  let out = "src/content/tutorial";
  let force = false;
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--out") {
      out = rest[++i] ?? out;
    } else if (a === "--force") {
      force = true;
    } else {
      positional.push(a);
    }
  }
  if (positional.length === 0) {
    throw new Error("Usage: bun scripts/scaffold.ts <plan.json> [--out dir] [--force]");
  }
  return { planPath: positional[0], out, force };
}

function scalar(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v);
  return String(v);
}

/** Render a minimal, valid frontmatter block from known keys. */
function frontmatter(fields: Record<string, unknown>): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of value) {
        if (Array.isArray(item)) {
          lines.push(`  - [${item.map((x) => scalar(x)).join(", ")}]`);
        } else {
          lines.push(`  - ${scalar(item)}`);
        }
      }
    } else if (typeof value === "object") {
      lines.push(`${key}:`);
      for (const [k, val] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`  ${k}: ${scalar(val)}`);
      }
    } else {
      lines.push(`${key}: ${scalar(value)}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeIfAbsent(path: string, content: string, force: boolean): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  if (!force && (await exists(path))) {
    console.log(`  skip (exists): ${path}`);
    return;
  }
  await writeFile(path, content, "utf8");
  console.log(`  wrote: ${path}`);
}

async function writeFileMap(baseDir: string, files: FileMap | undefined, force: boolean): Promise<void> {
  if (!files) return;
  for (const [rel, content] of Object.entries(files)) {
    await writeIfAbsent(join(baseDir, rel.replace(/^\/+/, "")), content, force);
  }
}

let validatorSource: string | null = null;
async function loadValidator(): Promise<string | null> {
  if (validatorSource !== null) return validatorSource;
  try {
    validatorSource = await readFile(VALIDATOR_PATH, "utf8");
  } catch {
    console.warn(`  warn: could not read bundled validator at ${VALIDATOR_PATH}; skipping validator copy`);
    validatorSource = "";
  }
  return validatorSource || null;
}

function lessonFrontmatter(lesson: Lesson, source?: string): string {
  const previews = lesson.validateExercise && lesson.previews === undefined ? false : lesson.previews;
  const fm: Record<string, unknown> = {
    type: "lesson",
    title: lesson.title,
    focus: lesson.focus,
    template: lesson.template,
    prepareCommands: lesson.prepareCommands,
    mainCommand: lesson.mainCommand,
    previews,
    openInStackBlitz: lesson.openInStackBlitz,
    downloadAsZip: lesson.downloadAsZip,
  };
  let block = frontmatter(fm);
  if (lesson.allowCommands && lesson.allowCommands.length > 0) {
    const t = [
      "terminal:",
      "  open: true",
      "  allowCommands:",
      ...lesson.allowCommands.map((c) => `    - ${JSON.stringify(c)}`),
    ].join("\n");
    block = block.replace(/\n---$/, `\n${t}\n---`);
  }
  if (source) {
    block = block.replace(/\n---$/, `\ncustom:\n  source: ${JSON.stringify(source)}\n---`);
  }
  return block;
}

async function writeLesson(lessonDir: string, lesson: Lesson, source: string | undefined, force: boolean): Promise<void> {
  const content =
    lessonFrontmatter(lesson, source) +
    "\n\n# " +
    lesson.title +
    "\n\n" +
    (lesson.body ?? "<!-- TODO: lesson narrative. One concept. Lead with the point. -->") +
    "\n";
  await writeIfAbsent(join(lessonDir, "content.md"), content, force);
  await writeFileMap(join(lessonDir, "_files"), lesson.files, force);
  await writeFileMap(join(lessonDir, "_solution"), lesson.solution, force);

  if (lesson.validateExercise) {
    const validator = await loadValidator();
    if (validator) {
      await writeIfAbsent(join(lessonDir, "_files", "validate.mjs"), validator, force);
      await writeIfAbsent(join(lessonDir, "_solution", "validate.mjs"), validator, force);
    }
  }

  await mkdir(join(lessonDir, "_files"), { recursive: true });
  await mkdir(join(lessonDir, "_solution"), { recursive: true });
}

async function writeMeta(
  dir: string,
  type: "part" | "chapter" | "tutorial",
  title: string | undefined,
  extra: Record<string, unknown>,
  force: boolean,
): Promise<void> {
  const fm = frontmatter({ type, title, ...extra });
  await writeIfAbsent(join(dir, "meta.md"), fm + "\n", force);
}

async function buildTutorial(plan: Plan, out: string, force: boolean): Promise<void> {
  // Root meta carries the run commands every lesson inherits.
  await writeMeta(
    out,
    "tutorial",
    plan.title,
    { template: plan.template, mainCommand: plan.mainCommand, prepareCommands: plan.prepareCommands },
    force,
  );
  for (const part of plan.parts ?? []) {
    const partDir = join(out, part.dir);
    await writeMeta(partDir, "part", part.title, { template: part.template }, force);
    for (const chapter of part.chapters ?? []) {
      const chapterDir = join(partDir, chapter.dir);
      await writeMeta(chapterDir, "chapter", chapter.title, { template: chapter.template }, force);
      for (const lesson of chapter.lessons) {
        await writeLesson(join(chapterDir, lesson.dir), lesson, plan.source, force);
      }
    }
    for (const lesson of part.lessons ?? []) {
      await writeLesson(join(partDir, lesson.dir), lesson, plan.source, force);
    }
  }
}

async function buildLesson(plan: Plan, out: string, force: boolean): Promise<void> {
  if (!plan.lesson) throw new Error('plan.kind is "lesson" but no "lesson" object was provided');
  await writeLesson(join(out, plan.lesson.dir), plan.lesson, plan.source, force);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const plan = JSON.parse(await readFile(args.planPath, "utf8")) as Plan;

  console.log(`Scaffolding ${plan.kind} into ${args.out}`);
  if (plan.kind === "tutorial") {
    await buildTutorial(plan, args.out, args.force);
  } else if (plan.kind === "lesson") {
    await buildLesson(plan, args.out, args.force);
  } else {
    throw new Error(`Unknown plan.kind: ${(plan as { kind: string }).kind}`);
  }
  console.log("Done. Fill in narratives and the _files/_solution gaps where TODOs remain, then run astro check.");
}

main().catch((err) => {
  console.error("scaffold failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
