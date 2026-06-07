# Claude Code features reference

Claude Code's extensions to agentskills.io, plus the related primitives: commands, sub-agents, rules, hooks, plugins. Shown as annotated configuration. Source docs: https://code.claude.com/docs/en/skills · /sub-agents · /memory · /hooks · /plugins

## Skill scopes and precedence

```
enterprise   managed settings                              highest priority
personal     ~/.claude/skills/<name>/SKILL.md
project      .claude/skills/<name>/SKILL.md                lowest of the three
plugin       <plugin>/skills/<name>/SKILL.md   namespaced as plugin-name:skill-name
```

Same-named skills resolve by priority: enterprise overrides personal overrides project. Plugin skills are namespaced and never collide.

## Commands are skills

```
.claude/commands/deploy.md            ┐
.claude/skills/deploy/SKILL.md        ┘  both create the /deploy invocation
```

Existing `.claude/commands/*.md` keep working. Skills add a directory for supporting files, frontmatter, and automatic activation.

## Claude Code frontmatter fields (annotated)

```yaml
---
name: deploy
description: Ships the current branch to staging.
argument-hint: [environment]      # autocomplete hint, e.g. [issue-number] or [file] [format]
disable-model-invocation: true    # only the user can run it via /deploy; never auto-loaded
user-invocable: false             # hidden from the slash menu; the agent may still auto-load it
model: opus                       # sonnet | opus | haiku | <full-id> | inherit
effort: high                      # low | medium | high | max (max is Opus 4.6 only)
context: fork                     # run in a forked sub-agent context instead of inline
agent: Explore                    # sub-agent type for context: fork (Explore | Plan | general-purpose)
paths: "src/**/*.ts"              # glob; auto-activate only when working on matching files
shell: bash                       # inline command-block shell; bash (default) or powershell
hooks: {}                         # lifecycle hooks scoped to this skill (see Hooks below)
---
```

## String substitution in skill and command bodies

```
$ARGUMENTS        all arguments passed to the skill/command
$1, $2            individual arguments (also $ARGUMENTS[0], $ARGUMENTS[1])
${CLAUDE_SESSION_ID}   current session id
${CLAUDE_SKILL_DIR}    directory of this SKILL.md; use it to reference bundled scripts/assets
```

```markdown
Run the bundled checker: bun ${CLAUDE_SKILL_DIR}/scripts/verify.ts $1
```

## Sub-agent file

```markdown
---
name: judge
description: Reviews a pet pull request against the rubric and merges or rejects it.
tools: Read, Grep, Glob, Bash        # allowlist
disallowedTools: WebFetch            # denylist
model: sonnet
permissionMode: acceptEdits
mcpServers: [github]
skills: [rubric-loader]              # preloaded into the sub-agent context
memory: project                      # persistent memory scope
---

You are the judge. You receive only this system prompt plus the invoking prompt, never the
parent conversation. Apply the rubric, leave review comments, decide merge or reject, and
return the decision plus the score breakdown.
```

Stored in `.claude/agents/<name>.md` (project) or `~/.claude/agents/<name>.md` (personal). Only `name` and `description` are required. Use a sub-agent when output would flood the main context unreferenced, when specialized instructions must stay consistent, when tool restrictions must be enforced, or when a smaller model controls cost.

Built-in sub-agents: `Explore` (read-only Haiku, file discovery), `Plan` (plan-mode research), `general-purpose` (capable multi-step).

## Rules and memory

```
CLAUDE.md                  repo root, ~/.claude/CLAUDE.md, or enterprise settings
.claude/rules/*.md         one topic per file, optionally path-scoped
```

Path-scoped rule:

```markdown
---
paths: "migrations/**"
---
Never edit a committed migration. Add a new migration file instead.
```

Loading behavior:

```
directory walk   from cwd up to the repo root, every CLAUDE.md found is concatenated (not overridden)
@import          @path/to/more.md inside CLAUDE.md pulls in another file
                 (relative or absolute; not evaluated inside code spans or fences)
AGENTS.md        portable across Claude Code, Cursor, Copilot, Codex; prefer it for portability
```

## Hooks

In `.claude/settings.json` or in skill/sub-agent frontmatter:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "command": "bun scripts/guard.ts" }
    ],
    "PostToolUse": [
      { "matcher": "Edit", "command": "bun run lint --fix" }
    ]
  }
}
```

```
events     PreToolUse  PostToolUse  Stop  SubagentStart  SubagentStop
matcher    the tool or sub-agent name the hook applies to
contract   JSON arrives on stdin; exit code signals pass/fail; exit 2 blocks and returns
           the message to the agent
```

## MCP servers

```json
{
  "mcpServers": {
    "github": { "type": "stdio", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"], "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" } },
    "remote": { "type": "url", "url": "https://mcp.example.com/sse" }
  }
}
```

Tools from a connected server appear alongside the agent's built-in tools.

## Plugins

```
<plugin>/
├── plugin.json        name, version, and the components it bundles
├── commands/
├── agents/            NOTE: plugin sub-agents may NOT use hooks, mcpServers, or permissionMode.
├── skills/                  To use those, copy the agent into .claude/agents/.
├── hooks/
└── .mcp.json
```

```console
$ /plugins                                  # browse and install from a marketplace
$ npx claude-code-templates@latest          # 400+ installable agents, commands, skills, hooks, MCPs
```

## Patterson CLI mapping

The bundled scripts wrap these primitives so the same verbs work everywhere:

```bash
bun scripts/create/agent.ts <name>      # scaffold .claude/agents/<name>.md
bun scripts/create/command.ts <name>    # scaffold .claude/commands/<name>.md
bun scripts/create/mcp.ts <name>        # add a server entry to .mcp.json
bun scripts/find/skill.ts <query>       # search registries
bun scripts/add/skill.ts <owner/repo>   # install from skills.sh
```
