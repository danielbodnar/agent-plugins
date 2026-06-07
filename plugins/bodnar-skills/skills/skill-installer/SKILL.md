---
name: skill-installer
description: Install agent skills, slash commands, MCPs, hooks, and Claude Code configuration using npx skills, npx autoskills, or npx claude-code-templates. Use whenever the user wants to add a Claude skill, install a skill from skills.sh or a GitHub repo, auto-detect-install skills for a project's stack, browse aitmpl.com or skills.sh, or set up agents/commands/hooks/MCPs/settings. Triggers on phrases like "install a skill", "add a claude skill", "find a skill for X", "set up claude code for this project", "auto-install skills", "browse aitmpl", "add MCP", "add a slash command", "skills.sh", "bootstrap claude config", or any mention of npx skills, npx autoskills, or npx claude-code-templates. Also use when installing from vercel-labs/agent-skills, anthropics/skills, ComposioHQ/awesome-claude-skills, or named skills from these registries. Do NOT use for creating new skills (use skill-creator) or installing the Claude Code CLI itself.
---

# Skill Installer

Three different `npx` tools install agent skills and Claude Code configuration. Each is best at a different intent. The job of this skill is to pick the right tool for the user's actual goal and run it with the right flags.

## The three tools at a glance

| Tool | Best for | Registry |
|------|----------|----------|
| `npx skills@latest` | A specific named skill, or searching the registry | Vercel Labs, [skills.sh](https://skills.sh) |
| `npx autoskills@latest` | Auto-detect a project's stack and install best-fit skills | midudev, autoskills registry |
| `npx claude-code-templates@latest` | Agents, slash commands, hooks, MCPs, settings, language/framework presets | davila7, [aitmpl.com](https://aitmpl.com) |

`skills` is a package manager. `autoskills` is a stack-aware bulk installer. `claude-code-templates` is a broader Claude Code catalog that includes things skills do not cover, like slash commands and MCPs.

## Decide which tool from intent

Pick by what the user is trying to accomplish:

- **The user names a specific skill or registry path** (e.g. `vercel-labs/agent-skills@react-best-practices`, `anthropics/skills`, `ComposioHQ/awesome-claude-skills`) → `npx skills add <package>`
- **The user is starting fresh and wants the right skills for the project's stack** → `npx autoskills` (defaults to claude-code; pass `-a cursor` etc. for other agents)
- **The user is searching for what is out there for task X** → `npx skills find "<query>"` or browse https://skills.sh
- **The user wants an agent, slash command, MCP, hook, or settings preset** → `npx claude-code-templates@latest` with the matching flag (`--agent`, `--command`, `--mcp`, `--hook`, `--setting`, `--workflow`)
- **The user gives a vague "set up claude code for me"** → run `npx autoskills --dry-run` first to show what would be installed, then ask before applying. If they want broader Claude Code config (slash commands, MCPs, statuslines), follow up with `npx claude-code-templates@latest`

When two tools could plausibly serve the same request, prefer the more specific one. `skills` for a named skill, `autoskills` for stack detection, `claude-code-templates` when the deliverable is not a skill at all.

## Default flag preferences

- Use `-y` / `--yes` only after a `--dry-run` review or when the request is unambiguous
- The default agent is `claude-code` for `autoskills` and the most common target for `skills`
- Use `-g` / `--global` for skills that should be available across every project. Most language and framework skills are project-scoped because they describe the project's stack
- For `claude-code-templates`, prefer one component per command. The visibility of "added one agent and one MCP" beats a single mega-command that hides what got installed

## Standard workflow

1. **Confirm intent.** Skill, agent, slash command, MCP, project preset? If unclear, ask once.
2. **Show a dry run when possible.** `autoskills --dry-run` shows what it would install. `skills find` shows search results before `add`. `claude-code-templates` accepts `--dry-run` to preview file creation.
3. **Pick the tool from the intent table above.**
4. **Run the command in the project directory** for project-scoped installs, or pass `--global` / `-g` for user-level.
5. **Verify the install.** Read the relevant `.claude/` subdirectories to confirm the files landed. Mention `CLAUDE.md` if `autoskills` regenerated it, and remind the user to review the diff before committing.

## Where files land after install

- **Project skills**: `.claude/skills/<skill>/SKILL.md`
- **Global skills**: `~/.claude/skills/<skill>/SKILL.md` (when `-g` is passed)
- **Agents**: `.claude/agents/<agent>.md` (claude-code-templates)
- **Slash commands**: `.claude/commands/<cmd>.md`
- **Hooks**: `.claude/hooks/<hook>.md` and entries in `.claude/settings.json`
- **MCPs**: entries in `.claude/settings.json` (or `.mcp.json`)
- **CLAUDE.md**: project root (autoskills regenerates this on every run)
- **skills-lock.json**: project root (autoskills records source and bundle hash for reproducibility)

`ls -la .claude/ && cat CLAUDE.md` after install gives the quick summary.

## Common patterns

A specific Vercel Labs skill:

```sh
npx skills add vercel-labs/agent-skills@react-best-practices
```

Auto-install for the whole project, claude-code only, with a preview first:

```sh
npx autoskills --dry-run
npx autoskills -a claude-code -y
```

Find a Cloudflare deployment skill on the registry:

```sh
npx skills find cloudflare
npx skills add <package-from-results>
```

Install a code-reviewer agent and a GitHub MCP via templates:

```sh
npx claude-code-templates@latest \
  --agent development-tools/code-reviewer \
  --mcp development/github-integration \
  --yes
```

Install a skill globally so it is available across every project:

```sh
npx skills add anthropics/skills@docx -g
```

Browse the templates UI interactively:

```sh
npx claude-code-templates@latest
```

## When to read the references

The reference files have the full flag list and edge cases for each tool. Read the relevant one when the user asks something the workflow above does not cover.

- `references/skills.md` for `skills` subcommands, source formats (GitHub shorthand, full URL, GitLab, git URL, local folder), per-agent install paths, registry semantics
- `references/autoskills.md` for the full list of detected technologies, registry security model (SHA-256 hashes, `skills-lock.json`), `--agent` targets
- `references/claude-code-templates.md` for the full flag list, component categories, language and framework auto-detection, the `--chats` viewer, the analytics dashboard, settings/hooks/workflows surface

## Things that resemble this skill but are different

- Creating a new skill from scratch is `skill-creator`, not this
- Editing an existing skill in place is just text editing, not this
- Installing the Claude Code CLI itself is `npm install -g @anthropic-ai/claude-code`
- Building an MCP server is `mcp-builder`, not this
- Generic `npm install` for a regular library is just npm

## Why three tools instead of one

The ecosystem grew in three directions at once. Vercel built a general package manager (`skills`). The community built a stack-aware auto-installer (`autoskills`). davila7 built a broader Claude Code catalog that goes past skills into agents, commands, MCPs, and settings (`claude-code-templates`). They overlap in places and that is fine. The router above resolves the overlap by intent.
