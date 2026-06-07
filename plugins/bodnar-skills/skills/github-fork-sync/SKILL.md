---
name: github-fork-sync
description: Sync and rebase forked GitHub repositories belonging to a user or org, in parallel, with persistent state and caching. Use this skill whenever the user asks to "sync forks", "rebase forks", "update forks", "catch up forks with upstream", or mentions keeping forked repos in sync. Also use when the user mentions a stale fork backlog, fork hygiene, or asks "are my forks up to date". Triggers on phrases like "/fork-sync", "/forks status", "skip this fork", or any request to discover, sync, rebase, or manage forks belonging to a GitHub user or organization. Includes parallel sub-agents for audit mode, slash commands, claude.ai/code Routine support for scheduled syncing from a single host repo, and optional GitHub Actions workflows.
---

# GitHub Fork Sync

Sync forked GitHub repositories with their upstream parents, in parallel, with persistent state and caching. This skill ships a CLI, slash commands, parallel sub-agents, a claude.ai/code Routine pattern for scheduled syncing, and optional GitHub Actions workflows for environments without Routines.

## When to use

- "Sync all my forks" / "Update my forks" / "Are my forks up to date?"
- "Sync forks for the `acme-org` organization"
- "Why did the `react` fork fail to sync?"
- "Skip the `linux` fork from now on"
- Any cron-driven or @claude-mention automation around fork hygiene

## Architecture in one paragraph

GitHub has a native `POST /repos/{owner}/{repo}/merge-upstream` endpoint that fast-forwards a fork's branch when there's no divergence. That's the happy path for almost all forks and it's idempotent. When a fork has local commits ahead of upstream, the skill consults the configured policy (default: skip and report) before doing anything destructive. Discovery happens via a single GraphQL query that returns parent ref info inline, keeping API usage low. State lives in SQLite at `~/.local/share/github-fork-sync/state.db` (XDG-compliant, override via `$GITHUB_FORK_SYNC_DB`). The same SQLite file holds the gh API response cache with ETag-aware revalidation.

## First-run setup

Before running anything, ensure dependencies are installed:

```sh
./scripts/init
```

This is a POSIX `sh` script that checks for `bun` and `gh`, installs Bun if missing, runs `bun install`, and initializes the SQLite database at `$GITHUB_FORK_SYNC_DB` (default `~/.local/share/github-fork-sync/state.db`). It is idempotent: safe to run repeatedly.

After init, verify gh is authenticated: `gh auth status`. If not, run `gh auth login`.

## The two modes

### Fast mode (default)

```sh
./scripts/orchestrate <owner> [--concurrency=8] [--branches=default|all] [--strategy=skip|rebase|pr]
```

Single Bun process, internal `Promise.all` with concurrency limit. Best for routine syncing of dozens to hundreds of forks. Each repo's outcome is recorded in the `sync_runs` table.

### Audit mode (parallel sub-agents)

When the user asks for an explanation per repo, or when a previous run flagged conflicts that need judgment, run audit mode. Use the `Task` tool to spawn one `fork-sync-worker` sub-agent per repo, in batches of 5-10. Each sub-agent gets its own transcript, can read the parent's recent history, and decides between rebase, merge, or skip with reasoning visible to the user.

To dispatch sub-agents:

1. Call `./scripts/list-forks <owner> --json` to get the worklist (this respects the skip list and cache).
2. Read `agents/fork-sync-worker.md` so you understand what each sub-agent will do.
3. Spawn one Task per repo (concurrency naturally limited by the platform). Pass the repo's `full_name`, the configured strategy, and the path to the state DB.
4. Aggregate the sub-agents' structured returns into a single report.

Audit mode is the right answer when the user says things like "explain what happened with each fork" or "I want to see the reasoning per repo". Otherwise default to fast mode — sub-agents are expensive and most syncs are deterministic merge-upstream calls.

## Slash commands

Three user-facing commands live in `commands/`:

