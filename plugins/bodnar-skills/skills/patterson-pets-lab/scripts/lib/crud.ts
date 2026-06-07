// Generic verb engine. Every scripts/<verb>/<entity>.ts calls runVerb(verb, entity, argv).
// The verbs are deliberately distinct in meaning:
//   create  scaffold a brand-new local instance from the entity template
//   find    search the registries (and local scope) for matching instances
//   add     install an existing instance from a registry into this project
//   remove  delete a local instance
//   edit    locate a local instance and open it in $EDITOR

import { resolveEntity, type Entity } from "./entities.ts";
import { exists, openInEditor, writeFile } from "./fs.ts";
import { die, log } from "./log.ts";
import { flag, positional, scopeFor, type Scope } from "./paths.ts";

export type Verb = "create" | "find" | "add" | "remove" | "edit";

async function gh(args: string[]): Promise<string> {
  const proc = Bun.spawn(["gh", ...args], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out;
}

async function create(entity: Entity, name: string, scope: Scope, force: boolean): Promise<void> {
  const path = entity.locate(name, scope);
  await writeFile(path, entity.scaffold(name), force);
  log.info(`scaffolded ${entity.name} "${name}". Replace the [placeholders] before shipping.`);
}

async function find(entity: Entity, query: string): Promise<void> {
  if (entity.registries.length === 0) {
    log.warn(`${entity.name} has no registry; it is local-only. Use create instead.`);
    return;
  }
  for (const registry of entity.registries) {
    log.step(`searching ${registry.label} for "${query}"`);
    for (const repo of registry.searchRepos) {
      const hits = await gh(["search", "code", query, "--repo", repo, "--limit", "5", "--json", "path,repository"]).catch(() => "");
      if (hits.trim()) log.out(hits.trim());
    }
    log.info(`install with: ${registry.install(query)}`);
  }
}

async function add(entity: Entity, ref: string): Promise<void> {
  const registry = entity.registries[0];
  if (!registry) die(`${entity.name} is local-only; nothing to install. Use create instead.`);
  const cmd = registry.install(ref).split(" ");
  log.step(`installing via: ${registry.install(ref)}`);
  const proc = Bun.spawn(cmd, { stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  if (code !== 0) die(`install failed (exit ${code})`);
  log.ok(`added ${entity.name} "${ref}"`);
}

async function remove(entity: Entity, name: string, scope: Scope): Promise<void> {
  const path = entity.locate(name, scope);
  if (!(await exists(path))) die(`no ${entity.name} found at ${path}`);
  await Bun.$`rm -rf ${path}`;
  log.ok(`removed ${path}`);
}

async function edit(entity: Entity, name: string, scope: Scope): Promise<void> {
  const path = entity.locate(name, scope);
  if (!(await exists(path))) die(`no ${entity.name} found at ${path}. Run: create ${entity.name} ${name}`);
  await openInEditor(path);
}

export async function runVerb(verb: Verb, entityName: string, argv: string[]): Promise<void> {
  const entity = resolveEntity(entityName);
  const [name] = positional(argv);
  const scope = scopeFor(argv);
  const force = argv.includes("--force");

  if (verb !== "find" && !name) die(`usage: ${verb} ${entityName} <name> [--personal] [--force]`);

  switch (verb) {
    case "create": return create(entity, name, scope, force);
    case "find": return find(entity, name ?? flag(argv, "query") ?? entityName);
    case "add": return add(entity, name);
    case "remove": return remove(entity, name, scope);
    case "edit": return edit(entity, name, scope);
  }
}
