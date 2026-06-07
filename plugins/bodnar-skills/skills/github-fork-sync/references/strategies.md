# Sync Strategy Decision Matrix

This skill ships three strategies for handling diverged forks. The default is `skip`. Choose another only when you understand the tradeoffs.

## The strategies

| Strategy | What it does | When to use | Risk |
|---|---|---|---|
| `skip` | Records `diverged`, takes no action | Default. Always safe. | None |
| `rebase` | Rebases fork onto upstream, force-pushes with lease | Forks where divergence is unintended (e.g., a stale local branch nobody references) | Force-push rewrites history. Anyone with that branch checked out gets a non-fast-forward on next pull. |
| `pr` | Opens a cross-fork PR from upstream into the fork | Active forks where divergence is intentional and you want a record of merging | None to history; adds noise via PRs |

## Per-outcome behavior

For a given branch, the CLI follows this order:

1. Skip-list check
2. Try `POST /repos/{owner}/{repo}/merge-upstream`
3. If 2 fails with `merge_type: "merge_conflict"` or fork is ahead, apply the strategy

Outcomes recorded in the `sync_runs` table:

| Outcome | Meaning | Strategy that produced it |
|---|---|---|
| `synced` | Fork was behind, now caught up | `merge-upstream` |
| `already_up_to_date` | Fork was equal to upstream, nothing to do | `merge-upstream` |
| `rebased` | Fork had local commits, rebased + force-pushed | `rebase` |
| `merged` | Merge commit created (rare) | `rebase` |
| `diverged` | Fork has local commits, no destructive action taken | `skip` (or `pr` after PR open) |
| `conflict` | Rebase attempted, merge conflict, aborted | `rebase` |
| `skipped` | On skip list, archived, or otherwise excluded | (any) |
| `failed` | Something else broke; check error_message | (any) |

## Edge cases

### Parent repo deleted

The fork has `fork: true` but no `parent` in the API response. Recorded as `failed` with message "parent repo deleted". Consider adding to skip list.

### Parent repo renamed or transferred

GitHub usually preserves the link via redirect. If the fork's `parent.full_name` differs from cached `parent_full_name`, the metadata refresh updates it on the next run.

### Fork has unique branches

`branches=default` ignores them entirely. `branches=all` syncs only branches that exist in BOTH the fork and the parent (intersection). Branches unique to the fork stay untouched regardless.

### Fork's default branch differs from parent's

The CLI uses the **fork's** default branch when `branches=default`. If the user wants to sync a branch that exists only in the parent, they need `branches=all` or to add the branch to the fork manually first.

### Fork has branch protection

`merge-upstream` respects branch protection rules. If a rule requires PRs, `merge-upstream` returns a 403 and the CLI records `failed`. Switch to `strategy=pr` for those repos.

### Archived forks

Skipped automatically (recorded as `skipped` with reason "fork is archived"). Pass `--include-archived` to override, but `merge-upstream` will refuse anyway.

### Archived parents

Same: recorded as `skipped` with reason "parent is archived". GitHub permits no upstream sync in this state.

### Many local commits ahead

The CLI doesn't distinguish "1 commit ahead" from "1000 commits ahead" unless you check `commits_ahead` on the result. If a fork is wildly ahead of upstream, it has effectively become its own project — flag it for the skip list. Run `/fork-sync-status verbose` to inspect divergence per repo.

## Choosing per-owner

Different owners may want different strategies. The CLI has no per-owner config; instead, run separate invocations:

```sh
./scripts/orchestrate alice --strategy=rebase
./scripts/orchestrate alice-the-org --strategy=skip
```

Or, in audit mode, the operator can choose per-repo when reviewing sub-agent outputs.

## Why skip is the default

Per the principle of lack of surprise: the user said "sync my forks", not "rewrite my forks' git history". Force-push-with-lease is safer than `--force` but still rewrites history. Surfacing diverged forks for human review is the conservative right answer. The user can always opt into `rebase` or `pr` for known-safe owners.
