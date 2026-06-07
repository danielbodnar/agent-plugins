# Incident Management Reference

This reference provides comprehensive templates and processes for incident management, including broken master/main, Feature Change Locks, on-call procedures, and rapid response protocols.

## Contents

- [Broken Master/Main Process](#broken-mastermain-process)
- [Feature Change Lock (FCL)](#feature-change-lock-fcl)
- [On-Call Rotation](#on-call-rotation)
- [Runbook Template](#runbook-template)

## Broken Master/Main Process

### Overview Template

```markdown
# Broken Master Process

## Definition

A "broken master" occurs when the main/master branch's CI/CD pipeline fails, preventing:
- Merging of new code
- Deployment to staging/production
- Releases

## Scope

**In Scope**:
- Test failures on main branch
- Build failures
- Deployment blockers
- Failed database migrations

**Out of Scope**:
- Feature branch failures (author responsibility)
- Flaky tests (handled separately)
- Infrastructure outages (incident process)

## Service Level Objectives (SLOs)

| Phase | SLO | Measurement |
|-------|-----|-------------|
| Detection | 5 minutes | Time from failure to alert |
| Triage | 15 minutes | Time to identify root cause |
| Assignment | 30 minutes | Time to assign DRI |
| Resolution | 2 hours | Time to restore green build |
| Communication | Ongoing | Updates every 30 minutes |

## Roles and Responsibilities

### DRI (Directly Responsible Individual)
**Primary**: Author of breaking change
**Backup**: Engineering Manager of team
**Ultimate**: Director of Engineering

### Triage Team
- On-call engineer (detection)
- Engineering manager (coordination)
- Release manager (deployment impact)

## Process

### 1. Detection (0-5 minutes)

**Automated**:
- CI/CD pipeline failure triggers alert
- Slack notification to #engineering
- PagerDuty alert (if applicable)

**Manual**:
- Engineer notices failure
- Posts in #engineering channel
- Tags @eng-managers

### 2. Triage (5-20 minutes)

**Triage DRI Actions**:

1. Acknowledge incident
   ```
   :ack: Triaging broken master incident
   Investigating pipeline #XXXXX
   ```

2. Identify failure
   - Review pipeline logs
   - Identify failing job
   - Determine failure type (test, build, deploy)

3. Assign root cause
   - Search recent commits
   - Check related MRs
   - Review blame/history

4. Tag responsible party
   ```
   @author This appears related to MR #XXX
   Assigning to you for resolution
   DRI: @author
   Backup: @eng-manager
   ```

### 3. Communication (Ongoing)

**Initial Announcement** (within 5 minutes):
```
🚨 Master is broken 🚨

Pipeline: #XXXXX
Failure: [Type of failure]
Suspected cause: MR #XXX by @author
DRI: @author
Expected resolution: [timeframe]

Please pause merging until resolved.
```

**Status Updates** (every 30 minutes):
```
Status Update: Master Broken

Time elapsed: 30 minutes
Progress: [current status]
Next step: [planned action]
ETA: [estimated resolution time]
```

**Resolution Announcement**:
```
✅ Master is fixed!

Resolution: [what was done]
Root cause: [brief explanation]
Total time: [duration]

Merging can resume. Thank you for your patience!
```

### 4. Resolution (20 minutes - 2 hours)

**Option A: Revert** (Preferred, fastest)

1. Identify breaking MR
2. Create revert MR
3. Fast-track review (single maintainer)
4. Merge immediately
5. Create follow-up issue for reinstatement

```bash
# Revert command
git revert -m 1 <merge-commit-hash>
git push origin HEAD:revert-mr-XXXX
```

**Revert MR Template**:
```markdown
## Revert MR #XXXX

**Reason**: Broke master - [failure description]

**Breaking commit**: [commit hash]

**Follow-up issue**: #YYYY

Cc: @original-author

## Review Requirements
- [ ] Single maintainer approval (expedited)
- [ ] No additional testing required
- [ ] Merge immediately upon approval
```

**Option B: Forward Fix** (When revert not possible)

1. Identify exact issue
2. Create minimal fix
3. Mark as ~"priority::1" ~"severity::1"
4. Expedited review process
5. Deploy immediately

**When to forward fix vs revert**:
- Forward fix if revert would cause data loss
- Forward fix if revert introduces security vulnerability
- Forward fix if issue is trivial (1-line change)
- Otherwise, revert

**Option C: Quarantine** (For flaky tests)

1. Confirm test is flaky (not deterministic failure)
2. Quarantine test
3. Create issue to fix
4. Assign to test owner

```ruby
# Quarantine example (RSpec)
it 'does something', quarantine: 'https://gitlab.com/issue/XXXX' do
  # test code
end
```

### 5. Prevention (Post-resolution)

**Required Actions**:
1. Create retrospective issue
2. Identify why CI didn't catch issue
3. Add test coverage
4. Update CI/CD checks
5. Document lessons learned

**Retrospective Template**:
```markdown
# Broken Master Retrospective - [Date]

## Timeline
- Detection: [time]
- Triage: [time]
- Assignment: [time]
- Resolution: [time]
- Total duration: [time]

## Root Cause
[Detailed explanation]

## Why CI Didn't Catch It
[Analysis of CI/CD gap]

## Prevention Actions
- [ ] Action item 1 (Owner: @person, Due: date)
- [ ] Action item 2 (Owner: @person, Due: date)

## Process Improvements
[Any process changes needed]
```

## Escalation Process

### Level 1: Team (0-30 minutes)
- Author + Engineering Manager
- Team members can assist

### Level 2: Director (30-60 minutes)
- Escalate to Director of Engineering
- Pull in additional resources
- Consider broader impact

### Level 3: VP/CTO (60+ minutes)
- Escalate to VP Engineering or CTO
- Business impact assessment
- External communication needs

**Escalation Criteria**:
- SLO breach (2 hour resolution)
- Critical deployment blocked
- Multiple teams impacted
- Customer-facing impact
- DRI unavailable
```

## Feature Change Lock (FCL)

### Overview

```markdown
# Feature Change Lock (FCL) Process

## Purpose

Improve reliability after severity::1 or public-facing severity::2 incidents caused by an engineering change.

## When to Apply FCL

**Triggers**:
- Severity::1 incident on production
- Public-facing severity::2 incident
- Incident caused by engineering deployment
- Status page update required

**Does NOT Apply**:
- Infrastructure-only incidents
- Third-party service outages
- DDoS attacks
- Non-engineering issues

## Duration

**Timeline**:
- Day 0: Incident occurs
- Day 1: Establish if FCL required
- Day 2: Confirmation and start planning
- Days 3-4: Planning
- Days 5-9: Execution (1 week)
- Days 10-11: Retrospective and reporting

**Can be extended if**:
- Work incomplete after 1 week
- Additional issues discovered
- Requires broader team involvement

## Roles

### FCL Manager (Engineering Manager)
- Form FCL team
- Plan and execute FCL
- Report to leadership
- Provide weekly updates

### FCL Team (Engineers)
- Default: Entire team
- Can be subset if work is limited
- Include code author and reviewers
- May include borrowed engineers

### Stakeholders
- Product Manager
- Director of Engineering
- VP Engineering
- Infrastructure representative

## Process

### 1. FCL Initiation (Day 0-1)

**Engineering Manager Actions**:

1. Create FCL issue
   ```markdown
   Title: [Team Name] FCL for Incident #XXXX
   
   ## Incident Details
   - Incident: #XXXX
   - Date: [date]
   - Severity: [severity]
   - Root cause: [brief description]
   - Author: @person
   - Reviewers: @person1, @person2
   
   ## FCL Team
   - @person1
   - @person2
   - @person3
   
   ## Timeline
   - Start date: [date]
   - Target end date: [date + 7 days]
   
   ## Planned Work
   [To be filled during planning]
   ```

2. Create Slack channel: `#fcl-incident-XXXX`

3. Invite stakeholders to channel

### 2. Incident Review (Day 1-2)

**Complete within 24 hours of incident resolution**

**Incident Review Template**:
```markdown
# Incident Review - Incident #XXXX

## Timeline
[Detailed timeline of incident]

## Impact
- Duration: [time]
- Affected users: [count/percentage]
- Revenue impact: [if applicable]
- Status page updated: [yes/no]

## Root Cause
[Detailed technical explanation]

## Contributing Factors
1. [Factor 1]
2. [Factor 2]

## Why Wasn't This Caught?
### Pre-merge
[Why CI/CD didn't catch it]

### Pre-production
[Why staging didn't catch it]

### Detection
[Why monitoring didn't alert sooner]

## What Went Well
1. [Positive aspect 1]
2. [Positive aspect 2]

## What Didn't Go Well
1. [Issue 1]
2. [Issue 2]

## Action Items
- [ ] Immediate corrective actions
- [ ] Short-term improvements
- [ ] Long-term improvements
```

### 3. Planning (Day 2-4)

**Work Plan Components**:

1. **Corrective Actions** (Must do)
   - Fix immediate issue
   - Prevent exact recurrence

2. **Detection Improvements** (High priority)
   - Add monitoring/alerting
   - Improve observability
   - Service level indicators

3. **Mitigation Improvements** (High priority)
   - Improve rollback process
   - Feature flags
   - Circuit breakers

4. **Testing Improvements** (Medium priority)
   - Add test coverage
   - Improve test environments
   - Integration tests

5. **Process Improvements** (Medium priority)
   - Update runbooks
   - Improve documentation
   - Update review checklists

**Work Plan Template**:
```markdown
## FCL Work Plan

### Corrective Actions (Must Complete)
| Issue | Description | Owner | Est. | Priority |
|-------|-------------|-------|------|----------|
| #XXX  | Fix root cause | @eng1 | 2d | P1 |
| #YYY  | Add validation | @eng2 | 1d | P1 |

### Detection (High Priority)
| Issue | Description | Owner | Est. | Priority |
|-------|-------------|-------|------|----------|
| #AAA  | Add alert | @eng1 | 4h | P2 |
| #BBB  | Dashboard | @eng2 | 1d | P2 |

### Mitigation (High Priority)
| Issue | Description | Owner | Est. | Priority |
|-------|-------------|-------|------|----------|
| #CCC  | Feature flag | @eng1 | 4h | P2 |
| #DDD  | Rollback docs | @eng2 | 2h | P2 |

### Testing (Medium Priority)
| Issue | Description | Owner | Est. | Priority |
|-------|-------------|-------|------|----------|
| #EEE  | Integration test | @eng1 | 1d | P3 |
| #FFF  | Load test | @eng2 | 1d | P3 |

### Process (Medium Priority)
| Issue | Description | Owner | Est. | Priority |
|-------|-------------|-------|------|----------|
| #GGG  | Update runbook | @eng1 | 2h | P3 |
| #HHH  | Review checklist | @eng2 | 1h | P3 |
```

### 4. Execution (Day 5-9)

**Daily Standup**:
```markdown
## FCL Daily Update - Day X

### Completed Today
- [Item 1]
- [Item 2]

### In Progress
- [Item 3] - 50% complete
- [Item 4] - Blocked on [blocker]

### Planned for Tomorrow
- [Item 5]
- [Item 6]

### Blockers
- [Blocker 1] - Need help from @person
- [Blocker 2] - Waiting on infrastructure

### ETA to Completion
- On track for [date]
- OR: Need extension to [date] due to [reason]
```

**Weekly Standup Report**:
```markdown
## FCL Weekly Standup - Incident #XXXX

**Team**: [Team name]
**Week**: [week number]
**Status**: [On Track / At Risk / Behind]

### Executive Summary
[2-3 sentences on progress]

### Progress
- Completed: [X] of [Y] items
- High priority remaining: [count]
- Blocked items: [count]

### Key Accomplishments
1. [Accomplishment 1]
2. [Accomplishment 2]

### Challenges
1. [Challenge 1] - [how addressing]

### Next Week Focus
1. [Focus area 1]
2. [Focus area 2]

### Target End Date
- Original: [date]
- Current: [date]
```

### 5. Scope of Work During FCL

**Allowed Work**:
- All FCL planned work
- Maintainer duties (reviewing others' MRs)
- Security issues (severity::1, severity::2)
- Data loss prevention issues

**Paused Work**:
- New feature development
- Non-critical bug fixes
- Non-security technical debt
- Research/POC work

**Exception Process**:
If work must continue (customer commitment, etc):
1. Discuss with Engineering Manager
2. Get approval from Director
3. Document exception in FCL issue

### 6. Closing Ceremony (Day 10-11)

**Ceremony Format**:
- Duration: 60 minutes
- Attendees: FCL team, stakeholders, leadership
- Format: Review + retrospective + celebration

**Agenda**:
1. **Incident recap** (5 min)
   - What happened
   - Impact

2. **Work completed** (20 min)
   - Demo improvements
   - Show metrics/monitoring
   - Before/after comparison

3. **Retrospective** (20 min)
   - What went well
   - What could improve
   - Process learnings

4. **Handbook updates** (10 min)
   - What changed in handbook
   - What changed in runbooks
   - What changed in processes

5. **Celebration** (5 min)
   - Recognize team effort
   - Thank participants
   - Close FCL

**Closing Report Template**:
```markdown
# FCL Closing Report - Incident #XXXX

## Summary
[Brief overview of FCL]

## Completed Work
- Total issues completed: [X]
- High priority: [Y]
- Medium priority: [Z]

## Key Improvements
1. **Detection**: [What improved]
2. **Mitigation**: [What improved]
3. **Testing**: [What improved]

## Metrics Impact
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Time to detect | [X] | [Y] | [%] |
| Time to mitigate | [A] | [B] | [%] |
| Test coverage | [C]% | [D]% | [+E]% |

## Incomplete Work
- [ ] Issue #XXX - Moved to backlog (low priority)
- [ ] Issue #YYY - Requires more research

## Learnings
### Process Improvements
1. [Improvement 1]
2. [Improvement 2]

### Technical Learnings
1. [Learning 1]
2. [Learning 2]

## Handbook Updates
- Updated: [Section 1]
- Added: [Section 2]
- Deprecated: [Section 3]

## Acknowledgments
Thank you to:
- FCL team: @eng1, @eng2, @eng3
- Support: @pm, @director
- Infrastructure: @sre1
```

## Escalation Paths

### Broken Master Escalation
```
Author (DRI)
  ↓ (if unavailable or 30 min)
Engineering Manager
  ↓ (if unresolved after 1 hour)
Director of Engineering
  ↓ (if critical or 2+ hours)
VP Engineering / CTO
```

### FCL Escalation
```
Engineering Manager (FCL DRI)
  ↓ (if scope unclear or blocked)
Director of Engineering
  ↓ (if business impact or extensions needed)
VP Engineering
```

### Production Incident Escalation
```
On-Call Engineer
  ↓ (for severity::1 or severity::2)
On-Call Manager
  ↓ (if multi-team or unclear ownership)
Director of Engineering
  ↓ (if customer communication needed)
VP Engineering + Customer Success
```

## On-Call Rotation

### On-Call Schedule Template

```markdown
# On-Call Schedule

## Current Rotation
- **Primary**: @engineer1 (Mon-Wed)
- **Secondary**: @engineer2 (Mon-Wed)
- **Primary**: @engineer3 (Thu-Sun)
- **Secondary**: @engineer4 (Thu-Sun)

## Rotation Schedule
- **Duration**: 1 week per person
- **Handoff**: Monday 9am (your timezone)
- **Coverage**: 24/7 or business hours only

## Responsibilities

### Primary On-Call
- Respond to all alerts
- First responder for incidents
- Triage broken master
- Initial incident classification

### Secondary On-Call
- Backup for primary
- Respond if primary doesn't (15 min SLA)
- Help with complex incidents
- Provide second opinion

## Response SLAs
- **Severity::1**: Acknowledge < 5 min, Respond < 15 min
- **Severity::2**: Acknowledge < 15 min, Respond < 30 min
- **Severity::3**: Acknowledge < 30 min, Respond < 2 hours
- **Severity::4**: Acknowledge < 4 hours, Respond < 1 day

## Handoff Process

**End of shift checklist**:
1. Document all ongoing incidents
2. Update next on-call in Slack
3. Transfer any open escalations
4. Provide context on any warnings

**Handoff message template**:
```
@next-on-call Handing off on-call

Ongoing incidents:
- None OR [list incidents]

Watching:
- [Item 1] - might alert if [condition]
- [Item 2] - waiting on [blocker]

Recent incidents (last 24h):
- [Incident 1] - resolved
- [Incident 2] - monitoring

Notes:
- [Any other context]

Good luck! 🍀
```

## Runbook Template

```markdown
# Runbook: [Service/Feature Name]

## Overview
[What this service does]

## Architecture
[Diagram or description]

## Common Alerts

### Alert: [Alert Name]

**Severity**: [1/2/3/4]

**Trigger**: [What causes this alert]

**Impact**: [User/business impact]

**Diagnosis**:
1. Check [metric/log]
2. Verify [condition]
3. Review [dashboard]

**Resolution**:
1. Action step 1
2. Action step 2
3. Verification step

**Escalation**: 
- If X, escalate to @team
- If Y, escalate to @person

## Troubleshooting

### Problem: [Common issue 1]

**Symptoms**:
- [Symptom 1]
- [Symptom 2]

**Root cause**:
[Explanation]

**Fix**:
[Step-by-step resolution]

### Problem: [Common issue 2]
[Same structure]

## Useful Commands

```bash
# Check service status
kubectl get pods -n production

# View logs
kubectl logs -f pod-name -n production

# Restart service
kubectl rollout restart deployment/service-name
```

## Useful Links
- Dashboard: [link]
- Logs: [link]
- Metrics: [link]
- Codebase: [link]

## Contacts
- Team: @team-handle
- Manager: @manager
- On-call: @oncall
```
