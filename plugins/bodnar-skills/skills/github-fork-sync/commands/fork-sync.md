---
allowed-tools: Bash(./scripts/orchestrate:*),Bash(./scripts/list-forks:*),Bash(./scripts/sync-fork:*),Bash(./scripts/skip:*),Bash(./scripts/status:*),Bash(./scripts/init:*),Read,Glob,Task
description: Sync forked GitHub repos with upstream. Defaults to fast mode; pass mode=audit for parallel sub-agents per repo.
argument-hint: <owner> [mode=fast|audit] [strategy=skip|rebase|pr] [branches=default|all]
---

You are syncing forked GitHub repositories for the user. Read the arguments, then dispatch.

## Arguments

The user invoked: `/fork-sync $ARGUMENTS`

Parse `$ARGUMENTS` as: `<owner> [key=value ...]`. The required positional is the owner (a GitHub username or organization). Optional key=value pairs:

- `mode=fast` (default) — single-process orchestrator, fast for routine syncs
- `mode=audit` — one Claude sub-agent per repo, with full per-repo reasoning visible
- `strategy=skip` (default) — never force-push or rebase diverged forks; just report
- `strategy=rebase` — rebase + force-push-with-lease when fork has diverged
- `strategy=pr` — open a PR from upstream into fork when diverged
- `branches=default` (default) — only sync the fork's default branch
- `branches=all` — sync every branch shared between fork and parent

## Step 1: Ensure setup

If `./scripts/init` has not been run on this machine, run it now. It is idempotent and fast.

## Step 2: Dispatch by mode

### If mode=fast (or unspecified)

Run the orchestrator and stream its NDJSON output:

```sh
./scripts/orchestrate <owner> --strategy=<strategy> --branches=<branches>
```

Then summarize the final `{type:"summary"}` line for the user. Highlight:

- Total synced (fast-forwarded with no conflicts)
- Total diverged (need attention)
- Total failed (need investigation; show the error_message field)
- Total skipped (skip list hits)

### If mode=audit

1. Run `./scripts/list-forks <owner> --json` and parse the result.
2. For batches of up to 5 forks at a time, dispatch parallel `Task` calls invoking the `fork-sync-worker` agent (defined in `agents/fork-sync-worker.md`). Pass each worker:
   - The repo's `full_name`
   - The configured `strategy`
   - The configured `branches` mode
   - The shared `run_id` (so all sub-agents' work groups under one ID in the DB)
3. Each sub-agent will run `./scripts/sync-fork` for its repo and report a structured outcome with reasoning.
4. After all workers complete, aggregate their outcomes and present a per-repo table to the user.

## Step 3: Recommend follow-ups

Based on the outcomes, suggest next actions:

- For diverged repos: ask if the user wants to retry with `strategy=rebase` or `strategy=pr` for those specific repos.
- For repeated failures (check `./scripts/status --since=<7-days-ago>`): ask if any should be added to the skip list.
- For conflicts: offer to spawn audit-mode sub-agents to investigate root causes.

## Important

- Do not re-implement sync logic in your turn. The CLI is the source of truth. Just call it and interpret the output.
- The CLI emits NDJSON; the final line is a summary. Use `tail -1 | jq` style processing if you need structured access from bash.
- The state DB at `~/.local/share/github-fork-sync/state.db` accumulates history across runs. Past runs inform future ones — that's the point.
