# Security Review

When security review is required and the secure-coding checklist.

**DRI:** [TBD]
**Review cadence:** Quarterly, plus after every security incident
**Last reviewed:** [YYYY-MM-DD]

## Why this exists

Most code does not need security review. The code that does (auth, payments, file uploads, external API integrations) needs it consistently. Documenting the trigger conditions prevents both over-review (everyone burns out) and under-review (the dangerous code slips through).

## [Body section heading]

[TBD: Fill in from `references/core-workflows.md` or the relevant skill reference. Keep imperative voice for processes, descriptive voice for context. Use concrete examples.]

## Success criteria

[TBD: List measurable outcomes that indicate this process is working.]

## Related

- [`code-review.md`](./code-review.md): general code review process
- [`../04-incident-management/postmortems.md`](../04-incident-management/postmortems.md): where security incidents update the trigger list
