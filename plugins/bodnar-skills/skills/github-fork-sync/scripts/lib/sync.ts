// Core sync logic. The brain of the skill.
//
// For a given fork, the decision tree is:
//   1. Check skip list -> if skipped, record and return.
//   2. Try POST /repos/{owner}/{repo}/merge-upstream -> if success, record and return.
//      This handles fast-forwards and "already up to date" in one API call.
//   3. If diverged (409 or commits ahead), consult the configured strategy:
//        - skip: record diverged, do nothing destructive (DEFAULT).
//        - rebase: clone, rebase, force-push-with-lease.
//        - pr: open a PR from upstream into fork.
//
// The default is intentionally conservative. Force-pushing rebased history
// is the kind of "surprise" that violates the principle of lack of surprise,
// so it's opt-in.

import type { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type SyncOutcome,
  type SyncStrategy,
  startRun,
  completeRun,
  isSkipped,
  getRepoMetadata,
  upsertRepoMetadata,
} from "./state.ts";
import { ghApi, ghGraphql, ghRun } from "./gh.ts";
import * as cache from "./cache.ts";

export type StrategyName = "skip" | "rebase" | "pr";

export type SyncOptions = {
  db: Database;
  full_name: string;
  strategy: StrategyName;
  branches: "default" | "all";
  run_id: string;
  /** If true, force a fresh fetch even if cache is warm */
  noCache?: boolean;
  /** If true, perform read-only checks but don't mutate the fork */
  dryRun?: boolean;
};

export type SyncResult = {
  type: "result";
  full_name: string;
  parent_full_name: string | null;
  branch: string;
  outcome: SyncOutcome;
  strategy: SyncStrategy | null;
  commits_ahead: number | null;
  commits_behind: number | null;
  error_message: string | null;
  duration_ms: number;
};

type RepoInfo = {
  full_name: string;
  default_branch: string;
  is_archived: boolean;
  parent_full_name: string | null;
  parent_default_branch: string | null;
  parent_is_archived: boolean;
  parent_is_deleted: boolean;
};

type MergeUpstreamResponse = {
  message: string;
  merge_type: "fast-forward" | "merge" | "none";
  base_branch: string;
};

/**
 * Sync one fork. Designed to be called from the orchestrator OR from a sub-agent.
 * Records outcome to the DB and returns a structured result.
 */
export async function syncFork(opts: SyncOptions): Promise<SyncResult[]> {
  const startTotal = Date.now();
  const results: SyncResult[] = [];

  // Resolve repo info (cached)
  const info = await fetchRepoInfo(opts.db, opts.full_name, opts.noCache);

  // Skip-list check
  const skip = isSkipped(opts.db, opts.full_name);
  if (skip) {
    const result = recordSkip(opts, info, "skip-list: " + skip.reason);
    results.push(result);
    return results;
  }

  // Sanity checks
  if (info.parent_is_deleted) {
    const r = recordFailure(opts, info, info.default_branch, "parent repo deleted");
    results.push(r);
    return results;
  }
  if (!info.parent_full_name) {
    const r = recordFailure(opts, info, info.default_branch, "not a fork");
    results.push(r);
    return results;
  }
  if (info.is_archived) {
    const r = recordSkip(opts, info, "fork is archived");
    results.push(r);
    return results;
  }

  // Branch list
  const branches =
    opts.branches === "all"
      ? await fetchSharedBranches(opts.db, info, opts.noCache)
      : [info.default_branch];

  for (const branch of branches) {
    const result = await syncBranch(opts, info, branch);
    results.push(result);
  }

  // Update metadata cache
  upsertRepoMetadata(opts.db, {
    full_name: info.full_name,
    parent_full_name: info.parent_full_name,
    default_branch: info.default_branch,
    parent_default_branch: info.parent_default_branch,
    is_archived: info.is_archived,
    parent_is_archived: info.parent_is_archived,
    parent_is_deleted: info.parent_is_deleted,
    refreshed_at: new Date().toISOString(),
  });

  // Annotate the last result with total duration
  const last = results[results.length - 1];
  if (last) last.duration_ms = Date.now() - startTotal;

  return results;
}

