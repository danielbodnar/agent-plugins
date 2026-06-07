# Security scanning & component kill-switch

How this marketplace handles vulnerabilities, and how to disable a compromised
or vulnerable plugin/skill/agent/script everywhere the marketplace is installed.

## Scanning layers

| Layer | Scope | Config |
| --- | --- | --- |
| **CodeQL** | First-party code (plugin/hook logic, scripts, CI workflows). Vendored skill demo/prototype/reference *assets* are excluded as non-deployed fixtures. | `.github/codeql/codeql-config.yml` + `.github/workflows/codeql.yml` |
| **Socket.dev** | Dependency / supply-chain: malware, install scripts, telemetry, shell access, credential exfiltration. Blocks on high-signal issues. | `socket.yml` |
| **scan-plugins** | LLM policy review of each referenced upstream plugin at its pinned SHA. | `.github/workflows/scan-plugins.yml` |
| **Workflow hardening** | SHA-pinned actions, least-privilege tokens, WIF opt-in. | `docs/workflows-security-audit.md` |

### Enabling the scoped CodeQL config

CodeQL currently runs as repo **default setup**, which scans everything
(including vendored demo assets) and cannot honour path exclusions. To switch to
the scoped config in this repo:

1. **Settings -> Security -> Code scanning** -> disable CodeQL **default setup**.
2. `gh variable set CODEQL_ADVANCED --body true`

The advanced workflow is gated on that variable, so it stays inert (and cannot
double-run against default setup) until both steps are done.

## Disabling a component (the kill-switch)

```sh
# whole plugin
node scripts/disable-component.mjs <plugin-name> --reason "CodeQL DOM-XSS" --cve https://github.com/danielbodnar/agent-plugins/security/code-scanning/7

# a single skill inside a strict:false bundle
node scripts/disable-component.mjs cct-development:some-skill --reason "..."

# preview only
node scripts/disable-component.mjs <name> --reason "..." --dry-run

# list what is currently disabled
node scripts/disable-component.mjs --list
```

What it does:

1. Removes the entry from `.claude-plugin/marketplace.json` (so the component is
   no longer distributed or installable).
2. For vendored local-source plugins, moves the files to `quarantine/` (kept in
   git history; out of the published `plugins/` tree).
3. Records the action in `SECURITY-DISABLED.md`.

After running it: **commit, push, and open a tracking issue** that pastes the
restore commands (below). Once pushed to `main`, the next marketplace refresh on
any client removes the component from discovery/updates.

### Propagation reality

- **On marketplace refresh** (`/plugin marketplace update`, or any client
  re-reading the marketplace): the component disappears from discovery and will
  not update. This covers Claude Code, claude.ai, and OpenCode wherever the
  marketplace is added.
- **Already-installed local copies are not force-removed** — the plugin spec has
  no remote uninstall. The tracking issue should tell users to run:
  ```sh
  /plugin uninstall <plugin-name>@bodnar-agent-plugins
  /plugin marketplace update bodnar-agent-plugins
  ```

### Restoring after a fix

```sh
node scripts/disable-component.mjs --restore <plugin-name>   # prints the exact git commands
```

Then delete the component's row from `SECURITY-DISABLED.md`, re-add its
marketplace entry, and re-run `npx github:hesreallyhim/claude-code-json-schema .`.
