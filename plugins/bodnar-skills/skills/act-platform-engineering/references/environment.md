# ACT Environment Reference

## Database Servers (PostgreSQL)

**Primary assessment target:** `vsurv_production` on `172.28.2.1` (dbprimary)

| Host | IP | Role | Notes |
|------|-----|------|-------|
| dbprimary | 172.28.2.1 | Primary / writer | `vsurv_production`, WAL shipping source |
| db2 | TBD | Replica | WAL shipping target |
| dbhotswap | TBD | Hot standby | Failover candidate |
| pg3 | TBD | Replica | Role TBD |
| appserver | TBD | Dev PG instances | Reports run from here |

## Proxmox VE Hosts (Pims Garden)

| Host | IP | Notes |
|------|-----|-------|
| PVE node 1 | 10.0.50.1 | ZFS-backed |
| PVE node 2 | 10.0.50.2 | ZFS-backed |
| PVE node 3 | 10.0.50.3 | ZFS-backed, failing drives |
| PVE node 4 | TBD | New Dell PowerEdge 730, being provisioned |

## Observability & Infrastructure Services

| Service | Host | Status |
|---------|------|--------|
| Zabbix | TBD | Installed, config TBD |
| Grafana | TBD | New instance being configured by Daniel |
| Netdata | All servers | Being deployed across fleet |
| WireGuard | All servers | VPN access for sysadmins |
| GitLab | gitlab.4act.com | CI/CD, source control, WireGuard-accessible |

## Known State and Active Concerns

- WAL shipping and streaming replication are in place
- ZFS on dbprimary with tuning gaps from a recent storage upgrade
- Failover automation status: undefined or manual
- Payment gateway and pimsserver stability concerns
- Non-functional backup infrastructure
- Failing drives in PVE3
- New Dell PowerEdge 730 to provision
- pimsserver split between master and betabeta images (long-standing divergence)
- VSmartClient build has Windows GitLab runner dependency requiring manual steps

## Key People

| Name | Role | Context |
|------|------|---------|
| Zach | Daniel's direct manager | Authored the "Bodnar Tasks" priority framework |
| Clint | Manager | |
| Miller | Collaborating engineer | Hardware, hypervisor, report scripts |
| Ben Jumper | Owner of Sysadmin/IAC (EC-120) and Internal Needs (EC-142) projects | |

## Zoho Projects

| ID | Field | Value |
|----|-------|-------|
| Portal ID | `710279869` |
| Internal Needs (EC-142) | `1572268000010985429` (prefix INT) |
| Sysadmin/IAC (EC-120) | `1572268000006485005` (prefix SY1) |
| Daniel's zpuid | `1572268000000859032` |

## Daniel's Acting Role

Acting as an employee of Patterson Companies (`daniel.bodnar@pattersonvet.com`) embedded at ACT. The BitBuilder Cloud name should not appear in ACT-facing deliverables.
