#!/usr/bin/env bun
// fetch_catalog.ts
// Builds references/catalog.json by querying every catalog source in parallel.
// Designed for Bun. Run: bun scripts/fetch_catalog.ts [--github-user=<handle>] [--no-cache]

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

type Product =
  | "Workers" | "D1" | "R2" | "KV" | "DurableObjects" | "Queues" | "Workflows"
  | "Agents" | "Containers" | "Sandboxes" | "Vectorize" | "WorkersAI"
  | "Hyperdrive" | "BrowserRendering" | "Images" | "Stream" | "Calls"
  | "Email" | "Pages" | "Zaraz" | "Radar" | "AnalyticsEngine";

type Language = "TypeScript" | "JavaScript" | "Rust" | "Python" | "Go";

type Framework =
  | "Hono" | "Vue" | "React" | "Astro" | "Next.js" | "Qwik"
  | "SvelteKit" | "Remix" | "None";

type CatalogEntry = {
  catalog_id: string;
  name: string;
  description: string;
  type: "template" | "starter" | "reference-arch" | "demo" | "doc" | "custom";
  source: "c3" | "cloudflare-templates" | "reference-architecture" | "first-party-repo" | "user-github" | "user-added";
  action: "create-cloudflare" | "git-clone" | "fetch-docs" | "npm-package";
  products: Product[];
  languages: Language[];
  frameworks: Framework[];
  fields: {
    template_id?: string;
    url?: string;
    ref?: string;
    subpath?: string;
    package?: string;
  };
  meta: {
    source_url?: string;
    stars?: number;
    last_updated?: string;
    official: boolean;
  };
};

type Catalog = {
  meta: {
    fetched_at: string;
    sources_fetched: string[];
    sources_failed: { source: string; reason: string }[];
    entry_count: number;
  };
  entries: CatalogEntry[];
};

const { values: args } = parseArgs({
  options: {
    "github-user": { type: "string", default: "danielbodnar" },
    "no-cache": { type: "boolean", default: false },
    "output": { type: "string", default: "references/catalog.json" },
  },
});

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GH_HEADERS: Record<string, string> = {
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "cloudflare-compose-skill",
};
if (GITHUB_TOKEN) GH_HEADERS.Authorization = `Bearer ${GITHUB_TOKEN}`;

async function gh(path: string): Promise<any> {
  const url = path.startsWith("http") ? path : `https://api.github.com${path}`;
  const res = await fetch(url, { headers: GH_HEADERS });
  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
    throw new Error("GitHub rate limited. Set GITHUB_TOKEN for higher limits.");
  }
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${url}`);
  return res.json();
}

async function ghText(path: string): Promise<string> {
  const url = path.startsWith("http") ? path : `https://api.github.com${path}`;
  const res = await fetch(url, { headers: GH_HEADERS });
  if (!res.ok) return "";
  return res.text();
}

async function ghRawFile(owner: string, repo: string, ref: string, path: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  const res = await fetch(url);
  if (!res.ok) return "";
  return res.text();
}

function detectProductsFromWrangler(config: string): Product[] {
  const products = new Set<Product>(["Workers"]);
  const map: Record<string, Product> = {
    d1_databases: "D1",
    r2_buckets: "R2",
    kv_namespaces: "KV",
    durable_objects: "DurableObjects",
    queues: "Queues",
    workflows: "Workflows",
    vectorize: "Vectorize",
    ai: "WorkersAI",
    hyperdrive: "Hyperdrive",
    browser: "BrowserRendering",
    images: "Images",
    analytics_engine_datasets: "AnalyticsEngine",
    containers: "Containers",
  };
  for (const [key, product] of Object.entries(map)) {
    if (config.includes(key)) products.add(product);
  }
  return [...products];
}

function detectProductsFromPackageJson(pkg: string): Product[] {
  const products: Product[] = [];
  if (pkg.includes('"agents"')) products.push("Agents");
  if (pkg.includes("@cloudflare/sandbox")) products.push("Sandboxes");
  if (pkg.includes("@cloudflare/containers")) products.push("Containers");
  if (pkg.includes("@cloudflare/ai") || pkg.includes('"ai"')) products.push("WorkersAI");
  return products;
}