async function syncBranch(
  opts: SyncOptions,
  info: RepoInfo,
  branch: string,
): Promise<SyncResult> {
  const t0 = Date.now();
  const runRowId = startRun(opts.db, {
    full_name: info.full_name,
    parent_full_name: info.parent_full_name,
    branch,
    run_id: opts.run_id,
  });

  if (opts.dryRun) {
    const compare = await fetchCompareStatus(opts.db, info, branch, opts.noCache);
    const outcome: SyncOutcome =
      compare.behind === 0
        ? "already_up_to_date"
        : compare.ahead === 0
          ? "synced"
          : "diverged";
    completeRun(opts.db, {
      id: runRowId,
      outcome,
      strategy: null,
      commits_ahead: compare.ahead,
      commits_behind: compare.behind,
      error_message: null,
      duration_ms: Date.now() - t0,
    });
    return {
      type: "result",
      full_name: info.full_name,
      parent_full_name: info.parent_full_name,
      branch,
      outcome,
      strategy: null,
      commits_ahead: compare.ahead,
      commits_behind: compare.behind,
      error_message: null,
      duration_ms: Date.now() - t0,
    };
  }

  // Try merge-upstream first. This is the happy path.
  try {
    const result = await ghApi<MergeUpstreamResponse>(
      `/repos/${info.full_name}/merge-upstream`,
      {
        method: "POST",
        fields: { branch },
        // POST is never cached
      },
    );
    const outcome: SyncOutcome =
      result.merge_type === "none" ? "already_up_to_date" : "synced";
    // Invalidate compare cache since state changed
    cache.invalidate(opts.db, `GET:/repos/${info.full_name}/compare/`);

    completeRun(opts.db, {
      id: runRowId,
      outcome,
      strategy: "merge-upstream",
      commits_ahead: 0,
      commits_behind: 0,
      error_message: null,
      duration_ms: Date.now() - t0,
    });
    return {
      type: "result",
      full_name: info.full_name,
      parent_full_name: info.parent_full_name,
      branch,
      outcome,
      strategy: "merge-upstream",
      commits_ahead: 0,
      commits_behind: 0,
      error_message: null,
      duration_ms: Date.now() - t0,
    };
  } catch (e) {
    // 409 means diverged. Other errors are real errors.
    const err = e as { status?: number; stderr?: string; message?: string };
    const stderr = err.stderr ?? "";
    const isDiverged =
      stderr.includes("merge-upstream") ||
      stderr.includes("409") ||
      stderr.toLowerCase().includes("conflict");
    if (!isDiverged) {
      completeRun(opts.db, {
        id: runRowId,
        outcome: "failed",
        strategy: "merge-upstream",
        commits_ahead: null,
        commits_behind: null,
        error_message: err.message ?? stderr,
        duration_ms: Date.now() - t0,
      });
      return {
        type: "result",
        full_name: info.full_name,
        parent_full_name: info.parent_full_name,
        branch,
        outcome: "failed",
        strategy: "merge-upstream",
        commits_ahead: null,
        commits_behind: null,
        error_message: err.message ?? stderr,
        duration_ms: Date.now() - t0,
      };
    }
  }

  // Diverged. Get compare status to decide what to do.
  const compare = await fetchCompareStatus(
    opts.db,
    info,
    branch,
    /* noCache */ true,
  );

  if (opts.strategy === "skip") {
    completeRun(opts.db, {
      id: runRowId,
      outcome: "diverged",
      strategy: null,
      commits_ahead: compare.ahead,
      commits_behind: compare.behind,
      error_message: "fork has diverged; strategy=skip",
      duration_ms: Date.now() - t0,
    });
    return {
      type: "result",
      full_name: info.full_name,
      parent_full_name: info.parent_full_name,
      branch,
      outcome: "diverged",
      strategy: null,
      commits_ahead: compare.ahead,
      commits_behind: compare.behind,
      error_message: null,
      duration_ms: Date.now() - t0,
    };
  }

  if (opts.strategy === "rebase") {
    return await doRebase(opts, info, branch, runRowId, t0, compare);
  }

  // strategy === "pr"
  return await openUpstreamPr(opts, info, branch, runRowId, t0, compare);
}

