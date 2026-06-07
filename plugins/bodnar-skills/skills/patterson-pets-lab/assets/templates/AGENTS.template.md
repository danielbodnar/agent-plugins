# AGENTS.md template

The following is the canonical starting point for an AGENTS.md file in a Patterson AI Pets repository. Copy it to the repository root, replace the placeholders, and revise until every section answers the question: what would the agent get wrong without being told this?

```markdown
# [Repository Name]

[One paragraph describing what this repository is and what the agent is expected to help with. Be specific about the project context. Generic statements waste context.]

## Stack and tooling

[Languages, runtimes, frameworks, and version pins. Mention only what is actually used. If the project uses Bun and TypeScript, say so. If it uses a specific test runner or linter, name it. The agent should not have to infer this from package.json.]

## Conventions

[Project-specific conventions the agent must follow. Naming patterns, file organization, import styles, code formatting rules that go beyond what the linter enforces. Anything an experienced contributor would correct in code review.]

## Forbidden zones

[Files, directories, or operations the agent must not modify or invoke. Migration files, generated code, third-party vendored content, anything destructive without explicit approval. Be specific.]

## Pre-existing infrastructure

[Everything that already exists in the environment but is not visible from the repository tree. External services, deployed Workers, Durable Object bindings, MCP servers, environment variables, secrets. The agent cannot discover these without being told.]

For Patterson AI Pets repositories, this section typically includes:
- The Show repository at [URL] and its pull request conventions
- The Cloudflare Durable Objects at [bindings]
- The company-wide judge skill installed at [location]
- The leaderboard endpoint at [URL]

## How to work in this repository

[Specific workflows the agent should follow when contributing. How to run tests, how to validate changes, how to format commits, how to open pull requests. Reference any bundled scripts in the repository's `scripts/` directory.]

## Resources

[Links to canonical documentation. For Patterson AI Pets repositories, this includes the rules document, the rubric, the workshop plan if relevant, and the agentskills.io specification.]
```

## Guidance for filling out the template

The AGENTS.md file is read by the agent at session start. Every line in the file occupies context throughout the session. Treat it as you would treat the most expensive comment in a codebase: each line must earn its place.

The test for whether a section belongs in AGENTS.md is whether the agent would get something wrong without it. Generic best practices ("write clear code," "handle errors gracefully") fail this test. Project-specific conventions ("the `users` table uses soft deletes, queries must include `WHERE deleted_at IS NULL`") pass it.

The pre-existing infrastructure section is usually the highest-value content for Patterson AI Pets repositories, because the workshop's defining example is teaching agents about infrastructure they cannot discover on their own. Spend the most effort here.

The same file can be named `CLAUDE.md` if the project is Claude-specific. The `AGENTS.md` convention is more portable across coding agents, including Cursor, GitHub Copilot, and Codex.

For larger projects, individual rules can be moved into `.claude/rules/*.md` with `paths:` frontmatter that scopes them to specific file patterns. This reduces the context cost of rules that apply only to certain parts of the codebase.
