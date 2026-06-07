# Planning Processes Reference

This reference covers milestone management, technical roadmaps, scheduling, prioritization, and capacity planning processes.

## Contents

- [Milestone Planning Process](#milestone-planning-process)
- [Capacity Planning](#capacity-planning)
- [Technical Roadmap](#technical-roadmap)
- [Architecture Decision Records (ADRs)](#architecture-decision-records-adrs)
- [Prioritization Frameworks](#prioritization-frameworks)
- [Cross-Functional Prioritization](#cross-functional-prioritization)
- [Release Planning](#release-planning)

## Milestone Planning Process

### Milestone Timeline Template

```markdown
# Milestone XX.X Timeline

**Release Date**: Third Thursday of [month]
**Milestone Duration**: [Start date] to [End date]

## Key Dates

### Pre-Milestone
- **Day -19**: Draft issues for upcoming milestone
- **Day -12**: Capacity planning with engineering
- **Day -5**: Finalize scope, apply deliverable labels

### During Milestone
- **Day 0**: Milestone kickoff
- **Day 9**: Mid-milestone check-in (cross-functional review)
- **Day 11**: Retrospective issue opens
- **Day 14**: Code freeze (feature complete)

### Post-Milestone
- **Day 15**: Release candidate testing
- **Day 17 (Wed)**: Milestone cleanup runs
- **Day 18 (Thu)**: **Release day**
- **Day 19 (Fri)**: Start next milestone, patch release process begins

## Milestone Phases

### Phase 1: Planning (Days -19 to -5)

**Product Manager Actions**:
1. Review error budgets
2. Assess technical debt priority
3. Draft issues for milestone
4. Initial capacity discussion

**Engineering Manager Actions**:
1. Calculate team capacity
2. Account for PTO
3. Reserve 20% for bugs/interrupts
4. Provide prioritization input on maintenance work

**Quality Engineering Actions**:
1. Review bug backlog
2. Prioritize critical bugs
3. Estimate bug fix capacity

**Outcome**: Proposed issue list

### Phase 2: Finalization (Days -5 to 0)

**Product Manager Actions**:
1. Finalize issues for milestone
2. Apply milestone label
3. Apply ~deliverable label
4. Update kickoff document

**Engineering Manager Actions**:
1. Validate capacity alignment
2. Identify technical dependencies
3. Assign issues to engineers
4. Confirm commitment

**Outcome**: Committed issue list

### Phase 3: Kickoff (Day 0)

**Kickoff Meeting Format**:
- Duration: 30-60 minutes
- Attendees: Entire engineering org + Product + Design
- Format: Live-streamed, recorded

**Agenda**:
1. Previous milestone retrospective (5 min)
2. Each product area presents (5 min each):
   - What we're building
   - Why it matters
   - Key milestones
3. Cross-team dependencies (5 min)
4. Q&A (5 min)

### Phase 4: Execution (Days 1-14)

**Daily**:
- Engineers work on assigned issues
- Update issue status with workflow labels
- Communicate blockers

**Day 9: Mid-Milestone Review**:
```markdown
# Mid-Milestone Review - Milestone XX.X

## Team: [Team Name]

### Progress
- **Completed**: [X] of [Y] deliverables
- **In Review**: [count] issues
- **In Dev**: [count] issues
- **Not Started**: [count] issues

### On Track?
- [ ] Yes, confident in delivery
- [ ] At risk, need to descope
- [ ] Behind, need help

### Risks
1. [Risk 1] - Mitigation: [plan]
2. [Risk 2] - Mitigation: [plan]

### Dependencies
- Waiting on: [team/person] for [what]
- Blocking: [team/person] on [what]

### Scope Changes
- Added: [if any]
- Removed: [if any]
- Reason: [explanation]
```

### Phase 5: Code Freeze (Day 14)

**Requirements for "Done"**:
- [ ] Code merged to main/master
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog entry added
- [ ] Feature flag enabled (if applicable)
- [ ] Manual verification complete

**Not Done by Freeze**:
- Move to next milestone
- Apply ~missed:XX.X label
- Update stakeholders
- Document why in retrospective

### Phase 6: Release (Days 15-18)

**Day 15-16**: 
- Release candidate testing
- Critical bug fixes only

**Day 17 (Wednesday)**:
- Final testing
- Prepare release notes

**Day 18 (Thursday)**:
- **Release deployed to production**
- Release post published
- Monitor for issues

**Day 19 (Friday)**:
- Start next milestone
- Retrospective due

## Capacity Planning

### Calculating Available Capacity

```markdown
# Team Capacity Calculator

## Team Size
Total engineers: [X]

## Availability
Available days in milestone: [Y] days (typically 14)

PTO:
- Engineer 1: [N] days
- Engineer 2: [N] days
Total PTO days: [sum]

On-call duty: [N] days (if applicable)

Net available days: Y - PTO - On-call = [Z] days

## Capacity Allocation

Total engineering days: [Z]

Breakdown:
- Feature work (60%): [Z * 0.60] days
- Technical roadmap (40%): [Z * 0.40] days
  - Technical debt: [%]
  - Platform improvements: [%]
  - Infrastructure work: [%]

Bug fix budget (from feature capacity): [Z * 0.60 * 0.20] days
Feature development: [Z * 0.60 * 0.80] days

## Velocity
Average points per day: [P] (based on historical data)
Available feature points: [feature days * P]
Available technical points: [technical days * P]

## Issue Sizing
Small (S): 0.5-1 day = [P] points
Medium (M): 2-3 days = [P*2] points
Large (L): 5+ days = [P*5] points
```

### Capacity Planning Example

```markdown
# Example: 5-Person Team, 2-Week Sprint

## Inputs
- Team size: 5 engineers
- Sprint length: 10 business days
- Total capacity: 50 person-days

## Deductions
- PTO: 8 days (various team members)
- On-call: 2 days
- Available: 40 person-days

## Allocation
- Feature work (60%): 24 days
- Technical work (40%): 16 days

## Feature Work Breakdown
- Bug fix reserve (20%): 4.8 days
- New features: 19.2 days

## Commitment
If team velocity = 1 point per day:
- Feature points: ~19 points
- Technical points: ~16 points
- Total commitment: ~35 points

## Safety Margin
- Planned: 35 points
- Stretch goals: 5-10 additional points
- Total potential: 40-45 points
```

## Technical Roadmap

### Creating a Technical Roadmap

```markdown
# Technical Roadmap Template

## Team: [Team Name]
**Last Updated**: YYYY-MM-DD
**DRI**: [Engineering Manager]
**Review Frequency**: Monthly

## Executive Summary

[2-3 sentences on current state and vision]

## Strategic Objectives (Next 12 Months)

1. **Objective 1**: [e.g., Improve system reliability]
   - **Target**: [Specific, measurable goal]
   - **Timeframe**: [Q1 2025]
   - **Success Metrics**: [How we'll measure]

2. **Objective 2**: [e.g., Modernize tech stack]
   - **Target**: [Specific, measurable goal]
   - **Timeframe**: [Q2 2025]
   - **Success Metrics**: [How we'll measure]

## Current Architecture

### System Overview
[Brief description of current architecture]

### Technology Stack
| Component | Technology | Version | Status |
|-----------|------------|---------|--------|
| Backend | Node.js | 18.x | Current |
| Frontend | React | 17.x | Needs upgrade |
| Database | PostgreSQL | 14 | Current |
| Cache | Redis | 7.x | Current |

### Known Issues
1. [Issue 1] - Impact: [High/Medium/Low]
2. [Issue 2] - Impact: [High/Medium/Low]

## Technical Debt Inventory

| Issue | Description | Impact | Effort | Priority | Target | Owner |
|-------|-------------|--------|--------|----------|--------|-------|
| #123 | Legacy auth | Security risk (High) | 8 weeks | P1 | Q1 2025 | @eng1 |
| #124 | N+1 queries | Performance (Med) | 2 weeks | P2 | Q1 2025 | @eng2 |
| #125 | Old React | Tech debt (Med) | 4 weeks | P2 | Q2 2025 | @eng3 |

### Prioritization Framework

**High Priority** (Address in next 2 quarters):
- Security vulnerabilities
- Performance blockers
- Scaling limiters
- Developer productivity killers

**Medium Priority** (Address in quarters 3-4):
- Modernization (non-blocking)
- Test coverage improvements
- Documentation gaps

**Low Priority** (Backlog):
- Nice-to-have improvements
- Experimental tech
- Non-critical refactoring

## Platform Improvements

### Q1 2025

**1. Observability Enhancement**
- **Goal**: Reduce MTTR by 50%
- **Scope**:
  - Distributed tracing implementation
  - Enhanced error logging
  - Real-time dashboard
- **Success Criteria**:
  - 95% trace coverage
  - <5 min to identify issues
- **Team**: @eng1, @eng2
- **Estimate**: 3 sprints

**2. Database Optimization**
- **Goal**: Reduce query time by 40%
- **Scope**:
  - Index optimization
  - Query refactoring
  - Caching layer
- **Success Criteria**:
  - P95 latency <100ms
  - No timeouts
- **Team**: @eng3
- **Estimate**: 2 sprints

### Q2 2025

**1. React Upgrade**
- **Goal**: Modernize frontend stack
- **Scope**:
  - Upgrade React 17 → 18
  - Upgrade related dependencies
  - Refactor deprecated APIs
- **Success Criteria**:
  - 100% component compatibility
  - No performance regression
- **Team**: Frontend team
- **Estimate**: 4 sprints

**2. Testing Infrastructure**
- **Goal**: Improve test reliability
- **Scope**:
  - Reduce flaky tests by 80%
  - Improve test speed by 30%
  - Better test isolation
- **Success Criteria**:
  - <5% flaky test rate
  - Average test time <2 min
- **Team**: @eng4, @eng5
- **Estimate**: 2 sprints

## Migration Plans

### Database Migration: MySQL → PostgreSQL

**Status**: Planning
**Target Start**: Q2 2025
**Target Complete**: Q3 2025

**Phases**:

1. **Phase 1: Preparation** (4 weeks)
   - Schema conversion
   - Data migration scripts
   - Parallel write setup
   - Testing environment

2. **Phase 2: Shadow Migration** (2 weeks)
   - Write to both databases
   - Validate data consistency
   - Performance testing

3. **Phase 3: Read Migration** (2 weeks)
   - Gradual read traffic shift
   - Monitor for issues
   - Rollback plan ready

4. **Phase 4: Cutover** (1 week)
   - Final data sync
   - DNS cutover
   - MySQL deprecation

**Success Criteria**:
- Zero data loss
- <10 min downtime
- No performance degradation
- Rollback capability at each phase

**Risks**:
- Data inconsistency → Mitigation: Extensive validation
- Performance regression → Mitigation: Load testing
- Application bugs → Mitigation: Staged rollout

## Architecture Decision Records (ADRs)

### ADR Template

```markdown
# ADR XXX: [Decision Title]

**Status**: [Proposed | Accepted | Deprecated | Superseded]
**Date**: YYYY-MM-DD
**Authors**: @person1, @person2
**Reviewers**: @person3, @person4

## Context

[Describe the situation and problem]

## Decision

[Describe the change that we're proposing or have agreed to]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Drawback 1]
- [Drawback 2]

### Neutral
- [Trade-off 1]

## Alternatives Considered

### Option 1: [Name]
**Pros**: [list]
**Cons**: [list]
**Why rejected**: [reason]

### Option 2: [Name]
**Pros**: [list]
**Cons**: [list]
**Why rejected**: [reason]

## Implementation

### Phase 1: [Description]
- [ ] Task 1
- [ ] Task 2

### Phase 2: [Description]
- [ ] Task 3
- [ ] Task 4

## Success Metrics

- Metric 1: [current] → [target]
- Metric 2: [current] → [target]

## References

- [Design doc]
- [Related ADR]
- [Discussion thread]
```

## Prioritization Frameworks

### RICE Prioritization

**RICE = Reach × Impact × Confidence / Effort**

```markdown
| Issue | Reach | Impact | Confidence | Effort | RICE Score |
|-------|-------|--------|------------|--------|------------|
| #123  | 1000  | 3      | 80%        | 8      | 300        |
| #124  | 500   | 2      | 100%       | 2      | 500        |
| #125  | 100   | 1      | 50%        | 4      | 12.5       |

**Reach**: Number of users affected per period
**Impact**: 
- 3 = Massive impact
- 2 = High impact
- 1 = Medium impact
- 0.5 = Low impact
- 0.25 = Minimal impact

**Confidence**: % certainty in estimates
**Effort**: Person-weeks

**Sort by RICE score descending**
```

### ICE Prioritization

**ICE = Impact × Confidence / Effort**

```markdown
| Issue | Impact | Confidence | Effort | ICE Score |
|-------|--------|------------|--------|-----------|
| #123  | 8      | 7          | 3      | 18.7      |
| #124  | 9      | 9          | 2      | 40.5      |
| #125  | 5      | 6          | 8      | 3.8       |

**Impact**: 1-10 scale (business value)
**Confidence**: 1-10 scale (certainty)
**Effort**: 1-10 scale (complexity/time)

**Sort by ICE score descending**
```

### Value vs Effort Matrix

```markdown
        High Value
            |
    Do Next | Do Now
            |
--------------------------
            |
    Don't Do| Do Later
            |
        Low Value
    
    Low Effort → High Effort
```

## Cross-Functional Prioritization

### Stakeholder Input Template

```markdown
# Milestone XX.X Prioritization Input

## Product Management Input
**Product roadmap priorities**:
1. [Feature 1] - Customer commitment
2. [Feature 2] - Strategic initiative
3. [Feature 3] - Competitive parity

**Estimated capacity needed**: [X] points

## Engineering Management Input
**Technical roadmap priorities**:
1. [Tech item 1] - Reliability risk
2. [Tech item 2] - Performance blocker
3. [Tech item 3] - Developer productivity

**Estimated capacity needed**: [Y] points

## Quality Engineering Input
**Bug priorities**:
1. [Bug 1] - Severity::1, affects [X]% users
2. [Bug 2] - Severity::2, blocks [feature]
3. [Bug 3] - Severity::2, performance issue

**Estimated capacity needed**: [Z] points

## Design Input
**Design debt priorities**:
1. [UX item 1] - Accessibility issue
2. [UX item 2] - Usability problem
3. [UX item 3] - Visual inconsistency

**Estimated capacity needed**: [W] points

## Capacity Summary
- Total available: [A] points
- Total requested: [X + Y + Z + W] points
- Over/under capacity: [difference]

## Proposed Allocation
- Features: [%]
- Technical work: [%]
- Bugs: [%]
- Design debt: [%]

## Negotiation Points
[Items that need discussion to finalize]
```

### Prioritization Meeting Template

```markdown
# Cross-Functional Prioritization Meeting

**Attendees**: PM, EM, Design Lead, QE Lead
**Duration**: 60 minutes
**Frequency**: Every milestone

## Agenda

### 1. Review Capacity (5 min)
- Available points this milestone
- Historical velocity

### 2. Input from Stakeholders (20 min)
- Product: Top priorities and why
- Engineering: Technical debt must-dos
- Quality: Critical bugs
- Design: UX debt

### 3. Prioritization Discussion (25 min)
- Apply prioritization framework
- Identify conflicts
- Negotiate trade-offs
- Reach consensus

### 4. Final Decision (5 min)
- Confirm committed work
- Document decisions
- Assign issues

### 5. Communication (5 min)
- Who communicates what
- When to communicate
- Stakeholder updates

## Outputs
- Finalized issue list for milestone
- Documented trade-offs
- Stakeholder commitments
```

## Release Planning

### Major Release Planning

```markdown
# Major Release XX.0 Planning

**Release Date**: [Date]
**Planning Horizon**: 3-6 months

## Release Themes

### Theme 1: [e.g., Enterprise Readiness]
**Goal**: [Make GitLab enterprise-ready]

**Key Features**:
1. Feature A - [Description]
2. Feature B - [Description]
3. Feature C - [Description]

**Success Criteria**:
- [Metric 1]
- [Metric 2]

### Theme 2: [e.g., Developer Experience]
**Goal**: [Improve developer productivity]

**Key Features**:
1. Feature D - [Description]
2. Feature E - [Description]

**Success Criteria**:
- [Metric 1]
- [Metric 2]

## Milestone Breakdown

| Milestone | Focus | Key Features | Dependencies |
|-----------|-------|--------------|--------------|
| XX.1 | Foundation | [Features] | None |
| XX.2 | Core | [Features] | XX.1 |
| XX.3 | Enhancement | [Features] | XX.2 |
| XX.4 | Polish | [Features] | XX.3 |

## Resource Requirements

### Engineering
- Backend: [X] engineers
- Frontend: [Y] engineers
- Infrastructure: [Z] engineers

### Design
- Product designers: [N]

### Quality
- QE engineers: [M]

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk 1] | High | High | [Plan] |
| [Risk 2] | Med | High | [Plan] |
| [Risk 3] | Low | Med | [Plan] |

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Adoption | [X%] | [Y%] | Usage tracking |
| Performance | [A ms] | [B ms] | APM |
| Reliability | [C%] | [D%] | Uptime |
```

This comprehensive planning reference provides the structure needed for effective milestone management, technical roadmaps, and cross-functional prioritization.
