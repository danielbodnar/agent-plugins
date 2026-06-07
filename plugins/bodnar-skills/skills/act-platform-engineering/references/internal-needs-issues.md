# Internal Needs Issues Quick Reference

The current state of the Internal Needs queue. Use this as a lookup when drafting new items (to avoid duplication) or when referencing existing work.

## Active Tasks (Categories)

| Title | Priority |
|-------|----------|
| Platform Engineering & Automation | High |
| Reliability & Failover | High |
| Database Performance & Scaling | Medium |
| Observability & Monitoring | High |
| Infrastructure & Hardware | High |
| CI/CD & Deployment | Low |
| Documentation | Medium |
| Security | Medium |

## Active Issues

### Platform Engineering & Automation
- Platform Engineering Repository
- General Cleanup and Consolidation
- Automate User Provisioning and VPN Setup

### Reliability & Failover
- Failover and Reliability
- Automatic Database Failover
- Dead Backup Servers
- Horizontal Scaling Plan

### Database Performance & Scaling
- Reporting Performance
- Filesystem Tuning on DB Primary
- Database Sharding and Scaling Strategy

### Observability & Monitoring
- Deploy Observability Stack
- Centralized Log Management

### Infrastructure & Hardware
- Failing Hard Drives in PVE3
- Provision and Install New Dell PowerEdge 730
- Virtual Environment (Pims Garden)

### CI/CD & Deployment
- Pipeline and Deployment Improvement
- Pimsserver Branch Consolidation

### Documentation
- Internal Documentation Platform

### Security
- Secrets Management

## Full Text

For full descriptions of each issue, see `references/bodnar-tasks.md`.

For the JSON-formatted version ready to feed into `scripts/zoho-create.sh`, see `references/internal-needs-issues.json`.

## Maintenance

When adding a new issue:
1. Add to `references/bodnar-tasks.md` (markdown form)
2. Add to `references/internal-needs-issues.json` (script-consumable form)
3. Update this quick-reference list
4. Run `scripts/zoho-create.sh` or use the Zoho UI/MCP to create it

When closing an issue:
1. Mark closed in this list (move to a "Closed" section, or delete)
2. Update bodnar-tasks.md and JSON accordingly
