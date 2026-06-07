#!/usr/bin/env bun
// analyze_scaffold.ts
//
// Walks the scaffolded monorepo (default: ./scaffolding) and emits ANALYSIS.md
// summarizing bindings, dependencies, entry points, routes, env vars, and collisions.
//
// Usage:
//   bun run scripts/analyze_scaffold.ts
//   bun run scripts/analyze_scaffold.ts --root=./scaffolding --output=./ANALYSIS.md

import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    root: { type: "string", default: "./scaffolding" },
    output: { type: "string", default: "./ANALYSIS.md" },
  },
});

type Bindings = {
  d1: any[];
  r2: any[];
  kv: any[];
  durable_objects: any[];
  queues_producers: any[];
  queues_consumers: any[];
  workflows: any[];
  vectorize: any[];
  ai: any;
  hyperdrive: any[];
  browser: any;
  images: any;
  analytics_engine: any[];
  containers: any[];
  services: any[];
  mtls: any[];
  assets: any;
};

type Wrangler = {
  exists: boolean;
  path?: string;
  format?: "jsonc" | "toml";
  name?: string;
  main?: string;
  compatibility_date?: string;
  compatibility_flags?: string[];
  bindings?: Bindings;
  routes?: any[];
  crons?: string[];
  vars?: Record<string, unknown>;
  migrations?: any[];
  envs?: string[];
  parse_failed?: boolean;
};

type PackageJson = {
  exists: boolean;
  path?: string;
  name?: string;
  version?: string;
  type?: string;
  main?: string;
  module?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  parse_failed?: boolean;
};

type SourceAnalysis = {
  name: string;
  path: string;
  wrangler: Wrangler;
  package_json: PackageJson;
  dev_vars: string[];
  env_example: string[];
  entry: string;
};

function stripJsonc(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

async function readJsonc<T = unknown>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(stripJsonc(raw)) as T;
  } catch {
    return null;
  }
}

async function collectSources(root: string): Promise<{ name: string; path: string }[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && !e.name.startsWith("."))
    .map(e => ({ name: e.name, path: join(root, e.name) }));
}

function extractBindings(w: Record<string, any>): Bindings {
  return {
    d1: w.d1_databases || [],
    r2: w.r2_buckets || [],
    kv: w.kv_namespaces || [],
    durable_objects: w.durable_objects?.bindings || [],
    queues_producers: w.queues?.producers || [],
    queues_consumers: w.queues?.consumers || [],
    workflows: w.workflows || [],
    vectorize: w.vectorize || [],
    ai: w.ai ?? null,
    hyperdrive: w.hyperdrive || [],
    browser: w.browser ?? null,
    images: w.images ?? null,
    analytics_engine: w.analytics_engine_datasets || [],
    containers: w.containers || [],
    services: w.services || [],
    mtls: w.mtls_certificates || [],
    assets: w.assets ?? null,
  };
}

async function readWrangler(sourcePath: string): Promise<Wrangler> {
  const candidates = [
    join(sourcePath, "wrangler.jsonc"),
    join(sourcePath, "wrangler.json"),
    join(sourcePath, "wrangler.toml"),
  ];
  const found = candidates.find(p => existsSync(p));
  if (!found) return { exists: false };

  if (found.endsWith(".toml")) {
    return { exists: true, path: found, format: "toml", parse_failed: true };
  }

  const parsed = await readJsonc<Record<string, any>>(found);
  if (!parsed) return { exists: true, path: found, format: "jsonc", parse_failed: true };

  return {
    exists: true,
    path: found,
    format: "jsonc",
    name: parsed.name,
    main: parsed.main,
    compatibility_date: parsed.compatibility_date,
    compatibility_flags: parsed.compatibility_flags || [],
    bindings: extractBindings(parsed),
    routes: parsed.routes || [],
    crons: parsed.triggers?.crons || [],
    vars: parsed.vars || {},
    migrations: parsed.migrations || [],
    envs: parsed.env ? Object.keys(parsed.env) : [],
  };
}

async function readPackageJson(sourcePath: string): Promise<PackageJson> {
  const p = join(sourcePath, "package.json");
  if (!existsSync(p)) return { exists: false };
  try {
    const raw = await readFile(p, "utf8");
    const parsed = JSON.parse(raw);
    return {
      exists: true,
      path: p,
      name: parsed.name,
      version: parsed.version,
      type: parsed.type,
      main: parsed.main,
      module: parsed.module,
      scripts: parsed.scripts || {},
      dependencies: parsed.dependencies || {},
      devDependencies: parsed.devDependencies || {},
    };
  } catch {
    return { exists: true, path: p, parse_failed: true };
  }
}

