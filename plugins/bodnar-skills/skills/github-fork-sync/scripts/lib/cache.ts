// ETag-aware cache for gh API responses.
// Stores response bodies in SQLite alongside their ETags so subsequent
// requests can use If-None-Match to get a cheap 304 instead of full payload.

import type { Database } from "bun:sqlite";

export type CacheEntry = {
  cache_key: string;
  response_body: string;
  etag: string | null;
  fetched_at: string;
  expires_at: string;
  status: number;
};

export type CacheMetadata = {
  etag: string | null;
  fresh: boolean;
};

/**
 * Construct a stable cache key from method, endpoint, and params.
 * Params are sorted to keep the key stable across argument orderings.
 */
export function cacheKey(
  method: string,
  endpoint: string,
  params?: Record<string, unknown>,
): string {
  const m = method.toUpperCase();
  if (!params || Object.keys(params).length === 0) {
    return `${m}:${endpoint}`;
  }
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(String(params[k]))}`)
    .join("&");
  return `${m}:${endpoint}?${sorted}`;
}

export function get(db: Database, key: string): CacheEntry | null {
  const row = db
    .prepare(`SELECT * FROM api_cache WHERE cache_key = ?`)
    .get(key) as CacheEntry | undefined;
  return row ?? null;
}

export function getFresh<T = unknown>(db: Database, key: string): T | null {
  const row = db
    .prepare(
      `SELECT response_body FROM api_cache
       WHERE cache_key = ? AND expires_at > datetime('now')`,
    )
    .get(key) as { response_body: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.response_body) as T;
  } catch {
    return null;
  }
}

export function getMetadata(db: Database, key: string): CacheMetadata | null {
  const row = db
    .prepare(
      `SELECT etag, expires_at FROM api_cache WHERE cache_key = ?`,
    )
    .get(key) as { etag: string | null; expires_at: string } | undefined;
  if (!row) return null;
  return {
    etag: row.etag,
    fresh: new Date(row.expires_at) > new Date(),
  };
}

/**
 * Store a response with TTL.
 * Default TTLs by endpoint pattern (overridable via ttlSeconds):
 *  - /repos/.../forks list: 1 hour
 *  - /repos/{owner}/{repo} metadata: 24 hours
 *  - /repos/.../compare ahead/behind: 5 minutes
 *  - default: 5 minutes
 */
export function put(
  db: Database,
  key: string,
  body: unknown,
  options: {
    etag?: string | null;
    status?: number;
    ttlSeconds?: number;
  } = {},
): void {
  const ttl = options.ttlSeconds ?? defaultTtlFor(key);
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  db.prepare(
    `INSERT OR REPLACE INTO api_cache
       (cache_key, response_body, etag, fetched_at, expires_at, status)
     VALUES (?, ?, ?, datetime('now'), ?, ?)`,
  ).run(
    key,
    JSON.stringify(body),
    options.etag ?? null,
    expiresAt,
    options.status ?? 200,
  );
}

export function refreshExpiry(
  db: Database,
  key: string,
  ttlSeconds?: number,
): void {
  const ttl = ttlSeconds ?? defaultTtlFor(key);
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  db.prepare(
    `UPDATE api_cache
       SET expires_at = ?, fetched_at = datetime('now')
     WHERE cache_key = ?`,
  ).run(expiresAt, key);
}

export function invalidate(db: Database, keyPrefix: string): number {
  const result = db
    .prepare(`DELETE FROM api_cache WHERE cache_key LIKE ?`)
    .run(`${keyPrefix}%`);
  return result.changes;
}

export function pruneExpired(db: Database): number {
  // Keep ETags of recently-expired entries for 24h so revalidation still works
  const result = db
    .prepare(
      `DELETE FROM api_cache
       WHERE expires_at < datetime('now', '-24 hours')`,
    )
    .run();
  return result.changes;
}

function defaultTtlFor(key: string): number {
  if (key.includes("/forks")) return 60 * 60; // 1 hour
  if (key.includes("/compare/")) return 5 * 60; // 5 minutes
  if (key.includes("/repos/") && !key.includes("/")) return 24 * 60 * 60;
  if (key.startsWith("graphql:user-forks")) return 60 * 60;
  return 5 * 60;
}
