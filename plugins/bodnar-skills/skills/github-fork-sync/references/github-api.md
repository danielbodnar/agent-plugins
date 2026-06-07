# GitHub API patterns

How this skill talks to GitHub. All calls go through the `gh` CLI rather than Octokit so authentication is handled by whichever `gh auth` context the user (or GitHub Actions) is logged into. No API token needs to be wired in by hand.

## Why `gh` over Octokit

`gh` already solves auth (PAT, GitHub App, OAuth), token refresh, enterprise hosts (`GH_HOST`), and proxy config. Wrapping it keeps this skill's runtime dependency surface to "bun + gh", which is what `./scripts/init` enforces. The wrapper lives at `scripts/lib/gh.ts` and exposes four entry points: `ghJson`, `ghRun`, `ghApi`, and `ghGraphql`.

## REST: the four endpoints used

The skill only needs four REST endpoints. Each one is wrapped with caching and ETag revalidation by `ghApi`.

### 1. Merge upstream (the happy path)

```
POST /repos/{owner}/{repo}/merge-upstream
body: { "branch": "main" }
```

This is GitHub's native "sync fork" button. It performs a fast-forward merge from the parent's matching branch into the fork's branch when there's no divergence. Idempotent: calling it on an already-up-to-date fork returns `{ "merge_type": "none" }` and is a no-op. Returns 422 when the fork has diverged. Never cached. POST endpoints are excluded from the cache layer in `ghApi` (see `scripts/lib/gh.ts` line where `method !== "GET"` short-circuits cache).

### 2. Repository metadata

```
GET /repos/{full_name}
```

Used to confirm a fork's parent, default branch, archived status, and disabled status before attempting any sync. Cached for 24h (see `references/state-schema.md` for TTL rationale). Cache key: `GET:/repos/{full_name}`.

### 3. Branches list

```
GET /repos/{full_name}/branches?per_page=100
```

Pulled for both the fork and its parent so the skill can intersect them and decide which branches are syncable. Cached for 1h. Pagination is honored via `--paginate` when the count approaches 100.

### 4. Compare commits

```
GET /repos/{full_name}/compare/{base}...{head}
```

Used to check `ahead_by` / `behind_by` for a branch before touching it. The result determines which outcome path the sync takes (`already_up_to_date`, `synced`, `diverged`, etc.). Cached for 5min — short because the moment the fork or parent advances, the comparison is stale.

## GraphQL: discovery in one round trip

REST would require a paginated `GET /users/{user}/repos?type=fork` followed by `GET /repos/{full_name}` for every fork to learn the parent. That's `1 + N` round trips. GraphQL collapses this to a single paginated query that returns `parent { nameWithOwner, defaultBranchRef }` inline.

```graphql
query ($login: String!, $cursor: String) {
  repositoryOwner(login: $login) {
    repositories(
      first: 100
      after: $cursor
      isFork: true
      ownerAffiliations: OWNER
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        nameWithOwner
        isArchived
        isDisabled
        defaultBranchRef {
          name
        }
        parent {
          nameWithOwner
          defaultBranchRef {
            name
          }
        }
      }
    }
  }
}
```

`repositoryOwner` resolves to either a `User` or `Organization`, so one query handles both. The skill paginates by feeding `endCursor` back as `cursor` until `hasNextPage` is false. Cached at the GraphQL layer with key `graphql:forks:{login}` and a 1h TTL — long enough to amortize across a sync session, short enough that newly created forks show up next run.

## ETag-aware revalidation

GitHub serves an `ETag` header on every GET response and accepts `If-None-Match` to short-circuit unchanged responses with a 304. The `ghApi` wrapper participates in this dance:

1. On read, look up `(method, endpoint, params)` in the cache. If a body and ETag exist and the entry isn't past its TTL, return cached body without calling out at all.
2. If the entry is past TTL but we still have an ETag, call `gh api --include -H "If-None-Match: \"<etag>\""`. The `--include` flag makes `gh` print response headers so we can detect a `304 Not Modified` and refresh just the cache's expiry timestamp without paying for the body.
3. On a non-304 response, parse the new ETag from headers and store body + ETag together.

This is why the cache table holds `etag` and `last_modified` alongside the body — see `references/state-schema.md` for the schema. 304s don't count against GitHub's primary rate limit (only against the secondary "conditional request" budget, which is much higher), so heavy reruns stay cheap.

## Authentication

Three contexts:

- **Local development**: `gh auth login` once. The wrapper calls `ensureAuthenticated()` on first use, which runs `gh auth status` and surfaces a clear error if the user isn't logged in.
- **GitHub Actions**: the workflows pass `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (or a finer-scoped PAT) to every step. `gh` reads it from the environment without needing `gh auth login`.
- **GitHub App**: `GH_TOKEN` set to an installation token works identically. The skill doesn't care which token type it gets.

For force-push strategies (`rebase`, `pr`), the token must have `contents: write` on the target fork. `merge-upstream` only needs `contents: write` and is fine with the default `GITHUB_TOKEN` permissions.

## Rate limits

GitHub gives 5,000 requests/hour for PATs and 15,000/hour for GitHub Apps on Enterprise plans. The cache + ETag combination drops a typical sync session to well under 100 actual requests for a few hundred forks (one GraphQL discovery, one compare per fork, occasionally a merge-upstream). 304 revalidations don't count against the primary budget.

If you hit a secondary rate limit (abuse detection), `gh` surfaces a 403 with `X-RateLimit-Remaining: 0`. The orchestrator catches this and bails the run cleanly rather than hammering — failures are recorded in `sync_runs` so the next invocation can resume from the unprocessed forks.

## Force-push safety: `--force-with-lease`

The `rebase` strategy uses `git push --force-with-lease` rather than `--force`. This is the difference between "I want my version to win" and "I want my version to win unless someone else pushed in the meantime". The lease-based variant refuses to overwrite refs that have moved since the local clone fetched them, which protects against the case where a collaborator pushes to the fork between the skill's clone and push steps. There's no equivalent at the REST API level, which is part of why the rebase path drops to `git` rather than using a REST endpoint.

## Cross-fork pull requests

The `pr` strategy opens a PR from the parent's branch into the fork's branch using:

```
POST /repos/{fork_owner}/{fork_repo}/pulls
body: {
  "title": "Sync with upstream",
  "head": "{parent_owner}:{parent_branch}",
  "base": "{fork_branch}",
  "body": "..."
}
```

The `head: "owner:branch"` syntax is GitHub's way of saying "the branch lives in another fork of the same network". Both repos must be in the same fork network for this to work, which is always true for a fork and its parent.

## Things not currently used (but easy to add)

- **GitHub Apps installation API**: would let this skill operate without per-user `gh auth`, but adds setup complexity. Out of scope.
- **Webhooks**: a real-time variant could subscribe to upstream pushes and sync forks reactively. The current skill is poll-based to keep the surface area simple.
- **GraphQL mutations** (`createPullRequest`, `mergeBranch`): the REST equivalents are well-documented and the GraphQL versions don't add anything for this workload.
