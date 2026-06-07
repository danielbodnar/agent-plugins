#!/usr/bin/env node
// Kill-switch for the bodnar-agent-plugins marketplace.
//
// Disabling a component removes its entry from .claude-plugin/marketplace.json
// (and, for vendored local-source plugins, moves its files into quarantine/).
// On the next marketplace refresh every client that has this marketplace added
// (Claude Code, claude.ai, OpenCode, ...) stops being offered the component.
//
// NOTE: the plugin spec has no remote force-uninstall; copies already installed
// on a device are not auto-removed. The companion GitHub issue (see
// docs/security-kill-switch.md) documents the one-line uninstall users run.
//
// Usage:
//   node scripts/disable-component.mjs <plugin-name> --reason "CVE / CodeQL alert" [--cve URL]
//   node scripts/disable-component.mjs <bundle>:<skill> --reason "..."   # one skill in a strict:false bundle
//   node scripts/disable-component.mjs --restore <plugin-name>
//   node scripts/disable-component.mjs --list
//
// Read-only preview: append --dry-run.

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const MP = join(ROOT, ".claude-plugin/marketplace.json");
const REGISTRY = join(ROOT, "SECURITY-DISABLED.md");
const QUARANTINE = join(ROOT, "quarantine");

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] ?? true) : undefined; };
const has = (n) => args.includes(n);
const dryRun = has("--dry-run");
const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1]?.startsWith("--") && !["--dry-run", "--restore", "--list"].includes(args[i - 1])));

const mp = JSON.parse(readFileSync(MP, "utf8"));
const save = (obj) => { if (!dryRun) writeFileSync(MP, JSON.stringify(obj, null, 2) + "\n"); };

if (has("--list")) {
  console.log(existsSync(REGISTRY) ? readFileSync(REGISTRY, "utf8") : "No components disabled.");
  process.exit(0);
}

const target = positional[0];
if (!target) { console.error("error: provide a <plugin-name> or <bundle>:<skill>"); process.exit(2); }

// --- restore -------------------------------------------------------------
if (has("--restore")) {
  console.log(`To restore "${target}", revert the disable commit (its files were preserved in git history):`);
  console.log(`  git log --oneline -- quarantine/plugins/${target} .claude-plugin/marketplace.json`);
  console.log(`  git checkout <commit-before-disable> -- plugins/${target} .claude-plugin/marketplace.json`);
  console.log(`  rm -rf quarantine/plugins/${target}`);
  console.log(`Then remove its row from SECURITY-DISABLED.md and re-run validation.`);
  process.exit(0);
}

const reason = flag("--reason") || "unspecified security issue";
const cve = flag("--cve") || "";
const stamp = new Date().toISOString();

// --- disable one skill inside a strict:false bundle ----------------------
if (target.includes(":")) {
  const [bundle, skill] = target.split(":");
  const entry = mp.plugins.find((p) => p.name === bundle);
  if (!entry || !Array.isArray(entry.skills)) { console.error(`error: "${bundle}" is not a skill-bundle entry`); process.exit(1); }
  const before = entry.skills.length;
  entry.skills = entry.skills.filter((s) => s.replace(/^\.\//, "").replace(/\/$/, "") !== skill);
  if (entry.skills.length === before) { console.error(`error: skill "${skill}" not found in bundle "${bundle}"`); process.exit(1); }
  save(mp);
  recordRegistry(`${bundle}:${skill}`, "skill", reason, cve, stamp);
  console.log(`${dryRun ? "[dry-run] " : ""}Disabled skill ${skill} in bundle ${bundle} (removed from skills[]).`);
  process.exit(0);
}

// --- disable a whole plugin entry ----------------------------------------
const idx = mp.plugins.findIndex((p) => p.name === target);
if (idx === -1) { console.error(`error: plugin "${target}" not found in marketplace.json`); process.exit(1); }
const entry = mp.plugins[idx];
mp.plugins.splice(idx, 1);
save(mp);

let quarantined = "";
if (typeof entry.source === "string" && entry.source.startsWith("./plugins/")) {
  const src = join(ROOT, entry.source);
  const dest = join(QUARANTINE, entry.source.replace(/^\.\//, ""));
  if (existsSync(src) && !dryRun) { mkdirSync(dirname(dest), { recursive: true }); renameSync(src, dest); }
  quarantined = `quarantine/${entry.source.replace(/^\.\//, "")}`;
}
recordRegistry(target, "plugin", reason, cve, stamp);
console.log(`${dryRun ? "[dry-run] " : ""}Disabled plugin "${target}" (removed from marketplace.json${quarantined ? `, moved files to ${quarantined}` : ""}).`);
console.log(`Next: commit, push, and open a tracking issue (see docs/security-kill-switch.md).`);

function recordRegistry(name, kind, reason, cve, stamp) {
  if (dryRun) return;
  if (!existsSync(REGISTRY)) {
    writeFileSync(REGISTRY, "# Disabled components\n\nComponents removed from the marketplace for security reasons. Restore with `scripts/disable-component.mjs --restore <name>`.\n\n| Component | Kind | Disabled (UTC) | Reason | Reference |\n| --- | --- | --- | --- | --- |\n");
  }
  appendFileSync(REGISTRY, `| \`${name}\` | ${kind} | ${stamp} | ${reason} | ${cve} |\n`);
}
