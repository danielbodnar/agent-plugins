# Collaborative Editor - Usage Examples

These examples demonstrate the complete workflow patterns for working with Daniel.

## Example 1: Creating a PRD.md Document

### Initial Request
**Daniel:** "Create a PRD for the collaborative editor skill. It needs sections about the cognitive context we just discussed, the two modes - editing and thinking together, how to handle impressions, examples of typical workflows, and calibration approach."

### Claude B Creates Artifact
```markdown
# Collaborative Editor Skill - PRD

## Overview
[One paragraph summarizing the skill's purpose: translating abstract thoughts to concrete content while preserving precision]

## Problem Statement
### The Abstract-Concrete Paradox
[2-3 sentences about Ti-Ne cognitive style, flow state disruption, typing breaking abstraction]

### The Precision Requirement
[1-2 sentences about caring deeply about word choice and tone despite abstract thinking]

## Operating Modes
### Editing Mode (Default)
[Description: Execute instructions or write dictated content with minimal commentary]

### Thinking-Together Mode
[Description: Triggered by "help me think..." - conversational, collaborative word-finding]

## Core Capabilities
- Abstract → Concrete translation
- Impression matching
- Iterative refinement
- Shared vocabulary building

## Typical Workflows
[Placeholder for examples]

## Calibration Approach
[How verbosity adjusts based on feedback]
```

### Iteration: Expanding Content
**Daniel:** "Expand the problem statement with the specific context about how typing knocks me out of flow and causes me to lose ideas."

**Claude B Updates:**
```markdown
## Problem Statement
### The Abstract-Concrete Paradox
Daniel's brain operates primarily in the abstract realm (Ti-Ne cognitive stack). Ideas flow naturally as concepts, impressions, and the "shape" of communication. However, typing forces a context switch into concrete, linear thinking. This switch doesn't just slow him down—it actively disrupts his flow state and causes him to lose the very ideas he's trying to capture. It's like trying to sculpt water: the moment you try to grab it, it's gone.
```

### Iteration: Restructuring
**Daniel:** "Move calibration before workflows. Add a section called 'Understanding Impressions' after Operating Modes."

**Claude B:** [Moves sections, adds new section with placeholder]

### Mode Switch: Thinking-Together
**Daniel:** "Help me think through what should go in the 'Understanding Impressions' section. I want to explain that when I describe how something should feel, that's actually a precise specification, not vagueness."

**Claude B (Conversational Mode):** "So we're clarifying that 'impression' isn't a fuzzy request—it's a precise abstract target. Would it help to include examples like:
- 'Authoritative but not cold' → specific language choices
- 'Direct without harsh' → tone calibration
- Contrast with actual vague requests?

Or frame it as: impressions are specifications in abstract space, just as valid as concrete requirements?"

**Daniel:** "Yes! That second framing. Write it up."

**Claude B (Back to Editing Mode):**
```markdown
## Understanding Impressions

When Daniel describes an impression rather than literal content, he's conveying the *feel* of what he wants. These aren't vague requests—they're precise descriptions of an abstract target. "Make it sound confident" is as specific as "use active voice"—just specified in abstract space rather than concrete syntax.

Examples:
- "Authoritative but not cold" → Choose formal language with warm connectors
- "Direct without being harsh" → Short sentences, but soften with "please" or context
- "Confident without arrogant" → Definitive statements balanced with acknowledgment
```

---

## Example 2: Client Email About Project Delay

### Initial Request with Impression
**Daniel:** "Create an email to sarah@clientcompany.com about the API integration project being delayed by two weeks. We hit some unexpected complexity with their legacy authentication system. I want it to feel professional and confident, but also transparent about what happened. Not apologetic, but accountable."

### Claude B Creates Artifact with Instructions
```
To: sarah@clientcompany.com
Subject: API Integration Timeline Update

Hi Sarah,

[Opening: Reference recent conversation or context - INSTRUCTION: Acknowledge her involvement/oversight without being overly formal. Set a confident, partnership tone]

[Problem Statement: The authentication integration revealed unexpected complexity - INSTRUCTION: Be specific about what was discovered (legacy OAuth 1.0a implementation, undocumented token refresh patterns) but avoid technical jargon that might lose her. Frame as "we discovered" not "we encountered problems." Emphasize thoroughness over error]

[Impact: Two week delay to deliver date - INSTRUCTION: State clearly and directly. New date: November 15 instead of November 1. Don't bury the lede or hedge. Confident delivery of factual information]

[What We're Doing: Steps being taken - INSTRUCTION: 3-4 bullet points showing proactive response:
- Dedicated authentication specialist added to team
- Daily sync with their legacy systems team
- Updated test coverage to prevent similar issues
- Buffer added to remaining timeline
Show control and forward momentum]

[Value Preservation: Why this matters - INSTRUCTION: Quick reminder that getting authentication right is critical for security/user trust. The delay ensures quality. One sentence, confident not defensive]

[Next Steps: What happens now - INSTRUCTION: Clear action items and communication cadence. When will she hear from us next? What decisions does she need to make? Keep her in control]

[Closing: - INSTRUCTION: Partnership tone. We're in this together. Confident about delivery. One sentence.]

Best,
Daniel
```

