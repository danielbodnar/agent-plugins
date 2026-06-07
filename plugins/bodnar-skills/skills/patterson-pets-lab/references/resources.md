# Resources and references

External and internal resources for the Patterson AI Pets workshop and skill materials.

## Specification and authoring

| Resource | URL |
| --- | --- |
| Agent Skills specification | https://agentskills.io/specification |
| Skill-creation best practices | https://agentskills.io/skill-creation/best-practices |
| Evaluating skills (test loop) | https://agentskills.io/skill-creation/evaluating-skills |
| Adding skills support to an agent | https://agentskills.io/client-implementation/adding-skills-support |
| Anthropic Complete Guide (PDF) | https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf |

## Claude Code documentation

| Topic | URL |
| --- | --- |
| Skills (Claude Code extensions, commands-as-skills) | https://code.claude.com/docs/en/skills |
| Sub-agents | https://code.claude.com/docs/en/sub-agents |
| Memory (CLAUDE.md, AGENTS.md, .claude/rules/) | https://code.claude.com/docs/en/memory |
| Hooks (pre/post tool use) | https://code.claude.com/docs/en/hooks |
| Plugins | https://code.claude.com/docs/en/plugins |

## Directories and template tooling

| Resource | Install command | URL |
| --- | --- | --- |
| skills.sh community directory | `npx skills add <owner/repo>` | https://skills.sh |
| Claude Code Templates | `npx claude-code-templates@latest` | https://www.aitmpl.com |
| Anthropic first-party skills (basis of the Bun fork) | `npx skills add anthropics/skills/<name>` | https://github.com/anthropics/skills |

## Example partner skills

Asana, Atlassian, Canva, Figma, Sentry, and Zapier publish skills worth reading as patterns for multi-MCP coordination and domain-specific intelligence. Listed in the Anthropic Complete Guide.

## Internal references (this skill)

| File | Covers |
| --- | --- |
| `references/concept.md` | The game: rules, cadence, scoring |
| `references/workshop-plan.md` | Slide-by-slide workshop outline |
| `references/pre-event-checklist.md` | What must be ready before opening day |
| `references/building-skills.md` | Synthesized skill-authoring guidance |
| `references/agentskills-spec.md` | The spec a skill must satisfy |
| `references/claude-code-features.md` | Claude Code primitives and frontmatter |
| `.claude/commands/` | Operational commands plus `build-*` commands that generate each pre-event artifact |
| `assets/templates/` | Scaffolding templates (SKILL, AGENTS, pet, justfile) |
| `scripts/` | The filesystem-routed CLI that scaffolds and installs the above |
| `.claude/commands/` | Slash commands wrapping the scripts |