async function doRebase(
  opts: SyncOptions,
  info: RepoInfo,
  branch: string,
  runRowId: number,
  t0: number,
  compare: { ahead: number; behind: number },
): Promise<SyncResult> {
  if (!info.parent_full_name) throw new Error("parent_full_name required");
  const tmp = mkdtempSync(join(tmpdir(), `fork-sync-${info.full_name.replace(/\//g, "-")}-`));
  try {
    // Clone fork at branch (depth=0 to allow rebase)
    await runCmd("gh", ["repo", "clone", info.full_name, tmp, "--", "-q", "--branch", branch]);

    // Add upstream
    await runCmd("git", ["-C", tmp, "remote", "add", "upstream", `https://github.com/${info.parent_full_name}.git`]);
    await runCmd("git", ["-C", tmp, "fetch", "upstream", branch, "--quiet"]);

    // Rebase
    const rebase = await runCmdNoThrow("git", [
      "-C", tmp, "rebase", `upstream/${branch}`,
    ]);
    if (rebase.exitCode !== 0) {
      // Conflict: abort and record
      await runCmdNoThrow("git", ["-C", tmp, "rebase", "--abort"]);
      completeRun(opts.db, {
        id: runRowId,
        outcome: "conflict",
        strategy: "rebase",
        commits_ahead: compare.ahead,
        commits_behind: compare.behind,
        error_message: rebase.stderr.slice(0, 4000),
        duration_ms: Date.now() - t0,
      });
      return {
        type: "result",
        full_name: info.full_name,
        parent_full_name: info.parent_full_name,
        branch,
        outcome: "conflict",
        strategy: "rebase",
        commits_ahead: compare.ahead,
        commits_behind: compare.behind,
        error_message: rebase.stderr.slice(0, 4000),
        duration_ms: Date.now() - t0,
      };
    }

    // Force-push with lease (safer than --force; refuses if remote moved)
    await runCmd("git", [
      "-C", tmp, "push", "--force-with-lease", "origin", branch,
    ]);

    cache.invalidate(opts.db, `GET:/repos/${info.full_name}/compare/`);
    completeRun(opts.db, {
      id: runRowId,
      outcome: "rebased",
      strategy: "rebase",
      commits_ahead: compare.ahead,
      commits_behind: compare.behind,
      error_message: null,
      duration_ms: Date.now() - t0,
    });
    return {
      type: "result",
      full_name: info.full_name,
      parent_full_name: info.parent_full_name,
      branch,
      outcome: "rebased",
      strategy: "rebase",
      commits_ahead: compare.ahead,
      commits_behind: compare.behind,
      error_message: null,
      duration_ms: Date.now() - t0,
    };
  } catch (e) {
    const err = e as { message?: string; stderr?: string };
    completeRun(opts.db, {
      id: runRowId,
      outcome: "failed",
      strategy: "rebase",
      commits_ahead: compare.ahead,
      commits_behind: compare.behind,
      error_message: (err.message ?? err.stderr ?? String(e)).slice(0, 4000),
      duration_ms: Date.now() - t0,
    });
    return {
      type: "result",
      full_name: info.full_name,
      parent_full_name: info.parent_full_name,
      branch,
      outcome: "failed",
      strategy: "rebase",
      commits_ahead: compare.ahead,
      commits_behind: compare.behind,
      error_message: (err.message ?? err.stderr ?? String(e)).slice(0, 4000),
      duration_ms: Date.now() - t0,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

async function openUpstreamPr(
  opts: SyncOptions,
  info: RepoInfo,
  branch: string,
  runRowId: number,
  t0: number,
  compare: { ahead: number; behind: number },
): Promise<SyncResult> {
  if (!info.parent_full_name) throw new Error("parent_full_name required");
  // Open a PR with the parent's branch as the head, fork's branch as the base.
  // This requires write access to the fork (we have it) and uses GitHub's
  // cross-fork PR feature.
  const [parentOwner] = info.parent_full_name.split("/");
  try {
    const title = `Sync ${branch} from upstream (${info.parent_full_name})`;
    const body = `Automated sync from \`${info.parent_full_name}@${branch}\`.\n\nBehind: ${compare.behind} commits, ahead: ${compare.ahead} commits.\n\nMerge this to bring upstream changes into the fork.`;
    await ghRun([
      "pr", "create",
      "--repo", info.full_name,
      "--base", branch,
      "--head", `${parentOwner}:${branch}`,
      "--title", title,
      "--body", body,
    ]);
    completeRun(opts.db, {
      id: runRowId,
      outcome: "diverged",
      strategy: "pr",
      commits_ahead: compare.ahead,
      commits_behind: compare.behind,
      error_message: "PR opened from upstream",
      duration_ms: Date.now() - t0,
    });
    return {
      type: "result",
      full_name: info.full_name,
      parent_full_name: info.parent_full_name,
      branch,
      outcome: "diverged",
      strategy: "pr",
      commits_ahead: compare.ahead,
      commits_behind: compare.behind,
      error_message: null,
      duration_ms: Date.now() - t0,
    };
  } catch (e) {
    const err = e as { message?: string; stderr?: string };
    completeRun(opts.db, {
      id: runRowId,
      outcome: "failed",
      strategy: "pr",
      commits_ahead: compare.ahead,
      commits_behind: compare.behind,
      error_message: (err.message ?? err.stderr ?? String(e)).slice(0, 4000),
      duration_ms: Date.now() - t0,
    });
    return {
      type: "result",
      full_name: info.full_name,
      parent_full_name: info.parent_full_name,
      branch,
      outcome: "failed",
      strategy: "pr",
      commits_ahead: compare.ahead,
      commits_behind: compare.behind,
      error_message: (err.message ?? err.stderr ?? String(e)).slice(0, 4000),
      duration_ms: Date.now() - t0,
    };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function recordSkip(
  opts: SyncOptions,
  info: RepoInfo,
  reason: string,
): SyncResult {
  const id = startRun(opts.db, {
    full_name: info.full_name,
    parent_full_name: info.parent_full_name,
    branch: info.default_branch,
    run_id: opts.run_id,
  });
  completeRun(opts.db, {
    id,
    outcome: "skipped",
    strategy: null,
    commits_ahead: null,
    commits_behind: null,
    error_message: reason,
    duration_ms: 0,
  });
  return {
    type: "result",
    full_name: info.full_name,
    parent_full_name: info.parent_full_name,
    branch: info.default_branch,
    outcome: "skipped",
    strategy: null,
    commits_ahead: null,
    commits_behind: null,
    error_message: reason,
    duration_ms: 0,
  };
}

function recordFailure(
  opts: SyncOptions,
  info: RepoInfo,
  branch: string,
  reason: string,
): SyncResult {
  const id = startRun(opts.db, {
    full_name: info.full_name,
    parent_full_name: info.parent_full_name,
    branch,
    run_id: opts.run_id,
  });
  completeRun(opts.db, {
    id,
    outcome: "failed",
    strategy: null,
    commits_ahead: null,
    commits_behind: null,
    error_message: reason,
    duration_ms: 0,
  });
  return {
    type: "result",
    full_name: info.full_name,
    parent_full_name: info.parent_full_name,
    branch,
    outcome: "failed",
    strategy: null,
    commits_ahead: null,
    commits_behind: null,
    error_message: reason,
    duration_ms: 0,
  };
}

async function fetchRepoInfo(
  db: Database,
  full_name: string,
  noCache?: boolean,
): Promise<RepoInfo> {
  // Try cached metadata first
  if (!noCache) {
    const cached = getRepoMetadata(db, full_name);
    if (cached) {
      // Stale after 24 hours
      const age = Date.now() - new Date(cached.refreshed_at).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        return {
          full_name: cached.full_name,
          default_branch: cached.default_branch,
          is_archived: cached.is_archived,
          parent_full_name: cached.parent_full_name,
          parent_default_branch: cached.parent_default_branch,
          parent_is_archived: cached.parent_is_archived,
          parent_is_deleted: cached.parent_is_deleted,
        };
      }
    }
  }

  type RepoResp = {
    full_name: string;
    default_branch: string;
    archived: boolean;
    fork: boolean;
    parent?: {
      full_name: string;
      default_branch: string;
      archived: boolean;
    };
  };

  const repo = await ghApi<RepoResp>(`/repos/${full_name}`, {
    db,
    cacheTtlSeconds: 24 * 60 * 60,
    skipCache: noCache,
  });

  return {
    full_name: repo.full_name,
    default_branch: repo.default_branch,
    is_archived: repo.archived,
    parent_full_name: repo.parent?.full_name ?? null,
    parent_default_branch: repo.parent?.default_branch ?? null,
    parent_is_archived: repo.parent?.archived ?? false,
    parent_is_deleted: repo.fork && !repo.parent,
  };
}

async function fetchSharedBranches(
  db: Database,
  info: RepoInfo,
  noCache?: boolean,
): Promise<string[]> {
  if (!info.parent_full_name) return [info.default_branch];
  type Branch = { name: string };
  const [forkBranches, parentBranches] = await Promise.all([
    ghApi<Branch[]>(`/repos/${info.full_name}/branches`, {
      db,
      cacheTtlSeconds: 60 * 60,
      skipCache: noCache,
    }),
    ghApi<Branch[]>(`/repos/${info.parent_full_name}/branches`, {
      db,
      cacheTtlSeconds: 60 * 60,
      skipCache: noCache,
    }),
  ]);
  const parentNames = new Set(parentBranches.map((b) => b.name));
  return forkBranches.map((b) => b.name).filter((n) => parentNames.has(n));
}

async function fetchCompareStatus(
  db: Database,
  info: RepoInfo,
  branch: string,
  noCache?: boolean,
): Promise<{ ahead: number; behind: number }> {
  if (!info.parent_full_name) return { ahead: 0, behind: 0 };
  const [parentOwner] = info.parent_full_name.split("/");
  const [forkOwner] = info.full_name.split("/");
  type CompareResp = { ahead_by: number; behind_by: number };
  const resp = await ghApi<CompareResp>(
    `/repos/${info.full_name}/compare/${parentOwner}:${branch}...${forkOwner}:${branch}`,
    {
      db,
      cacheTtlSeconds: 5 * 60,
      skipCache: noCache,
    },
  );
  return { ahead: resp.ahead_by, behind: resp.behind_by };
}

async function runCmd(cmd: string, args: string[]): Promise<string> {
  const proc = Bun.spawn([cmd, ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw {
      message: `${cmd} ${args.join(" ")} exited ${code}`,
      stderr,
      status: code,
    };
  }
  return stdout;
}

async function runCmdNoThrow(
  cmd: string,
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn([cmd, ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { exitCode, stdout, stderr };
}

/**
 * Discover all forks for a user or organization in a single GraphQL query.
 * Paginated. Returns enriched fork list with parent info inline.
 */
export type ForkListItem = {
  full_name: string;
  parent_full_name: string;
  default_branch: string;
  parent_default_branch: string;
  is_archived: boolean;
  parent_is_archived: boolean;
};

export async function listForks(
  db: Database,
  owner: string,
  options: { noCache?: boolean } = {},
): Promise<ForkListItem[]> {
  // Owner may be a user or an org. We don't know upfront, so fall back from one to the other.
  const userQuery = /* GraphQL */ `
    query ($login: String!, $cursor: String) {
      repositoryOwner(login: $login) {
        ... on User {
          repositories(first: 100, isFork: true, after: $cursor, ownerAffiliations: OWNER) {
            pageInfo { hasNextPage endCursor }
            nodes {
              nameWithOwner
              isArchived
              defaultBranchRef { name }
              parent {
                nameWithOwner
                isArchived
                defaultBranchRef { name }
              }
            }
          }
        }
        ... on Organization {
          repositories(first: 100, isFork: true, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              nameWithOwner
              isArchived
              defaultBranchRef { name }
              parent {
                nameWithOwner
                isArchived
                defaultBranchRef { name }
              }
            }
          }
        }
      }
    }
  `;

  type Node = {
    nameWithOwner: string;
    isArchived: boolean;
    defaultBranchRef: { name: string } | null;
    parent: {
      nameWithOwner: string;
      isArchived: boolean;
      defaultBranchRef: { name: string } | null;
    } | null;
  };
  type Resp = {
    repositoryOwner: {
      repositories: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: Node[];
      };
    } | null;
  };

  const all: Node[] = [];
  let cursor: string | null = null;
  while (true) {
    const data: Resp = await ghGraphql<Resp>(
      userQuery,
      { login: owner, cursor },
      {
        db,
        cacheKey: `user-forks:${owner}:${cursor ?? "start"}`,
        skipCache: options.noCache,
      },
    );
    if (!data.repositoryOwner) break;
    const page = data.repositoryOwner.repositories;
    all.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
  }

  return all
    .filter((n) => n.parent && n.defaultBranchRef && n.parent.defaultBranchRef)
    .map((n) => ({
      full_name: n.nameWithOwner,
      parent_full_name: n.parent!.nameWithOwner,
      default_branch: n.defaultBranchRef!.name,
      parent_default_branch: n.parent!.defaultBranchRef!.name,
      is_archived: n.isArchived,
      parent_is_archived: n.parent!.isArchived,
    }));
}
