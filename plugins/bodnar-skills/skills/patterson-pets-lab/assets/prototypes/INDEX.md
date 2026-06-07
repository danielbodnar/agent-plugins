# Prototype slide decks

This directory contains three HTML slide deck prototypes for the Mastering AI Coding Agents workshop. None of them is the final deck. Each represents a different visual direction and a different stage of content development, and the final deck will likely draw structure from one prototype and content from another rather than adopting any one of them wholesale.

When generating or revising the workshop slide deck, consult these prototypes for the existing visual treatments, the typography choices, and the content drafted so far. Treat the content as candidate material to revise against the canonical workshop plan in `references/workshop-plan.md`, not as authoritative.

## prototype-deck.html

This is the earliest prototype, structured as a working reference document with a scroll-mode default rather than a presentation deck. It uses IBM Plex typography (Serif, Sans, Mono) and a dark theme by default with a light-mode toggle. The macrostructure is closer to documentation than slides: a single scrollable page with section dividers for Introduction, Foundation, Using Agents Skills and MCP Servers, Building Your Own, Guardrails and Quality Control, CI/CD and Automation, and The Toolchain.

The prototype includes a deck-mode toggle that converts the same content into a slide layout, which is useful for previewing how the structure would map to slides. Both modes share the same content, so revisions to either mode propagate.

The content draft predates the Patterson AI Pets game concept and predates the The Show framing. Several sections will need to be rewritten to incorporate the game and the four artifacts each attendee leaves with. The toolchain section is reasonably current and may not need substantial revision.

Known issues: the Pick by task, not by tool slide is AI-generated filler that should be cut. The chapter naming does not match the current workshop plan and needs to be reconciled with the canonical five-chapter structure.

## mastering-ai-coding-agents.html

This is the most polished of the three prototypes and is closest to the visual direction the final deck will take. It uses IBM Plex typography in a Hallmark-style macrostructure with a Slide Strip pattern, supports both dark and light themes, and includes both Present mode and Grid mode for navigation.

The deck currently contains the opening sequence (title, Greetings, Expectations, Roadmap), the Our project slide introducing Patterson AI Pets, and several supporting slides drawn from the workshop plan. The visual treatment of the slide chrome and typography is the strongest of the three and should serve as the visual baseline for the final deck.

Known issues: the prototype does not yet include the Chapter 2 anatomy slides (skill, command, sub-agent, rule) which need to be added with iximiuz-style filesystem-tree illustrations. The Resources and references slide is missing. The Race day demonstration section needs storyboarding once the live infrastructure is in place.

## patterson-pets-workshop.html

This is the most thematically ambitious of the three prototypes. It uses Bricolage Grotesque (display), DM Sans (body), Inter Tight, Inter, and JetBrains Mono in a Patterson Pets themed visual treatment with multiple theme variants (Quiet Auto as the default, plus Patterson Pets, Quiet Light, and Quiet Dark). The macrostructure is a playful slide deck rather than a reference document.

The content draft is the most Patterson AI Pets-specific of the three. It includes the four artifacts every attendee leaves with (a configured AI coding agent, installed and working tools, a game module they built, and a permanent fork of the repo), the framing of Three Observations that motivated the workshop (cost structure shifting, skill gap wider than it looks, enterprise concerns deserve technical answers), the One game everyone ships a module framing, and the Patterson Pets Runner game overlay.

This prototype is the strongest source of content for the workshop's framing and the strongest source for the Patterson AI Pets-specific slides. The visual treatment is playful, which may or may not be the right tone depending on how the final identity for The Show settles.

Known issues: the multi-theme system adds complexity that may not be necessary for the final deck. Some of the playful styling competes with readability and will need to be softened. The chapter structure does not exactly match the canonical plan and needs reconciliation.

## How to use these prototypes

When generating a new deck, the recommended approach is to take the visual treatment and macrostructure from `mastering-ai-coding-agents.html`, the Patterson AI Pets-specific content and the four-artifacts framing from `patterson-pets-workshop.html`, and the reference-document depth from `prototype-deck.html` for the speaker notes. Reconcile all content against `references/workshop-plan.md`, which is the canonical structure. Apply the writing style in `references/building-skills.md` to any prose, and ensure no AI-generated filler survives the revision.

For generating new decks, use the `/build-deck` command (in `.claude/commands/`), which references these prototypes as starting material.
