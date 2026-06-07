# Command: Triage dbprimary

The fastest read on the state of `vsurv_production` on `172.28.2.1`. Run this first when you sit down to investigate anything, or as a daily morning check during the assessment phase.

## Trigger

User says:
- "Quick triage on dbprimary"
- "Run the morning check"
- "10-command check"
- "Just give me the fast read"

## What This Does

Executes the 10-command sequence from `references/cheatsheet.md` §9 in order, captures output, and summarizes.

## The 10 Commands

1. System identity: `hostname; cat /etc/os-release | head -3; uname -r; uptime`
2. Memory + CPU: `free -h; lscpu | grep -E 'Model name|Socket|Core|Thread'`
3. ZFS pool status: `zpool status -v; zpool list`
4. Disk health: `nvme list; nvme smart-log /dev/nvme0`
5. PostgreSQL version + database size:
   ```sql
   SELECT version();
   SELECT pg_size_pretty(pg_database_size('vsurv_production'));
   ```
6. Active connections:
   ```sql
   SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
   ```
7. Replication status:
   ```sql
   SELECT client_addr, state, replay_lag FROM pg_stat_replication;
   ```
8. WAL archiving:
   ```sql
   SELECT * FROM pg_stat_archiver;
   ```
9. ZFS dataset properties for PG data:
   ```bash
   zfs get recordsize,compression,atime,logbias $(zfs list -o name,mountpoint | grep -i postgres | awk '{print $1}')
   ```
10. Key sysctls and THP:
    ```bash
    sysctl vm.swappiness vm.dirty_ratio vm.dirty_background_ratio vm.overcommit_memory
    cat /sys/kernel/mm/transparent_hugepage/enabled
    ```

## Output Format

```
## dbprimary Triage — [date HH:MM]

### System
- Hostname, OS, kernel, uptime: [one line]
- CPU: [model, cores]
- RAM: [total, free, used]

### Storage
- Pool: [status, capacity]
- Disks: [NVMe model, % used, available spare]

### PostgreSQL
- Version: [version]
- Database size: [size]
- Connections: [state breakdown]
- Replication: [replica count, max lag]
- WAL archive: [last successful, last failed, archive_lag]

### Tuning Snapshot
- ZFS: recordsize=[value], compression=[value], atime=[value], logbias=[value]
- sysctl: swappiness=[N], dirty_ratio=[N], dirty_bg=[N], overcommit=[N]
- THP: [always/madvise/never]

### Anomalies
- [Anything that looks off]

### Next Action
- [If everything is green, "no action needed"]
- [If something is off, the suggested next investigation]
```

## When to Escalate

Each of these can trigger a deeper investigation:

| Anomaly | Hand off to |
|---------|-------------|
| Pool DEGRADED or errors | `commands/assess-disks.md` + `commands/assess-zfs.md` |
| `idle in transaction` > 5 | `commands/assess-postgres.md` |
| Replication state != streaming | `commands/assess-replication.md` |
| `last_failed_wal` populated | `commands/assess-backups.md` |
| recordsize = 128K | Filesystem Tuning issue (already tracked) |
| THP not "never" | `commands/assess-kernel.md` |

## Related Resources

- `scripts/triage-dbprimary.sh` (executable version)
- `references/cheatsheet.md` §9
- `agents/dba.md`
- `agents/sre.md`
