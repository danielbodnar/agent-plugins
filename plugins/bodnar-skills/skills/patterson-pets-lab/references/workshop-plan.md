# Workshop plan: Mastering AI Coding Agents

The workshop introduces AI coding agents through five chapters delivered in a single session, framed around the construction of Patterson AI Pets as the canonical example. Each participant leaves with a working pet entered into The Show.

## Opening

The opening sets up the context for the rest of the session. The title slide is followed by Greetings (the instructor's introduction), Expectations (what participants will leave with), and Roadmap (the shape of the session). The fifth slide introduces the project, Patterson AI Pets, explaining the game, the role each participant plays, and showing a sample finished pet alongside the league repository and leaderboard surface. The opening concludes with hands-on Setup, where participants fork the workshop repository, run the bootstrap script, and verify their environment with all three coding agents available.

## Chapter 1: Intro to AI Agents

Chapter 1 establishes the conceptual ground.

The first slide, "The problem with AI," makes the case that you do not really know a tool until you know what it is not good at. Knowing when not to use AI matters as much as knowing how to use it.

The second slide, "The real challenge isn't new," argues that the practical bottleneck in using AI well is the same one software engineers have always faced: breaking complex problems into small, modular units of work. Success or failure with AI hinges on how well this decomposition is done.

The third slide introduces AI in the five environments: web, IDE, terminal, CI/CD, and desktop.

The fourth slide, "Why terminals?", makes the case for terminal-based agents using the principles of KISS, DRY, and the Unix philosophy of doing one thing well and composing with pipes.

The fifth slide previews what the rest of the session covers.

## Chapter 2: Getting Started

Chapter 2 introduces the primitives that make agents extensible.

The first two slides cover what an agent reads at session start and walk through the anatomy of `agents.md`, using the workshop repository's actual file as the example.

The third slide introduces the four primitives: skills, commands, sub-agents, and rules. The slide notes that in Claude Code, commands have been merged into skills, so a file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create the same `/deploy` invocation.

The next four slides walk through each primitive in turn (skill, command, sub-agent, rule), each with a filesystem tree illustration in the iximiuz style, the relevant frontmatter fields, and a reference to the canonical documentation. The tree the slides build up to:

```
.claude/
├── skills/
│   └── deploy/SKILL.md      # auto-activates on relevance; bundles scripts/refs/assets
├── commands/
│   └── deploy.md            # /deploy; same invocation a skill named deploy would create
├── agents/
│   └── judge.md             # sub-agent: isolated context, own tool allowlist
└── rules/
    └── migrations.md        # path-scoped rule, loaded only for matching files
```

The eighth slide covers MCP servers, but only at a structural level: what an MCP server is, the shape of `.mcp.json`, and how tools from a connected server appear alongside the agent's built-in tools. The workshop does not go deeper than this. The shape shown:

```json
{ "mcpServers": { "github": { "type": "stdio", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] } } }
```

The ninth slide is hands-on: participants install a skill from `skills.sh`, confirm the company-wide judge skill is present, and trigger the installed skill to confirm it activates.

```bash
npx skills add <owner/repo>      # install from skills.sh
claude /skills                   # confirm the judge skill is present
# then prompt the agent in a way that should trigger the new skill, and watch it load
```

## Chapter 3: Going Deeper

Chapter 3 shifts from consuming skills to writing one.

The first slide frames pet authorship as skill authorship and walks participants through scaffolding a new pet from the Patterson skill-creator template, authoring the pet's `SKILL.md` with a focused trigger description, and optionally adding supporting commands, sub-agents, or rules.

```bash
bun scripts/init.ts my-pet          # scaffold the pet (a pet is a skill)
$EDITOR my-pet/SKILL.md             # write a focused, trigger-rich description
bunx patterson-skill-creator validate my-pet
```

The second slide explains the hierarchical skill structure: skills live at three levels (company-wide, personal, project), and the judge runs as the Patterson company-wide skill. This is why every pet's pull request gets reviewed automatically without per-team configuration. The pet itself sits at the project level and operates within the constraints the company-wide skill imposes.

The third slide is hands-on: participants push their pet repository to GitHub, test it locally against the practice challenge, and open a pull request against the Show repository to register the pet for the next race.

```bash
just race                           # run the pet against the practice challenge locally
git push -u origin main             # publish the pet repository
just submit                         # open the PR to the Show that registers the pet
```

The fourth slide covers guardrails: allow lists, deny lists, and pre-tool-use hooks that catch a pet before it does something it should not. The slide makes the case that guardrails are not optional once a pet runs autonomously in CI.

## Chapter 4: Tying It All Together

Chapter 4 demonstrates the workshop's payoff: the agent participants just built runs in CI as part of a real workflow.

The first slide makes the bridge explicit: the agent students just used locally is the same agent that runs in CI when a pet's pull request lands. Only the trigger differs.

The second slide introduces the judge agent in its full operational form. Participants see the judge skill, the rubric it consumes, and the workflow that invokes it on each pet's pull request. The slide includes a live demonstration of the judge reviewing a sample submission with comments, scoring, and the merge or rejection decision.

The third slide is the workshop's centerpiece, race day. All registered pets receive the workshop's first challenge simultaneously, participants observe their pets opening pull requests against the Show repository, and the judge reviews each submission and updates the leaderboard as results land. Optionally, participants review another team's pet repository to see how a different approach scored.

The fourth slide covers other CI/CD patterns the same primitive supports: issue triage, dependency updates, and scheduled maintenance pull requests.

The fifth slide tells participants what to take home from the session.

## Closing

The closing recaps the two pillars (skills and MCP servers), reminds participants that the workshop repository, the pet template, and the rules document are all available to take home, and previews where Patterson AI Pets goes from here, including the cadence of upcoming races and how to recruit non-technical teammates.

The fourth slide is a Resources and references slide listing the agentskills.io specification and authoring documentation, the Claude Code documentation for skills, sub-agents, memory and rules, plugins, and hooks, the skills.sh community directory, and the claude-code-templates project at aitmpl.com.

The session ends with Q&A.
