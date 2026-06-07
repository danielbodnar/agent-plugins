# claude.ai/code Routines

The primary automation path for this skill. A Routine schedules Claude Code to run in a chosen repository on a schedule. Pick one host repo, point a daily Routine at it, and Claude syncs every fork the authenticated `gh` account can see.

## Why Routines over GitHub Actions

- **No per-fork installation.** The Routine runs in one host repo and operates on every fork via the `gh` CLI. No `.github/workflows/` to drop into 200 forked repos.
- **Schedule lives where you'll find it.** claude.ai/code → Routines is a single dashboard. No hunting through workflow run history across N repos.
- **Auth is automatic.** The Routine uses the `gh` CLI session of whoever set it up.
- **Reasoning is visible.** Each Routine run is a transcript Claude wrote. Failures come with explanations, not just a red X.

## Setup

### 1. Install the skill in a host repo

Pick any repo you control. A tooling repo like `bitbuilder-prod` or a dotfiles repo works well. The skill folder lives at `.claude/skills/github-fork-sync/`. Commit it.

```sh
git clone <this-skill-repo> .claude/skills/github-fork-sync
cd .claude/skills/github-fork-sync
./scripts/init
git add .claude/skills/github-fork-sync
git commit -m "Add github-fork-sync skill"
git push
```

### 2. Add a `.github-fork-sync.yml` config

At the root of the host repo, commit a config file. Template:

```yaml
# .github-fork-sync.yml
owner: danielbodnar
strategy: skip
branches: default
concurrency: 8

skip:
  - repo: danielbodnar/some-repo
    reason: vendored, intentionally diverged
  - repo: danielbodnar/old-experiment
    reason: archived in spirit
    expires_at: 2026-12-31

# Optional: where to post the run summary
tracking_issue:
  enabled: true
  label: fork-sync
  title: "Fork sync status"
```

This file is the source of truth. The Routine reads it on every run.

### 3. Create the Routine

claude.ai/code → Routines → New routine. Fill in:

| Field | Value |
|-------|-------|
| Name | `Sync forked repos` |
| Repository | your host repo |
| Trigger | Daily, pick a time you don't mind running (e.g. 06:00 local) |
| Instructions | (see below) |
| Connectors | none required |
| Behavior → Auto-fix pull requests | up to you, off by default for this skill |

### 4. Paste these Instructions

```
Use the github-fork-sync skill at .claude/skills/github-fork-sync to sync every fork under the owner specified in .github-fork-sync.yml at the repo root.

Steps:

1. cd .claude/skills/github-fork-sync
2. Run ./scripts/init quietly to ensure deps are present.
3. Run ./scripts/load-skip-yaml ../../../.github-fork-sync.yml to seed the skip list from the committed config.
4. Read owner, strategy, branches, and concurrency from the YAML. Default strategy is skip. Never escalate to rebase or pr unless the YAML explicitly says so.
5. Run ./scripts/orchestrate $owner --strategy=$strategy --branches=$branches --concurrency=$concurrency --json | tee /tmp/fork-sync.ndjson
6. Run ./scripts/status --json > /tmp/fork-sync-status.json
7. Build a Markdown summary from the NDJSON. Include: total forks scanned, synced count, diverged count, failed count, skipped count, total duration. List each diverged or failed fork with its reason.
8. Write the summary to two paths in the host repo:
   - last-run.md (overwrite)
   - runs/$(date -u +%Y-%m-%d).md (one file per day, append if rerun)
9. If there are any failures or diverged forks AND tracking_issue.enabled is true in the YAML:
   - Search for an open issue with label fork-sync and the configured title.
   - If found, post a comment with the summary. If not found, open a new issue with that label and title.
10. git add last-run.md runs/ && git commit -m "fork-sync: $(date -u +%Y-%m-%d) summary" && git push
11. If anything in steps 1-10 errored, surface the error clearly in the Routine output and skip the commit step. Do not push partial state.

Defaults if .github-fork-sync.yml is missing: owner = the authenticated gh user, strategy = skip, branches = default, concurrency = 8, tracking_issue disabled.
```

That's the whole Routine.

## State persistence model

Routines run in fresh sandboxes. On-disk SQLite doesn't survive between invocations. The Routine flow uses the host repo as state storage:

| State | Location | Format |
|-------|----------|--------|
| Skip list | `.github-fork-sync.yml` | YAML, hand-edited via PR |
| Run history | `runs/<ISO-DATE>.md` | Markdown, one file per day |
| Latest summary | `last-run.md` | Markdown, overwritten each run |
| Failures and divergence | Tracking issue (label `fork-sync`) | GitHub Issue + comments |
| API cache | None — each run rediscovers | n/a |

Skipping the cache is fine: Routine runs are far enough apart (daily or weekly) that fresh discovery is the right default. If you start running a Routine at high frequency, copy `scripts/lib/cache.ts` patterns into a Workers KV-backed store and read from there. That's a config change, not an architecture change.

## Pulling skip changes back into local CLI

When you edit `.github-fork-sync.yml` in a PR and merge it, your local SQLite skip list is now stale. Run:

```sh
./scripts/load-skip-yaml ./.github-fork-sync.yml
```

This wipes and rewrites the skip rows from the YAML. Idempotent.

## Testing the Routine before scheduling it

Routines support a manual "Run now" button. Do this once before scheduling:

1. Save the Routine without enabling the schedule, or with a far-future trigger.
2. Click "Run now".
3. Read the transcript. Watch for errors in `init`, `load-skip-yaml`, `orchestrate`, or the final commit.
4. Confirm `last-run.md` and `runs/<today>.md` got committed.
5. If everything's clean, switch the trigger to Daily.

## Multi-owner support

If you maintain forks under both a personal account and an org, run two Routines: one with `owner: danielbodnar`, one with `owner: bitbuilder-cloud`. Same skill, same host repo, two configs (`.github-fork-sync.danielbodnar.yml` and `.github-fork-sync.bitbuilder.yml`). Adjust the Instructions to read the path from the Routine's name or pass it as an argument the Instructions parse.

## Limits

- The Routine has the permissions of whoever created it. If you create the Routine and you can `gh repo view org/private-fork`, the Routine can too. If you leave the company, the Routine stops working — recreate it under whoever takes over.
- Each Routine runs sequentially per repo. If one routine takes 25 minutes, it doesn't block other routines, but it does delay your next sync. For hundreds of forks, increase `concurrency` in the YAML rather than running multiple Routines.
- Routine runs have a max duration. For very large fork counts (1000+), split into multiple Routines by owner-prefix or by topic.
