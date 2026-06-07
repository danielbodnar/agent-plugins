#!/usr/bin/env bun
// setup -- provision and verify the cross-platform workshop developer environment.
//
// Idempotent: re-running it only fills gaps. It checks the toolchain mise pins,
// installs missing dependencies where it can, and reports anything the attendee
// must install by hand. The same verbs (just bootstrap, just race, just submit)
// work across Codespaces, Dev Containers, the Dockerfile, and a local mise install.

import { die, log } from "./lib/log.ts";

interface Tool {
  bin: string;
  why: string;
  install?: string;
}

const REQUIRED: Tool[] = [
  { bin: "mise", why: "version manager pinning bun, just, gh", install: "curl https://mise.run | sh" },
  { bin: "bun", why: "TypeScript runtime and package manager", install: "mise use -g bun@latest" },
  { bin: "just", why: "task runner for bootstrap/race/submit", install: "mise use -g just@latest" },
  { bin: "gh", why: "GitHub interactions and registry search", install: "mise use -g github-cli@latest" },
];

const AGENTS: Tool[] = [
  { bin: "claude", why: "Claude Code", install: "npm i -g @anthropic-ai/claude-code" },
  { bin: "opencode", why: "OpenCode", install: "npm i -g opencode-ai" },
  { bin: "copilot", why: "GitHub Copilot CLI", install: "gh extension install github/gh-copilot" },
];

async function present(bin: string): Promise<boolean> {
  return (await Bun.spawn(["sh", "-c", `command -v ${bin}`], { stdout: "ignore", stderr: "ignore" }).exited) === 0;
}

async function check(group: string, tools: Tool[]): Promise<string[]> {
  log.step(`checking ${group}`);
  const missing: string[] = [];
  for (const tool of tools) {
    if (await present(tool.bin)) {
      log.ok(`${tool.bin} present`);
    } else {
      log.warn(`${tool.bin} missing (${tool.why}) -> ${tool.install ?? "see docs"}`);
      missing.push(tool.bin);
    }
  }
  return missing;
}

const missing = [...(await check("required toolchain", REQUIRED)), ...(await check("coding agents", AGENTS))];

if (missing.length === 0) {
  log.ok("environment OK: every required tool and all three agents are available");
} else {
  die(`environment incomplete. Install: ${missing.join(", ")}`);
}
