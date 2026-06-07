# Engineering Handbook

This is the canonical written-down version of how the engineering team operates: values, workflows, incident response, planning, monitoring. It is the source of truth. If something here is wrong, fix it; if something is missing, add it.

## How to navigate

The handbook is organized into five areas, each in its own directory.

1. **[Direction & Culture](./01-direction-and-culture/)**: What we believe, how we work, where we're going
2. **[Workflows](./02-workflows/)**: How we ship code: issues, review, CI/CD, security
3. **[Planning](./03-planning/)**: How we decide what to build: milestones, roadmaps, capacity
4. **[Incident Management](./04-incident-management/)**: How we respond when things break: broken main, on-call, postmortems
5. **[Monitoring & Quality](./05-monitoring-and-quality/)**: How we know if things are working: observability, technical debt, SLOs

Each directory has its own `README.md` explaining what's inside.

## How this handbook works

**Single source of truth.** Each topic has exactly one canonical file. If a process is also documented in a Slack pin or a Google Doc, those are wrong by definition. Either delete them or replace their content with a link to the file here.

**Async-first.** This handbook should answer most questions a new engineer would ask without anyone needing to be online. If you have to ask someone something more than once, that's a signal: write it down here.

**Living document.** Each file has a DRI (directly responsible individual) and a review cadence at the top. If you see something stale, fix it and open a PR. If you don't know who the DRI is, ask in #engineering and propose yourself.

**Action-oriented.** Files describe what to do, not just what is true. Imperative voice over passive.

**Explain the why.** Every non-obvious process has a "why this exists" paragraph near the top. When the reason expires, the process can be retired.

## How to contribute

1. Open a PR with your proposed change.
2. Tag the file's DRI for review.
3. Get one approval, merge.

Anyone on the team can propose a change to any file. The DRI is the gate for merging, not for ideas.

## Publishing

This handbook is published as a static site. See [`publishing.md`](./publishing.md) for the deploy contract: what generator, what host, how to update.

## Maintenance

- Files are reviewed by their DRI on the cadence stated at the top.
- Engineering managers review their team's pages quarterly.
- Leadership reviews values and direction annually.
- Stale files (no edits in 12 months and no DRI) are candidates for deletion.

---

**Handbook DRI:** [TBD]
**Last reviewed:** [YYYY-MM-DD]
