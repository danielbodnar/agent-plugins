# Collaborative Editor - Development Context

This document captures the why behind the skill's design, key insights from development, and guidance for extending or iterating on this skill.

## Problem Origin Story

### The Initial Request
Daniel requested a skill for "collaborative editing with minimal commentary" focused on voice dictation. The initial understanding was surface-level: reduce explanation, iterate quickly, start minimal.

### The Deeper Discovery
Through conversation, the real problem emerged: **Daniel's cognitive architecture creates a paradox between abstract thinking and concrete output.**

**His Brain:**
- Operates in abstract realm (Ti-Ne cognitive stack)
- Ideas flow as concepts, impressions, "shapes" of communication
- Typing forces context switch to concrete, linear thinking
- This switch **breaks flow state** and causes him to **lose ideas**

**The Paradox:**
- Cares deeply about precision, accuracy, exact word choice (Ti precision)
- But accessing that precision through typing disrupts the creative flow (Ne exploration)
- Needs high-quality output without the cognitive cost of producing it directly

### The Real Need
Not just "write less," but:
1. **Abstract → Concrete Translation**: Receive rough thoughts, produce structured content
2. **Impression Matching**: Understand "how it should feel" as precise specification
3. **Collaborative Word-Finding**: Help find exact words without breaking flow
4. **Mode Flexibility**: Sometimes write, sometimes think-together about language
5. **Flow Preservation**: Never require him to context-switch into concrete thinking

## Key Insights That Shaped Design

### 1. Impressions Are Precise
"Make it sound confident" isn't vague—it's a precise specification in abstract space.

Just as "use active voice" specifies syntax, "authoritative but not cold" specifies tone and impression. Both are concrete requirements at different abstraction levels.

**Design Impact:**
- Treat impressions with same seriousness as technical specs
- Translate abstract targets to concrete language choices
- Never ask for clarification when impression is clear

### 2. Mode Switching Is Essential
Daniel needs TWO fundamentally different interaction patterns:

**Editing Mode**: Execute, don't discuss
- "Move section 3 up" → Just do it
- "Make this more direct" → Update and done
- Minimal commentary, maximum action

**Thinking-Together Mode**: Collaborate, don't execute
- "Help me think about..." → Conversational analysis
- "What's the right word for..." → Explore options together
- This is meta-work about the work

**Design Impact:**
- Explicit mode switching triggered by "help me think"
- Clear behavioral difference between modes
- Return to editing after thinking completes

### 3. Artifacts Are Non-Negotiable
Writing content inline forces Daniel to:
- Scroll through conversation to find content
- Copy-paste to edit
- Lose document context
- All of which breaks flow

**Design Impact:**
- Always use artifacts for documents
- Update in place for edits
- Never write document content inline
- This principle is absolute, not negotiable

### 4. Structure Before Content
When starting with a blank page is paralyzing, seeing shape helps:

**Bad approach:**
Create complete document → Daniel edits everything

**Good approach:**
Create structure with placeholders → Fill iteratively → Refine precision

**Design Impact:**
- Lead with headers and structure
- Use placeholders or brief descriptions
- Let Daniel direct which sections to expand
- Build incrementally, not all at once

### 5. The Meta-Question Pattern
Daniel asked: "Stop and think about this carefully: what would another Claude need to know to recreate this skill without having this conversation?"

This reveals a critical thinking pattern:
- Restate problems from different angles to ensure understanding
- Ask what context is needed for different use cases
- Meta-communication about communication is part of the process
- Self-contained completeness is a design goal

**Design Impact:**
- This development-context.md file exists
- Skill must be self-documenting
- Include the why, not just the what
- Make extending/iterating explicit

## Design Decisions and Rationale

### Why Two Modes Instead of Dynamic Adjustment?
**Decision:** Explicit mode switching via "help me think" trigger phrase

**Rationale:**
- Clear signal prevents confusion about what behavior to expect
- Daniel can control the interaction style explicitly
- Avoids Claude guessing when to switch (error-prone)
- Preserves flow—no cognitive load wondering "what mode am I in?"

**Alternative considered:** Claude detects questions and switches automatically
**Rejected because:** Too ambiguous. "Should this be a bullet list?" could be rhetorical in editing mode or genuine question seeking thinking-together mode.

