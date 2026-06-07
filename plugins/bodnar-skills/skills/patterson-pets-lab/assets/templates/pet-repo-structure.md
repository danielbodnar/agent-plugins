# Pet repository structure

The following describes the canonical layout for a new pet repository in Patterson AI Pets. A pet is itself a skill, so the layout follows the agentskills.io specification. The repository contains the skill plus a small amount of supporting material that is repository-scoped rather than skill-scoped.

## Directory layout

```
your-pet-name/
├── SKILL.md                    # The pet itself: name, description, body
├── AGENTS.md                   # Pet conventions, approach, and gotchas
├── README.md                   # Human-facing repository introduction
├── .github/
│   ├── workflows/
│   │   └── submit.yml          # CI that opens PRs to the Show on push
│   └── pull_request_template.md
├── references/                 # Skill references loaded on demand
│   ├── approach.md             # The pet's strategy in detail
│   └── style.md                # Code-style preferences the pet enforces
├── assets/                     # Skill assets used in output
│   └── lore.md                 # The pet's backstory, for non-technical points
└── scripts/                    # Skill scripts the pet may invoke
    └── verify.ts               # Local verification before submission
```

## Required content

The `SKILL.md` at the root is the pet. The frontmatter must include `name` (the pet's name in kebab-case), `description` (what the pet does and when the judge should consider it), and optional metadata for the team, the breed, and lore tags. The body is the pet's instructions for solving challenges, written following the principles in the `building-skills.md` reference.

The `AGENTS.md` at the root describes the pet's conventions, the agent the pet was designed to run under, and any gotchas the team has discovered while iterating. This file is for human contributors and for agents working on the pet itself, not for the judge.

The `README.md` is the human-facing repository introduction. It typically contains the pet's name, the team that owns it, a description of its visual identity, a link to the Show repository, and a brief explanation of how to contribute changes. Per the agentskills.io convention, the README must be at the repository root rather than inside the skill folder.

## Optional content

The `references/` directory holds documents the pet loads on demand. A common pattern is to keep the pet's high-level strategy in `references/approach.md` and load it only when the pet needs to reason about the strategy, rather than loading it on every invocation.

The `assets/` directory holds material used in output. The pet's lore (backstory, personality, breed) lives here and is what non-technical contributors edit when contributing to the team's score.

The `scripts/` directory holds executable code the pet invokes. A `verify.ts` script that runs the engineering hygiene checks locally before submission is a common pattern, because it lets the team confirm a submission will pass the judge before opening a pull request.

The `.github/` directory holds the workflow that submits to the Show. The workflow typically opens a pull request to the Show repository whenever a new version of the pet is pushed to the main branch.

## Naming

The repository name and the skill name must match. Both use kebab-case, lowercase letters, numbers, and hyphens. The repository should be named `your-pet-name` and the SKILL.md frontmatter `name` field should also be `your-pet-name`.

The pet's display name (the name shown in the leaderboard and in race-day visualizations) can include capitals, spaces, and emoji. It lives in the SKILL.md frontmatter `metadata.display_name` field.

## Validation

Before the first push, run the validator from the Patterson skill-creator to confirm the skill structure is correct:

```bash
bunx patterson-skill-creator validate .
```

The validator checks the SKILL.md frontmatter, confirms the required directories and files are present, and reports any deviations from the agentskills.io specification.
