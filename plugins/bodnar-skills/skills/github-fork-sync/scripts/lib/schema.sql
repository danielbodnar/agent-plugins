-- github-fork-sync state database schema
-- Initialized by ./scripts/init or ./scripts/db init
-- All tables use STRICT mode for type enforcement (SQLite 3.37+)

-- Repos to never sync, with optional expiry for "temporary skip"
CREATE TABLE IF NOT EXISTS skip_list (
  full_name   TEXT NOT NULL PRIMARY KEY,
  reason      TEXT NOT NULL,
  added_at    TEXT NOT NULL,                 -- ISO 8601
  added_by    TEXT,                          -- user/source that added it
  expires_at  TEXT                           -- ISO 8601, NULL = permanent
) STRICT;

CREATE INDEX IF NOT EXISTS idx_skip_list_expires
  ON skip_list(expires_at)
  WHERE expires_at IS NOT NULL;

-- Every sync attempt, ever. Append-only history.
CREATE TABLE IF NOT EXISTS sync_runs (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name          TEXT NOT NULL,
  parent_full_name   TEXT,
  branch             TEXT NOT NULL,
  started_at         TEXT NOT NULL,           -- ISO 8601
  completed_at       TEXT,
  outcome            TEXT NOT NULL,           -- synced | already_up_to_date | rebased | merged | diverged | conflict | skipped | failed
  strategy           TEXT,                    -- merge-upstream | rebase | merge | pr
  commits_ahead      INTEGER,
  commits_behind     INTEGER,
  error_message      TEXT,
  duration_ms        INTEGER,
  run_id             TEXT                     -- groups runs from the same orchestrate invocation
) STRICT;

CREATE INDEX IF NOT EXISTS idx_sync_runs_repo
  ON sync_runs(full_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_runs_outcome
  ON sync_runs(outcome, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_runs_run_id
  ON sync_runs(run_id);

-- gh API response cache. ETag-aware conditional requests.
-- Cache key format: "<METHOD>:<endpoint>?<sorted-params>"
CREATE TABLE IF NOT EXISTS api_cache (
  cache_key      TEXT NOT NULL PRIMARY KEY,
  response_body  TEXT NOT NULL,               -- JSON
  etag           TEXT,
  fetched_at     TEXT NOT NULL,               -- ISO 8601
  expires_at     TEXT NOT NULL,               -- ISO 8601, when this entry is stale
  status         INTEGER NOT NULL             -- HTTP status when cached
) STRICT;

CREATE INDEX IF NOT EXISTS idx_api_cache_expires
  ON api_cache(expires_at);

-- Denormalized fork->parent relationships, refreshed daily by list-forks.
-- Lets sync-fork operate on a single repo without needing to re-query the parent.
CREATE TABLE IF NOT EXISTS repo_metadata (
  full_name           TEXT NOT NULL PRIMARY KEY,
  parent_full_name    TEXT,                   -- NULL for non-forks (shouldn't be in this table)
  default_branch      TEXT NOT NULL,
  parent_default_branch TEXT,
  is_archived         INTEGER NOT NULL DEFAULT 0,
  parent_is_archived  INTEGER NOT NULL DEFAULT 0,
  parent_is_deleted   INTEGER NOT NULL DEFAULT 0,
  refreshed_at        TEXT NOT NULL            -- ISO 8601
) STRICT;

CREATE INDEX IF NOT EXISTS idx_repo_metadata_refreshed
  ON repo_metadata(refreshed_at);

-- Schema version for future migrations
CREATE TABLE IF NOT EXISTS schema_version (
  version    INTEGER NOT NULL PRIMARY KEY,
  applied_at TEXT NOT NULL
) STRICT;

INSERT OR IGNORE INTO schema_version (version, applied_at)
  VALUES (1, datetime('now'));