function detectLanguage(files: string[]): Language[] {
  const langs = new Set<Language>();
  if (files.some(f => f.endsWith(".ts") || f.endsWith(".tsx"))) langs.add("TypeScript");
  if (files.some(f => f.endsWith(".js") || f.endsWith(".jsx") || f.endsWith(".mjs"))) langs.add("JavaScript");
  if (files.some(f => f.endsWith(".rs") || f === "Cargo.toml")) langs.add("Rust");
  if (files.some(f => f.endsWith(".py"))) langs.add("Python");
  if (files.some(f => f.endsWith(".go") || f === "go.mod")) langs.add("Go");
  return langs.size > 0 ? [...langs] : ["TypeScript"];
}

function detectFrameworks(pkg: string): Framework[] {
  const fw: Framework[] = [];
  if (pkg.includes('"hono"')) fw.push("Hono");
  if (pkg.includes('"vue"') || pkg.includes('"nuxt"')) fw.push("Vue");
  if (pkg.includes('"react"') || pkg.includes('"next"')) fw.push("React");
  if (pkg.includes('"astro"')) fw.push("Astro");
  if (pkg.includes('"next"')) fw.push("Next.js");
  if (pkg.includes('"@qwik"')) fw.push("Qwik");
  if (pkg.includes('"@sveltejs/kit"')) fw.push("SvelteKit");
  if (pkg.includes('"@remix-run"')) fw.push("Remix");
  return fw.length > 0 ? fw : ["None"];
}

// --- Source 1: create-cloudflare templates ---
async function fetchC3Templates(): Promise<CatalogEntry[]> {
  const entries: CatalogEntry[] = [];
  const paths = [
    "packages/create-cloudflare/templates",
    "packages/create-cloudflare/templates-experimental",
  ];
  for (const path of paths) {
    const dirs = await gh(`/repos/cloudflare/workers-sdk/contents/${path}`).catch(() => []);
    for (const dir of Array.isArray(dirs) ? dirs : []) {
      if (dir.type !== "dir") continue;
      const c3Meta = await ghRawFile("cloudflare", "workers-sdk", "main", `${path}/${dir.name}/c3.json`);
      let description = dir.name;
      if (c3Meta) {
        try {
          const parsed = JSON.parse(c3Meta);
          description = parsed.description || parsed.displayName || dir.name;
        } catch {}
      }
      const wrangler = await ghRawFile("cloudflare", "workers-sdk", "main", `${path}/${dir.name}/templates/wrangler.jsonc`)
        || await ghRawFile("cloudflare", "workers-sdk", "main", `${path}/${dir.name}/wrangler.jsonc`);
      const pkg = await ghRawFile("cloudflare", "workers-sdk", "main", `${path}/${dir.name}/templates/package.json`)
        || await ghRawFile("cloudflare", "workers-sdk", "main", `${path}/${dir.name}/package.json`);
      entries.push({
        catalog_id: `c3:${dir.name}`,
        name: dir.name,
        description,
        type: "template",
        source: "c3",
        action: "create-cloudflare",
        products: [...new Set([...detectProductsFromWrangler(wrangler), ...detectProductsFromPackageJson(pkg)])],
        languages: detectLanguage([pkg]),
        frameworks: detectFrameworks(pkg),
        fields: { template_id: dir.name },
        meta: {
          source_url: `https://github.com/cloudflare/workers-sdk/tree/main/${path}/${dir.name}`,
          official: true,
        },
      });
    }
  }
  return entries;
}

