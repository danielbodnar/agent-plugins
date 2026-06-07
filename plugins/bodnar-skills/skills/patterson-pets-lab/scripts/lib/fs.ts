// Filesystem helpers. Prefer Bun.write and Bun.file over node:fs/stream where practical.

import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { log } from "./log.ts";

export async function exists(path: string): Promise<boolean> {
  return await Bun.file(path).exists();
}

// Write a file, creating parent directories, refusing to clobber unless force is set.
export async function writeFile(path: string, contents: string, force = false): Promise<void> {
  if (!force && (await exists(path))) {
    throw new Error(`refusing to overwrite existing file: ${path} (pass --force to replace)`);
  }
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, contents);
  log.ok(`wrote ${path}`);
}

export async function readFile(path: string): Promise<string> {
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`file not found: ${path}`);
  return await file.text();
}

// Open a path in the user's editor. Honors $EDITOR, falls back to a sane default.
export async function openInEditor(path: string): Promise<void> {
  const editor = process.env.EDITOR ?? process.env.VISUAL ?? "nvim";
  log.step(`opening ${path} in ${editor}`);
  await Bun.$`${editor} ${path}`.catch(() => log.warn(`could not launch ${editor}; edit ${path} manually`));
}
