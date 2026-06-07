# `npx skills@latest` reference

The Vercel Labs Skills CLI. A package manager for agent skills, with a public registry at [skills.sh](https://skills.sh) and source flexibility that goes well beyond it.

## Subcommands

| Command | Purpose |
|---------|---------|
| `npx skills find "<query>"` | Search the registry for skills matching a query |
| `npx skills add <source>` | Install a skill into the current project (or globally with `-g`) |
| `npx skills list` | Show installed skills |
| `npx skills update [<source>]` | Update one skill, or all installed skills if no source given |
| `npx skills remove <source>` | Uninstall a skill |

## Flags

| Flag | Effect |
|------|--------|
| `-g`, `--global` | Install into the user-level skills directory instead of the project |
| `-y`, `--yes` | Skip confirmation prompts (useful in setup scripts) |
| `-a`, `--agent <agent>` | Target a specific agent (claude-code, codex, cursor, gemini-cli, opencode, windsurf, etc.) |
| `--skill <name>` | When the source repo contains multiple skills, pick one by name |
| `-h`, `--help` | Show help |

## Source formats

The CLI is generous about where a skill lives. All of these work:

- GitHub shorthand: `owner/repo`
- GitHub shorthand with skill: `owner/repo@skill-name`
- Full GitHub URL: `https://github.com/owner/repo`
- Path inside a repo: `https://github.com/owner/repo/tree/main/path/to/skill`
- GitLab URL or any git URL
- Local folder: `./path/to/skill`

The CLI looks for `SKILL.md` files in the source. If multiple are found and `--skill` is not specified, it prompts.

## Per-agent install paths

Project-scoped installs land in the agent's conventional `.<agent>/skills/` directory:

| Agent | Install path |
|-------|--------------|
| claude-code | `.claude/skills/<skill>/` |
| codex | `.codex/skills/<skill>/` |
| cursor | `.cursor/skills/<skill>/` |
| gemini-cli | `.gemini/skills/<skill>/` |
| opencode | `.opencode/skills/<skill>/` |
| windsurf | `.windsurf/skills/<skill>/` |

Global installs use `~/.<agent>/skills/<skill>/`.

The full list as of late 2025 / early 2026 covers: amp, antigravity, claude-code, clawdbot, codex, cursor, droid, gemini, gemini-cli, github-copilot, goose, kilo, kiro-cli, opencode, roo, trae, windsurf.

## Registry: skills.sh

`skills.sh` is the public directory and leaderboard. It ranks skills by total installs.

Popular sources to know:

- `vercel-labs/agent-skills`: React, Next.js, web design (100K+ installs each)
- `anthropics/skills`: Frontend design, document processing (docx, pptx, xlsx, pdf), canvas-design, algorithmic-art
- `ComposioHQ/awesome-claude-skills`: Community-curated meta-collection
- `VoltAgent/awesome-agent-skills`: 1000+ skills, the most contributed community repo

The badge format for embedding in READMEs is `https://skills.sh/b/<owner>/<repo>`.

## Examples

Find skills for browser testing:

```sh
npx skills find "browser testing"
```

Install one specifically:

```sh
npx skills add browserbase/skills/browser
```

Install React best practices into the current project for Claude Code:

```sh
npx skills add vercel-labs/agent-skills@react-best-practices
```

Install a skill globally so every project can use it:

```sh
npx skills add anthropics/skills@docx -g
```

Install for Codex globally without prompts:

```sh
npx skills add baltazarparra/ai-native-engineering --skill quality-gate -a codex -g -y
```

Install from a local folder while developing a skill:

```sh
npx skills add ./my-skill -y
```

List what is currently installed:

```sh
npx skills list
```

Update everything:

```sh
npx skills update
```

## Notes on safety

The skills.sh registry runs routine security audits and security issues are reported via security.vercel.com. The CLI does not vet third-party sources beyond the registry, so installing arbitrary `owner/repo` sources from outside the registry is the user's responsibility. Prefer registry sources (`vercel-labs/...`, `anthropics/...`, `ComposioHQ/...`) when there is a choice.

## Alternative: the `find-skills` skill itself

Vercel Labs publishes a skill called `find-skills` at `vercel-labs/skills/find-skills` that teaches the agent to discover and install skills on demand. Installing this once is a way to get the agent itself to suggest skills when the user asks something like "is there a skill for X". It is a meta-skill that wraps `npx skills find` with a registry-aware decision flow.
