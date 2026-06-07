# Command: Check Grafana and Netdata Status

Check observability stack deployment status across the fleet.

## Trigger

User says:
- "Where are we on the observability rollout?"
- "Is Netdata up on all servers?"
- "Check Grafana"
- "Observability status"

## Steps

1. **Grafana instance:**
   - Is it reachable?
   - What datasources are configured?
   - How many dashboards exist?
   - Are there any provisioning errors in `journalctl -u grafana-server`?

2. **Netdata deployment status per host:**

For each host in the fleet (dbprimary, db2, dbhotswap, pg3, appserver, PVE 10.0.50.1-3, plus PowerEdge 730 when added):

```bash
systemctl is-active netdata
systemctl status netdata --no-pager | head -10
curl -s http://localhost:19999/api/v1/info | jq '.version, .uptime'
```

3. **Netdata plugins per host:**
   - PostgreSQL plugin (on DB hosts)
   - ZFS plugin (on all)
   - System plugins (always)

4. **Netdata streaming (if configured):**
   - Child → parent setup
   - All children reporting to parent?

5. **Log aggregation (if any):**
   - Centralized log target configured?
   - On which hosts is it pointed?

## Output Format

```
## Observability Stack Status — [date]

### Grafana
- Host: [hostname]
- Version: [version]
- Reachable: [yes/no]
- Datasources: [list with status]
- Dashboards: [count, list key ones]

### Netdata Deployment
| Host | IP | Status | Version | PG Plugin | ZFS Plugin |
|------|-----|--------|---------|-----------|------------|
| dbprimary | 172.28.2.1 | [running/stopped/missing] | [ver] | [yes/no] | [yes/no] |
| db2 | TBD | [...] | [...] | [...] | [...] |
| dbhotswap | TBD | [...] | [...] | [...] | [...] |
| pg3 | TBD | [...] | [...] | [...] | [...] |
| appserver | TBD | [...] | [...] | [...] | [...] |
| pve1 | 10.0.50.1 | [...] | [...] | N/A | [yes/no] |
| pve2 | 10.0.50.2 | [...] | [...] | N/A | [yes/no] |
| pve3 | 10.0.50.3 | [...] | [...] | N/A | [yes/no] |

### Streaming
- Parent: [host or N/A]
- Children reporting: [N of total]

### Centralized Logs
- Aggregator: [tool or "not deployed"]
- Hosts forwarding: [count]

### Status Summary
- Coverage: [N of total hosts have Netdata]
- Plugin completeness: [PG-relevant hosts have PG plugin?]
- Dashboards built: [list]
- Dashboards needed: [list]

### Next Steps
- [Specific hosts still needing Netdata]
- [Specific dashboards still to build]
- [Log aggregation decision needed]
```

## Critical Things to Look For

- **Hosts where Netdata is not running.** Each one is a blind spot.
- **DB hosts missing the PostgreSQL plugin.** Limits dashboard usefulness.
- **No streaming or centralized parent.** Means you have to check each host individually.
- **No centralized log aggregation.** Means troubleshooting is SSH + grep.

## Follow-Up Actions

- For each missing Netdata installation, this is part of the Deploy Observability Stack Zoho issue. Update progress.
- For each missing PostgreSQL or ZFS plugin, add specific config step to the rollout plan.
- If centralized logs aren't deployed, this is the Centralized Log Management Zoho issue.
- Dashboards that should be built but aren't: list them as concrete next-week items.

## Related Resources

- `agents/observability-engineer.md`
- `agents/sre.md`
- `references/bodnar-tasks.md` (Deploy Observability Stack and Centralized Log Management entries)