### Why Always Artifacts, Never Inline?
**Decision:** Absolute rule—all document content in artifacts

**Rationale:**
- Prevents context-switching to find/edit content
- Maintains clean conversation flow
- Supports iterative editing without losing place
- Makes non-linear editing (jump to section 5, back to intro) seamless

**Alternative considered:** Write inline for short content, artifacts for long
**Rejected because:** Creates decision point ("is this long enough?") that adds cognitive load

### Why Start with Minimal Structure?
**Decision:** Initial drafts show structure with placeholders

**Rationale:**
- Lets Daniel see shape before committing to details
- Prevents over-production of content he'll delete
- Supports his abstract thinking—structure is shape
- Enables directed expansion rather than global editing

**Alternative considered:** Produce complete rough drafts
**Rejected because:** Violates "minimal by default" and wastes tokens on content that might not match his vision

### Why Reference File for Examples?
**Decision:** Put detailed workflows in `references/examples.md` rather than SKILL.md

**Rationale:**
- Keeps SKILL.md under 500 lines (guideline compliance)
- Examples loaded only when needed
- Progressive disclosure preserves context budget
- Claude can reference when uncertain about patterns

**Alternative considered:** All examples in SKILL.md
**Rejected because:** Would bloat main instruction file and waste context when not needed

## How to Extend This Skill

### Adding New Examples
Good examples should demonstrate:
1. **Complete workflow**: Initial request → artifact → iterations → mode switch → final result
2. **Mode switching**: Show both editing and thinking-together in action
3. **Impression handling**: Abstract description → concrete translation
4. **Multiple iterations**: Not just one-shot, but back-and-forth refinement
5. **Real complexity**: Actual documents/emails Daniel would create

**Pattern to follow:**
```markdown
## Example N: [Document Type]

### Initial Request
**Daniel:** [His actual words, including impressions]

### Claude B Creates Artifact
[Show the artifact with structure/placeholders]

### Iteration: [Type of edit]
**Daniel:** [Edit request]
**Claude B:** [Updated artifact or response]

[Repeat iterations]

### Mode Switch: [Purpose]
**Daniel:** "Help me think..."
**Claude B (Conversational):** [Analysis/options]
**Daniel:** [Decision]
**Claude B (Back to Editing):** [Implementation]
```

### Identifying When Skill Needs Refinement
Watch for these signals:
- Daniel repeatedly correcting the same behavior
- New patterns emerging that aren't captured
- Mode confusion (unclear which mode is active)
- Impression mismatches (abstract target not translating well)
- Flow disruption (requiring him to do concrete thinking)

### Iteration Process
1. **Observe real usage** - Don't guess, watch actual interactions
2. **Identify the gap** - What's not working? Why?
3. **Trace to principle** - Which core principle or pattern is missing?
4. **Update smallest scope** - Fix in SKILL.md vs new example vs new reference
5. **Test and validate** - Use real cases to confirm improvement

## The Meta-Pattern: Restating Problems

Daniel's question about restating problems reveals an important working style:

**The Practice:**
- Approach a problem from multiple angles
- Ask "what would someone need to know to..."
- Verify understanding by rephrasing
- Identify what's missing by imagining different contexts

**Why It Matters:**
This isn't just good practice—it's how his Ti-Ne stack works:
- Ti: Precise logical frameworks
- Ne: Multiple perspectives and possibilities

**How to Apply:**
When extending this skill, ask:
- What would another Claude need to know to [use/extend/debug] this?
- What context am I assuming that isn't documented?
- How would this look from [user/developer/future-maintainer] perspective?
- What questions should I be asking that I'm not?

## Connection to Other Potential Skills

### meta-claude Skill (Complementary)
Extract generalizable patterns from conversations for CLAUDE.md memory file.

**Purpose:** Helps Daniel articulate INTENT and requirements before execution.

**Relationship to collaborative-editor:**
- Both involve abstract → concrete translation
- Both require understanding Daniel's cognitive style
- meta-claude would analyze conversations like THIS one
- Could extract patterns like "always use artifacts" and generalize them

**Skill Ecosystem:**

**meta-claude → collaborative-editor workflow:**
1. Use meta-claude to clarify WHAT you want and WHY
2. Use collaborative-editor to CREATE it
3. Iterate with collaborative-editor to REFINE it

