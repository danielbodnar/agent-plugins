# Culture & Values Reference

This reference provides templates for defining engineering culture, values, career development, innovation programs, and people management processes.

## Contents

- [Engineering Values & Principles](#engineering-values--principles)
- [Engineering Excellence](#engineering-excellence)
- [Career Development](#career-development)
- [Innovation Programs](#innovation-programs)
- [Team Health & Culture](#team-health--culture)

## Engineering Values & Principles

### Core Values Template

```markdown
# Engineering Values

## Our Core Values

### 1. [Value Name] (e.g., Collaboration)

**What it means**:
[Clear definition of the value]

**How we live it**:
- [Specific behavior 1]
- [Specific behavior 2]
- [Specific behavior 3]

**Examples**:
- ✅ Good: [Concrete positive example]
- ❌ Avoid: [What violates this value]

### 2. [Value Name] (e.g., Quality)

**What it means**:
[Clear definition]

**How we live it**:
- [Behavior 1]
- [Behavior 2]

**Examples**:
- ✅ Good: [Example]
- ❌ Avoid: [Anti-example]

[Repeat for all core values]

## Engineering Principles

### Principle 1: [e.g., Bias for Action]

**Definition**: [Clear explanation]

**Application**:
- In code review: [How this applies]
- In architecture decisions: [How this applies]
- In incident response: [How this applies]

**Trade-offs**:
- ⚖️ Balance [X] with [Y]

### Principle 2: [e.g., Simple Over Clever]

**Definition**: [Clear explanation]

**Application**:
- [Context 1]: [How to apply]
- [Context 2]: [How to apply]

**Code Example**:
```javascript
// ❌ Clever but hard to maintain
const process = data => data.reduce((acc, {val: v}) => 
  [...acc, v > 0 ? v ** 2 : Math.abs(v)], []);

// ✅ Simple and clear
function processData(data) {
  return data.map(item => {
    const value = item.val;
    return value > 0 ? value * value : Math.abs(value);
  });
}
```
```

### Example: GitLab-Style Values

```markdown
# Engineering Values

## 1. Collaboration

**What it means**:
Working together transparently and helping others succeed.

**How we live it**:
- Default to public communication
- Share context proactively
- Ask for help when stuck
- Offer help when you see someone struggling
- Review others' code thoughtfully
- Accept feedback graciously

**Examples**:
- ✅ Good: Sharing a problem in a public channel to help others learn
- ✅ Good: Offering to pair program with a teammate on a complex issue
- ❌ Avoid: Keeping knowledge siloed
- ❌ Avoid: Working in isolation without sharing progress

## 2. Results

**What it means**:
Focus on outcomes over activity. Ship value to users.

**How we live it**:
- Define clear success metrics
- Iterate toward goals
- Make two-way door decisions quickly
- Don't let perfect be the enemy of good
- Celebrate shipped work

**Examples**:
- ✅ Good: Shipping an MVC that solves 80% of the problem
- ✅ Good: Deciding quickly on reversible decisions
- ❌ Avoid: Over-engineering solutions
- ❌ Avoid: Analysis paralysis

## 3. Efficiency

**What it means**:
Optimize for the right outcomes, not just speed.

**How we live it**:
- Write boring code
- Automate repetitive tasks
- Reuse before rebuilding
- Consider total cost of ownership
- Balance short-term and long-term

**Examples**:
- ✅ Good: Using proven libraries instead of reinventing
- ✅ Good: Automating deployment instead of manual steps
- ❌ Avoid: Premature optimization
- ❌ Avoid: Building custom solutions when standard ones exist

## 4. Transparency

**What it means**:
Share information openly and be honest about challenges.

**How we live it**:
- Document decisions publicly
- Share bad news quickly
- Admit mistakes openly
- Make information accessible
- Explain the "why" behind decisions

**Examples**:
- ✅ Good: Posting incident retrospective publicly
- ✅ Good: Admitting you don't know something
- ❌ Avoid: Hiding problems until they're critical
- ❌ Avoid: Making decisions without explanation

## 5. Iteration

**What it means**:
Ship small increments frequently rather than waiting for perfection.

**How we live it**:
- Break large projects into small pieces
- Ship behind feature flags
- Get feedback early
- Improve incrementally
- Learn from each iteration

**Examples**:
- ✅ Good: Shipping feature with basic functionality first
- ✅ Good: Using feature flags to gradually roll out
- ❌ Avoid: Holding features for months
- ❌ Avoid: Big-bang releases
```

## Engineering Excellence

### Excellence Definition Template

```markdown
# Engineering Excellence

## What is Engineering Excellence?

Engineering excellence is [your definition]. At [Company], engineering excellence means:

1. **Quality Code**
   - Well-tested and maintainable
   - Clear and documented
   - Performant and secure
   - Following established patterns

2. **Effective Processes**
   - Efficient workflows
   - Clear communication
   - Fast feedback loops
   - Continuous improvement

3. **Technical Leadership**
   - Mentoring others
   - Driving architecture decisions
   - Championing best practices
   - Sharing knowledge

4. **Business Impact**
   - Understanding user needs
   - Delivering value
   - Making data-driven decisions
   - Balancing tech debt with features

## Measuring Excellence

### Technical Metrics
- Code coverage: >[X]%
- Deployment frequency: [target]
- Lead time: <[X] days
- MTTR: <[X] hours
- Change failure rate: <[X]%

### Quality Metrics
- Bug rate: <[X] per 1000 LOC
- Security vulnerabilities: 0 high/critical
- Performance: P95 <[X]ms
- Availability: >[X]%

### Team Health Metrics
- Code review turnaround: <24 hours
- Onboarding time: <[X] weeks
- Team satisfaction: >[X]/10
- Knowledge sharing: [metric]

## Continuous Improvement

### Quarterly Review Process
1. Review metrics against targets
2. Identify top 3 improvement areas
3. Create action plans
4. Assign owners and deadlines
5. Track progress monthly
```

## Career Development

### Career Ladder Template

```markdown
# Engineering Career Ladder

## Levels Overview

```
Staff Engineer (L6)        ┐
Senior Engineer (L5)        │ Senior Track
Engineer II (L4)            │
Engineer I (L3)             │
Associate Engineer (L2)     │ Individual Contributor
Junior Engineer (L1)        ┘

Engineering Manager (M3)    ┐
Team Lead (M2)              │ Management Track
Tech Lead (M1)              ┘
```

## Individual Contributor Track

### Junior Engineer (L1)

**Experience**: 0-2 years

**Technical Skills**:
- Writes clean, functional code with guidance
- Debugs issues with support
- Understands team's codebase basics
- Completes well-defined tasks

**Collaboration**:
- Actively seeks feedback
- Asks clarifying questions
- Participates in code reviews
- Communicates progress

**Impact**:
- Completes assigned tasks
- Contributes to team projects
- Learns team processes

**Growth Focus**:
- Technical fundamentals
- Code quality
- Team collaboration
- System understanding

### Engineer I (L2)

**Experience**: 2-4 years

**Technical Skills**:
- Writes well-tested, maintainable code independently
- Debugs complex issues
- Understands system architecture
- Estimates work accurately

**Collaboration**:
- Provides helpful code reviews
- Contributes to technical discussions
- Mentors junior engineers
- Communicates technical concepts clearly

**Impact**:
- Owns features end-to-end
- Reduces tech debt proactively
- Improves team processes
- Reliable team member

**Growth Focus**:
- System design
- Technical leadership
- Cross-team collaboration
- Business understanding

### Engineer II (L3)

**Experience**: 4-7 years

**Technical Skills**:
- Designs systems independently
- Makes sound architectural decisions
- Optimizes for performance and scale
- Expert in multiple domains

**Collaboration**:
- Leads technical initiatives
- Mentors multiple engineers
- Influences team technical direction
- Effective cross-team coordination

**Impact**:
- Owns complex systems
- Drives technical improvements
- Unblocks others
- Raises team quality bar

**Growth Focus**:
- Strategic thinking
- Technical vision
- Organizational impact
- Mentorship

### Senior Engineer (L4)

**Experience**: 7-12 years

**Technical Skills**:
- Sets technical strategy
- Solves novel, complex problems
- Expert across the stack
- Anticipates technical risks

**Collaboration**:
- Leads large initiatives
- Mentors senior engineers
- Influences org-wide decisions
- Represents engineering externally

**Impact**:
- Owns critical systems
- Drives org-level improvements
- Multiplies team effectiveness
- Shapes engineering culture

**Growth Focus**:
- Strategic leadership
- Organizational influence
- Industry expertise
- Executive communication

### Staff Engineer (L5+)

**Experience**: 12+ years

**Technical Skills**:
- Defines technical vision
- Solves company-wide technical problems
- Industry-recognized expert
- Innovates beyond current solutions

**Collaboration**:
- Leads organization-wide initiatives
- Mentors senior+ engineers
- Influences company strategy
- Thought leader externally

**Impact**:
- Owns critical infrastructure
- Drives company-level technical decisions
- Sets industry standards
- Transforms engineering organization

## Management Track

### Tech Lead (M1)

**Experience**: 5+ years as IC, first leadership role

**People Management**:
- Leads small team (3-5)
- Conducts 1-on-1s
- Provides regular feedback
- Supports career development

**Technical Leadership**:
- Maintains strong technical skills
- Codes regularly (50%+ time)
- Makes architectural decisions
- Reviews critical code

**Impact**:
- Team delivers consistently
- High team morale
- Technical quality maintained
- Projects completed on time

### Engineering Manager (M2)

**Experience**: 2+ years in management

**People Management**:
- Leads team (5-10)
- Drives performance management
- Handles difficult conversations
- Builds high-performing team

**Technical Leadership**:
- Sets technical direction
- Codes occasionally (20-30% time)
- Evaluates architecture
- Maintains technical credibility

**Strategic**:
- Plans quarterly roadmap
- Manages budget/headcount
- Cross-functional partnership
- Drives team growth

**Impact**:
- Team consistently delivers
- Low attrition
- Strong team culture
- Business goals achieved

### Senior Engineering Manager (M3)

**Experience**: 5+ years in management

**People Management**:
- Leads multiple teams (10-20)
- Develops managers
- Shapes org culture
- Talent acquisition strategy

**Technical Leadership**:
- Drives technical strategy
- Limited coding
- Evaluates org-level architecture
- Technical risk management

**Strategic**:
- Multi-quarter planning
- Significant budget ownership
- Executive stakeholder management
- Org-level initiatives

**Impact**:
- Multiple teams deliver consistently
- Strong bench of leaders
- Org culture excellence
- Significant business impact
```

### Individual Development Plan (IDP) Template

```markdown
# Individual Development Plan

**Engineer**: [Name]
**Manager**: [Name]
**Current Level**: [Level]
**Target Level**: [Level]
**Review Date**: [Date]
**Next Review**: [Date + 6 months]

## Career Goals

### Short-term (6 months)
1. [Goal 1]
2. [Goal 2]
3. [Goal 3]

### Long-term (2-3 years)
1. [Goal 1]
2. [Goal 2]

## Gap Analysis

### Technical Skills

| Skill | Current | Target | Gap | Plan |
|-------|---------|--------|-----|------|
| System design | 3/5 | 4/5 | Design course | Q1 |
| Performance | 2/5 | 4/5 | Optimization project | Q2 |

### Leadership Skills

| Skill | Current | Target | Gap | Plan |
|-------|---------|--------|-----|------|
| Mentoring | 2/5 | 4/5 | Mentor 2 engineers | Q1-Q2 |
| Communication | 3/5 | 4/5 | Present at team meeting | Q1 |

## Development Activities

### Q1 2025

**Technical**:
- [ ] Complete system design course
- [ ] Lead architecture review
- [ ] Contribute to tech blog

**Leadership**:
- [ ] Mentor junior engineer
- [ ] Present at team meeting
- [ ] Lead technical spike

**Business**:
- [ ] Shadow product planning
- [ ] Present to stakeholders
- [ ] Customer interview

### Q2 2025

**Technical**:
- [ ] Own performance optimization project
- [ ] Give tech talk externally
- [ ] Contribute to open source

**Leadership**:
- [ ] Mentor second engineer
- [ ] Run retrospective
- [ ] Lead cross-team initiative

**Business**:
- [ ] Write product proposal
- [ ] Present at all-hands
- [ ] Industry conference

## Success Metrics

- Complete [X] development activities
- Receive positive feedback from [Y] sources
- Demonstrate [Z] skills at target level
- Ship [N] impactful projects

## Support Needed

**From Manager**:
- [ ] Budget for conference
- [ ] Intro to [person] for mentorship
- [ ] Assignment to [project]

**From Organization**:
- [ ] Training resources
- [ ] Speaking opportunities
- [ ] Project allocation

## Progress Notes

### [Date]
[Progress update]

### [Date]
[Progress update]
```

## Innovation Programs

### Innovation Time Template

```markdown
# Innovation Program

## Overview

**Allocation**: [X]% time (e.g., 10% = 1 day per 2-week sprint)

**Eligibility**: All engineers

**Goal**: Encourage exploration, learning, and innovation

## What Qualifies

**Allowed**:
- Explore new technologies
- Build proof-of-concepts
- Contribute to open source
- Technical writing/speaking
- Internal tools
- Process improvements
- Learning/skill development

**Not Allowed**:
- Catch-up on regular work
- Personal projects (unrelated to work)
- Helping other teams with their roadmap work

## Process

### Proposing Innovation Work

1. Create innovation proposal:
```markdown
## Innovation Proposal: [Title]

**Author**: @person
**Estimated Duration**: [X] days/weeks
**Category**: [Technical | Process | Learning]

### Problem/Opportunity
[What are you exploring or solving?]

### Proposed Approach
[What will you do?]

### Expected Outcomes
[What will you learn or build?]

### Success Criteria
[How will you know if it's successful?]

### Alignment
[How does this benefit the team/company?]
```

2. Discuss with manager
3. Get approval
4. Track time spent
5. Share results

### Demo Day

**Frequency**: Quarterly

**Format**:
- 5-10 minute presentations
- Demo working prototypes
- Share learnings
- Q&A

**Benefits**:
- Share knowledge
- Get feedback
- Inspire others
- Celebrate innovation

## Examples

### Technical Innovation

**Example 1: GraphQL API Exploration**
- Research GraphQL benefits
- Build prototype endpoint
- Compare with REST
- Present findings
- **Outcome**: Adopted for new API

**Example 2: Performance Monitoring**
- Research APM tools
- Set up trial
- Create dashboards
- **Outcome**: Improved visibility

### Process Innovation

**Example 1: Automated Testing Strategy**
- Analyze current coverage gaps
- Research testing patterns
- Implement example
- Create guidelines
- **Outcome**: Improved test quality

**Example 2: Code Review Automation**
- Research linting tools
- Configure for team
- Document best practices
- **Outcome**: Faster reviews

### Learning Innovation

**Example 1: System Design Study Group**
- Organize weekly sessions
- Work through case studies
- Share learnings
- **Outcome**: Team skill improvement

**Example 2: Tech Blog Series**
- Write about team projects
- Share externally
- **Outcome**: Improved recruiting, knowledge sharing
```

## Team Health & Culture

### Team Health Metrics

```markdown
# Team Health Dashboard

## Engagement Metrics

| Metric | Current | Target | Trend |
|--------|---------|--------|-------|
| Team satisfaction | 8.2/10 | 8.5/10 | ↑ |
| Would recommend | 85% | 90% | → |
| Growth opportunities | 7.8/10 | 8.0/10 | ↑ |
| Work-life balance | 7.5/10 | 8.0/10 | ↓ |

## Collaboration Metrics

| Metric | Current | Target | Trend |
|--------|---------|--------|-------|
| Code review time | 8 hours | <24 hours | ↑ |
| Meeting load | 12 hrs/wk | <10 hrs/wk | → |
| Documentation quality | 7/10 | 8/10 | ↑ |
| Knowledge sharing | 6 sessions/mo | 8/mo | → |

## Delivery Metrics

| Metric | Current | Target | Trend |
|--------|---------|--------|-------|
| Sprint commitment | 92% | >90% | → |
| Velocity | 45 pts | Stable | → |
| Bug rate | 2% | <3% | ↑ |
| Cycle time | 5 days | <7 days | ↑ |

## Actions

Based on low work-life balance score:
- [ ] Review meeting load
- [ ] Check for after-hours work
- [ ] Discuss capacity planning
- [ ] Address in 1-on-1s
```

### Team Retrospective Template

```markdown
# Team Retrospective - [Date]

## Format: Start, Stop, Continue

### Start (New things to try)
- [Suggestion 1] - Votes: [X]
- [Suggestion 2] - Votes: [X]

### Stop (Things not working)
- [Item 1] - Votes: [X]
- [Item 2] - Votes: [X]

### Continue (Keep doing)
- [Item 1] - Votes: [X]
- [Item 2] - Votes: [X]

## Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | @person | [date] | ⏳ |
| [Action 2] | @person | [date] | ✅ |

## Previous Actions Review

| Action | Status | Notes |
|--------|--------|-------|
| [Previous action] | ✅ Complete | [Outcome] |
| [Previous action] | ⏳ In Progress | [Update] |
| [Previous action] | ❌ Cancelled | [Reason] |

## Celebration 🎉

- [Win 1]
- [Win 2]
- [Win 3]
```

This comprehensive culture and values reference provides the foundation for building a strong engineering organization with clear values, career paths, innovation programs, and healthy team practices.
