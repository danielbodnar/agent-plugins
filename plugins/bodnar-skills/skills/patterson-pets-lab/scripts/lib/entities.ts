// Entity descriptors for the filesystem-routed CLI.
//
// Each of scripts/{create,find,add,remove,edit}/<entity>.ts resolves to one
// descriptor here. The verb scripts stay thin: they import runVerb from crud.ts
// and pass the entity name. All entity-specific knowledge (where the file lives,
// what a fresh one looks like, which registry installs it) lives in this file so
// there is exactly one place to change when a primitive evolves.

import { join } from "node:path";
import { buildFrontmatter } from "./frontmatter.ts";
import { claudeDir, type Scope } from "./paths.ts";

export type EntityName = "agent" | "skill" | "command" | "template" | "reference" | "mcp" | "plugin";

export interface RegistryRef {
  // Human label shown in find results.
  label: string;
  // Command that installs the named item from this registry. {name} is substituted.
  install: (name: string) => string;
  // gh owners/repos to search with `gh search code` for this entity.
  searchRepos: string[];
}

export interface Entity {
  name: EntityName;
  // Absolute path to the file that holds a single instance.
  locate: (name: string, scope: Scope) => string;
  // Fresh starter contents for `create`. Placeholders use [bracket] form.
  scaffold: (name: string) => string;
  // Registries that `find` and `add` consult. Empty means local-only.
  registries: RegistryRef[];
}

// Shared registry endpoints. skills.sh is the community directory; aitmpl.com
// (the claude-code-templates project) is the larger component catalog.
const SKILLS_SH: RegistryRef = {
  label: "skills.sh",
  install: (ref) => `npx skills add ${ref}`,
  searchRepos: ["vercel-labs/agent-skills", "anthropics/skills"],
};
const aitmpl = (kind: string): RegistryRef => ({
  label: "aitmpl.com",
  install: (name) => `npx claude-code-templates@latest --${kind} ${name}`,
  searchRepos: ["davila7/claude-code-templates"],
});

export const ENTITIES: Record<EntityName, Entity> = {
  agent: {
    name: "agent",
    locate: (name, scope) => join(claudeDir("agents", scope), `${name}.md`),
    scaffold: (name) =>
      buildFrontmatter({
        name,
        description: `[What this sub-agent specializes in] + [when the parent agent should delegate to it].`,
        tools: "Read, Grep, Glob",
        model: "inherit",
      }) +
      `\n\nYou are the ${name} sub-agent.\n\n` +
      `## Responsibility\n\n[The single class of task this sub-agent owns. Keep it narrow.]\n\n` +
      `## Method\n\n[Step-by-step approach. The body becomes the sub-agent system prompt; it\n` +
      `receives only this plus the invoking prompt, never the parent conversation.]\n\n` +
      `## Output\n\n[Exact shape the parent expects back. A sub-agent that returns prose when\n` +
      `the parent wanted a file list has failed.]\n`,
    registries: [aitmpl("agent")],
  },

  skill: {
    name: "skill",
    locate: (name, scope) => join(claudeDir("skills", scope), name, "SKILL.md"),
    scaffold: (name) =>
      buildFrontmatter({
        name,
        description: `[What it does] + [when to use it] + [trigger phrases]. Make sure to use this skill whenever the user mentions [domain], even when they do not explicitly ask for [function].`,
        metadata: { author: process.env.USER ?? "team", version: "0.1.0" },
      }) +
      `\n\n# ${name}\n\n[One or two sentences: what this skill is and why it exists.]\n\n` +
      `## How to use this skill\n\n[Imperative, step-by-step. Reference bundled scripts/references and say when to load each.]\n\n` +
      `## Examples\n\n[At least one concrete worked example. Agents pattern-match against examples more reliably than prose.]\n\n` +
      `## Gotchas\n\n[Environment facts that defy reasonable assumptions. Often the highest-value section.]\n`,
    registries: [SKILLS_SH, aitmpl("skill")],
  },

  command: {
    name: "command",
    locate: (name, scope) => join(claudeDir("commands", scope), `${name}.md`),
    scaffold: (name) =>
      buildFrontmatter({
        description: `[What /${name} does in one line.]`,
        "argument-hint": "[arg]",
      }) +
      `\n\n# /${name}\n\n` +
      `[The prompt the agent runs when the user types /${name}. Use $ARGUMENTS for all\n` +
      `passed arguments, or $1, $2 for individual ones. Reference bundled scripts with\n` +
      `\${CLAUDE_SKILL_DIR} so paths resolve regardless of the working directory.]\n`,
    registries: [aitmpl("command")],
  },

  template: {
    name: "template",
    // Templates carry a .template.<ext> suffix so editors highlight and lint the target language.
    locate: (name, _scope) => join(process.cwd(), "assets", "templates", name),
    scaffold: (name) =>
      `# ${name}\n\n` +
      `Canonical starting point for a generated \`${name.replace(/\.template\.[^.]+$/, "")}\` file.\n` +
      `Copy it into place, replace the [placeholders], and revise until every line earns its context cost.\n\n` +
      "```\n[template body with [bracketed] placeholders the scaffolder fills in]\n```\n",
    registries: [aitmpl("template")],
  },

  reference: {
    name: "reference",
    locate: (name, _scope) => join(process.cwd(), "references", `${name}.md`),
    scaffold: (name) =>
      `# ${name}\n\n` +
      `[Reference documentation loaded on demand from SKILL.md. Keep it focused so it\n` +
      `consumes little context when loaded. Prefer annotated examples over prose.]\n\n` +
      `## Example\n\n` +
      "```\n[a concrete, runnable example of the thing this reference describes]\n```\n",
    registries: [],
  },

  mcp: {
    name: "mcp",
    // MCP servers are registered in a single .mcp.json at the project root.
    locate: (_name, _scope) => join(process.cwd(), ".mcp.json"),
    scaffold: (name) =>
      JSON.stringify(
        { mcpServers: { [name]: { type: "stdio", command: "npx", args: ["-y", `@scope/${name}`], env: {} } } },
        null,
        2,
      ) + "\n",
    registries: [aitmpl("mcp")],
  },

  plugin: {
    name: "plugin",
    locate: (name, scope) => join(claudeDir("plugins", scope), name, "plugin.json"),
    scaffold: (name) =>
      JSON.stringify(
        { name, version: "0.1.0", description: `[What the ${name} plugin bundles]`, commands: [], agents: [], skills: [], hooks: [], mcpServers: [] },
        null,
        2,
      ) + "\n",
    registries: [aitmpl("plugin")],
  },
};

export function resolveEntity(name: string): Entity {
  const entity = ENTITIES[name as EntityName];
  if (!entity) throw new Error(`unknown entity: ${name}`);
  return entity;
}