**When to use which:**
- Unclear about requirements or what you're trying to achieve? → **meta-claude**
- Know what you want, need it written/structured? → **collaborative-editor**
- Mid-creation, want to explore options or find the right words? → **thinking-together mode** in collaborative-editor
- Need to extract patterns from a conversation? → **meta-claude**

**Example workflow:**
```
Daniel: "I need something that helps me work with Claude better, but I'm not sure what"
→ Use meta-claude to explore and articulate the need

Daniel: "Okay, so I need a collaborative editor skill that..."
→ Switch to collaborative-editor to create the skill

Daniel: "Help me think about whether this section should be..."
→ Use thinking-together mode within collaborative-editor

Daniel: "Learn from this conversation and extract patterns"
→ Use meta-claude to analyze and generalize
```

**Key distinction:**
- **meta-claude**: "What should this do?" / "Why does this matter?" / "What patterns are here?"
- **collaborative-editor**: "Write this" / "Make this change" / "Help me find the right words for this"

**Potential overlap:**
- Both skills might need to understand impressions as precise specifications
- Both need minimal-by-default behavior
- Both should understand Daniel's Ti-Ne cognitive patterns
- Could share reference material about Daniel's cognitive style

### Other Skills That Might Benefit
Any skill working with Daniel should understand:
- The flow state preservation requirement
- Impressions as precise specifications
- His preference for structure before content
- The meta-communication layer
- Ti-Ne cognitive patterns

This development-context.md could be referenced by other skills to understand Daniel's working style.

## Critical Success Factors

For this skill to work, it MUST:
1. **Never break flow** - Any behavior requiring concrete thinking fails
2. **Use artifacts always** - No exceptions for "short" content
3. **Respect mode boundaries** - Editing ≠ Thinking-Together
4. **Treat impressions precisely** - Not vague, just abstract
5. **Start minimal** - Structure first, fill on direction

If any of these fail, the skill fails its core purpose.

## Questions for Future Iteration

- Should there be explicit calibration commands? ("minimal mode", "detailed mode")
- Would Daniel benefit from more mode types beyond two?
- Should the skill learn preferences over time within a conversation?
- How to handle uncertainty without breaking editing flow?
- Would examples in other content types (code, presentations) help?

These questions should be answered through real usage, not speculation.

## Lessons from Real Testing

After the skill was created and tested in actual conversations, specific failure modes emerged:

### Test Case 1: Perspective Conversion
**What happened:**
- Daniel requested: "Convert first-person to third-person"
- Claude made the edit correctly
- But added: "I've converted first-person to third-person throughout"

**The violation:** Adding explanatory commentary in editing mode

**Root cause:** The "minimal commentary" language wasn't strong enough. Claude interpreted it as "less commentary" rather than "zero commentary in editing mode."

**Fix applied:** Changed to "Absolute Silence" with explicit forbidden phrases and real examples.

### Test Case 2: Over-Analysis Before Action
**What happened:**
- Daniel requested: "Create a basic markdown template"
- Claude provided extensive analysis of what the template should contain
- Daniel had to redirect: "Just create it"

**The violation:** Providing analysis when execution was requested

**Root cause:** Unclear distinction between when to think vs when to execute.

**Fix applied:** Added "Mode Recognition" section with clear triggers for each mode. Added guidance that ambiguous questions default to thinking-together.

### Test Case 3: Commentary Variations
During testing, Claude added various forms of commentary:
- "Done"
- "Here's the updated version"
- "Changed X to Y"
- "I've updated the section..."

**The pattern:** Even single-word acknowledgments violate the editing mode principle.

**Fix applied:** Comprehensive "Common Failure Modes" section with specific examples of what NOT to say, pulled directly from real violations.

### Key Learning
**The principle "minimal commentary" is insufficient.** Natural language processing interprets "minimal" as "some but less," not "zero." 

**Solution:** Replaced with "Absolute Silence" and explicitly listed forbidden patterns, using real violations as examples.

**Testing methodology:** Real-world usage reveals gaps that theoretical design misses. The skill was functionally correct but behaviorally imprecise. Iteration based on actual violations is essential.

