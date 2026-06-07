# Patterson AI Pets: The Show

Patterson AI Pets is a team-based competitive coding game intended for groups of mixed technical and non-technical participants within an organization. Each team designs and maintains an autonomous coding agent, represented in the game as a pet avatar with its own name, breed, and visual identity. The agent itself lives in a GitHub repository that the team controls.

## The race

At a regular cadence, every pet in The Show receives the same coding challenge and attempts to solve it autonomously. The pet reads the problem statement, produces a pull request, and submits the work for review. A judge agent evaluates each submission against a published rubric covering correctness, simplicity, clarity, and engineering hygiene, then merges or rejects the pull request based on the result. The race itself plays out across The Show's GitHub activity and is rendered visually as pets running, jumping, and avoiding obstacles, with each obstacle corresponding to a real engineering check that pets either passed or failed.

The hands-off character of the race is deliberate. Once a pet is submitted, the human who built it watches but does not intervene. This mirrors the way autonomous agents are used in production, where preparation is the work and the run is the evaluation.

## The leaderboard

Each race produces a leaderboard. A pet's score reflects both the quality of its solution as judged against the rubric and the token efficiency of the agent that produced it, with smaller and more focused agents rewarded over larger and more elaborate ones. The combination of these two axes forces a real tradeoff between capability and economy, mirroring the actual constraints of using AI agents in engineering work.

Concretely, a race result for one pet looks like this:

```json
{
  "pet": "greyhound-glider",
  "team": "Logistics",
  "rubric": { "correctness": 40, "simplicity": 18, "clarity": 16, "hygiene": 9 },
  "tokens_used": 18450,
  "efficiency_bonus": 12,
  "race_points": 95
}
```

Quality and economy combine into the race points, so a pet that passes every rubric check but burns ten times the tokens can finish below a leaner pet that scored slightly lower on quality.

Teams can also earn points for non-technical contributions made between races. Examples include pet design (name, lore, visual identity), race commentary, post-race analysis writeups, and cross-team coaching. The intent is that participation is meaningful for team members who are not themselves engineers, which makes Patterson AI Pets a company-wide event rather than an engineering-team event.

## The season

Teams iterate on their pets in the time between races. Over the course of a season, individual race scores accumulate into a team standing, and the team with the highest cumulative score at season end is named Best in Show.

The cadence between races is intentionally relaxed. Daily races would cause burnout and shallow tuning. The recommended cadence is monthly, with optional daily practice challenges available between official races for teams that want to keep their pets sharp without competitive stakes.

## The judge as company-wide skill

The judge agent is installed as a Patterson company-wide skill. This means that every team's agent picks up the judge automatically, without any per-team configuration. The judge therefore acts as the canonical enforcement mechanism for engineering standards across the organization. The same skill that evaluates pets in The Show could review production pull requests, enforce hygiene checks, and provide consistent feedback across teams.

This dual role is a feature, not a coincidence. The game produces a real artifact (the judge) that has utility beyond the game.

## What makes a pet

A pet is itself a skill. The pet's `SKILL.md` is what the judge reads when evaluating a submission. Pets may include supporting commands, sub-agents, rules, and references, but the entry point is always `SKILL.md` in a directory named for the pet. The same agentskills.io specification that governs all skills governs pets.

This means that learning to author a good pet is the same exercise as learning to author a good skill. Every skill the team produces during the workshop is also a competitor in the league, and conversely every competitor in the league is also a useful artifact for the team's day-to-day work.

## Non-technical participation

Patterson AI Pets is designed so that engineers are not the only ones who can contribute meaningfully. The following are examples of contribution types that earn points outside of pet performance:

Pet design covers the name, the breed, the visual identity, and the lore. A team may have an engineer write the SKILL.md while a designer or marketer writes the pet's backstory and produces the avatar. Both contributions count toward the team's score.

Race commentary covers live or written narration of races as they happen. Someone with strong writing skills but no engineering background can produce post-race recap posts that earn points for the team.

Coaching covers cross-team mentorship. If a team's pet improves dramatically after consulting another team's published approach, the consulted team earns coaching points.

Analysis covers written breakdowns of why pets succeeded or failed in a given race. These breakdowns serve as continuous-improvement training material for the whole organization.

## What the game produces beyond fun

Over a season, Patterson AI Pets produces a library of well-crafted skills owned by Patterson teams. Many of those skills have utility beyond the game. The judge becomes a real code-review automation. Pets that solve specific kinds of challenges become starting points for team-specific workflow skills. Race writeups become onboarding material for new engineers. The competitive structure produces real engineering culture as a side effect.
