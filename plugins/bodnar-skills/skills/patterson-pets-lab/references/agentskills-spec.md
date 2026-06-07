# Agentskills.io specification summary

Quick reference for the agentskills.io specification, shown as structure and examples. Full text: https://agentskills.io/specification

## Minimum and full directory layout

```
my-skill/                    # directory name MUST equal the frontmatter `name`
└── SKILL.md                 # the only required file

my-skill/                    # full layout, everything below SKILL.md is optional
├── SKILL.md
├── scripts/                 # executable code the agent may run
│   └── extract.ts
├── references/              # docs loaded on demand, one file per topic
│   └── reference.md
└── assets/                  # templates and resources used in output
    └── template.docx
```

## Annotated SKILL.md

```markdown
---
# --- required ---
name: my-skill                 # 1-64 chars; [a-z0-9-]; no leading/trailing/double hyphen;
                               # MUST match the parent directory; MUST NOT start with
                               # "claude" or "anthropic" (reserved)
description: Extracts tables from PDFs and writes them to CSV. Use whenever the user
             mentions PDFs, tables, or data extraction.   # 1-1024 chars; what it does +
                               # when to use it; read at session start to decide relevance

# --- optional ---
license: MIT                   # or Apache-2.0, or a reference to a bundled license file
compatibility: Requires network access and the `pdftoppm` binary.  # 1-500 chars; rarely needed
metadata:                      # arbitrary string->string map; namespace keys to avoid clashes
  author: team
  version: 0.1.0
allowed-tools: Read Write Bash # space-separated, pre-approved tools (experimental)
---

[Markdown body: the instructions the agent reads after deciding the skill is relevant.]
```

## Field rules as a table

| Field | Required | Constraint |
| --- | --- | --- |
| `name` | yes | 1-64 chars, `[a-z0-9-]`, matches directory, not reserved prefix |
| `description` | yes | 1-1024 chars, states what + when |
| `license` | no | SPDX id or bundled file reference |
| `compatibility` | no | 1-500 chars, environment requirements |
| `metadata` | no | string->string map |
| `allowed-tools` | no | space-separated tool names (experimental) |

## Forbidden in frontmatter

```markdown
---
name: claude-helper            # REJECTED: "claude" prefix is reserved
description: Renders <div> tags # REJECTED: < and > are forbidden in any frontmatter value
                               # (frontmatter enters the system prompt; angle brackets enable injection)
---
```

## Progressive disclosure: three load tiers

| Tier | What loads | When | Budget |
| --- | --- | --- | --- |
| 1 metadata | `name` + `description` | session start, every installed skill | ~50-100 tokens |
| 2 body | SKILL.md after frontmatter | when the skill activates | < 5k tokens (~500 lines) |
| 3 resources | `scripts/`, `references/`, `assets/` | only when the body references them | unbounded |

When the body would exceed tier 2, move detail into `references/` and point to it from the body, so a task pays only for the references it actually loads.

## File references from SKILL.md

```markdown
See [the reference guide](references/reference.md) for the field table.
Run the extractor: scripts/extract.ts
```

Use relative paths from the skill root. Keep references one level deep; avoid nested reference chains.

## Optional directory contents

```
scripts/     # self-contained or dependency-documented; clear errors; handles edge cases.
             # Python, Bash, JavaScript, TypeScript are all common.
references/   # focused, small files (REFERENCE.md, finance.md, legal.md). Each loads
             # independently, so size is a per-load context cost.
assets/      # document templates, config templates, diagrams, lookup tables, schemas.
```

## Validation

```console
$ skills-ref validate ./my-skill
✓ SKILL.md frontmatter valid
✓ name matches directory
✓ no reserved prefix
✓ no angle brackets in frontmatter
skill OK
```

The Patterson fork exposes the same check: `bunx patterson-skill-creator validate ./my-skill`.

## Portability boundary

The base specification above is portable across every compliant agent. Claude Code adds extra frontmatter fields and behaviors (see `claude-code-features.md`); those are valid in Claude Code and ignored elsewhere, so a skill stays portable as long as it does not depend on them. Full Claude Code reference: https://code.claude.com/docs/en/skills
