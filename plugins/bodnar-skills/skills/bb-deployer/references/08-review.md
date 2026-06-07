# Phase 8: Review / Reflect / Improve

The goal is to capture what happened so the next bb-deployer invocation goes faster, and to surface improvements to the skill itself. This phase is the link in the progression from skill, to scripts, to CLI, to MCP. Without it, the skill cannot get sharper.

## Reflection prompts

Walk through these with Daniel after deploy. Keep it conversational. The order does not matter; the goal is to surface friction and learnings.

What surprised you? Anything the analysis or plan got wrong, anything that turned out harder or easier than expected, anything Cloudflare did that you did not anticipate.

Which phase took the most time? Which phase felt like it could have been zero-effort?

Did any default produce a worse result than expected? The locked-in defaults exist to remove friction; when they create friction, that is a signal to revisit.

Which step would you skip next time? Which would you make more interactive?

Which step would you want a CLI for first? This answer feeds the progression directly.

## Write the review

Append to the project `README.md` under the History section that Phase 4 scaffolded. Use this entry shape:

```markdown
### bb-deployer handoff on YYYY-MM-DD

- Source: <artifact source, e.g., claude.ai/share/abc123 or pasted in chat>
- Stack: <Vue 3 + Vite | Astro> + Hono + Workers
- Bindings: <list>
- Deploy: https://<project-name>.bitbuilder.cloud
- Wall-clock time: <hours>
- Surprises:
  - <one per line>
- Improvements for next time:
  - <one per line>
- Skill changes proposed:
  - <one per line, or "none">
```

Commit:

```bash
git add README.md
git commit -m "docs: bb-deployer review notes"
git push
```

## Propose skill improvements

When the reflection surfaced a pattern worth encoding, propose a change to `bb-deployer`. Do not edit the skill silently. Present the proposed change in the conversation with this shape:

```
Proposed bb-deployer update
- Phase: <which>
- Change: <what would change in the reference>
- Why: <reasoning tied to the surprise that prompted it>
- Risk: <what might go wrong with this change>
```

Daniel accepts, rejects, or asks for revision. When accepted, edit the relevant reference file in the skill (or `SKILL.md` for codex-level changes). Commit the change to the skill's repo separately from the project repo.

## Promote toward the CLI

The progression Daniel wants runs skill, then individual scripts, then unified CLI, then MCP. Phase 8 is where graduation candidates get nominated.

When a phase has run identically across two or more invocations, it is a candidate for extraction into a standalone Bun script. Note the candidate in the review entry. Do not extract yet; the rule is "twice in a row, identical" not "once was tedious".

When several extracted scripts share parameters and orchestration, they are candidates for merging into the `bbctl` CLI. Again, note candidates; do not implement yet.

When the CLI has stabilized, expose it as an MCP server so other Claude surfaces (Claude Desktop, claude.ai with the connector) can drive it. This is the last step in the progression; do not jump ahead.

## What this phase produces

A History entry in the project README. Optionally, a proposed-change document for the bb-deployer skill itself. Optionally, a list of CLI graduation candidates.

## What ends here

The artifact is shipped. The review is committed. When Daniel wants to start the cycle on a new artifact, invoke bb-deployer again from Phase 1.
