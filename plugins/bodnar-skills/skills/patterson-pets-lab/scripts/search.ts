#!/usr/bin/env bun
// search -- unified code search across the skill/template registries using the gh CLI.
//
//   bun scripts/search.ts <query> [--kind skill|agent|command|mcp|template] [--limit N]
//
// Searches the GitHub repositories behind claude-code-templates (aitmpl.com),
// Vercel's agent-skills (the repo behind skills.sh), Anthropic's first-party
// skills, and surfaces the install command for each registry. gh handles auth,
// rate limiting, and pagination, so this stays thin glue over `gh search code`.

import { die, log } from "./lib/log.ts";
import { flag, positional } from "./lib/paths.ts";

interface Registry {
  label: string;
  repos: string[];
  install: (ref: string) => string;
}

const REGISTRIES: Registry[] = [
  { label: "skills.sh (vercel-labs/agent-skills)", repos: ["vercel-labs/agent-skills"], install: (r) => `npx skills add ${r}` },
  { label: "anthropics/skills", repos: ["anthropics/skills"], install: (r) => `npx skills add anthropics/skills/${r}` },
  { label: "aitmpl.com (davila7/claude-code-templates)", repos: ["davila7/claude-code-templates"], install: (r) => `npx claude-code-templates@latest --skill ${r}` },
];

async function ghAvailable(): Promise<boolean> {
  return (await Bun.spawn(["sh", "-c", "command -v gh"], { stdout: "ignore", stderr: "ignore" }).exited) === 0;
}

async function searchRepo(query: string, repo: string, limit: number): Promise<void> {
  const args = ["search", "code", query, "--repo", repo, "--limit", String(limit), "--json", "path,repository,url"];
  const proc = Bun.spawn(["gh", ...args], { stdout: "pipe", stderr: "pipe" });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  const hits = text.trim() ? JSON.parse(text) : [];
  if (hits.length === 0) {
    log.info(`  no hits in ${repo}`);
    return;
  }
  for (const hit of hits) log.out(`  ${repo}  ${hit.path}`);
}

const argv = Bun.argv.slice(2);
const [query] = positional(argv);
if (!query) die("usage: search <query> [--kind <entity>] [--limit N]");
if (!(await ghAvailable())) die("gh CLI not found. Install it: mise use -g github-cli@latest");

const kind = flag(argv, "kind");
const limit = Number(flag(argv, "limit") ?? 5);
const scoped = kind ? `${query} ${kind}` : query;

for (const registry of REGISTRIES) {
  log.step(`${registry.label}`);
  for (const repo of registry.repos) await searchRepo(scoped, repo, limit).catch((e) => log.warn(`  ${repo}: ${e.message}`));
  log.info(`  install: ${registry.install("<ref-from-results>")}`);
}
