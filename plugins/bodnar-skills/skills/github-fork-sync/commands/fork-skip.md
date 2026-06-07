---
allowed-tools: Bash(./scripts/skip:*),Read
description: Add or remove a repo from the fork-sync skip list.
argument-hint: <add|remove|list> <owner/repo> [reason="..."] [expires=ISO8601]
---

Manage the fork-sync skip list. Repos on this list are excluded from `/fork-sync` runs.

## Arguments

`/fork-skip $ARGUMENTS`

Three forms:
- `/fork-skip add <owner/repo> reason="<why>" [expires=<ISO8601>]`
- `/fork-skip remove <owner/repo>`
- `/fork-skip list`

## Behavior

### add

Always require a reason. If the user invoked `add` without one, ask them: "What's the reason for skipping `<repo>`?" (one short question) before running the command. The reason gets stored alongside the skip entry so future-you knows why this is on the list.

If they provide an `expires` date, treat it as a temporary skip (e.g., "this fork is being actively rebased, skip until next month"). Otherwise it's permanent.

Run:
```sh
./scripts/skip add <owner/repo> --reason "<reason>" [--expires <ISO8601>] --added-by "<user>"
```

For `--added-by`, use whatever identifier you have for the current user. If unknown, omit it.

### remove

Run:
```sh
./scripts/skip remove <owner/repo>
```

Confirm to the user that the repo will be re-included in the next sync run.

### list

Run `./scripts/skip list` and present the output. If the list is long, group by permanent vs temporary skips.

## Important

The skip list is intentionally simple: per-repo full_name only. There's no glob support, no per-branch skipping, no per-owner exclusion. If the user asks for those, suggest they file an enhancement instead of working around it manually — keeping the skip list dumb keeps the system understandable.
