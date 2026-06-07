// State management for github-fork-sync.
// Uses bun:sqlite (built into Bun, zero deps).
// All times are ISO 8601 strings for portability and human readability.

import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export type SyncOutcome =
  | "synced"
  | "already_up_to_date"
  | "rebased"
  | "merged"
  | "diverged"
  | "conflict"
  | "skipped"
  | "failed";

export type SyncStrategy = "merge-upstream" | "rebase" | "merge" | "pr";

export type SkipEntry = {
  full_name: string;
  reason: string;
  added_at: string;
  added_by: string | null;
  expires_at: string | null;
};

export type SyncRun = {
  id: number;
  full_name: string;
  parent_full_name: string | null;
  branch: string;
  started_at: string;
  completed_at: string | null;
  outcome: SyncOutcome;
  strategy: SyncStrategy | null;
  commits_ahead: number | null;
  commits_behind: number | null;
  error_message: string | null;
  duration_ms: number | null;
  run_id: string | null;
};

export type RepoMetadata = {
  full_name: string;
  parent_full_name: string | null;
  default_branch: string;
  parent_default_branch: string | null;
  is_archived: boolean;
  parent_is_archived: boolean;
  parent_is_deleted: boolean;
  refreshed_at: string;
};

const DEFAULT_DB_PATH = join(
  process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"),
  "github-fork-sync",
  "state.db",
);

export function getDbPath(): string {
  return process.env.GITHUB_FORK_SYNC_DB ?? DEFAULT_DB_PATH;
}

export function openDb(path = getDbPath()): Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  // WAL gives us safe concurrent readers, important when multiple workers run.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  return db;
}

export function initSchema(db: Database, schemaPath?: string): void {
  const path = schemaPath ?? new URL("./schema.sql", import.meta.url).pathname;
  const sql = readFileSync(path, "utf8");
  db.exec(sql);
}

// ============================================================================
// Skip list
// ============================================================================

export function addSkip(
  db: Database,
  full_name: string,
  reason: string,
  options: { expires_at?: string | null; added_by?: string | null } = {},
): void {
  db.prepare(
    `INSERT OR REPLACE INTO skip_list (full_name, reason, added_at, added_by, expires_at)
     VALUES (?, ?, datetime('now'), ?, ?)`,
  ).run(
    full_name,
    reason,
    options.added_by ?? null,
    options.expires_at ?? null,
  );
}

export function removeSkip(db: Database, full_name: string): boolean {
  const result = db
    .prepare(`DELETE FROM skip_list WHERE full_name = ?`)
    .run(full_name);
  return result.changes > 0;
}

export function isSkipped(db: Database, full_name: string): SkipEntry | null {
  const row = db
    .prepare(
      `SELECT * FROM skip_list
       WHERE full_name = ?
         AND (expires_at IS NULL OR expires_at > datetime('now'))`,
    )
    .get(full_name) as SkipEntry | undefined;
  return row ?? null;
}

export function listSkips(db: Database): SkipEntry[] {
  return db
    .prepare(
      `SELECT * FROM skip_list
       WHERE expires_at IS NULL OR expires_at > datetime('now')
       ORDER BY added_at DESC`,
    )
    .all() as SkipEntry[];
}

export function pruneExpiredSkips(db: Database): number {
  const result = db
    .prepare(
      `DELETE FROM skip_list
       WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')`,
    )
    .run();
  return result.changes;
}

// ============================================================================
// Sync runs
// ============================================================================

export type StartRunInput = {
  full_name: string;
  parent_full_name: string | null;
  branch: string;
  run_id: string;
};

export function startRun(db: Database, input: StartRunInput): number {
  const result = db
    .prepare(
      `INSERT INTO sync_runs
         (full_name, parent_full_name, branch, started_at, outcome, run_id)
       VALUES (?, ?, ?, datetime('now'), 'failed', ?)`,
    )
    .run(input.full_name, input.parent_full_name, input.branch, input.run_id);
  return Number(result.lastInsertRowid);
}

export type CompleteRunInput = {
  id: number;
  outcome: SyncOutcome;
  strategy: SyncStrategy | null;
  commits_ahead: number | null;
  commits_behind: number | null;
  error_message: string | null;
  duration_ms: number;
};

export function completeRun(db: Database, input: CompleteRunInput): void {
  db.prepare(
    `UPDATE sync_runs
       SET completed_at = datetime('now'),
           outcome = ?,
           strategy = ?,
           commits_ahead = ?,
           commits_behind = ?,
           error_message = ?,
           duration_ms = ?
     WHERE id = ?`,
  ).run(
    input.outcome,
    input.strategy,
    input.commits_ahead,
    input.commits_behind,
    input.error_message,
    input.duration_ms,
    input.id,
  );
}

export function lastRunFor(db: Database, full_name: string): SyncRun | null {
  const row = db
    .prepare(
      `SELECT * FROM sync_runs
       WHERE full_name = ?
       ORDER BY started_at DESC
       LIMIT 1`,
    )
    .get(full_name) as SyncRun | undefined;
  return row ?? null;
}

export function recentFailures(db: Database, since_iso: string): SyncRun[] {
  return db
    .prepare(
      `SELECT * FROM sync_runs
       WHERE outcome IN ('failed', 'conflict')
         AND started_at >= ?
       ORDER BY started_at DESC`,
    )
    .all(since_iso) as SyncRun[];
}

export function runsByRunId(db: Database, run_id: string): SyncRun[] {
  return db
    .prepare(`SELECT * FROM sync_runs WHERE run_id = ? ORDER BY started_at`)
    .all(run_id) as SyncRun[];
}

// ============================================================================
// Repo metadata
// ============================================================================

export function upsertRepoMetadata(db: Database, meta: RepoMetadata): void {
  db.prepare(
    `INSERT OR REPLACE INTO repo_metadata
       (full_name, parent_full_name, default_branch, parent_default_branch,
        is_archived, parent_is_archived, parent_is_deleted, refreshed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    meta.full_name,
    meta.parent_full_name,
    meta.default_branch,
    meta.parent_default_branch,
    meta.is_archived ? 1 : 0,
    meta.parent_is_archived ? 1 : 0,
    meta.parent_is_deleted ? 1 : 0,
    meta.refreshed_at,
  );
}

export function getRepoMetadata(
  db: Database,
  full_name: string,
): RepoMetadata | null {
  const row = db
    .prepare(`SELECT * FROM repo_metadata WHERE full_name = ?`)
    .get(full_name) as
    | (Omit<RepoMetadata, "is_archived" | "parent_is_archived" | "parent_is_deleted"> & {
        is_archived: number;
        parent_is_archived: number;
        parent_is_deleted: number;
      })
    | undefined;
  if (!row) return null;
  return {
    ...row,
    is_archived: row.is_archived === 1,
    parent_is_archived: row.parent_is_archived === 1,
    parent_is_deleted: row.parent_is_deleted === 1,
  };
}