// --- Source 2: cloudflare/templates gallery ---
async function fetchTemplatesGallery(): Promise<CatalogEntry[]> {
  const entries: CatalogEntry[] = [];
  const dirs = await gh("/repos/cloudflare/templates/contents/").catch(() => []);
  for (const dir of Array.isArray(dirs) ? dirs : []) {
    if (dir.type !== "dir" || dir.name.startsWith(".")) continue;
    const readme = await ghRawFile("cloudflare", "templates", "main", `${dir.name}/README.md`);
    const firstPara = readme.split("\n").find(l => l.trim() && !l.startsWith("#")) || dir.name;
    const wrangler = await ghRawFile("cloudflare", "templates", "main", `${dir.name}/wrangler.jsonc`)
      || await ghRawFile("cloudflare", "templates", "main", `${dir.name}/wrangler.toml`);
    const pkg = await ghRawFile("cloudflare", "templates", "main", `${dir.name}/package.json`);
    entries.push({
      catalog_id: `gh:cloudflare-templates/${dir.name}`,
      name: dir.name,
      description: firstPara.slice(0, 200),
      type: "template",
      source: "cloudflare-templates",
      action: "git-clone",
      products: [...new Set([...detectProductsFromWrangler(wrangler), ...detectProductsFromPackageJson(pkg)])],
      languages: detectLanguage([pkg]),
      frameworks: detectFrameworks(pkg),
      fields: {
        url: "https://github.com/cloudflare/templates",
        ref: "main",
        subpath: dir.name,
      },
      meta: {
        source_url: `https://github.com/cloudflare/templates/tree/main/${dir.name}`,
        official: true,
      },
    });
  }
  return entries;
}

// --- Source 3: Reference Architectures ---
async function fetchReferenceArchitectures(): Promise<CatalogEntry[]> {
  const entries: CatalogEntry[] = [];
  const sitemapUrl = "https://developers.cloudflare.com/sitemap-0.xml";
  const res = await fetch(sitemapUrl);
  if (!res.ok) return entries;
  const xml = await res.text();
  const urlMatches = [...xml.matchAll(/<loc>(https:\/\/developers\.cloudflare\.com\/reference-architecture\/[^<]+)<\/loc>/g)];
  for (const m of urlMatches.slice(0, 100)) {
    const url = m[1];
    const slug = url.replace(/\/$/, "").split("/").slice(-2).join("/");
    const pageRes = await fetch(url).catch(() => null);
    if (!pageRes?.ok) continue;
    const html = await pageRes.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
    const name = titleMatch?.[1]?.replace(/\s*·.*$/, "").trim() || slug;
    const description = descMatch?.[1]?.trim().slice(0, 300) || "Cloudflare reference architecture";
    const productsFromBody: Product[] = [];
    for (const p of ["D1","R2","KV","DurableObjects","Queues","Workflows","Agents","Containers","Vectorize","WorkersAI","Hyperdrive"] as const) {
      const needle = p === "DurableObjects" ? "Durable Objects" : p === "WorkersAI" ? "Workers AI" : p;
      if (html.includes(needle)) productsFromBody.push(p);
    }
    entries.push({
      catalog_id: `ra:${slug}`,
      name,
      description,
      type: "reference-arch",
      source: "reference-architecture",
      action: "fetch-docs",
      products: productsFromBody.length > 0 ? productsFromBody : ["Workers"],
      languages: [],
      frameworks: [],
      fields: { url },
      meta: { source_url: url, official: true },
    });
  }
  return entries;
}

// --- Source 4: First-party demo repos ---
const FIRST_PARTY_REPOS: { owner: string; repo: string; subpath?: string }[] = [
  { owner: "cloudflare", repo: "agents-starter" },
  { owner: "cloudflare", repo: "agents" },
  { owner: "cloudflare", repo: "ai" },
  { owner: "cloudflare", repo: "workers-ai-notebooks" },
  { owner: "cloudflare", repo: "workflows-starter" },
  { owner: "cloudflare", repo: "containers-template" },
  { owner: "cloudflare", repo: "sandbox" },
  { owner: "cloudflare", repo: "workers-sdk" },
];

async function fetchFirstPartyRepos(): Promise<CatalogEntry[]> {
  const entries: CatalogEntry[] = [];
  for (const { owner, repo, subpath } of FIRST_PARTY_REPOS) {
    const meta = await gh(`/repos/${owner}/${repo}`).catch(() => null);
    if (!meta) continue;
    const branch = meta.default_branch || "main";
    const wrangler = await ghRawFile(owner, repo, branch, subpath ? `${subpath}/wrangler.jsonc` : "wrangler.jsonc");
    const pkg = await ghRawFile(owner, repo, branch, subpath ? `${subpath}/package.json` : "package.json");
    entries.push({
      catalog_id: `gh:${owner}/${repo}${subpath ? `#${subpath}` : ""}`,
      name: subpath ? `${repo}/${subpath}` : repo,
      description: meta.description || "",
      type: "demo",
      source: "first-party-repo",
      action: "git-clone",
      products: [...new Set([...detectProductsFromWrangler(wrangler), ...detectProductsFromPackageJson(pkg)])],
      languages: detectLanguage([pkg]),
      frameworks: detectFrameworks(pkg),
      fields: {
        url: meta.html_url,
        ref: branch,
        ...(subpath ? { subpath } : {}),
      },
      meta: {
        source_url: meta.html_url,
        stars: meta.stargazers_count,
        last_updated: meta.pushed_at,
        official: true,
      },
    });
  }
  return entries;
}

