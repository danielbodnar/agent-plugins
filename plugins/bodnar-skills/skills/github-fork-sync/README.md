# github-fork-sync

Keep your forked GitHub repositories synced with their upstream parents. Runs in parallel, persists state, caches API calls, and ships with slash commands and GitHub Actions automations.

## Quick start

```sh
./scripts/init                      # one-time bootstrap (bun, gh auth, db init)
./scripts/orchestrate danielbodnar  # sync every fork under your account
./scripts/status                    # see what just happened
```

That's it for the common case. The orchestrator discovers every fork you own, runs them through GitHub's native `merge-upstream` endpoint in parallel, and reports outcomes. Forks that have diverged from their parent are skipped by default rather than rebased — see strategy docs below to opt in.

## What you get

- **One CLI**, four scripts: `orchestrate`, `list-forks`, `sync-fork`, `status`. All three are extensionless Bun executables.
- **Three slash commands** for Claude Code: `/fork-sync`, `/fork-sync-status`, `/fork-skip`.
- **One sub-agent**, `fork-sync-worker`, for parallel audit-mode runs where each repo gets its own Claude reasoning trace.
- **Two GitHub Actions workflows**: a weekly cron (`fork-sync-scheduled.yml`) and a comment-trigger (`fork-sync-on-demand.yml`) responding to `@claude /fork-sync`.
- **Persistent state** in SQLite at `~/.local/share/github-fork-sync/state.db`. Skip lists, run history, failure log, and the gh API cache all live in one file.

## Two parallelism modes

The orchestrator runs in **fast mode** by default: a single Bun process, `Promise.all` with bounded concurrency, NDJSON output. This is what you want for routine syncing.

For audits or debugging, switch to **audit mode** by invoking `/fork-sync danielbodnar mode=audit`. Each fork gets its own Claude sub-agent (`agents/fork-sync-worker.md`) running the same `./scripts/sync-fork` worker but with reasoning traces, recommendations, and structured JSON output per repo. Slower and more expensive, but useful when forks are misbehaving and you want a per-repo diagnosis.

## Three sync strategies

| Strategy | What it does | When to use it | Force-push? |
|----------|--------------|----------------|-------------|
| `skip` (default) | Only fast-forward via `merge-upstream`. Diverged forks are recorded, not touched. | Routine syncing. | No |
| `rebase` | Drop to `git`, rebase local commits onto upstream, force-push-with-lease. | When you want diverged forks brought into line. | Yes, opt-in |
| `pr` | Open a cross-fork PR from upstream into your fork. | When you want a human review step. | No |

Default is `skip` because it's safe under all conditions. See `references/strategies.md` for the full decision matrix and edge cases.

## State and skip lists

Three things you'll want to do over time:

```sh
./scripts/skip add danielbodnar/some-repo --reason "vendored, deliberately diverged"
./scripts/skip remove danielbodnar/some-repo
./scripts/skip list
```

Skipped repos never appear in sync runs. The `--reason` field shows up in `./scripts/status` so you remember why you skipped a year from now. Skip entries can carry an `--expires-at` if the reason is temporary.

## Scheduled syncing

The recommended path is a **claude.ai/code Routine**. One Routine, daily trigger, host repo of your choice — Claude wakes up, runs the skill, commits a summary, and posts to a tracking issue if anything failed. No per-fork installation. Full setup in `references/routines.md`.

```
Name:        Sync forked repos
Repository:  your tooling repo (e.g. bitbuilder-prod)
Trigger:     Daily at 06:00 (or whenever)
Instructions: paste the block from references/routines.md
```

State for the Routine path lives in the host repo: skip list in `.github-fork-sync.yml` (committed), run history in `runs/<ISO-DATE>.md`, latest summary in `last-run.md`, failures and divergence in a labeled tracking issue. The Routine commits these at the end of each run.

For users without Claude Code Routines, the same automation is available as `workflows/fork-sync-scheduled.yml` and `workflows/fork-sync-on-demand.yml` — drop them in `.github/workflows/` of the same host repo. These are an alternative path; Routines are preferred.

## File map

```
SKILL.md                              # primary skill entry, read this first
README.md                             # this file
package.json, tsconfig.json
scripts/
  init                                # POSIX sh bootstrap
  db                                  # DB admin: init|dump|vacuum|reset
  list-forks                          # GraphQL discovery
  sync-fork                           # single-repo worker
  orchestrate                         # fast-mode entry point
  skip                                # skip list manager
  load-skip-yaml                      # YAML config -> skip table (Routine helper)
  status                              # human-readable state report
  lib/
    schema.sql                        # SQLite schema (STRICT mode)
    state.ts                          # DB ops
    cache.ts                          # ETag-aware cache
    gh.ts                             # gh CLI wrapper
    sync.ts                           # core sync brain
commands/
  fork-sync.md                        # /fork-sync <owner> [mode=...]
  fork-sync-status.md                 # /fork-sync-status
  fork-skip.md                        # /fork-skip add|remove|list
agents/
  fork-sync-worker.md                 # parallel audit-mode worker
assets/
  github-fork-sync.example.yml        # template for host repo's .github-fork-sync.yml
workflows/                            # alternative: GitHub Actions (use only without Routines)
  fork-sync-scheduled.yml             # weekly cron
  fork-sync-on-demand.yml             # @claude comment trigger
references/
  routines.md                         # claude.ai/code Routine setup (primary)
  github-api.md                       # gh CLI / API patterns
  state-schema.md                     # DB tables and queries
  strategies.md                       # full strategy decision matrix
```

## Requirements

- `bun` (1.2+) — the `init` script installs it if missing
- `gh` (2.x) — must be installed and authenticated (`gh auth login`)
- `git` (any modern version) — only used by the `rebase` strategy
- `sqlite3` (optional) — for inspecting the state DB by hand

## Design notes

- **Default-safe**: every destructive operation is opt-in. The skill never force-pushes unless you explicitly select `--strategy=rebase`.
- **Idempotent**: rerun anything. `merge-upstream` is idempotent at GitHub's end. The cache short-circuits unchanged data. The skip list filters stable.
- **Native formats**: SQLite for state, NDJSON for orchestrator output, structured JSON for sub-agent reports. No bespoke wire formats.
- **Thin glue**: the skill compiles down to "GitHub's merge-upstream endpoint, called in parallel, with caching and a skip list". Everything else is plumbing.
