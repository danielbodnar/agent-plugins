---
allowed-tools: Bash(./scripts/status:*),Bash(./scripts/db:*),Read
description: Report fork sync state. Shows last-run outcomes, skip list, recent failures.
argument-hint: [owner=<owner>] [since=<ISO8601>] [verbose]
---

Report current github-fork-sync state.

## Arguments

`/fork-sync-status $ARGUMENTS`

Parse arguments:
- `owner=<owner>` — filter to one user/org
- `since=<ISO8601>` — failures since (default: 7 days ago)
- `verbose` — show last run per repo, not just aggregates

## Steps

1. Run `./scripts/status` with the parsed flags.
2. If the user passed `verbose` or the report shows recent failures, also run `./scripts/status --json` and inspect for patterns:
   - Repeated failures on the same repo (3+ failures in 7 days) — strong skip-list candidate
   - A whole owner with no successes — likely an auth or API quota issue
   - Many `diverged` outcomes for one owner — strategy mismatch (recommend `strategy=rebase` or `strategy=pr`)
3. Surface those patterns to the user with concrete suggestions.

## Output format

Lead with a one-line summary ("Last run: X synced, Y diverged, Z failed at <timestamp>"), then the breakdown, then any patterns you flagged. Keep it short unless `verbose` was passed.
