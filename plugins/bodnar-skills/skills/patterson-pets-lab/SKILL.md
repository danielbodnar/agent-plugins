---
name: patterson-pets-lab
description: Plan, design, and build Patterson AI Pets, a team-based competitive coding game with autonomous coding agents as pet avatars, and the associated workshop "Mastering AI Coding Agents" for Patterson TechDays. Use this skill whenever the user mentions Patterson AI Pets, The Show, the workshop lab, the judge agent, the pet template, race-day mechanics, the bun-based skill-creator fork, the cross-platform dev environment, or any pre-event preparation item. Also use when drafting skill-creation prompts for workshop or game components, authoring the slide deck, scaffolding pet repositories, or synthesizing the Anthropic skill-building guide and agentskills.io specification into workshop materials. Make sure to use this skill any time the user is working on the lab, the game, the judge, or any Patterson AI Pets artifact, even when they do not name the project explicitly.
metadata:
  author: Daniel Bodnar
  version: 1.1.0
  audience: Patterson TechDays
---

# Patterson AI Pets Lab

This skill packages the working definition of Patterson AI Pets, the workshop plan that introduces it, and the artifacts required to deliver the workshop and run the game afterward. It is intended for use while planning the workshop, drafting materials, building infrastructure, and onboarding collaborators.

## What Patterson AI Pets is

Patterson AI Pets is a team-based competitive coding game for groups of mixed technical and non-technical participants within an organization. Each team designs and maintains an autonomous coding agent represented in the game as a pet avatar with its own name, breed, and visual identity. The agent itself lives in a GitHub repository the team controls. Teams compete in periodic races, called Shows, where every pet receives the same coding challenge and attempts to solve it autonomously. A judge agent reviews each submission against a published rubric and merges or rejects the work. Race outcomes feed a leaderboard, with additional points available for non-technical contributions such as pet design, race commentary, and post-race analysis. The team with the highest cumulative score at season end is named Best in Show.

For the full board-game-style description of the game and its mechanics, read `references/concept.md`.

## What the workshop is

The workshop, titled "Mastering AI Coding Agents," is the kickoff event for Patterson AI Pets. It is delivered to a group of Patterson developers and runs over a single session. The workshop introduces AI coding agents through five chapters covering the problem AI is and is not good at, the five environments where agents live, the four primitives of skills, commands, sub-agents, and rules, the practice of writing one's own skill, and a real-world demonstration that ties everything together by running the first race of the new league. Each participant leaves with a working pet entered into The Show.

For the full chapter outline with sub-bullets and embedded student workflow, read `references/workshop-plan.md`.

## How this skill is organized

The reference material is split across two directories. The `references/` directory contains background documentation that should be loaded only when relevant to the task at hand. The `assets/` directory contains output material: templates ready to be scaffolded into new files, and the slide-deck prototypes. Two further directories hold runnable tooling. The `scripts/` directory is a Bun-based, filesystem-routed CLI that scaffolds and installs the primitives the workshop uses. The `.claude/commands/` directory holds slash commands: the operational workflow commands that wrap the scripts, and the `build-*` commands that generate each pre-event artifact.

When the user asks about the game itself, the rules, the cadence, or the scoring, consult `references/concept.md`. When the user asks about the workshop structure, the chapter outline, or what students will be doing during the session, consult `references/workshop-plan.md`. When the user asks what needs to be ready before opening day, consult `references/pre-event-checklist.md`. When the user is authoring a new skill of any kind, consult `references/building-skills.md` for the synthesized best practices and `references/agentskills-spec.md` for the precise specification. When the user is working with Claude Code primitives specifically, consult `references/claude-code-features.md`.

When the user wants to build a workshop or game component, run the matching `build-*` command from `.claude/commands/`, or hand them the command body as a paste-ready prompt for another agent such as OpenCode. When the user is scaffolding a new file, use the corresponding template in `assets/templates/` or run the matching script in `scripts/`. When the user is working on the workshop slide deck, consult `assets/prototypes/INDEX.md` to understand the existing visual prototypes and pick a starting point.

## Working on the workshop

When the user is building out workshop content, the workflow is to start from the chapter outline in `references/workshop-plan.md`, identify which slide or section needs work, and either draft the content directly or run `/build-deck` (optionally scoped to a chapter). The workshop plan is the canonical source of truth for what the workshop covers and in what order. Any change to the workshop scope must be reflected there first, then propagated to slides and supporting artifacts.

When the user adds a new piece of pre-event preparation, also update `references/pre-event-checklist.md` so the checklist remains complete.

## Working on the game

When the user is working on game design, the workflow is to start from the concept document in `references/concept.md`, identify which mechanic or rule needs definition or revision, and update the document directly. The concept document is the public face of the game and should be readable by non-technical participants. Operational detail such as scoring formulas, judge rubrics, and race-day procedures belongs in separate documents linked from the concept.

When the user introduces a new game mechanic that requires infrastructure (a new endpoint, a new Durable Object, a new GitHub Action), also update `references/pre-event-checklist.md` and consider whether a new `build-*` command should be added to `.claude/commands/`.

## Authoring new skills

When the user wants to author a new skill, whether for the game, the workshop, or as a pet, the canonical reference is `references/building-skills.md`, which synthesizes the Anthropic complete guide and the agentskills.io specification. The general workflow is described there. The strict structural requirements (file naming, frontmatter fields, directory conventions) are in `references/agentskills-spec.md`.