// --- Source 5: User's GitHub (owned + starred) ---
async function fetchUserGithub(user: string): Promise<CatalogEntry[]> {
  const entries: CatalogEntry[] = [];
  const repos: any[] = [];
  try {
    const owned = await gh(`/users/${user}/repos?per_page=100&type=owner&sort=updated`);
    repos.push(...owned.map((r: any) => ({ ...r, _user_owned: true })));
  } catch {}
  try {
    const starred = await gh(`/users/${user}/starred?per_page=100`);
    repos.push(...starred.map((r: any) => ({ ...r, _user_starred: true })));
  } catch {}

  for (const repo of repos) {
    const branch = repo.default_branch || "main";
    const wrangler = await ghRawFile(repo.owner.login, repo.name, branch, "wrangler.jsonc")
      || await ghRawFile(repo.owner.login, repo.name, branch, "wrangler.toml")
      || await ghRawFile(repo.owner.login, repo.name, branch, "wrangler.json");
    const pkg = await ghRawFile(repo.owner.login, repo.name, branch, "package.json");
    const isCloudflareRelated = wrangler || (pkg && pkg.includes("wrangler"));
    if (!isCloudflareRelated) continue;
    entries.push({
      catalog_id: `gh:${repo.owner.login}/${repo.name}`,
      name: repo.full_name,
      description: repo.description || "",
      type: "custom",
      source: "user-github",
      action: "git-clone",
      products: [...new Set([...detectProductsFromWrangler(wrangler), ...detectProductsFromPackageJson(pkg)])],
      languages: detectLanguage([pkg]),
      frameworks: detectFrameworks(pkg),
      fields: { url: repo.html_url, ref: branch },
      meta: {
        source_url: repo.html_url,
        stars: repo.stargazers_count,
        last_updated: repo.pushed_at,
        official: false,
        ...(repo._user_owned ? { user_owned: true } : {}),
        ...(repo._user_starred ? { user_starred: true } : {}),
      } as any,
    });
  }
  return entries;
}

// --- Main ---
async function main() {
  const outPath = args.output!;
  const sourcesFetched: string[] = [];
  const sourcesFailed: { source: string; reason: string }[] = [];
  const allEntries: CatalogEntry[] = [];

  const tasks: [string, Promise<CatalogEntry[]>][] = [
    ["c3", fetchC3Templates()],
    ["cloudflare-templates", fetchTemplatesGallery()],
    ["reference-architecture", fetchReferenceArchitectures()],
    ["first-party-repo", fetchFirstPartyRepos()],
    ["user-github", fetchUserGithub(args["github-user"]!)],
  ];

  for (const [name, promise] of tasks) {
    console.error(`Fetching ${name}...`);
    try {
      const entries = await promise;
      allEntries.push(...entries);
      sourcesFetched.push(name);
      console.error(`  ${name}: ${entries.length} entries`);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      sourcesFailed.push({ source: name, reason });
      console.error(`  ${name}: FAILED — ${reason}`);
    }
  }

  // Dedupe by catalog_id (later entries win, which happens to favor user-github over first-party)
  const dedup = new Map<string, CatalogEntry>();
  for (const e of allEntries) dedup.set(e.catalog_id, e);
  const finalEntries = [...dedup.values()].sort((a, b) => a.catalog_id.localeCompare(b.catalog_id));

  const catalog: Catalog = {
    meta: {
      fetched_at: new Date().toISOString(),
      sources_fetched: sourcesFetched,
      sources_failed: sourcesFailed,
      entry_count: finalEntries.length,
    },
    entries: finalEntries,
  };

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(catalog, null, 2));
  console.error(`Wrote ${finalEntries.length} entries to ${outPath}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