async function readKeyFile(sourcePath: string, filename: string): Promise<string[]> {
  const p = join(sourcePath, filename);
  if (!existsSync(p)) return [];
  try {
    const raw = await readFile(p, "utf8");
    return raw
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#") && l.includes("="))
      .map(l => l.split("=")[0]!.trim());
  } catch {
    return [];
  }
}

async function detectEntry(sourcePath: string, pkg: PackageJson, wrangler: Wrangler): Promise<string> {
  if (wrangler.main) return wrangler.main;
  if (pkg.main) return pkg.main;
  if (pkg.module) return pkg.module;
  const candidates = ["src/index.ts", "src/worker.ts", "index.ts", "worker.ts", "src/index.js"];
  for (const c of candidates) {
    if (existsSync(join(sourcePath, c))) return c;
  }
  return "unknown";
}

async function analyzeSource(src: { name: string; path: string }): Promise<SourceAnalysis> {
  const wrangler = await readWrangler(src.path);
  const pkg = await readPackageJson(src.path);
  const dev_vars = await readKeyFile(src.path, ".dev.vars");
  const env_example =
    (await readKeyFile(src.path, ".env.example")) ||
    (await readKeyFile(src.path, ".env.sample"));
  const entry = await detectEntry(src.path, pkg, wrangler);
  return { name: src.name, path: src.path, wrangler, package_json: pkg, dev_vars, env_example, entry };
}

function summarizeBindings(b: Bindings | undefined): string {
  if (!b) return "none detected";
  const parts: string[] = [];
  if (b.d1.length) parts.push(`D1:${b.d1.length}`);
  if (b.r2.length) parts.push(`R2:${b.r2.length}`);
  if (b.kv.length) parts.push(`KV:${b.kv.length}`);
  if (b.durable_objects.length) parts.push(`DO:${b.durable_objects.length}`);
  if (b.queues_producers.length) parts.push(`Q-prod:${b.queues_producers.length}`);
  if (b.queues_consumers.length) parts.push(`Q-cons:${b.queues_consumers.length}`);
  if (b.workflows.length) parts.push(`Workflows:${b.workflows.length}`);
  if (b.vectorize.length) parts.push(`Vec:${b.vectorize.length}`);
  if (b.ai) parts.push("AI");
  if (b.hyperdrive.length) parts.push(`Hyper:${b.hyperdrive.length}`);
  if (b.browser) parts.push("Browser");
  if (b.images) parts.push("Images");
  if (b.containers.length) parts.push(`Containers:${b.containers.length}`);
  if (b.services.length) parts.push(`Services:${b.services.length}`);
  if (b.analytics_engine.length) parts.push(`AE:${b.analytics_engine.length}`);
  return parts.length === 0 ? "none detected" : parts.join(", ");
}

type Collision = { key: string; sources: string[] };
type Collisions = {
  binding: Collision[];
  do_class: Collision[];
  queue: Collision[];
  env_var: Collision[];
};

function detectCollisions(analyses: SourceAnalysis[]): Collisions {
  const bindingMap = new Map<string, string[]>();
  const doClassMap = new Map<string, string[]>();
  const queueMap = new Map<string, string[]>();
  const envVarMap = new Map<string, string[]>();

  const push = (m: Map<string, string[]>, key: string, source: string) => {
    if (!key) return;
    const arr = m.get(key) || [];
    arr.push(source);
    m.set(key, arr);
  };

  for (const src of analyses) {
    const b = src.wrangler.bindings;
    if (!b) continue;
    const collectBinding = (items: any[], field: string = "binding") => {
      for (const item of items) push(bindingMap, item[field], src.name);
    };
    collectBinding(b.d1);
    collectBinding(b.r2);
    collectBinding(b.kv);
    collectBinding(b.durable_objects, "name");
    collectBinding(b.queues_producers);
    collectBinding(b.workflows);
    collectBinding(b.vectorize);
    collectBinding(b.hyperdrive);
    collectBinding(b.analytics_engine);
    collectBinding(b.services);

    for (const item of b.durable_objects) push(doClassMap, item.class_name, src.name);
    for (const item of b.queues_producers) push(queueMap, item.queue, src.name);
    for (const item of b.queues_consumers) push(queueMap, item.queue, src.name);

    for (const v of src.dev_vars) push(envVarMap, v, src.name);
  }

  const filter = (m: Map<string, string[]>): Collision[] =>
    [...m.entries()]
      .filter(([_, sources]) => sources.length > 1)
      .map(([key, sources]) => ({ key, sources }));

  return {
    binding: filter(bindingMap),
    do_class: filter(doClassMap),
    queue: filter(queueMap),
    env_var: filter(envVarMap),
  };
}

type MergedDeps = {
  deps: Map<string, { source: string; version: string }[]>;
  devDeps: Map<string, { source: string; version: string }[]>;
};

