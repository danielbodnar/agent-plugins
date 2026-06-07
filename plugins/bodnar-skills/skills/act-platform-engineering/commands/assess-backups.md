# Command: Assess Backups

Check WAL archiving, base backups, and recovery capability.

## Trigger

User says:
- "Check backups"
- "Are we backed up?"
- "What's our recovery situation?"
- "WAL archive status"

## Steps

1. **WAL archiving config on dbprimary (§2.1):**
   - `archive_mode = on`
   - `wal_level = replica` or `logical`
   - `archive_command` is set and sensible
   - `max_wal_senders` allows for current + planned replicas

2. **WAL archive lag (§2.2):**
   - `pg_stat_archiver` for last successful and last failed
   - Archive lag should be < a few minutes

3. **Base backup schedule (§2.3):**
   - Check crontab for `pg_basebackup`, `pgbackrest`, or `barman`
   - Check systemd timers
   - If pgBackRest is installed, run `pgbackrest info`
   - **NB: WAL shipping alone is NOT a backup strategy.** A base backup is required to apply WAL to.

4. **Backup destination health:**
   - Disk space at the backup target
   - Last successful backup timestamp
   - Backup retention vs disk capacity
   - **ACT context: backup servers have been non-functional for an extended period.** This is a known critical issue.

5. **Restore testing:**
   - When was the last restore test?
   - Do we have documentation for the restore procedure?
   - Is there a non-production environment we can restore into?

## Output Format

```
## Backup Assessment — [date]

### WAL Archiving
- archive_mode: [on/off]
- wal_level: [value]
- archive_command: [value]
- Last successful archive: [timestamp]
- Last failed archive: [timestamp or none]
- Archive lag: [duration]

### Base Backups
- Tool: [pg_basebackup/pgBackRest/Barman/none]
- Schedule: [frequency or "manual only"]
- Last backup: [timestamp or "unknown"]
- Backup destination: [path/host]
- Destination health: [status]

### Recovery Capability
- Point-in-time recovery: [possible / not possible — why]
- Restore documentation: [exists / missing]
- Last restore test: [date or "never"]

### Findings
- [Healthy]
- [Concerns]
- [Issues]
```

## Critical Things to Look For

- **`archive_mode = off`** means no PITR. Critical issue.
- **`last_failed_wal` populated** means archive is broken. Investigate immediately.
- **No base backup schedule** means WAL chain is unusable. Critical issue.
- **Backup destination disk full or unreachable** means new backups won't land.
- **No restore test** means we don't know if backups actually work. Schedule one.

## Follow-Up Actions

- If backup servers are non-functional (known issue), this is the Dead Backup Servers Zoho issue. Update with current state.
- If no PITR or no base backup schedule, draft new Zoho issues with the specific gaps.
- If restore has never been tested, propose scheduling a test against a non-production target.

## Related Resources

- `references/cheatsheet.md` §2
- `agents/dba.md`
- `agents/sysadmin.md` (for backup destination hardware)
- `agents/sre.md` (for recovery time objectives)
