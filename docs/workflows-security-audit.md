# GitHub Actions Security Audit — `.github/workflows`

Audit of the CI workflows and scripts under `.github/`, with the remediations
applied in this branch. Scope: `revert-failed-bumps.yml`, `close-external-prs.yml`,
`validate-plugins.yml`, `scan-plugins.yml`, `bump-plugin-shas.yml`,
`check-mcp-urls.yml`, `validate-frontmatter.yml`, `validate-licenses.yml`,
`scripts/validate-frontmatter.ts`, `scripts/discover_bumps.py`,
`policy/prompt.md`, `policy/schema.json`.

Severities: **Critical / High / Medium / Low / Info**. ✅ = fixed in this branch,
📌 = documented / accepted, ⏭ = recommended follow-up.

## Critical

### C1 — Hardcoded Anthropic Workload Identity Federation IDs ✅
`scan-plugins.yml` hardcoded `anthropic-federation-rule-id`,
`anthropic-organization-id`, and `anthropic-service-account-id`. These are
repository-bound to Anthropic's org and break (or silently no-op) for this fork.
**Fix:** moved to repo variables `SCAN_WIF_FEDERATION_RULE_ID`,
`SCAN_WIF_ORGANIZATION_ID`, `SCAN_WIF_SERVICE_ACCOUNT_ID`, and the scan step is
gated with `&& vars.SCAN_WIF_FEDERATION_RULE_ID != ''` so the job runs on cached
verdicts only when WIF is not configured. To enable scanning on your own infra:

```sh
gh variable set SCAN_WIF_FEDERATION_RULE_ID  --body fdrl_xxx
gh variable set SCAN_WIF_ORGANIZATION_ID     --body <org-uuid>
gh variable set SCAN_WIF_SERVICE_ACCOUNT_ID  --body svac_xxx
```

### C2 — Third-party actions pinned to mutable tags ✅
Every `actions/*` action used a floating major/minor tag (`@v4`, `@v5`, `@v7`),
which can be retagged upstream (supply-chain risk). **Fix:** all pinned to commit
SHAs with a human-readable `# vX.Y.Z` comment:

| Action | Pinned SHA | Tag |
| --- | --- | --- |
| actions/checkout | `11bd7190…` | v4.2.2 |
| actions/checkout | `08c6903c…` | v5.0.0 |
| actions/github-script | `60a0d830…` | v7.0.1 |
| actions/download-artifact | `d3f86a10…` | v4.3.0 |
| actions/upload-artifact | `330a01c4…` | v5.0.0 |
| actions/cache (restore/save) | `8b402f58…` | v5.0.2 |

`oven-sh/setup-bun` and the three `anthropics/claude-plugins-community/...`
composite actions were already SHA-pinned.

## High

### H1 — `xargs` word-splitting / code-path injection ✅
`validate-frontmatter.yml` piped changed filenames to bare `xargs`, so a filename
with spaces or glob characters could be split or expanded. Fork PRs are already
filtered out (`if:` guard on `head.repo.full_name == github.repository`), so this
was latent, not exploitable today. **Fix:** `xargs -d '\n'` treats each line as a
single literal argument.

### H2 — `pull_request_target` in `close-external-prs.yml` 📌
The workflow runs in the privileged base context. **Reviewed and accepted as
safe:** it never checks out or executes PR code; it only reads the author's
collaborator permission and the PR number from the event payload and calls the
REST API with hardcoded `owner`/`repo`. An inline comment now documents this
trust boundary. The rejection message was also rebranded (no longer claims to be
Anthropic's process; points contributors at this repo's issues).

## Medium

### M1 — `permissions:` review 📌
Reviewed all jobs; permissions are least-privilege. Write scopes are scoped to
the jobs that need them and annotated inline:
- `bump-plugin-shas.yml`: `contents/pull-requests/actions: write` (create bump
  branches, open PRs, dispatch checks).
- `revert-failed-bumps.yml` (job): `contents/pull-requests/actions: write`.
- `scan-plugins.yml`: top-level `contents: read` + `id-token: write` (OIDC);
  comment job `pull-requests: write`.
All other workflows are `contents: read`. No change required.

### M2 — Upstream composite-action dependency 📌⏭
`validate-plugins.yml`, `scan-plugins.yml`, and `bump-plugin-shas.yml` depend on
SHA-pinned composite actions in `anthropics/claude-plugins-community`. SHAs are
immutable (good), but the logic lives in an external org. The stale
"`TODO: re-pin once #34 merges`" note was removed and replaced with a comment
noting the dependency. **Follow-up:** fork/vendor these actions for full
independence.

## Low / Info

- **I1 — Secret redaction (positive):** `scan-plugins.yml` redacts
  `sk-ant-…` keys before they reach artifacts/PR comments. Kept.
- **I2 — Markdown neutralization (positive):** PR-comment assembly strips
  markdown control chars to block prompt-injection from upstream plugin content.
  Kept.
- **I3 — Artifact retention:** scan artifacts retained 7 days. Kept.
- **I4 — `discover_bumps.py` (positive):** uses `jq`/safe JSON construction;
  descriptive comment updated to reference `bodnar-agent-plugins`.

## Fork-compatibility summary

After this branch the workflows are fork-safe: WIF is opt-in via repo variables
(C1), actions are SHA-pinned (C2), and Anthropic-specific user-facing text has
been rebranded. The only remaining external coupling is the
`anthropics/claude-plugins-community` composite actions (M2), pinned by SHA and
flagged for optional vendoring.