function mergeDeps(analyses: SourceAnalysis[]): MergedDeps {
  const deps = new Map<string, { source: string; version: string }[]>();
  const devDeps = new Map<string, { source: string; version: string }[]>();
  for (const src of analyses) {
    const pkg = src.package_json;
    if (!pkg.exists) continue;
    for (const [name, version] of Object.entries(pkg.dependencies || {})) {
      const arr = deps.get(name) || [];
      arr.push({ source: src.name, version });
      deps.set(name, arr);
    }
    for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
      const arr = devDeps.get(name) || [];
      arr.push({ source: src.name, version });
      devDeps.set(name, arr);
    }
  }
  return { deps, devDeps };
}

function renderCollisions(c: Collisions): string {
  const sections: string[] = [];
  const renderSection = (title: string, items: Collision[]) => {
    if (items.length === 0) return;
    const rows = items.map(r => `- **\`${r.key}\`** appears in: ${r.sources.join(", ")}`).join("\n");
    sections.push(`### ${title}\n\n${rows}`);
  };
  renderSection("Binding name collisions", c.binding);
  renderSection("Durable Object class collisions", c.do_class);
  renderSection("Queue name collisions", c.queue);
  renderSection("Env var collisions", c.env_var);
  if (sections.length === 0) return "No collisions detected. Synthesis can proceed without rename decisions.";
  return sections.join("\n\n");
}

function renderDeps(merged: MergedDeps): string {
  const conflicts = (m: Map<string, { source: string; version: string }[]>): string[] => {
    const out: string[] = [];
    for (const [name, sources] of m) {
      const versions = new Set(sources.map(s => s.version));
      if (versions.size > 1) {
        const detail = sources.map(s => `${s.source}=${s.version}`).join(", ");
        out.push(`- **${name}**: ${detail}`);
      }
    }
    return out;
  };
  const depConflicts = conflicts(merged.deps);
  const devConflicts = conflicts(merged.devDeps).map(l => l.replace(/^- /, "- (dev) "));
  const total = `Total unique dependencies: ${merged.deps.size} runtime, ${merged.devDeps.size} dev.`;
  if (depConflicts.length === 0 && devConflicts.length === 0) {
    return `${total}\n\nNo dependency version conflicts.`;
  }
  return `${total}\n\n### Version conflicts\n\n${[...depConflicts, ...devConflicts].join("\n")}`;
}

function renderSourceBlock(s: SourceAnalysis): string {
  return `### ${s.name}

- **Path**: \`${s.path}\`
- **Wrangler format**: ${s.wrangler.format || "none"}
- **Entry**: \`${s.entry}\`
- **Compatibility date**: ${s.wrangler.compatibility_date || "not set"}
- **Compatibility flags**: ${(s.wrangler.compatibility_flags || []).join(", ") || "none"}
- **Bindings**: ${summarizeBindings(s.wrangler.bindings)}
- **Routes**: ${(s.wrangler.routes || []).length} entries
- **Crons**: ${(s.wrangler.crons || []).length} entries
- **Dev vars declared**: ${s.dev_vars.length} keys${s.dev_vars.length ? ` (${s.dev_vars.slice(0, 6).join(", ")}${s.dev_vars.length > 6 ? "..." : ""})` : ""}
- **Scripts**: ${Object.keys(s.package_json.scripts || {}).join(", ") || "none"}
`;
}

function renderReport(analyses: SourceAnalysis[], root: string): string {
  const sourcesSection = analyses.map(renderSourceBlock).join("\n");
  const collisions = detectCollisions(analyses);
  const collisionSection = renderCollisions(collisions);
  const merged = mergeDeps(analyses);
  const depsSection = renderDeps(merged);

  return `# Scaffold analysis

Generated: ${new Date().toISOString()}
Scaffolding root: \`${root}\`
Sources analyzed: ${analyses.length}

## Sources

${sourcesSection}

## Collision report

${collisionSection}

## Dependency reconciliation

${depsSection}

## Next steps

Proceed to Phase 6 (L3 synthesis) using the playbook at \`references/l3-synthesis-playbook.md\`.
Key decisions you'll be asked to make:

1. **Architecture option** (monolith / service-bindings / DO-centric).
2. **Collision resolutions** for any items flagged above.
3. **Major version dependency bumps** if any are required.

Collisions flagged above must be resolved during synthesis. Minor or no collisions means synthesis should proceed without user intervention on binding renames.
`;
}

async function main(): Promise<void> {
  const root = args.root!;
  const output = args.output!;
  if (!existsSync(root)) {
    throw new Error(`Scaffolding root does not exist: ${root}`);
  }

  const sources = await collectSources(root);
  const analyses: SourceAnalysis[] = [];
  for (const src of sources) {
    analyses.push(await analyzeSource(src));
  }
  const report = renderReport(analyses, root);
  await writeFile(output, report);
  console.log(`Wrote ${output} covering ${analyses.length} source(s).`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
