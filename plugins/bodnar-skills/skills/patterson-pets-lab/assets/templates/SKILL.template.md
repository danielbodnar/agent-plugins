# SKILL.md template

The following is the canonical starting point for a new skill in Patterson AI Pets. Copy it to `SKILL.md` inside a new skill directory, replace the placeholders, and validate against the agentskills.io specification.

```markdown
---
name: skill-name-in-kebab-case
description: [What the skill does] + [when to use it] + [specific trigger phrases]. Make sure to use this skill whenever the user mentions [domain or task], even when they do not explicitly ask for [skill function].
metadata:
  author: [your name or team]
  version: 0.1.0
---

# Skill Name

[Opening paragraph: what this skill is and why it exists. One or two sentences.]

## When to use this skill

[Spell out the trigger conditions in plain language. This complements the description in the frontmatter. The body content is what the agent reads after it has decided the skill is relevant, so this section explains how the agent should apply that decision.]

## How to use this skill

[Step-by-step instructions. Use imperative voice. Be specific about what the agent should do at each step. Reference any bundled scripts, references, or assets here, and explain when each should be loaded.]

## Examples

[Concrete worked examples. At least one. Examples are more reliable than abstract instructions because the agent pattern-matches against them.]

## Gotchas

[Environment-specific facts that defy reasonable assumptions. Each gotcha should be a concrete correction to a mistake the agent will make without being told. This section is often the highest-value content in a skill.]

## References

[Pointers to files in `references/` with explicit guidance on when to load each one. Avoid generic "see references/ for details" pointers.]
```

## Guidance for filling out the template

The name must match the parent directory name exactly. Kebab-case, lowercase letters, numbers, and hyphens only. No underscores, no capitals.

The description is the single most important field, because it determines whether the skill triggers. Front-load the use case, include specific trigger phrases users would actually say, and lean slightly pushy on the triggers to combat undertriggering.

The body should focus on what the agent would get wrong without the skill. Generic advice wastes tokens. Project-specific knowledge, domain conventions, and non-obvious corrections justify their cost.

The body should fit under five hundred lines and five thousand tokens. If the skill needs more detail, move it into files in `references/` and load them on demand.

The body should not duplicate the frontmatter. The frontmatter answers "when do I use this." The body answers "how do I use this." Putting "when to use" content in the body wastes tokens because the agent has already decided to load the skill.

The skill folder must not contain a `README.md`. All documentation belongs in `SKILL.md` or in `references/`. A repository-level README intended for human readers belongs outside the skill folder.

Validate the skill before shipping it. Use `skills-ref validate ./your-skill` or the equivalent TypeScript validator from `patterson-skill-creator`.