For authoring a pet specifically, start from the pet template in `assets/templates/pet-repo-structure.md`. A pet is a skill, and the same rules apply. The pet's `SKILL.md` is what the judge will read on race day, so it should be focused, well-described, and free of irrelevant content that competes for the agent's attention.

## The build commands

The `build-*` slash commands in `.claude/commands/` each produce one pre-event preparation artifact. Every command is invokable directly in Claude Code, and its body is a structured, paste-ready prompt that can also be handed to another agent such as OpenCode. The commands are listed below in roughly the order they are built; the dependencies are noted in each command body, and several can run in parallel.

- `/build-rules` — the rules document and scoring rubric authoring skill (built first; everything encodes it)
- `/build-judge` — the judge skill, installed as the Patterson company-wide skill (most load-bearing; depends on the rules)
- `/build-workshop-repo` — the workshop repository with branch-per-lesson structure
- `/build-agents-md` — the canonical AGENTS.md for a repository (takes an optional repo path)
- `/build-pet-template` — the starter scaffold for new pets (takes pet name and team name)
- `/build-dev-env` — the cross-platform developer environment (mise, just, devcontainer, codespaces, dockerfile, claude, opencode, copilot)
- `/build-skill-creator` — the TypeScript and Bun rewrite of the anthropics/skills skill-creator with Patterson templates
- `/build-show-infra` — the Cloudflare Worker, Durable Objects, and leaderboard surface
- `/build-judge-ci` — the GitHub Actions workflow that runs the judge on incoming pet pull requests
- `/build-challenge` — the race-day coding challenge (takes an optional time budget)
- `/build-deck` — the slide deck generated from the workshop plan (takes an optional chapter)

Run the matching command when the user is ready to build that component, or adapt the command body if their needs have shifted from what is documented. The operational counterparts are distinct: `/config-cicd` wires the live judge workflow into a repository, whereas `/build-judge-ci` builds the skill that authors that workflow.

## The prototypes

Three HTML slide deck prototypes for the workshop are bundled in `assets/prototypes/`. They represent different visual directions and different stages of content development, and none is the final deck. The accompanying `assets/prototypes/INDEX.md` describes each prototype's status, its current strengths, and the issues that need to be addressed before any of them can become the canonical deck. When the user is generating, revising, or selecting a visual direction for the workshop deck, consult the index first to understand what has already been tried, then reference the appropriate prototype as starting material.

## The scripts

The `scripts/` directory is the Bun rewrite of the skill-creator as a filesystem-routed CLI. The directory layout is the command surface: `scripts/<verb>/<entity>.ts` is invoked as `<verb> <entity>`, so `scripts/create/skill.ts` scaffolds a skill and `scripts/add/agent.ts` installs a sub-agent. Every leaf script is a runnable Bun executable with a `#!/usr/bin/env bun` shebang; the shared logic lives in `scripts/lib/`, so the leaves stay thin and there is one place to change behavior.

The verbs are distinct in meaning. `create` scaffolds a new local instance from the entity template. `find` searches the registries. `add` installs an existing instance from a registry. `remove` deletes a local instance. `edit` locates an instance and opens it in the editor. The entities are agent, skill, command, template, reference, mcp, and plugin, defined in `scripts/lib/entities.ts`.

Four top-level scripts stand alone. `init.ts` scaffolds a complete pet repository and also acts as a dispatcher for the verb and entity routing. `setup.ts` provisions and verifies the cross-platform developer environment. `sync-docs.ts` refreshes the reference material from canonical upstream sources into a cache for reconciliation. `search.ts` runs a unified `gh` code search across the repositories behind skills.sh, the Anthropic skills repository, and aitmpl.com.

When the user wants to scaffold, find, or install a primitive, run the matching script rather than writing files by hand. The scripts validate against the spec and keep naming conventions consistent.

## The commands

The `.claude/commands/` directory holds two families of slash commands. The operational commands wrap the scripts and drive the workflows: `/init`, `/setup`, `/guide`, `/skills`, `/config-cicd`, and `/add-agents`. The `build-*` commands generate the pre-event artifacts and are described in the section above. Every command references bundled scripts and files through `${CLAUDE_SKILL_DIR}` so paths resolve regardless of the working directory. `/guide` is the orientation command: it loads the relevant reference and points the user at the next concrete step.

## Conventions

Naming follows the agentskills.io specification: kebab-case directory names, exactly `SKILL.md` (case-sensitive) for the entry file, no underscores or capitals in skill names. Skill names must not start with "claude" or "anthropic" (these are reserved). For details, see `references/agentskills-spec.md`.

Scaffolding templates in `assets/templates/` are named `[name].template.[ext]`, for example `SKILL.template.md` and `AGENTS.template.md`, so editors apply the target language's syntax highlighting and linting to the template itself rather than treating it as an opaque `.template` file.

Writing style for any document produced under this skill follows the conventions in the user's writing-style skill if available. The defaults are complete sentences with natural rhythm, no em-dashes, no fragment-stacking, no hardcoded implementation specifics unless explicitly requested. Documents intended for delivery should contain only the work itself, with any process commentary or open questions kept in chat instead.

Skill descriptions should be specific about both what the skill does and when it should trigger, and should lean slightly pushy on trigger language to combat the model's tendency to undertrigger. See `references/building-skills.md` for examples.

## Resources

For the full list of external references including links to the Anthropic complete guide, the agentskills.io documentation, the Claude Code documentation, and the community skills directory, see `references/resources.md`.