- `/fork-sync` — entry point. Dispatches to fast mode by default; passes `--mode=audit` through to spawn sub-agents.
- `/fork-sync-status` — reads the state DB and reports last-run outcomes, currently-skipped repos, and any unresolved failures.
- `/fork-skip` — adds a repo to the skip list with a reason, optionally with an expiry date.

Each command's frontmatter declares the minimal `allowed-tools` it needs, following the pattern in this repo's `.claude/commands/` examples.

## Scheduled automation

The recommended path is a **claude.ai/code Routine** running against a single host repo. One Routine, scheduled daily, syncs every fork the authenticated `gh` account can see. No per-fork installation. Full instructions live in `references/routines.md`. The short version:

1. Install this skill in any repo you control (e.g. a tooling repo). The skill folder lives at `.claude/skills/github-fork-sync/`.
2. Commit a `.github-fork-sync.yml` config at the repo root with your target owner and skip list. An example template is in `assets/github-fork-sync.example.yml`.
3. claude.ai/code → Routines → New routine. Pick the host repo, set a daily trigger, and paste the instructions block from `references/routines.md`.

State persists across Routine runs through the host repo itself: `.github-fork-sync.yml` for the skip list, `runs/<ISO-DATE>.md` files for history, `last-run.md` for the latest summary, and a single tracking issue (label `fork-sync`) for failures and divergent forks. The Routine commits these at the end of each run. SQLite stays on the local CLI side where the cache pays off.

When using a Routine, the helper `./scripts/load-skip-yaml` syncs the YAML config into the in-memory skip list before each orchestrate call. This keeps `.github-fork-sync.yml` as the source of truth Daniel edits in PRs, and the SQLite skip table as the runtime view.

### Alternative: GitHub Actions

For environments without Claude Code Routines, two workflows in `workflows/` provide the same automation against a single host repo (no per-fork install required):

- `fork-sync-scheduled.yml` — weekly cron, manual `workflow_dispatch`. Persists SQLite state through `actions/cache` keyed by ISO week.
- `fork-sync-on-demand.yml` — triggers on `@claude /fork-sync <owner>` comments via `claude-code-action@v1`.

Use these if Routines aren't an option. The skill itself is the same — only the trigger surface changes.

## State and caching

See `references/state-schema.md` for the full schema. The short version:

- **`skip_list`** — repos to never touch, with optional expiry (temporary skip for "this is being actively worked on").
- **`sync_runs`** — every sync attempt, ever. Lets you answer "when did this last sync?" and "which repos have been failing repeatedly?".
- **`api_cache`** — gh API responses keyed by request URL+params, with ETag for conditional requests. Honors `Cache-Control: max-age` from GitHub's responses where present.
- **`repo_metadata`** — denormalized fork→parent relationships, refreshed daily.

To inspect state, `./scripts/db dump` prints all tables as JSON, or open the file directly with any SQLite client (DuckDB works great here too: `duckdb ~/.local/share/github-fork-sync/state.db`).

## Sync strategy decision matrix

For a given fork branch, the logic in `scripts/lib/sync.ts` follows this order:

1. **Skip list check** — if the repo is on the skip list (and not expired), record `skipped` and return.
2. **Try merge-upstream** — call `POST /repos/{owner}/{repo}/merge-upstream`. If it succeeds with `merge_type: "fast-forward"` or `"none"` (already up to date), record `synced` and return. This handles the vast majority of cases in one API call.
3. **Diverged fork** — `merge-upstream` returns 409 with `merge_type: "merge_conflict"` or the fork is ahead. Consult the configured strategy:
   - `skip` (default): record `diverged`, no destructive action, surface in the report.
   - `rebase`: clone, fetch upstream, `git rebase upstream/<branch>`, force-push with lease. Conflicts → record `conflict` and exit non-zero.
   - `pr`: open a PR from `upstream/<branch>` into the fork's branch, leaving the merge to the user.

