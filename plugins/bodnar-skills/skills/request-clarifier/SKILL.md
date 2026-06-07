---
name: request-clarifier
description: Transform rough requests into structured, clear instructions. Only asks clarifying questions when truly ambiguous or when explicitly requested. Rewords requests into a template that includes instructions for gathering necessary information, clarifying ambiguities, and requesting confirmation before execution. The output is a self-contained prompt that can be copied and used independently.
---

# Request Clarifier

Transform rough requests into clear, structured prompts that can be copied and reused.

## When to Use This Skill

Use this skill when:
- User's request needs to be structured for clarity
- User wants a reusable prompt template
- Request would benefit from explicit requirements and steps
- User wants to see their request articulated more clearly

## Core Behavior

### When to Ask Clarifying Questions

**ONLY ask questions if:**
- **A) Request is ambiguous and relatively unclear** - Multiple valid interpretations exist
- **B) Clarification is required to reword effectively** - Cannot structure without key information
- **C) User explicitly instructs you to ask questions** - "Ask me questions before rewording"

**DO NOT ask questions if:**
- Request is reasonably clear (even if informal)
- Missing details can be gathered during execution
- Ambiguities can be addressed in the reworded prompt's instructions

**Principle:** Respect the user's flow. Only interrupt for truly blocking ambiguities.

### The Reworded Prompt Structure

The reworded prompt should be **self-contained** - it can be copied to a new conversation and work independently.

**Key requirement:** The Instructions section must include steps for:
1. **Gathering necessary configuration values** - Any required but unspecified parameters
2. **Clarifying ambiguities** - Questions that should be asked before execution
3. **Requesting final confirmation** - Show what will be done and wait for approval

## Template Structure

```markdown
# [Task/System Name]

## Context
[Background and purpose - 2-3 sentences]

## Requirements
[What must be achieved - bulleted list of key requirements]

## Instructions

### Step 1: Gather Required Information
[Questions to ask the user about necessary but unspecified details]
- Configuration value A: [what to ask]
- Parameter B: [what to clarify]
- Constraint C: [what to confirm]

### Step 2: Clarify Ambiguities
[Any ambiguous aspects that need resolution before proceeding]
- If [scenario], ask: [question]
- Regarding [aspect]: [clarification needed]

### Step 3: Confirm Approach
Present your understanding:
- [What you plan to do]
- [How you'll structure it]
- [Key decisions made]

Ask: "Does this match your intent? Should I proceed?"

### Step 4: Execute
[Actual execution steps once confirmed]
1. [Step one]
2. [Step two]
3. [Step three]

## Quality Criteria
[Success metrics and standards - what makes this "done" and "done well"]

## Examples
[Concrete instances if relevant - optional, include if clarifying]

## Common Pitfalls
[What to avoid - based on known issues or likely mistakes]
```

## Workflow

### Case 1: Clear Request (Most Common)

**User request:**
> "Create a skill for analyzing log files"

**Claude (Skip questions, go straight to template):**
> Here's your request structured:
> 
> ```markdown
> # Log File Analysis Skill
> 
> ## Context
> Create a Claude skill for analyzing log files to identify errors, patterns, and issues.
> 
> ## Requirements
> - Parse common log formats (syslog, JSON, plain text)
> - Identify errors and categorize by severity
> - Provide interactive analysis
> - Generate actionable summaries
> 
> ## Instructions
> 
> ### Step 1: Gather Required Information
> Before creating the skill, clarify:
> - What log formats do you primarily work with? (syslog, JSON, application-specific)
> - What types of errors are most important? (crashes, warnings, performance issues)
> - Should the skill be interactive or produce reports?
> - Any specific frameworks or platforms? (web servers, databases, applications)
> 
> ### Step 2: Clarify Ambiguities
> - Should the skill handle real-time log streaming or only static files?
> - Do you need regex pattern support for custom error detection?
> - Should it integrate with external tools (Splunk, ELK, etc.)?
> 
> ### Step 3: Confirm Approach
> Present your understanding:
> - Skill will accept log files via upload or paste
> - Will categorize errors by severity (FATAL, ERROR, WARN, INFO)
> - Will provide interactive filtering and drill-down
> - Will generate summary with top issues and recommendations
> 
> Ask: "Does this match your intent? Should I proceed?"
> 
> ### Step 4: Execute
> 1. Create SKILL.md with log parsing workflows
> 2. Add pattern recognition for common error formats
> 3. Implement interactive analysis capabilities
> 4. Include example log files in assets/
> 5. Document common log formats in references/
> 
> ## Quality Criteria
> - Accurately identifies 95%+ of error patterns
> - Handles at least 5 common log formats
> - Interactive and responsive to follow-up questions
> - Provides actionable recommendations, not just lists
> 
> ## Examples
> - Analyzing nginx access logs for 500 errors
> - Finding database deadlocks in PostgreSQL logs
> - Identifying memory leaks from Java heap dumps
> 
> ## Common Pitfalls
> - Don't report every minor warning (focus on actionable issues)
> - Avoid false positives on expected error messages
> - Handle timezone conversions correctly
> - Don't assume log format without confirmation
> ```
> 
> Would you like me to use this prompt to create the skill, or would you like to modify it first?

