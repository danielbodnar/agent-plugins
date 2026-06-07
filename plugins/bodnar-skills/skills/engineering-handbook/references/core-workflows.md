# Core Engineering Workflows Reference

This reference provides detailed templates and examples for core engineering workflows including issue management, code review, merge requests, and CI/CD processes.

## Contents

- [Issue Workflow](#issue-workflow)
- [Code Review Process](#code-review-process)
- [Merge Request (Pull Request) Workflow](#merge-request-pull-request-workflow)
- [CI/CD Pipeline Configuration](#cicd-pipeline-configuration)
- [Working with Issues](#working-with-issues)
- [Asynchronous Work Best Practices](#asynchronous-work-best-practices)
- [Security-First Development](#security-first-development)

## Issue Workflow

### Basic Issue Lifecycle

```markdown
# Issue Workflow Labels

workflow::planning - Issue is being scoped and estimated
workflow::ready for development - Ready to be picked up
workflow::in dev - Actively being worked on  
workflow::in review - In code review
workflow::verification - Deployed, awaiting verification
workflow::complete - Verified and closed
```

### Issue Template

```markdown
## Summary

[Brief description of the issue]

## Problem

[Describe the problem this addresses]

## Proposal

[Proposed solution or approach]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Technical Considerations

[Architecture, dependencies, edge cases]

## Documentation Requirements

- [ ] Update user documentation
- [ ] Update API documentation
- [ ] Add changelog entry

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing steps

## Related Issues

- Related to #XXX
- Blocks #YYY
- Blocked by #ZZZ
```

### Priority and Severity Labels

```markdown
# Priority (Schedule urgency)
priority::1 - Urgent, schedule immediately
priority::2 - High priority, schedule soon
priority::3 - Medium priority, schedule when capacity allows
priority::4 - Low priority, nice to have

# Severity (User/business impact)
severity::1 - Blocker, system unusable
severity::2 - Critical, major feature broken
severity::3 - Major, important feature degraded
severity::4 - Low, minor issue
```

## Code Review Process

### Review Guidelines Template

```markdown
# Code Review Guidelines

## Reviewer Responsibilities

### Initial Review (15-30 minutes)
- [ ] Read the issue/ticket description
- [ ] Understand the problem being solved
- [ ] Review the overall approach
- [ ] Check for architectural concerns

### Code Review (30-60 minutes)
- [ ] Verify code follows style guidelines
- [ ] Check for security vulnerabilities
- [ ] Ensure adequate test coverage
- [ ] Review error handling
- [ ] Check for performance issues
- [ ] Verify documentation is updated

### Security Checklist
- [ ] Input validation present
- [ ] No sensitive data in logs
- [ ] Authentication/authorization checked
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection

## Author Responsibilities

### Before Submitting
- [ ] Self-review the code
- [ ] Run all tests locally
- [ ] Update documentation
- [ ] Add changelog entry
- [ ] Link to issue/ticket
- [ ] Request specific reviewers if needed

### During Review
- [ ] Respond to feedback within 24 hours
- [ ] Ask clarifying questions
- [ ] Mark resolved comments
- [ ] Request re-review when ready

## Review Standards

**Response Times**:
- Initial review: Within 24 hours
- Follow-up comments: Within 24 hours
- Final approval: Within 48 hours of last change

**Approval Requirements**:
- At least 1 reviewer approval
- All discussions resolved
- CI/CD pipeline passes
- No merge conflicts
```

### Code Review Comment Templates

```markdown
# Suggestion Comment Template
**Suggestion**: Consider using [alternative approach]

**Reasoning**: [Why this would be better]

**Example**:
```[language]
[code example]
```

# Question Comment Template
**Question**: [Your question]

**Context**: [Why you're asking]

# Blocking Issue Template
**Blocking Issue**: [What needs to change]

**Severity**: [Impact level]

**Required Action**: [Specific fix needed]

# Nitpick Comment Template
**Nitpick** (non-blocking): [Minor suggestion]
```

## Merge Request (Pull Request) Workflow

### MR Template

```markdown
## What does this MR do?

[Brief description]

## Related Issues

Closes #XXX

## Screenshots (if applicable)

## How to test

1. Step 1
2. Step 2
3. Expected result

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Changelog entry added
- [ ] Security considerations addressed
- [ ] Performance impact considered
- [ ] Migration plan (if applicable)

## Breaking Changes

- [ ] No breaking changes
- [ ] Breaking changes (describe below)

## Database Changes

- [ ] No database changes
- [ ] Migration included (describe below)

## Feature Flag

- [ ] Not behind feature flag
- [ ] Behind feature flag: `flag_name`
```

### MR Merge Criteria

```markdown
# Definition of Done

## Code Quality
- All automated tests pass
- Code coverage meets threshold (e.g., 80%)
- No new linting errors
- Security scans pass

## Review
- Approved by required reviewers
- All conversations resolved
- No requested changes outstanding

## Documentation
- User-facing documentation updated
- API documentation updated (if applicable)
- Changelog entry added
- Migration guide (if breaking change)

## Testing
- Unit tests pass
- Integration tests pass  
- Manual testing completed
- Performance testing (if applicable)

## Deployment
- Feature flag configured (if applicable)
- Rollback plan documented
- Monitoring/alerting updated
- Database migrations tested
```

## CI/CD Pipeline Configuration

### Basic Pipeline Template

```yaml
# .gitlab-ci.yml / .github/workflows/ci.yml

stages:
  - build
  - test
  - lint
  - security
  - deploy

variables:
  COVERAGE_THRESHOLD: "80"

# Build Stage
build:
  stage: build
  script:
    - npm install
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 day

# Test Stage
unit-tests:
  stage: test
  script:
    - npm run test:unit
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

integration-tests:
  stage: test
  script:
    - npm run test:integration
  dependencies:
    - build

# Lint Stage
eslint:
  stage: lint
  script:
    - npm run lint

typescript-check:
  stage: lint
  script:
    - npm run type-check

# Security Stage
dependency-scan:
  stage: security
  script:
    - npm audit
  allow_failure: false

sast-scan:
  stage: security
  script:
    - npm run security:scan

# Deploy Stages
deploy-staging:
  stage: deploy
  script:
    - npm run deploy:staging
  only:
    - develop
  environment:
    name: staging
    url: https://staging.example.com

deploy-production:
  stage: deploy
  script:
    - npm run deploy:production
  only:
    - main
  when: manual
  environment:
    name: production
    url: https://example.com
```

### Pipeline Failure Response

```markdown
# Pipeline Failure Response Process

## Severity Classification

### Severity 1: Blocking
- Main/master branch is red
- Deployment pipeline broken
- All engineers blocked

**Response Time**: Immediate (< 15 minutes)

### Severity 2: High Impact  
- Feature branch consistently failing
- Flaky tests causing delays
- Multiple teams affected

**Response Time**: Within 2 hours

### Severity 3: Low Impact
- Occasional test failures
- Non-critical job failures
- Single team affected

**Response Time**: Within 1 business day

## Response Process

1. **Identify** (5-15 minutes)
   - Determine root cause
   - Identify affected scope
   - Assign to responsible party

2. **Communicate** (Immediately)
   - Post in #engineering channel
   - Tag relevant teams
   - Provide status updates

3. **Resolve** (Based on severity)
   - Revert breaking change, OR
   - Submit urgent fix, OR
   - Quarantine flaky test

4. **Prevent** (Post-resolution)
   - Update CI/CD checks
   - Add test coverage
   - Document in retrospective
```

## Working with Issues

### Team Workflow Example

```markdown
# Sprint/Milestone Workflow

## Planning (Day 1)

1. **Review Previous Sprint**
   - What shipped?
   - What didn't ship and why?
   - Retrospective items

2. **Capacity Planning**
   - Calculate available points
   - Account for PTO
   - Reserve 20% for interrupts

3. **Issue Selection**
   - Prioritize with PM
   - Size issues (S/M/L)
   - Identify dependencies
   - Assign issues

## Daily Standup (Async or Sync)

**Format**:
- What I completed yesterday
- What I'm working on today
- Any blockers

**Blockers**:
- Tag relevant people
- Escalate if blocked >24 hours

## Mid-Sprint Check (Day 7)

- Review progress vs. plan
- Adjust scope if needed
- Communicate changes to stakeholders

## End of Sprint (Day 14)

1. **Deploy and Verify**
   - All work deployed
   - Verification complete
   - Documentation updated

2. **Cleanup**
   - Close completed issues
   - Update issue statuses
   - Move incomplete work

3. **Demo** (Optional)
   - Show completed work
   - Gather feedback
   - Celebrate wins
```

### Working in Teams

```markdown
# Cross-Functional Team Collaboration

## Team Composition
- Backend Engineer
- Frontend Engineer  
- Product Manager
- Product Designer
- QA Engineer (if applicable)

## Shared Responsibilities
- Ship features on time
- Maintain quality standards
- Communicate proactively
- Support each other

## Communication Channels

**Issue Comments**: 
- Technical details
- Implementation decisions
- Permanent record

**Slack Channel**:
- Quick questions
- Status updates
- Daily coordination

**Synchronous Meetings**:
- Complex discussions
- Design reviews
- Sprint planning

## Dependencies Management

```markdown
**When frontend depends on backend**:
1. Backend creates API spec
2. Frontend implements against mock
3. Backend implements API
4. Integration testing
5. Deploy together or use feature flag

**When blocked**:
1. Document blocker in issue
2. Tag blocking party
3. Find alternative work
4. Escalate if blocked >24 hours
```
```

## Asynchronous Work Best Practices

```markdown
# Remote/Async Collaboration Guidelines

## Written Communication

### Issue/MR Descriptions
- **Context**: Why this is needed
- **Approach**: How you're solving it
- **Decisions**: Key choices made
- **Questions**: What you need feedback on

### Comments
- Quote what you're responding to
- Provide full context
- Link to references
- Use threads for topics

## Status Updates

**Frequency**: Daily or when status changes

**Template**:
```
Status: [On Track / At Risk / Blocked]
Progress: [What's done]
Next: [What's next]
Blockers: [Any issues]
ETA: [Expected completion]
```

## Time Zone Considerations

- Schedule meetings thoughtfully
- Document meetings for async review
- Provide 24-hour feedback cycles
- Use async tools (Loom, written updates)
- Respect working hours
```

## Security-First Development

```markdown
# Security Guidelines

## Security Review Triggers

Require security review when:
- [ ] Handling user authentication
- [ ] Processing user authorization
- [ ] Accepting user input
- [ ] Handling file uploads
- [ ] Processing payments
- [ ] Accessing external APIs
- [ ] Changing security configurations
- [ ] Modifying rate limits

## Secure Coding Checklist

### Input Validation
- [ ] All inputs validated
- [ ] Whitelist approach used
- [ ] File uploads restricted
- [ ] Max payload size enforced

### Authentication/Authorization
- [ ] Authentication required
- [ ] Authorization checked
- [ ] Session management secure
- [ ] Password requirements enforced

### Data Protection
- [ ] Sensitive data encrypted
- [ ] No secrets in code
- [ ] Secure key management
- [ ] Data sanitized in logs

### API Security
- [ ] Rate limiting implemented
- [ ] CORS configured properly
- [ ] API keys rotated regularly
- [ ] Authentication tokens expire

## Security Issue Handling

**Reporting**:
1. Create confidential issue
2. Tag security team
3. Do NOT disclose publicly
4. Follow responsible disclosure

**Response**:
- Critical (S1): Fix within 24 hours
- High (S2): Fix within 1 week
- Medium (S3): Fix within 1 month
- Low (S4): Fix when capacity allows
```

This reference provides the foundational workflows that most engineering teams need. Adapt the templates to match your organization's tools and culture.
