# Monitoring & Quality Reference

This reference covers performance monitoring, technical debt management, error budgets, the infradev process, and quality engineering practices.

For Cloudflare Workers shops, pair this reference with `cloudflare-observability.md`, which covers the Cloudflare-specific implementation (Workers Logs, Logs Explorer, Workers Tracing, OTLP export, `wrangler tail`, `bunx cf@latest agent-context`, and the `bunx skills cloudflare` plugin) without duplicating the generic concepts here.

## Contents

- [Performance Monitoring](#performance-monitoring)
- [Alerting](#alerting)
- [Service Level Objectives (SLOs)](#service-level-objectives-slos)
- [Technical Debt Management](#technical-debt-management)
- [Infrastructure Development (Infradev)](#infrastructure-development-infradev)
- [Quality Engineering](#quality-engineering)

## Performance Monitoring

### Observability Stack Template

```markdown
# Observability & Monitoring

## Monitoring Philosophy

**The Three Pillars**:
1. **Metrics**: What is happening (quantitative)
2. **Logs**: Why it's happening (qualitative)
3. **Traces**: How it's happening (requests)

## Metrics

### Application Metrics

**Golden Signals**:
- **Latency**: How long requests take
- **Traffic**: How many requests
- **Errors**: How many failures
- **Saturation**: How full the system is

**Key Metrics**:
```markdown
| Metric | Target | Alert Threshold | Critical |
|--------|--------|-----------------|----------|
| P50 latency | <100ms | >150ms | >300ms |
| P95 latency | <300ms | >500ms | >1000ms |
| P99 latency | <500ms | >1000ms | >2000ms |
| Error rate | <0.1% | >0.5% | >1% |
| Availability | >99.9% | <99.9% | <99.5% |
| CPU usage | <70% | >80% | >90% |
| Memory usage | <80% | >90% | >95% |
```

### Infrastructure Metrics

**System Resources**:
- CPU utilization
- Memory usage
- Disk I/O
- Network throughput

**Database Metrics**:
- Query latency
- Connection pool usage
- Replication lag
- Slow query count

**Cache Metrics**:
- Hit rate
- Miss rate
- Eviction rate
- Memory usage

## Logs

### Log Levels

```
FATAL   - System is unusable
ERROR   - Error that requires attention
WARN    - Warning that should be investigated
INFO    - Normal operational messages
DEBUG   - Detailed information for debugging
TRACE   - Very detailed information
```

### Structured Logging Template

```javascript
// ✅ Good: Structured logs
logger.info('User login', {
  userId: user.id,
  email: user.email,
  loginMethod: 'oauth',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  duration: Date.now() - startTime,
  success: true
});

// ❌ Bad: Unstructured logs
console.log('User logged in: ' + user.email);
```

### Log Aggregation

**Log Storage**:
- Centralized logging (ELK, Datadog, Splunk)
- Retention policy: 30-90 days
- Archive policy: 1+ years

**Log Queries**:
```
# Find errors for specific user
userId:12345 AND level:ERROR

# Find slow requests
duration:>1000 AND endpoint:"/api/*"

# Find failed deployments
service:deployment AND status:failed
```

## Traces

### Distributed Tracing

**Tracing Implementation**:
```javascript
// Add tracing to request handlers
app.get('/api/users/:id', async (req, res) => {
  const span = tracer.startSpan('get_user');
  span.setTag('user.id', req.params.id);
  
  try {
    // Database query sub-span
    const dbSpan = tracer.startSpan('db_query', {
      childOf: span
    });
    const user = await db.users.findById(req.params.id);
    dbSpan.finish();
    
    // External API call sub-span
    const apiSpan = tracer.startSpan('external_api', {
      childOf: span
    });
    const profile = await fetchUserProfile(user.id);
    apiSpan.finish();
    
    span.setTag('success', true);
    res.json({ user, profile });
  } catch (error) {
    span.setTag('error', true);
    span.log({ event: 'error', message: error.message });
    throw error;
  } finally {
    span.finish();
  }
});
```

**Trace Analysis**:
- Request flow visualization
- Bottleneck identification
- Dependency mapping
- Error tracking

## Dashboards

### Service Health Dashboard

```markdown
# Service Health Dashboard

## Overview Panel
- Requests/sec (time series)
- Error rate % (time series)
- P95 latency (time series)
- Active instances (gauge)

## Performance Panel
- Latency breakdown by endpoint
- Slowest endpoints (table)
- Database query time
- External API time

## Errors Panel
- Error rate by type
- Top error messages
- Error distribution by endpoint
- Recent errors (log stream)

## Resources Panel
- CPU usage by instance
- Memory usage by instance
- Network I/O
- Disk usage

## Business Metrics Panel
- Active users
- API calls by client
- Feature usage
- Conversion rate
```

### Dashboard Best Practices

```markdown
# Dashboard Guidelines

## Do's
✅ Use consistent color schemes
✅ Start with time series
✅ Include percentile latencies (P50, P95, P99)
✅ Show both absolute and rate metrics
✅ Add context (SLO lines, annotations)
✅ Link to runbooks
✅ Mobile-friendly layouts

## Don'ts
❌ Too many graphs (max 12 per dashboard)
❌ Misleading scales (always start at 0 for percentages)
❌ Vanity metrics without actionable insights
❌ Stale dashboards (review quarterly)
❌ No context (add descriptions)
```

## Alerting

### Alert Template

```yaml
alert: HighErrorRate
expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.01
for: 5m
labels:
  severity: critical
  service: api
  team: backend
annotations:
  summary: "High error rate detected"
  description: "Error rate is {{ $value | humanizePercentage }} (threshold: 1%)"
  runbook: "https://runbooks.company.com/high-error-rate"
  dashboard: "https://grafana.company.com/d/service-health"
```

### Alert Severity Levels

```markdown
# Alert Severity Guide

## Critical (P1)
- **Response Time**: Immediate (<5 minutes)
- **Examples**:
  - Service completely down
  - Data loss in progress
  - Security breach
- **Action**: Page on-call, create incident

## High (P2)
- **Response Time**: <15 minutes
- **Examples**:
  - Elevated error rate
  - Degraded performance
  - Failed deployments
- **Action**: Alert on-call, start investigation

## Medium (P3)
- **Response Time**: <1 hour
- **Examples**:
  - Elevated resource usage
  - Slow queries
  - Flaky tests
- **Action**: Notify team, schedule fix

## Low (P4)
- **Response Time**: <24 hours
- **Examples**:
  - Certificate expiring soon
  - Deprecated API usage
  - Low disk space (warning level)
- **Action**: Create issue, prioritize
```

### Alert Best Practices

```markdown
# Alerting Guidelines

## Alert Quality

**Good Alerts**:
- Actionable
- Clear impact
- Linked to runbook
- Appropriate severity
- Low false positive rate

**Bad Alerts**:
- Too noisy (alert fatigue)
- No clear action
- Unclear impact
- Wrong severity
- High false positive rate

## Alert Rules

1. **Every alert should require action**
   - If no action needed, it's not an alert
   - Use dashboards for informational metrics

2. **Alert on symptoms, not causes**
   - ✅ "Users experiencing high latency"
   - ❌ "CPU usage at 80%"

3. **Include context in alert**
   - Current value
   - Threshold
   - Runbook link
   - Dashboard link

4. **Set appropriate thresholds**
   - Based on SLOs
   - Include buffer
   - Adjust based on feedback

5. **Review and tune regularly**
   - Quarterly alert review
   - Track false positive rate
   - Adjust thresholds
   - Deprecate stale alerts
```

## Service Level Objectives (SLOs)

### SLO Template

```markdown
# Service Level Objectives

## Service: [Service Name]

### SLO 1: Availability

**Definition**: Percentage of successful requests

**Target**: 99.9% (three nines)

**Measurement Window**: 30 days

**Error Budget**: 0.1% = 43 minutes of downtime per month

**Measurement**:
```
Success Rate = (Total Requests - Failed Requests) / Total Requests
Failed Request = HTTP 5xx or timeout
```

**Current Performance**: 99.95%
**Error Budget Remaining**: 75% (32 minutes)

### SLO 2: Latency

**Definition**: Request response time

**Target**: 
- P50 < 100ms
- P95 < 300ms
- P99 < 500ms

**Measurement Window**: 30 days

**Current Performance**:
- P50: 78ms
- P95: 245ms
- P99: 412ms

**Status**: ✅ Meeting target

### SLO 3: Correctness

**Definition**: Percentage of correct responses

**Target**: 99.99%

**Measurement**: Automated validation checks

**Current Performance**: 99.995%

**Status**: ✅ Meeting target
```

### Error Budget Policy

```markdown
# Error Budget Policy

## What is an Error Budget?

Error budget = 100% - SLO target

Example: 99.9% SLO = 0.1% error budget

## Error Budget States

### Healthy (>50% remaining)
- **Status**: ✅ Green
- **Actions**:
  - Continue normal feature development
  - Maintain current pace
  - Optional: Invest in reliability

### Warning (20-50% remaining)
- **Status**: ⚠️ Yellow
- **Actions**:
  - Increase focus on reliability
  - Review recent changes
  - Prepare contingency plans
  - Inform stakeholders

### Depleted (<20% remaining)
- **Status**: 🔴 Red
- **Actions**:
  - **Freeze non-critical deployments**
  - Focus 100% on reliability
  - Daily leadership updates
  - Root cause analysis
  - Implement corrective actions

## Error Budget Burn Rate

**Fast Burn** (24-48 hours):
- Immediate investigation
- Page on-call
- Consider rollback

**Medium Burn** (1 week):
- Schedule investigation
- Monitor closely
- Plan fixes

**Slow Burn** (2-4 weeks):
- Normal investigation
- Track in backlog

## Calculating Burn Rate

```
Burn Rate = (Error Budget Used / Time Period) / (Total Error Budget / SLO Window)

Example:
- Used 20% of error budget in 2 days
- SLO window is 30 days
- Burn Rate = (20% / 2 days) / (100% / 30 days) = 10% / 3.33% = 3x
- At this rate, budget exhausted in 10 days
```
```

## Technical Debt Management

### Technical Debt Classification

```markdown
# Technical Debt Types

## Type 1: Deliberate and Prudent

**Definition**: Intentional shortcuts to meet deadlines, with plan to address

**Examples**:
- Shipping without full test coverage
- Hardcoding config for quick release
- Skipping optimization for MVP

**Management**:
- Document in code comments
- Create follow-up issues
- Schedule within 1-2 milestones
- Link to original decision

## Type 2: Deliberate and Reckless

**Definition**: Taking shortcuts without considering consequences

**Examples**:
- Bypassing security checks for speed
- Ignoring architectural guidelines
- Copy-pasting without understanding

**Management**:
- Identify in code review
- Reject or require immediate fix
- Educate team on consequences
- Document as anti-pattern

## Type 3: Inadvertent and Prudent

**Definition**: Learn better approach after implementation

**Examples**:
- Discover more efficient algorithm
- Find better library after building custom
- Learn about design pattern that fits better

**Management**:
- Document learning
- Create refactoring issue
- Share knowledge with team
- Prioritize based on impact

## Type 4: Inadvertent and Reckless

**Definition**: Poor code quality due to lack of skill/knowledge

**Examples**:
- Not following best practices
- Poor error handling
- Lack of documentation
- No tests

**Management**:
- Identify in code review
- Provide education/mentoring
- Set quality standards
- Require improvements
```

### Technical Debt Tracking

```markdown
# Technical Debt Registry

| ID | Type | Description | Impact | Effort | Priority | Owner | Target |
|----|------|-------------|--------|--------|----------|-------|--------|
| TD-001 | Architecture | Monolith coupling | High | 12w | P1 | @team1 | Q2 |
| TD-002 | Performance | N+1 queries | Med | 2w | P2 | @eng1 | Q1 |
| TD-003 | Security | Weak encryption | High | 1w | P1 | @eng2 | Q1 |
| TD-004 | Testing | Low coverage | Med | 4w | P3 | @team2 | Q2 |
| TD-005 | Dependencies | Outdated libs | Low | 1w | P3 | @eng3 | Q2 |

## Impact Assessment

**High Impact**:
- Security vulnerabilities
- Performance degradation
- Scaling blockers
- Developer productivity killers

**Medium Impact**:
- Code maintainability
- Test reliability
- Documentation gaps
- Minor performance issues

**Low Impact**:
- Code style inconsistencies
- Non-critical optimizations
- Nice-to-have refactors

## Prioritization Framework

```
Priority = (Impact × Contagion) / Effort

Where:
- Impact: 1-10 (user/business impact)
- Contagion: 1-5 (how fast it spreads)
- Effort: 1-10 (person-weeks)
```

## Technical Debt Budget

Allocate 20-40% of engineering capacity to technical debt:

**20% for:**
- Mature products
- Stable architecture
- Good technical health

**40% for:**
- Rapid growth products
- Technical scaling needs
- High debt accumulation
```

## Infrastructure Development (Infradev)

### Infradev Issue Template

```markdown
# Infradev Issue: [Title]

## Severity
~severity::[1/2/3/4]

## Priority
~priority::[1/2/3/4]

## Problem Statement

[Clear description of the infrastructure/reliability issue]

## Impact

**User Impact**:
- [How users are affected]
- [Number of users affected]
- [Frequency of occurrence]

**Business Impact**:
- [Revenue impact, if any]
- [Availability impact]
- [SLA risk]

**Engineering Impact**:
- [Developer productivity impact]
- [Operational burden]
- [Incident frequency]

## Evidence

**Metrics**:
- [Link to dashboard]
- [Link to metrics]

**Incidents**:
- Related to incident: #XXX
- Related to incident: #YYY

**Logs**:
```
[Relevant log samples]
```

## Root Cause

[Technical explanation of why this is happening]

## Proposed Solution

### Approach
[Detailed technical solution]

### Alternatives Considered
1. [Alternative 1] - Rejected because [reason]
2. [Alternative 2] - Rejected because [reason]

### Implementation Plan
1. Step 1
2. Step 2
3. Step 3

### Testing Strategy
- [ ] Unit tests
- [ ] Integration tests
- [ ] Load tests
- [ ] Canary deployment

### Rollback Plan
[How to rollback if solution causes issues]

## Success Criteria

- [ ] Metric 1 improves from [X] to [Y]
- [ ] Incident frequency reduced by [Z]%
- [ ] No new issues introduced

## Timeline

- Investigation: [X] days
- Implementation: [Y] days
- Testing: [Z] days
- Rollout: [W] days

**Total**: [X+Y+Z+W] days

## Dependencies

- Depends on: #XXX
- Blocks: #YYY
```

### Infradev Triage Process

```markdown
# Infradev Triage Workflow

## Step 1: Initial Triage (Infrastructure Team)

**Actions**:
1. Verify issue exists
2. Assess severity and priority
3. Provide evidence (metrics, logs, incidents)
4. Propose solution (if known)
5. Tag appropriate development team
6. Label with ~infradev

## Step 2: Development Team Review

**Actions**:
1. Review issue within 24 hours
2. Validate severity/priority
3. Ask clarifying questions
4. Estimate effort
5. Assign to engineer or EM

## Step 3: Prioritization

**With Product Manager**:
- Compare with product roadmap
- Assess business impact
- Decide priority vs features
- Schedule in milestone

**Criteria**:
- Severity::1 + Priority::1 = Immediate
- Severity::1 + Priority::2 = Next sprint
- Severity::2 + Priority::1 = Next sprint
- Severity::2 + Priority::2 = Next 2 sprints
- Lower severity = Backlog prioritization

## Step 4: Implementation

**Engineer Actions**:
1. Create implementation plan
2. Get technical review
3. Implement solution
4. Test thoroughly
5. Deploy with monitoring

**Communication**:
- Update issue daily
- Notify infrastructure team of progress
- Share completion and verification

## Step 5: Verification

**Infrastructure Team**:
1. Verify metrics improved
2. Monitor for regressions
3. Close issue if resolved
4. Reopen if issues persist

**Success Criteria**:
- Metrics show improvement
- No new issues introduced
- Solution addresses root cause
```

## Quality Engineering

### Test Strategy

```markdown
# Testing Strategy

## Test Pyramid

```
        /\
       /E2E\        10% - End-to-End Tests
      /------\
     /  Inte  \     20% - Integration Tests
    /  gration \
   /------------\
  /   Unit Tests  \  70% - Unit Tests
 /------------------\
```

### Unit Tests (70%)

**Purpose**: Test individual functions/methods

**Characteristics**:
- Fast (<1ms each)
- Isolated (no dependencies)
- Deterministic (no flakiness)

**Coverage Target**: >80%

**Example**:
```javascript
describe('calculateTotal', () => {
  it('sums prices correctly', () => {
    const items = [{ price: 10 }, { price: 20 }];
    expect(calculateTotal(items)).toBe(30);
  });
  
  it('handles empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });
  
  it('applies discount', () => {
    const items = [{ price: 100 }];
    expect(calculateTotal(items, 0.1)).toBe(90);
  });
});
```

### Integration Tests (20%)

**Purpose**: Test component interactions

**Characteristics**:
- Moderate speed (100ms-1s)
- Real dependencies (DB, APIs)
- May require setup/teardown

**Coverage Target**: Critical paths

**Example**:
```javascript
describe('User API', () => {
  beforeEach(async () => {
    await db.users.clear();
  });
  
  it('creates user and returns id', async () => {
    const userData = { email: 'test@example.com', name: 'Test' };
    const response = await request(app)
      .post('/api/users')
      .send(userData);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    
    const user = await db.users.findById(response.body.id);
    expect(user.email).toBe('test@example.com');
  });
});
```

### End-to-End Tests (10%)

**Purpose**: Test complete user flows

**Characteristics**:
- Slow (seconds to minutes)
- Full system (UI, API, DB)
- May be flaky

**Coverage Target**: Critical user journeys

**Example**:
```javascript
test('user can complete checkout', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');
  
  // Add to cart
  await page.goto('/products/123');
  await page.click('button:has-text("Add to Cart")');
  
  // Checkout
  await page.goto('/cart');
  await page.click('button:has-text("Checkout")');
  await page.fill('[name=cardNumber]', '4242424242424242');
  await page.click('button:has-text("Complete Purchase")');
  
  // Verify
  await expect(page.locator('text=Order Confirmed')).toBeVisible();
});
```

## Test Quality Metrics

```markdown
# Test Quality Dashboard

## Coverage
- Line coverage: 82% (target: >80%)
- Branch coverage: 75% (target: >75%)
- Untested files: 12 (target: 0)

## Reliability
- Flaky test rate: 3% (target: <5%)
- Test pass rate: 96% (target: >95%)
- Tests quarantined: 8 (target: <10)

## Performance
- Unit test suite: 45s (target: <60s)
- Integration test suite: 5m (target: <10m)
- E2E test suite: 15m (target: <20m)

## Maintenance
- Outdated test dependencies: 3 (target: 0)
- Test code duplication: 12% (target: <10%)
- Test documentation: 85% (target: >90%)
```

This comprehensive monitoring and quality reference provides all the necessary templates and processes for maintaining high-quality, reliable engineering systems with proper observability, technical debt management, and quality assurance practices.
