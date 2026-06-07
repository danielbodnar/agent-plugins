#!/usr/bin/env node
/**
 * validate.mjs - a dependency-free validator for Agent Skill files.
 *
 * Runs inside the TutorialKit WebContainer (Node-in-the-browser), so it uses
 * only the Node standard library: no npm install, no YAML package. It parses
 * the frontmatter of a SKILL.md by hand and lints it against the Agent Skills
 * conventions the workshop teaches.
 *
 * Usage:
 *   node validate.mjs [path-to-SKILL.md]   (defaults to ./SKILL.md)
 *
 * Exit code 0 = all checks passed, 1 = at least one error.
 *
 * This is the lesson grader. Copy it unchanged into both _files/ and
 * _solution/ as validate.mjs so the starting state and the solved state run
 * the same checks.
 */

import { readFile } from 'node:fs/promises';
import { argv, exit } from 'node:process';

const target = argv[2] ?? 'SKILL.md';

/**
 * Normalize input before parsing. Strips a UTF-8 BOM and converts CRLF and
 * lone CR to LF, so frontmatter detection does not depend on the author's
 * operating system or editor. Without this, a valid SKILL.md saved with
 * Windows line endings fails every frontmatter check.
 */
function normalize(src) {
  return src.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

/** Pull the YAML frontmatter block (between the first two `---` fences). */
function extractFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: source };
  return { frontmatter: match[1], body: match[2] };
}

/**
 * Minimal `key: value` parser. Enough for the flat frontmatter skills use
 * (name, description, allowed-tools). Strips surrounding quotes and supports
 * YAML block scalars (`>`, `>-`, `|`, `|-`) collapsed onto one logical value.
 */
function parseFrontmatter(text) {
  const data = {};
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let value = kv[2].trim();

    // Block scalar: gather the following more-indented lines into one value.
    if (value === '>' || value === '>-' || value === '|' || value === '|-') {
      const folded = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
        folded.push(lines[++i].trim());
      }
      value = folded.join(' ');
    }
    value = value.replace(/^["']|["']$/g, '');
    data[key] = value;
  }
  return data;
}

const checks = [];
const record = (ok, label, detail = '') => checks.push({ ok, label, detail });

let source;
try {
  source = normalize(await readFile(target, 'utf8'));
} catch {
  console.error(`\u2717 Could not read ${target}`);
  exit(1);
}

const { frontmatter, body } = extractFrontmatter(source);

record(frontmatter !== null, 'Has YAML frontmatter delimited by ---');

const fm = frontmatter ? parseFrontmatter(frontmatter) : {};

// name --------------------------------------------------------------------
// Run the shape checks only when the field is present, so a missing field
// reports one honest failure instead of a contradictory mix of pass and fail.
const name = typeof fm.name === 'string' ? fm.name : '';
const hasName = name.length > 0;
record(hasName, 'Frontmatter has a `name`');
if (hasName) {
  const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
  record(kebab, 'name is lowercase kebab-case', kebab ? '' : `got: "${name}"`);
  record(name.length <= 64, 'name is \u2264 64 characters', `length: ${name.length}`);
}

// description -------------------------------------------------------------
const description = typeof fm.description === 'string' ? fm.description : '';
const hasDescription = description.length > 0;
record(hasDescription, 'Frontmatter has a `description`');
if (hasDescription) {
  record(
    description.length <= 1024,
    'description is \u2264 1024 characters',
    `length: ${description.length}`,
  );
  record(
    /\b(use (this|it|when)|when|whenever|trigger)\b/i.test(description),
    'description explains WHEN to trigger',
    'Name the situations that should invoke the skill.',
  );
}

// body --------------------------------------------------------------------
record(body.trim().length > 0, 'SKILL.md has instructional body content');

// report ------------------------------------------------------------------
let failures = 0;
console.log(`\nValidating ${target}\n`);
for (const c of checks) {
  console.log(`  ${c.ok ? '\u2713' : '\u2717'} ${c.label}${c.detail ? `  \u2014 ${c.detail}` : ''}`);
  if (!c.ok) failures++;
}
console.log(
  `\n${failures === 0 ? '\u2713 PASS' : `\u2717 FAIL (${failures} issue${failures === 1 ? '' : 's'})`}\n`,
);
exit(failures === 0 ? 0 : 1);
