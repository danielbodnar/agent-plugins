# Building skills: a synthesis

Synthesis of the Anthropic "Complete Guide to Building Skills for Claude" and the agentskills.io best-practices guidance. Canonical for any skill authored under Patterson AI Pets, pets included. Shown as patterns and examples; for the precise field rules see `agentskills-spec.md`, and for Claude Code extensions see `claude-code-features.md`.

## What a skill is

A folder with a `SKILL.md` (exact case) holding YAML frontmatter then Markdown, optionally plus `scripts/`, `references/`, and `assets/`. One skill authored once works in Claude.ai, Claude Code, and the API, as long as the environment supplies any dependency the skill needs.

## Writing the description (the trigger)

The description is the single field that decides whether the skill loads. Pattern:

```
[what it does] + [when to use it] + [key capabilities / trigger phrases]
```

Agents currently undertrigger, so lean slightly pushy on the trigger language.

```yaml
# strong: specific verb, concrete nouns, real trigger phrases, slightly pushy
description: Extracts tables and form fields from PDFs into CSV or JSON. Use whenever the
  user mentions PDFs, scanned documents, invoices, or data extraction, even when they do
  not say "extract".

# weak: vague, no triggers, unrecognizable from user phrasing
description: Helps with documents.
description: Implements the hierarchical project entity model.
```

## Description antipatterns and fixes

| Symptom | Example | Fix |
| --- | --- | --- |
| Too generic | `Helps with projects` | Name the verb and the artifact: `Drafts and validates Terraform modules...` |
| Missing trigger | `Creates documentation systems` | Add phrases users say: `...whenever the user mentions docs, READMEs, or API reference` |
| Too technical | `Implements the HPE model` | Describe in user words: `Tracks tasks, milestones, and project status` |

## Writing the body: show, do not tell

The body should focus on what the agent gets wrong without it. Generic advice wastes tokens; project-specific corrections justify their cost.

```markdown
<!-- wastes tokens: the agent already knows this -->
## Error handling
Handle errors appropriately and follow best practices.

<!-- earns its place: a concrete correction the agent cannot infer -->
## Querying users
The `users` table uses soft deletes. Every query MUST include `WHERE deleted_at IS NULL`,
or it returns rows the application treats as gone.
```

Calibrate prescriptiveness to fragility. Where many approaches work and consistency does not matter, state the goal and let the agent choose. Where operations are fragile or consistency is essential, give explicit steps. Most skills mix both; calibrate per section.

Provide defaults, not menus:

```markdown
<!-- default with a fallback: actionable -->
Use pdfplumber for text extraction; fall back to pdf2image with pytesseract for scans.

<!-- menu: forces the agent to choose with no guidance -->
You can use pypdf, pdfplumber, PyMuPDF, or pdf2image.
```

## The gotchas section (often the highest-value content)

Template:

```markdown
## Gotchas
- [Concrete mistake the agent will make] -> [the correction].
- [Environment fact that defies a reasonable assumption] -> [what is actually true].
```

Filled example:

```markdown
## Gotchas
- The staging API returns 200 with an error body, not a 4xx. Check `body.ok`, not the status.
- `bun test` ignores files outside `src/`. Put fixtures in `src/__fixtures__/` or they will not run.
```

When the agent makes a mistake in practice, add the correction here. That is the most direct improvement path.

## Output templates beat prose formats

When output must follow a shape, ship a template; agents pattern-match against structure far more reliably than against a described format.

```markdown
## Report format
ALWAYS use this exact structure:
# [Title]
## Summary
## Findings
## Recommendations
```

Short templates live inline. Longer ones live in `assets/` and are referenced from the body with explicit load instructions.

## Bundled scripts beat repeated instructions

If the skill keeps asking the agent to write the same helper (a validator, a parser, a chart builder), bundle it under `scripts/` and call it. Code is deterministic; prose instructions are reinterpreted every run. This matters most for validations, where determinism is the point.

## Progressive disclosure as a cost decision

```
SKILL.md body only            -> pays full body cost on every activation
SKILL.md body + references/    -> pays small body cost + only the references a task loads
```

The second pattern is almost always preferable once supporting material is non-trivial.

## Testing loop

Minimum loop: author, run two or three realistic prompts (what a real user would actually type), observe whether it triggered and whether the output was correct, improve, repeat.

For objectively verifiable outputs, store cases in `evals/evals.json` and run each with and without the skill for a baseline:

```json
{
  "skill_name": "pdf-extractor",
  "evals": [
    {
      "id": 1,
      "prompt": "Pull the line items from invoice.pdf into a CSV",
      "expected_output": "A CSV with one row per line item and a header row",
      "assertions": [
        "output file has a .csv extension",
        "header row contains 'description' and 'amount'",
        "row count matches the invoice line-item count"
      ]
    }
  ]
}
```

Subjective skills (writing style, design quality) are reviewed by a human against a stated goal, not by assertions.

## Pitfall checklist

- [ ] Description is specific, with concrete trigger phrases (not "helps with projects").
- [ ] Body teaches only what the agent does not already know.
- [ ] Skill is narrow; it does one thing, so its description stays focused.
- [ ] Detail lives in `references/`, not a 5000-line body.
- [ ] No `README.md` inside the skill folder; human-facing README lives at the repo root.

## Distribution

```bash
# share the directory directly, or:
npx skills add <owner/repo>                  # install from skills.sh
npx claude-code-templates@latest --skill X   # install from aitmpl.com
python -m scripts.package_skill ./my-skill   # produce a .skill zip for Claude.ai upload
```

## Sources

Anthropic Complete Guide: https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf
Agent Skills best practices: https://agentskills.io/skill-creation/best-practices
Links collected in `resources.md`.