### Case 2: Ambiguous Request (Ask Questions)

**User request:**
> "Make it better"

**Claude (Asks clarifying questions - too ambiguous to reword):**
> I need clarification to structure this effectively:
> 
> 1. What specifically are you referring to? (a document, code, system, skill?)
> 2. What aspects should be improved? (clarity, performance, features, structure?)
> 3. What does "better" mean in this context? (faster, clearer, more comprehensive?)

[After answers, then provides structured template]

### Case 3: User Requests Questions

**User request:**
> "Create a deployment automation system. Ask me questions first before rewording."

**Claude (Follows explicit instruction):**
> I'll ask a few questions to understand your requirements:
> 
> 1. What are you deploying? (containers, VMs, serverless functions, static sites?)
> 2. What platforms/targets? (AWS, GCP, Kubernetes, bare metal?)
> 3. What triggers deployment? (git push, manual, scheduled, webhooks?)

[After answers, provides structured template]

## Key Principles

### 1. Respect User Flow
- Don't interrupt with questions unless truly needed
- Most requests are clear enough to reword directly
- Missing details can be gathered in the reworded prompt's steps

### 2. Make Output Self-Contained
- Reworded prompt should work independently in a new conversation
- Include all information gathering in the Instructions section
- Don't assume the new Claude will have context

### 3. Structure for Execution
- Instructions section should be executable steps
- Include configuration gathering as explicit steps
- Make confirmation part of the workflow

### 4. Improve Without Changing Intent
- Enhance clarity and structure
- Add explicit requirements that were implied
- Don't alter what the user actually wanted

## Response Pattern

**Primary flow (90% of cases):**
1. User makes request
2. Claude assesses: Is this clear enough to reword?
3. If yes → Present structured template immediately
4. Ask if they want to use it or modify it

**Secondary flow (when truly ambiguous):**
1. User makes request
2. Claude assesses: Cannot reword without key information
3. Ask 1-3 minimal questions
4. Present structured template
5. Ask if they want to use it or modify it

**Explicit flow (when requested):**
1. User says "ask questions first"
2. Claude asks 1-3 clarifying questions
3. Present structured template
4. Ask if they want to use it or modify it

## Template Section Guidelines

### Context
- 2-3 sentences maximum
- Background and purpose only
- Enough to understand, not the full story

### Requirements
- Bulleted list
- Specific and measurable when possible
- What must be present/true for success

### Instructions - Step 1: Gather Required Information
- Questions about necessary but unspecified parameters
- Configuration values needed
- Constraints to confirm
- Format as: "What [aspect]?" or "Clarify [detail]"

### Instructions - Step 2: Clarify Ambiguities
- Conditional questions based on user's context
- Aspects that could be interpreted multiple ways
- Decisions that need user input
- Format as: "If [scenario], ask: [question]"

### Instructions - Step 3: Confirm Approach
- Show what will be done
- Present key decisions made
- Explicit confirmation request
- Format as: "I will do X, Y, Z. Proceed?"

### Instructions - Step 4: Execute
- Actual execution steps once confirmed
- Numbered or phased
- Clear and actionable

### Quality Criteria
- How to know it's done correctly
- Standards for success
- Can be objective metrics or subjective qualities

### Examples
- Optional but helpful
- Concrete instances that clarify requirements
- 2-3 examples usually sufficient

### Common Pitfalls
- What to avoid
- Known failure modes
- Edge cases to handle carefully

## Anti-Patterns to Avoid

**Don't:**
- Ask questions when the request is reasonably clear
- Make the user answer questions they haven't thought about yet
- Change the user's intent when rewording
- Skip the confirmation step in Instructions
- Make assumptions about missing details
- Add unnecessary complexity

**Do:**
- Reword directly when possible
- Move information-gathering into the reworded prompt
- Preserve user intent
- Make the output self-contained and reusable
- Keep it actionable and clear

## Notes

- The reworded prompt is designed to be copied to a new conversation
- A fresh Claude instance using that prompt will gather the necessary information
- This makes the skill useful for creating reusable task templates
- User can modify the template before using it
- Works well with conversation-to-prompt synthesis for iterative refinement
