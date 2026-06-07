# Zach's Style Guide

Reference for matching the conversational-but-professional tone Zach uses in Zoho task descriptions. This is the canonical voice for all Zoho task and issue descriptions.

## Canonical Example (Zach's Original "Bodnar Tasks")

```
Priority High
* Failover and Reliability (this is also a long burn so it can be worked on in tandem with other tasks)
   * Keeping the payment gateway service and pimsserver instances online and available is key to accomplishing this
   * The pimsserver db can possibly be overloaded by data traffic which could result in instability which spills over into payments
   * We also need to address possible dns/routing issues
   * What happens if a server crashes? Do we have db backups?
   * If theres a problem, who will be alerted and how?
```

## Rules Derived from the Example

### Voice and tense
- **Neutral, story-based, issue-focused.** Describe situations and what done looks like.
- **No first-person ("I want", "I would like").** Phrase as "X is needed", "Y has been overlooked".
- **No third-person attribution unless naming a specific colleague.** Don't say "the team needs", say "automated promotion is needed".
- Bullets explain context and provide the "why", not step-by-step instructions or checklist items.

### Punctuation and formatting
- **No em-dashes anywhere.** Use commas, parentheses, or restructure.
- **Contractions are fine.** "thats", "dont", "its" without apostrophes is acceptable (matches Zach's style). Don't over-correct grammar.
- **No priority labels embedded in the item descriptions.** Priority is a Zoho field, not prose content.
- **Parenthetical asides for long-burn or scope notes** match Zach's pattern: "(this is also a long burn so it can be worked on in tandem with other tasks)".

### Content
- **Address the situation first**, then what needs to be done about it.
- **Don't prescribe the "how"** in detail. Stay at the "what's the problem and what does done look like" level.
- **Reference real concerns** (payment gateway uptime, server crashes, alerting) rather than abstract concepts.

## Before/After Examples

### Restoration after a crash
Bad: "I would like to be able to recover quickly from server crashes."
Good: "There is no clear answer to what happens if a server crashes or whether db backups are current."

### Manual processes
Bad: "It took a full week to restore access and provision a new user. Thats not sustainable."
Good: "Sysadmin and server management lacks automation. Restoring access and provisioning a new user currently requires significant manual effort across multiple systems."

### Performance
Bad: "We need to optimize the report queries."
Good: "Report queries need to be improved so the reports themselves take less time."

### Single point of failure
Bad: "If one box has a bad day, so does everyone else."
Good: "If one goes down, everything it supports goes with it."

## Words to Avoid

- "extremely", "very", "really" (intensifiers)
- "obviously", "clearly", "simply" (presumptuous)
- "leverage", "synergy", "stakeholder" (corporate-speak)
- "I", "we", "us" (first person) in task/issue body text
- "would like to", "would love to" (preference framing)
- Em-dashes (use commas or restructure)