`references/strategies.md` has the full decision table including edge cases (orphaned forks, archived parents, renamed repos).

## Output format

The CLI emits one JSON object per line to stdout (NDJSON), one per repo. The final line is a summary object. Example:

```json
{"type":"result","full_name":"danielbodnar/react","outcome":"synced","strategy":"merge-upstream","duration_ms":412}
{"type":"result","full_name":"danielbodnar/linux","outcome":"diverged","commits_ahead":3,"commits_behind":1247}
{"type":"summary","total":42,"synced":38,"diverged":3,"failed":1,"skipped":0,"duration_ms":18432}
```

This format is consumable by jq, the `--json-schema` flag in claude-code-action, and the Claude Code subagent that wraps it.

## Design constraints

This skill follows Daniel's Sane Defaults Philosophy:
- Use gh's native `merge-upstream` endpoint instead of inventing our own sync logic.
- SQLite over a remote DB. Native format. Files are data.
- Bun + TypeScript (strict ESM). No build step. Executables are `#!/usr/bin/env bun` shebangs without `.ts` extensions.
- Force-push is opt-in, never default.
- The CLI is composable: NDJSON in, NDJSON out, plays well with `jq`, `gh`, GitHub Actions.

If a future request would push the skill toward maintaining a custom git server, building a UI, or handling auth tokens, STOP and ASK. That contradicts Sane Defaults.

## File map

```
github-fork-sync/
├── SKILL.md                          # this file
├── README.md                         # human-facing overview
├── package.json                      # bun deps (none required, bun:sqlite is built in)
├── tsconfig.json                     # strict TS config
├── scripts/
│   ├── init                          # POSIX sh bootstrap
│   ├── orchestrate                   # main entry: list + sync (fast mode)
│   ├── list-forks                    # discovery via gh GraphQL
│   ├── sync-fork                     # single-repo worker (called by sub-agents too)
│   ├── skip                          # add/remove/list skip entries
│   ├── load-skip-yaml                # sync .github-fork-sync.yml -> skip_list (Routine helper)
│   ├── status                        # human-readable state report
│   ├── db                            # DB admin: init, dump, vacuum
│   └── lib/
│       ├── state.ts                  # SQLite state ops
│       ├── cache.ts                  # ETag-aware gh API cache
│       ├── gh.ts                     # gh CLI wrapper
│       ├── sync.ts                   # core sync logic (the brain)
│       └── schema.sql                # DB schema (initialized by ./scripts/init)
├── commands/
│   ├── fork-sync.md                  # /fork-sync slash command
│   ├── fork-sync-status.md           # /fork-sync-status
│   └── fork-skip.md                  # /fork-skip
├── agents/
│   └── fork-sync-worker.md           # parallel sub-agent for audit mode
├── assets/
│   └── github-fork-sync.example.yml  # template for .github-fork-sync.yml in host repo
├── workflows/                        # alternative: GitHub Actions (use only if Routines unavailable)
│   ├── fork-sync-scheduled.yml       # weekly cron + workflow_dispatch
│   └── fork-sync-on-demand.yml       # @claude /fork-sync trigger
└── references/
    ├── routines.md                   # claude.ai/code Routine setup (primary automation path)
    ├── github-api.md                 # gh CLI / API patterns used here
    ├── state-schema.md               # DB tables, cache invalidation rules
    └── strategies.md                 # full sync strategy decision matrix
```

## Recovery and reruns

Every CLI command is idempotent. Reruns are safe: the cache short-circuits unchanged data, the skip list filters out repos you've already excluded, and `merge-upstream` is itself idempotent. If a previous run was interrupted, just rerun — partial sync_runs entries get a fresh row, not a duplicate.

To force a full refresh ignoring cache: `./scripts/orchestrate <owner> --no-cache`.

To wipe state and start over: `./scripts/db reset --confirm`. This drops all tables and reinitializes from `scripts/lib/schema.sql`.
