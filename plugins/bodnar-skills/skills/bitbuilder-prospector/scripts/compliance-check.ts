#!/usr/bin/env bun
/**
 * Regex-based compliance gate for dist/index.html and email drafts.
 *
 * Usage:
 *   bun scripts/compliance-check.ts <file>
 *   bun scripts/compliance-check.ts --business-name "Neal & Neal" <file>
 *
 * Exits 0 if all checks pass. Exits 1 if any fail.
 */

import { readFileSync } from "node:fs";

interface Check {
  name: string;
  test: (src: string) => { pass: boolean; detail?: string };
}

const STOCK_CDN_PATTERNS = [
  /unsplash\.com/i,
  /pexels\.com/i,
  /pixabay\.com/i,
  /istockphoto\.com/i,
  /shutterstock\.com/i,
  /gettyimages\.com/i,
];

// Franchise / chain markers. Flagged only if not already the business name.
const FRANCHISE_MARKERS = [
  "State Farm",
  "RE/MAX",
  "Re/Max",
  "Keller Williams",
  "Century 21",
  "Coldwell Banker",
  "McDonald's",
  "McDonalds",
  "Subway",
  "Hertz",
  "Avis",
  "Allstate",
  "Farmers Insurance",
  "Progressive Insurance",
  "GEICO",
  "Liberty Mutual",
  "AAA Insurance",
  "Nationwide Insurance",
  "The Travelers",
];

const PYTHON_TOKENS = [
  /\bdef\s+\w+\s*\(/,
  /\bimport\s+(os|sys|json|re|pathlib|subprocess)\b/,
  /\bfrom\s+\w+\s+import\b/,
  /\bprint\s*\(/,
  /^\s*#!\/usr\/bin\/env\s+python/m,
];

const WATERMARK_REGEX = /Design concept prepared by BitBuilder Cloud\. Not affiliated with [^.]+\. Feedback: daniel@bitbuilder\.io/;

const args = Bun.argv.slice(2);
let businessName: string | undefined;
let file: string | undefined;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--business-name") {
    businessName = args[++i];
  } else {
    file = args[i];
  }
}

if (!file) {
  console.error("Usage: bun scripts/compliance-check.ts [--business-name <n>] <file>");
  process.exit(2);
}

const src = readFileSync(file, "utf8");

const checks: Check[] = [
  {
    name: "No em-dashes",
    test: (s) => {
      const matches = s.match(/—|\u2014/g) ?? [];
      return matches.length === 0
        ? { pass: true }
        : { pass: false, detail: `${matches.length} em-dash(es) found` };
    },
  },
  {
    name: "Watermark present (byte-exact)",
    test: (s) =>
      WATERMARK_REGEX.test(s)
        ? { pass: true }
        : { pass: false, detail: "Footer watermark missing or malformed" },
  },
  {
    name: "No stock-photo CDN URLs",
    test: (s) => {
      for (const re of STOCK_CDN_PATTERNS) {
        if (re.test(s)) return { pass: false, detail: `Matched ${re}` };
      }
      return { pass: true };
    },
  },
  {
    name: "No Python code",
    test: (s) => {
      for (const re of PYTHON_TOKENS) {
        if (re.test(s)) return { pass: false, detail: `Matched ${re}` };
      }
      return { pass: true };
    },
  },
  {
    name: "Exactly one <h1>",
    test: (s) => {
      const count = (s.match(/<h1\b/gi) ?? []).length;
      return count === 1
        ? { pass: true }
        : { pass: false, detail: `Found ${count} <h1> elements` };
    },
  },
  {
    name: "Three CTA anchors present",
    test: (s) => {
      const hrefs = ["/cta/purchase", "/cta/schedule", "/cta/extend"];
      const missing = hrefs.filter((h) => !s.includes(`href="${h}"`));
      return missing.length === 0
        ? { pass: true }
        : { pass: false, detail: `Missing hrefs: ${missing.join(", ")}` };
    },
  },
  {
    name: "Beacon script loaded",
    test: (s) =>
      /<script[^>]+src=["']\/beacon\.js["']/i.test(s)
        ? { pass: true }
        : { pass: false, detail: "beacon.js script tag missing" },
  },
  {
    name: "No franchise trademarks (unless business is franchise)",
    test: (s) => {
      const hits: string[] = [];
      for (const marker of FRANCHISE_MARKERS) {
        if (s.includes(marker) && !(businessName && businessName.includes(marker))) {
          hits.push(marker);
        }
      }
      return hits.length === 0
        ? { pass: true }
        : { pass: false, detail: `Found: ${hits.join(", ")}` };
    },
  },
  {
    name: "No banned outreach phrases",
    test: (s) => {
      const banned = [
        /\bhand-crafted\b/i,
        /\bhandcrafted\b/i,
        /\bpoured hours\b/i,
        /\bspent the weekend\b/i,
        /\bfrom scratch\b/i,
      ];
      for (const re of banned) {
        if (re.test(s)) return { pass: false, detail: `Matched ${re}` };
      }
      return { pass: true };
    },
  },
];

let failures = 0;
console.log(`\nCompliance check: ${file}\n`);
for (const check of checks) {
  const result = check.test(src);
  const mark = result.pass ? "✓" : "✗";
  const detail = result.detail ? ` — ${result.detail}` : "";
  console.log(`  ${mark} ${check.name}${detail}`);
  if (!result.pass) failures++;
}

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}\n`);
process.exit(failures === 0 ? 0 : 1);
