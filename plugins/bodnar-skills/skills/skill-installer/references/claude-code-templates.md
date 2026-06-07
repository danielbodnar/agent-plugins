# `npx claude-code-templates@latest` reference

A broader Claude Code configuration catalog. Goes past skills into agents, slash commands, hooks, MCPs, settings presets, statuslines, and full project templates. Browseable at [aitmpl.com](https://aitmpl.com).

## Source

GitHub: [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates)
Site: [aitmpl.com](https://aitmpl.com)

## Modes

The CLI runs in three modes depending on which flags are passed:

1. **Interactive browse**: `npx claude-code-templates@latest` with no flags opens an interactive selector
2. **Component install**: pass any of `--agent`, `--command`, `--mcp`, `--hook`, `--setting`, `--workflow` to install specific named components
3. **Stack scaffold**: pass `--language` and optionally `--framework` to scaffold a project preset

## Component categories

| Flag | What it installs | Example |
|------|------------------|---------|
| `--agent <path>` | An AI agent definition (file under `.claude/agents/`) | `--agent development-team/frontend-developer` |
| `--command <path>` | A slash command (file under `.claude/commands/`) | `--command testing/generate-tests` |
| `--mcp <path>` | An MCP server entry in `.mcp.json` or `.claude/settings.json` | `--mcp database/postgresql-integration` |
| `--hook <path>` | A hook (file under `.claude/hooks/` and an entry in settings) | `--hook git/pre-commit-validation` |
| `--setting <path>` | A settings preset that writes into `.claude/settings.json` | `--setting performance/mcp-timeouts` |
| `--workflow <path>` | A bundled workflow that combines several components | `--workflow git-excellence` |

Component paths follow `category/name`. Browse aitmpl.com to discover what is available.

## Stack scaffolds

For greenfield setup, the CLI auto-detects framework and language from `package.json` / `requirements.txt` / `pyproject.toml`, or accepts explicit flags:

```sh
# Specific language
npx claude-code-templates@latest --language python

# Language plus framework
npx claude-code-templates@latest \
  --language javascript-typescript \
  --framework nextjs

# Adding agents on top
npx claude-code-templates@latest \
  --language python \
  --agent ml-engineer \
  --agent data-scientist
```

Supported language values include `javascript-typescript`, `python`, `go`, `rust`, and others (browse the catalog).

## Common flags

| Flag | Effect |
|------|--------|
| `--yes` | Skip confirmation prompts |
| `--dry-run` | Show what files would be created without writing anything |
| `--global` | Install into `~/.claude/` instead of the project's `.claude/` |

The flags can be combined: `--agent X --command Y --mcp Z --yes` installs all three in one run.

## Built-in tools beyond installation

The CLI ships with a few utilities that are not about installing components:

- `--chats`: Mobile-optimized live viewer for Claude responses. Pair with `--tunnel` for secure remote access via Cloudflare Tunnel:
  ```sh
  # Local
  npx claude-code-templates@latest --chats
  # Remote
  npx claude-code-templates@latest --chats --tunnel
  ```
- `--analytics`: Real-time monitoring dashboard for AI development sessions with live state detection and performance metrics
- `--check`: Comprehensive diagnostics for the local Claude Code install
- `--marketplaces`: Unified interface to view marketplaces, installed plugins, and manage permissions

## Component categories on aitmpl.com

The site organizes components into searchable categories:

- **Agents**: development-team (frontend-developer, backend-developer, fullstack-developer), AI specialists (ml-engineer, data-scientist, prompt-engineer), security (security-auditor, code-reviewer), business and marketing
- **Commands**: testing, performance, code-optimization, documentation, deployment, scaffolding
- **MCPs**: database integrations (postgresql, mysql, mongodb), development integrations (github, gitlab), web (web-fetch, filesystem-access), AI services
- **Hooks**: git (pre-commit-validation, commit-validator), formatting, linting, test triggers
- **Settings**: permissions, model selection (use-sonnet, use-opus), performance tuning, allow lists
- **Workflows**: git-excellence, full-stack development, security-first, ML lifecycle

## Examples

Browse interactively:

```sh
npx claude-code-templates@latest
```

Install a single agent:

```sh
npx claude-code-templates@latest --agent development-tools/code-reviewer --yes
```

Install a stack: code-reviewer agent, generate-tests command, GitHub MCP:

```sh
npx claude-code-templates@latest \
  --agent development-tools/code-reviewer \
  --command testing/generate-tests \
  --mcp development/github-integration \
  --yes
```

Scaffold a Python FastAPI project with API and security agents:

```sh
npx claude-code-templates@latest \
  --language python \
  --framework fastapi \
  --agent api-developer \
  --agent security-auditor \
  --mcp postgresql-integration \
  --setting read-only-mode
```

Add a security auditor to an existing project:

```sh
npx claude-code-templates@latest --agent security-auditor
```

Open the live chat viewer with a Cloudflare Tunnel:

```sh
npx claude-code-templates@latest --chats --tunnel
```

## File layout after install

```
.claude/
├── agents/
│   ├── frontend-developer.md
│   ├── backend-developer.md
│   └── fullstack-developer.md
├── commands/
│   ├── setup-testing.md
│   ├── setup-linting.md
│   └── ci-pipeline.md
├── hooks/
│   ├── format-javascript-files.md
│   └── eslint-on-save.md
├── settings.json
└── settings.local.json
```

The CLI merges new components with existing ones rather than overwriting, and prompts on conflict.

## Removing components

There is no `remove` subcommand. Delete the relevant files directly:

```sh
rm .claude/agents/unwanted-agent.md
rm .claude/commands/unwanted-command.md
```

Edit `.claude/settings.json` or `.claude/settings.local.json` by hand to remove MCP entries, hook registrations, or settings.

## When to reach for this vs `skills` or `autoskills`

`claude-code-templates` is the right tool when the deliverable is something other than a skill: an agent, a slash command, an MCP, a hook, or a settings preset. It is also the right tool for greenfield project scaffolds that bundle a language, framework, and a curated set of agents and commands together.

For skills specifically, `skills` and `autoskills` have larger and more actively-curated registries. Reach for `claude-code-templates` for skills only when its catalog has something the others do not.