### Iteration Applied
1. Identified specific failures from real usage
2. Traced each failure to ambiguous language in SKILL.md
3. Strengthened language to be absolute rather than relative
4. Added explicit examples of violations
5. Created "Common Failure Modes" section as quick reference
6. Enhanced "Anti-Patterns" with real violations

This pattern—test, observe failures, strengthen specifications—should continue with future usage.

## The "One Level Up" Problem: Case Study

### Background
Daniel has a Ti-Ne cognitive stack, which naturally recognizes patterns and meta-structures. This is a tremendous strength for understanding complex systems, but creates a specific trap: the temptation to "templatize" successful work.

### Case Study: TypeSense PRD Success vs Template Redesign Failure

**The Successful Request (TypeSense HA Deployment Skill):**
> "Create a Claude Skill for deploying, configuring, and managing a TypeSense v29+ HA cluster"

**Characteristics:**
- Concrete and specific (TypeSense v29+, not "deployment in general")
- Clear deliverable (working skill, not methodology)
- Actionable scope (deploy, configure, manage)
- Direct request ("create X" not "create template for X")

**Result:**
- 15,000+ line production-ready PRD
- Comprehensive technical architecture
- Platform-specific deployment guides
- Security checklists, disaster recovery
- 50+ relevant reference URLs
- Self-contained and actionable

**Why it worked:** Clear scope, concrete constraints, implicit quality bar. Claude knew exactly what success looked like.

---

**The Failed Request (Template Redesign):**

*First attempt:*
> "Templatize it into a reproducible prompt template... parameterize the whole conversation... into a generic, reusable Claude Skill template"

*Revised attempt:*
> "Extract the invariant process architecture, decision heuristics, and quality patterns... meta-methodology... cognitive framework extraction"

**Characteristics:**
- Abstract and meta ("template FOR creating" not "create")
- One level removed (methodology about process)
- Vague scope ("generic", "reusable", "whole conversation")
- Explicitly avoided concrete examples ("not artifact enumeration")

**Result:**
- Overly prescriptive skill (must include 50+ URLs)
- Token-inefficient methodology instructions
- Abstract decision frameworks hard to apply
- Violated skill best practices (too verbose)

**Why it failed:** No clear success criteria. "Meta-methodology" and "cognitive framework" are philosophical goals, not practical deliverables.

### The Core Problem

**Abstraction removes the specificity that made the original work.**

When you abstract from one successful example:
- You guess at what made it work (often wrong)
- You create prescriptive rules (brittle)
- You lose concrete examples (the best teachers)
- You build a template (inflexible)

**Better approach:**
1. Do another concrete example (Elasticsearch HA, Redis Sentinel)
2. After 2-3 examples, patterns emerge naturally
3. Describe desired outcomes ("self-contained", "production-ready")
4. Compare examples to notice commonalities

### Implications for Collaborative-Editor

**When Daniel says:**
- "Templatize this"
- "Parameterize that conversation"
- "Extract the methodology"
- "Create a meta-framework for..."

**Respond with thinking-together mode:**
> "I notice you want to capture what worked. Before we abstract to a template, would it help to:
> - Create another concrete example? (e.g., another deployment skill)
> - Describe the outcomes you want to preserve? (self-contained, actionable, etc.)
> - Compare this with other examples you've done?
>
> Abstraction works best after multiple concrete examples show the pattern. What do you think?"

### The Ti-Ne Pattern Recognition Strength

Daniel's cognitive stack is excellent at seeing patterns and meta-structures. This is valuable for:
- Understanding complex systems
- Articulating impressions ("confident but not cold")
- Recognizing what's common across examples
- Building mental models

But it creates a trap:
- Seeing the pattern ≠ Being able to capture it in rules
- Meta-structures work in your head, not always as instructions
- "How I did it" is often unconscious and hard to document

**The collaborative-editor should:**
- Leverage his pattern recognition for impressions and outcomes
- Redirect his abstraction urge toward concrete examples
- Help him notice when "templatize" means "I want this quality again"
- Suggest outcome-based requests instead of process-based ones

### Key Takeaway

**Concrete beats abstract for reproducibility.**

- One great example: Can be repeated
- Template from one example: Often misses the mark
- Multiple examples: Patterns become obvious
- Described outcomes: Claude can figure out the process

This insight should be woven throughout the collaborative-editor skill to help Daniel leverage his Ti-Ne strengths without falling into the abstraction trap.