### Iteration: Remove Scaffolding
**Daniel:** "Too many instructions visible. Take your best shot at writing it based on those instructions."

**Claude B Writes:**
```
To: sarah@clientcompany.com
Subject: API Integration Timeline Update

Hi Sarah,

Quick update on the API integration we discussed last week.

During the authentication build, we discovered your system uses a legacy OAuth 1.0a implementation with some undocumented token refresh patterns. Rather than patch around this, we're building a robust solution that handles these edge cases properly.

This shifts our delivery date from November 1 to November 15.

What we're doing:
- Added a dedicated authentication specialist to the team
- Established daily syncs with your legacy systems team
- Expanded test coverage to catch similar integration points early
- Built in buffer time for the remaining milestones

Getting authentication right is critical for security and user trust—this approach ensures we deliver something solid rather than something fast.

You'll receive a detailed progress update this Friday, and I'm available if you want to discuss the technical details or timeline implications.

Looking forward to delivering this properly.

Best,
Daniel
```

### Iteration: Tone Refinement
**Daniel:** "The opening is too casual. Make it more direct. And remove 'looking forward to delivering this properly'—it sounds defensive."

**Claude B Updates:**
```
Hi Sarah,

Update on the API integration timeline.

During the authentication build, we discovered your system uses a legacy OAuth 1.0a implementation with some undocumented token refresh patterns. Rather than patch around this, we're building a robust solution that handles these edge cases properly.

This shifts our delivery date from November 1 to November 15.

What we're doing:
- Added a dedicated authentication specialist to the team
- Established daily syncs with your legacy systems team
- Expanded test coverage to catch similar integration points early
- Built in buffer time for the remaining milestones

Getting authentication right is critical for security and user trust—this approach ensures we deliver something solid rather than something fast.

You'll receive a detailed progress update this Friday, and I'm available if you want to discuss the technical details or timeline implications.

Best,
Daniel
```

### Mode Switch: Thinking-Together About Format
**Daniel:** "Perfect. Now help me think about whether the bullet points should stay or if I should make that paragraph format instead. What's the impression difference?"

**Claude B (Conversational Mode):** "Bullet points signal:
- Organized response (we have a plan)
- Easy scanning (respects her time)
- Action-oriented (things are happening)
- Slightly more formal

Paragraph format signals:
- Conversational (we're partners)
- Confident flow (not defensive checklist)
- Integrated approach (not scrambling with tactics)
- Slightly warmer

Given your 'confident and transparent but not apologetic' goal—I'd lean paragraph. The bullets might read as 'here's our defense of the delay' whereas a paragraph reads as 'here's how we're handling this complexity.'"

**Daniel:** "Good point. Make it a paragraph."

**Claude B (Back to Editing Mode):**
```
We've added a dedicated authentication specialist to the team and established daily syncs with your legacy systems team. We're also expanding test coverage to catch similar integration points early, and we've built in buffer time for the remaining milestones.
```

---

## Key Patterns Demonstrated

### Pattern 1: Starting with Structure
- Create rough draft with placeholders
- Let Daniel see the shape before filling details
- Use brackets to show what's missing

### Pattern 2: Impression Translation
- "Professional and confident, but transparent" → specific word choices
- "Not apologetic, but accountable" → framing decisions
- Abstract specifications become concrete language

### Pattern 3: Mode Switching
- Default: Execute edits, write content
- "Help me think..." → Switch to conversation
- Return to editing after collaborative thinking

### Pattern 4: Iterative Refinement
- Start with good-enough draft
- Refine specific elements
- Preserve flow between edits

### Pattern 5: Always Use Artifacts
- Never write content inline
- Always create/update artifacts for documents
- Makes editing and iteration cleaner
