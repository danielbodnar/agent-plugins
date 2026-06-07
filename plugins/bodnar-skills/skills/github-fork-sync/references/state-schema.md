# State Schema Reference

The state database is SQLite at `~/.local/share/github-fork-sync/state.db` (override via `$GITHUB_FORK_SYNC_DB`). Schema lives in `scripts/lib/schema.sql`.

All tables use STRICT mode. Times are stored as ISO 8601 strings for portability — DuckDB can open this DB and query it as well, which is useful for ad-hoc analytics.

## Tables

### `skip_list`

Repos to never sync. Optionally with an expiry for "skip until X".

| Column | Type | Notes |
|---|---|---|
| `full_name` | TEXT PRIMARY KEY | `owner/repo` |
| `reason` | TEXT NOT NULL | Free-form |
| `added_at` | TEXT NOT NULL | ISO 8601 |
| `added_by` | TEXT | Who added it (e.g., username, "scheduled-workflow") |
| `expires_at` | TEXT | NULL = permanent |

**Index**: `idx_skip_list_expires` on `expires_at` where not null. Used by `pruneExpiredSkips()`.

**Lifecycle**: Read on every sync to filter forks. Pruned of expired entries on each run.

### `sync_runs`

Append-only history of every sync attempt. The most useful operational table.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `full_name` | TEXT NOT NULL | Fork's `owner/repo` |
| `parent_full_name` | TEXT | Upstream's `owner/repo` |
| `branch` | TEXT NOT NULL | Branch synced |
| `started_at` | TEXT NOT NULL | ISO 8601 |
| `completed_at` | TEXT | NULL means crashed mid-run |
| `outcome` | TEXT NOT NULL | See `references/strategies.md` for values |
| `strategy` | TEXT | `merge-upstream` \| `rebase` \| `merge` \| `pr` |
| `commits_ahead` | INTEGER | At time of run |
| `commits_behind` | INTEGER | At time of run |
| `error_message` | TEXT | Truncated to 4000 chars |
| `duration_ms` | INTEGER | Total time including API calls |
| `run_id` | TEXT | UUID grouping all branches in one orchestrate invocation |

**Indexes**:
- `idx_sync_runs_repo` on `(full_name, started_at DESC)` — for "last run of repo X"
- `idx_sync_runs_outcome` on `(outcome, started_at DESC)` — for failure dashboards
- `idx_sync_runs_run_id` on `run_id` — for grouping a single run

**Common queries**:

```sql
-- Last run per repo
SELECT * FROM sync_runs r
INNER JOIN (
  SELECT full_name, MAX(started_at) AS latest
  FROM sync_runs GROUP BY full_name
) latest_per_repo
  ON r.full_name = latest_per_repo.full_name
 AND r.started_at = latest_per_repo.latest;

-- Repos that have failed 3+ times in the last 30 days
SELECT full_name, COUNT(*) AS failures
FROM sync_runs
WHERE outcome IN ('failed', 'conflict')
  AND started_at > datetime('now', '-30 days')
GROUP BY full_name
HAVING failures >= 3;

-- Average sync duration by outcome
SELECT outcome, AVG(duration_ms) FROM sync_runs GROUP BY outcome;
```

### `api_cache`

ETag-aware cache for gh API responses.

| Column | Type | Notes |
|---|---|---|
| `cache_key` | TEXT PRIMARY KEY | `<METHOD>:<endpoint>?<sorted-params>` |
| `response_body` | TEXT NOT NULL | JSON-encoded body |
| `etag` | TEXT | From the original response's `ETag` header |
| `fetched_at` | TEXT NOT NULL | ISO 8601 |
| `expires_at` | TEXT NOT NULL | When this entry becomes stale |
| `status` | INTEGER NOT NULL | HTTP status when cached |

**TTL defaults** (overridable per call):

| Endpoint pattern | TTL |
|---|---|
| `*/forks` | 1 hour |
| `*/compare/*` (ahead/behind) | 5 minutes |
| `/repos/{owner}/{repo}` (metadata) | 24 hours |
| `graphql:user-forks:*` | 1 hour |
| Default | 5 minutes |

**Revalidation**: When an entry is stale and has an ETag, the next fetch sends `If-None-Match`. A 304 response refreshes the expiry without burning a fresh API quota; a 200 replaces the body and ETag.

**Pruning**: Expired entries older than 24 hours are dropped on `./scripts/db vacuum`.

### `repo_metadata`

Denormalized fork→parent relationships, refreshed daily.

| Column | Type | Notes |
|---|---|---|
| `full_name` | TEXT PRIMARY KEY | Fork's `owner/repo` |
| `parent_full_name` | TEXT | Upstream's `owner/repo` |
| `default_branch` | TEXT NOT NULL | Fork's default branch |
| `parent_default_branch` | TEXT | Upstream's default branch |
| `is_archived` | INTEGER NOT NULL | 0 or 1 |
| `parent_is_archived` | INTEGER NOT NULL | 0 or 1 |
| `parent_is_deleted` | INTEGER NOT NULL | 0 or 1 (fork without parent in API) |
| `refreshed_at` | TEXT NOT NULL | ISO 8601 |

**Lifecycle**: Populated by `list-forks` on every run. Used by `sync-fork` to short-circuit `/repos/{full_name}` calls when run within 24 hours of the last refresh.

## Cache invalidation rules

After a successful state-changing operation, the relevant cache entries are invalidated:

| Operation | Invalidates |
|---|---|
| `merge-upstream` success | `GET:/repos/{full_name}/compare/*` |
| `rebase` + force-push | `GET:/repos/{full_name}/compare/*` |
| `pr` opens new PR | (no compare cache change; PR doesn't merge) |

## Backups and migrations

Schema versions live in the `schema_version` table. The current version is 1. Future migrations should be additive (use `ALTER TABLE ... ADD COLUMN` and `IF NOT EXISTS`); never drop or rename columns without a migration script.

To back up state:
```sh
sqlite3 ~/.local/share/github-fork-sync/state.db ".backup state-backup-$(date +%Y%m%d).db"
```

To inspect ad-hoc with DuckDB:
```sh
duckdb -c "ATTACH '~/.local/share/github-fork-sync/state.db' AS s; SELECT * FROM s.sync_runs ORDER BY started_at DESC LIMIT 20;"
```
