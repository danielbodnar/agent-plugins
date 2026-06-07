---
name: resume-qc
description: "AI linter for Daniel Bodnar's resume content. Use this skill any time Daniel asks to audit, lint, QC, review, or check resume content, especially danielbodnar.com or pasted resume markdown/HTML. Triggers on phrases like 'audit my resume', 'lint the resume', 'check the resume site', 'what's wrong with my resume', 'review danielbodnar.com', 'QC the resume', or any request to evaluate the quality of resume copy, skills sections, job descriptions, or technical keywords. Operates like oxlint and biomejs for prose, with stable rule IDs, severity levels, located findings, and suggested fixes. Does not propose full rewrites. Stays scoped to what is on the page, with no outside ground-truth checks."
---

# resume-qc

An AI linter for resume content. Modeled on oxlint and Biome: stable rule IDs, severity levels, located findings, suggested fixes, summary counts.

This skill exists because AI tools curating resume content tend to introduce a recognizable set of failure modes: vacuous verbs, self-aggrandizing intros, unsupported tag-cloud entries, redundant skill listings, and house-style violations. A good linter catches these mechanically so the human can focus on judgment calls.

## When this triggers

Daniel asks to audit, lint, QC, or review resume content. The default target is `https://danielbodnar.com/`. He may also paste markdown or HTML directly, or point at a different URL.

## Workflow

1. **Acquire content.** If a URL was given (or the default applies), use `web_fetch` to retrieve it. If markdown or HTML was pasted, work from that. Strip the rendering chrome (terminal-prompt decorations, navigation lines, "expand all / collapse all" controls) before linting so location references point at meaningful content, not at UI scaffolding.

2. **Identify sections.** Resumes have a stable shape: header / summary / experience (each role has a header line, a one-line description, bullets, and a tag cloud) / skills (categorized) / interests / footer. Walk the content and label each section. Findings get scoped to a section so the report is navigable.

3. **Run rule passes.** For each section, evaluate every applicable rule from `references/rules.md`. Rules are the heart of the skill. Read that file before linting — the calibration examples for each rule are the difference between a useful linter and a noisy one.

4. **Emit a report.** Use the linter-style format defined in `references/output-format.md`. Always include the summary counts at the bottom. Default to the human-readable text format unless Daniel asks for JSON.

## Calibration is the whole game

The quick way to write a bad version of this skill is to flag every occurrence of "leverage", "robust", or "comprehensive" as AI slop. That produces noise, gets ignored, and makes the linter useless. The skill's job is to flag *vacuous* use and *allow* concrete use.

A verb like "leveraged" is fine when its object is named and its effect is measurable. "Leveraged eBPF/XDP to drop 1.2M PPS at the NIC" is concrete. "Leveraged cutting-edge solutions to drive efficiency" is filler. Same verb, different verdict. Each rule in `references/rules.md` includes flagged-usage and acceptable-usage examples so this judgment stays consistent across runs.

When the call is genuinely close, prefer `info` over `warning` and explain the calibration in the message. The user can decide.

## What this skill does not do

- It does not propose full rewrites. The fix on each finding is a one-line nudge. Daniel decides what to apply.
- It does not check coverage against an external stack of record. If Cloudflare, Nushell, or Bun aren't on the page, that's not a finding. The linter only judges what's there.
- It does not verify external facts (employment dates, company existence). It can flag `factual/unsourced-metric` for numbers that beg a citation, but it doesn't fact-check.
- It does not auto-apply fixes.

## Output is the contract

Findings are the deliverable. The format is rigid on purpose so the report is scannable, diff-friendly across runs, and pipeable into other tools. See `references/output-format.md` for the spec, including the JSON form.

Always end with the summary block:

```
errors:   N
warnings: N
info:     N
total:    N
```

If the report has zero findings, say so plainly and don't pad.

## House style for the report itself

The report is prose, and Daniel reads it. Apply his own voice rules to it: no em-dashes, no "not X but Y" constructions, no punchy fragments for emphasis, no filler verbs. The linter eats its own dog food.
