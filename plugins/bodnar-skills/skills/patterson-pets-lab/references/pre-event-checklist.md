# Pre-event preparation checklist

Everything below must be in place before participants arrive, so that students write pets rather than configure plumbing. Each item pairs the artifact with a concrete way to confirm it is ready.

## Game design

- [ ] **Rules document** in the Show repository, canonical for disputes.
      `test -f rules/RULES.md`
- [ ] **Scoring rubric** concrete enough that two readers score a submission the same way.
      `test -f rules/RUBRIC.md`
- [ ] **Non-technical scoring categories** defined with the points each is worth.
      `grep -q "design\|commentary\|coaching\|analysis" rules/RUBRIC.md`

## Judge agent (Patterson company-wide skill)

- [ ] **Working judge skill** ingests a pet PR, applies the rubric, comments, merges or rejects.
      `test -f judge/SKILL.md && bunx patterson-skill-creator validate judge`
- [ ] **Rubric committed to the judge repo** in the form the judge actually consumes.
      `test -f judge/references/rubric.md`
- [ ] **Test fixtures**: example submissions with expected outcomes, usable as eval cases.
      `test -d judge/evals && ls judge/evals/*.json`
- [ ] **Installed at company scope** so every team's agent picks it up automatically.
      `ls ~/.claude/skills/judge/SKILL.md  # or the enterprise managed-settings equivalent`

## Workshop repository

- [ ] **Branch-per-lesson** so a late or stuck participant can check out the next lesson.
      `git branch -a | grep -E 'lesson-[0-9]'`
- [ ] **Bootstrap script**: one command prepares the local environment.
      `just bootstrap`
- [ ] **AGENTS.md** written as a canonical example, naming the pre-provisioned Show infrastructure.
      `grep -q "Pre-existing infrastructure" AGENTS.md`
- [ ] **Pet repository template**: a forkable scaffold with a stub spec-conformant SKILL.md.
      `bun scripts/init.ts demo-pet && bunx patterson-skill-creator validate demo-pet`

## Cross-platform developer environment

- [ ] **Reachable four ways**: Codespaces, Dev Container, Dockerfile, local mise install.
      `test -f .devcontainer/devcontainer.json -a -f Dockerfile -a -f mise.toml`
- [ ] **Toolchain plus three agents** installed side by side.
      `bun scripts/setup.ts`
- [ ] **Conventional just verbs** so the same commands work everywhere.
      `just --list | grep -E 'bootstrap|race|submit'`
- [ ] **Reproducible**: same versions and paths regardless of OS.
      `mise ls`

## Skill templates and starters

- [ ] **Bun fork of skill-creator**: anthropics/skills with the Python scripts rewritten in TypeScript/Bun.
      `bun scripts/init.ts --help`
- [ ] **Templates for every primitive** (skill, command, sub-agent, rule, MCP stub, pet).
      `ls assets/templates/`
- [ ] **Templates validate against the spec** so generated skills are correct from the first commit.
      `for d in $(ls -d generated/*/); do bunx patterson-skill-creator validate "$d"; done`

## Live infrastructure

- [ ] **Cloudflare Durable Objects** for the race coordinator and per-team state, deployed and reachable.
      `curl -fsS "$SHOW_API/health"`
- [ ] **Leaderboard surface** rendering and updating as the judge merges PRs.
      `curl -fsS "$LEADERBOARD_URL" | grep -qi leaderboard`
- [ ] **GitHub Actions wiring** triggers the judge on a pet PR to the Show.
      `test -f .github/workflows/judge.yml`

## Workshop-day content

- [ ] **First challenge**: small enough to attempt in-session, varied enough that pets diverge, realistic enough to transfer.
      `test -f challenges/01/PROBLEM.md`
- [ ] **Slide deck** applies the visual identity to each chapter in the workshop plan.
      `test -f assets/prototypes/patterson-pets-workshop.html`
- [ ] **Reference materials** linked from the repo and surfaced on the closing resources slide.
      `grep -q "agentskills.io" assets/prototypes/patterson-pets-workshop.html`

## Build order (dependencies first)

```
1. rules + rubric          everything else encodes them
2. judge agent             most load-bearing; gates several items
3. pet template            must satisfy what the judge expects
4. dev env + skill templates   parallelizable across contributors
5. Show infrastructure     depends on the judge being callable
6. first challenge + deck   encode everything above, so they come last
```
