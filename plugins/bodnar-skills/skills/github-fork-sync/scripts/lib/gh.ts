// Thin wrapper around the `gh` CLI with cache integration.
// We use `gh` rather than Octokit directly because it handles auth
// (token rotation, GH_TOKEN, gh-cli config) without us reimplementing it.
// Sane Defaults: align with the upstream platform.

import type { Database } from "bun:sqlite";
import * as cache from "./cache.ts";

export type GhError = {
  status: number;
  message: string;
  stderr: string;
};

/**
 * Run `gh` with arguments, return parsed stdout (assumed JSON).
 * Throws GhError on non-zero exit.
 */
export async function ghJson<T = unknown>(args: string[]): Promise<T> {
  const proc = Bun.spawn(["gh", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw {
      status: exitCode,
      message: `gh ${args.join(" ")} exited ${exitCode}`,
      stderr,
    } satisfies GhError;
  }
  if (!stdout.trim()) return undefined as T;
  return JSON.parse(stdout) as T;
}

/**
 * Run `gh` for a side effect (no JSON parsing).
 * Returns stdout as string, throws on non-zero exit.
 */
export async function ghRun(args: string[]): Promise<string> {
  const proc = Bun.spawn(["gh", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw {
      status: exitCode,
      message: `gh ${args.join(" ")} exited ${exitCode}`,
      stderr,
    } satisfies GhError;
  }
  return stdout;
}

/**
 * REST API call via `gh api`, with cache support.
 * For GET requests, consults the cache first. ETag conditional requests
 * happen via `gh api -H "If-None-Match: \"<etag>\""` when we have one.
 */
export async function ghApi<T = unknown>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    fields?: Record<string, string>;
    rawFields?: Record<string, string>;
    db?: Database;
    cacheKey?: string;
    cacheTtlSeconds?: number;
    skipCache?: boolean;
  } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const args: string[] = ["api", endpoint, "-X", method];

  for (const [k, v] of Object.entries(options.fields ?? {})) {
    args.push("-f", `${k}=${v}`);
  }
  for (const [k, v] of Object.entries(options.rawFields ?? {})) {
    args.push("-F", `${k}=${v}`);
  }

  // Cache only on GET. POST/merge-upstream is not idempotent at the cache layer
  // even though the GitHub endpoint itself is idempotent in effect.
  if (method !== "GET" || !options.db || options.skipCache) {
    return ghJson<T>(args);
  }

  const key = options.cacheKey ?? cache.cacheKey(method, endpoint, options.fields);
  const fresh = cache.getFresh<T>(options.db, key);
  if (fresh !== null) return fresh;

  // Have a stale entry with an ETag? Try conditional request.
  const meta = cache.getMetadata(options.db, key);
  if (meta?.etag) {
    args.push("-H", `If-None-Match: ${meta.etag}`);
    args.push("--include"); // include headers so we can detect 304
    try {
      const raw = await ghRun(args);
      // gh --include puts headers first, blank line, then body.
      const headerEnd = raw.indexOf("\n\n") !== -1 ? raw.indexOf("\n\n") : raw.indexOf("\r\n\r\n");
      const headers = headerEnd > 0 ? raw.slice(0, headerEnd) : raw;
      if (/\bHTTP\/[\d.]+\s+304\b/i.test(headers)) {
        // 304 Not Modified: refresh expiry, return cached body
        cache.refreshExpiry(options.db, key, options.cacheTtlSeconds);
        const cached = cache.getFresh<T>(options.db, key);
        if (cached !== null) return cached;
      }
      // Otherwise it's a fresh body. Strip headers and parse.
      const bodyStr = headerEnd > 0 ? raw.slice(headerEnd).trim() : raw;
      const body = JSON.parse(bodyStr) as T;
      const newEtag = extractEtag(headers);
      cache.put(options.db, key, body, {
        etag: newEtag,
        ttlSeconds: options.cacheTtlSeconds,
      });
      return body;
    } catch (e) {
      // Fall through to normal fetch on error
    }
  }

  // Normal fetch with --include to capture ETag
  const argsWithHeaders = [...args, "--include"];
  const raw = await ghRun(argsWithHeaders);
  const headerEnd = raw.indexOf("\n\n") !== -1 ? raw.indexOf("\n\n") : raw.indexOf("\r\n\r\n");
  const headers = headerEnd > 0 ? raw.slice(0, headerEnd) : "";
  const bodyStr = headerEnd > 0 ? raw.slice(headerEnd).trim() : raw;
  const body = JSON.parse(bodyStr) as T;
  const etag = extractEtag(headers);
  cache.put(options.db, key, body, {
    etag,
    ttlSeconds: options.cacheTtlSeconds,
  });
  return body;
}

function extractEtag(headers: string): string | null {
  const match = headers.match(/^etag:\s*(.+)$/im);
  return match?.[1]?.trim() ?? null;
}

/**
 * GraphQL via `gh api graphql`.
 * Used to fetch fork lists efficiently in a single round-trip.
 */
export async function ghGraphql<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  options: {
    db?: Database;
    cacheKey?: string;
    cacheTtlSeconds?: number;
    skipCache?: boolean;
  } = {},
): Promise<T> {
  const key = options.cacheKey
    ? `graphql:${options.cacheKey}`
    : `graphql:${hashString(query + JSON.stringify(variables))}`;

  if (options.db && !options.skipCache) {
    const fresh = cache.getFresh<T>(options.db, key);
    if (fresh !== null) return fresh;
  }

  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [k, v] of Object.entries(variables)) {
    args.push("-F", `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`);
  }
  const result = await ghJson<{ data: T; errors?: unknown[] }>(args);
  if (result.errors && result.errors.length > 0) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }
  if (options.db) {
    cache.put(options.db, key, result.data, {
      ttlSeconds: options.cacheTtlSeconds ?? 60 * 60,
    });
  }
  return result.data;
}

function hashString(s: string): string {
  // Fast non-crypto hash for cache keys. djb2.
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * Check that gh is installed and authenticated. Returns the auth status text.
 */
export async function ensureAuthenticated(): Promise<string> {
  try {
    const status = await ghRun(["auth", "status"]);
    return status;
  } catch (e) {
    const err = e as GhError;
    throw new Error(
      `gh is not authenticated. Run 'gh auth login' first.\n${err.stderr}`,
    );
  }
}
