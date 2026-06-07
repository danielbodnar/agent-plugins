# Command: Assess Replication

Check streaming replication health from dbprimary to db2, dbhotswap, and pg3.

## Trigger

User says:
- "Check replication"
- "Is dbhotswap caught up?"
- "Are the replicas streaming?"
- "Replication lag check"

## Steps

1. **On dbprimary (`172.28.2.1`):**
   - Run `pg_stat_replication` query from §3.1
   - Check that all expected replicas (db2, dbhotswap, pg3) appear
   - Check `state = streaming` for each
   - Check `replay_lag` in time and bytes
   - Check `sync_state` (sync vs async)

2. **On each replica (db2, dbhotswap, pg3):**
   - Run `pg_stat_wal_receiver` query from §3.2
   - Confirm `status = streaming`
   - Confirm recent `latest_end_time`

3. **Check recovery config on each replica (§3.3):**
   - Confirm `standby.signal` exists (PG12+)
   - Check `primary_conninfo`
   - Confirm `pg_is_in_recovery()` returns true

4. **Check failover readiness (§3.4):**
   - Is Patroni or repmgr installed?
   - If not, document manual failover procedure

5. **Check WAL archive status on dbprimary (§2.2):**
   - `pg_stat_archiver` for `last_failed_wal` and `archive_lag`

6. **Check replication slots on dbprimary (§2.4):**
   - Are all slots active?
   - Are any retaining large amounts of WAL (>1 GB)?

## Output Format

```
## Replication Assessment — [date]

### Primary (dbprimary 172.28.2.1)
- Replicas connected: [list]
- WAL archive lag: [duration]
- Replication slots: [active/inactive count, retained WAL]

### Replicas

#### db2 ([IP if known])
- State: [streaming/disconnected/lagging]
- Replay lag: [time and bytes]
- Last WAL received: [timestamp]

#### dbhotswap ([IP if known])
- [same fields]

#### pg3 ([IP if known])
- [same fields]

### Failover
- Automated tool: [Patroni/repmgr/none]
- Manual procedure documented: [yes/no]
- Last failover test: [date or "never"]

### Findings
- [Healthy areas]
- [Concerns]
- [Issues]
```

## Critical Things to Look For

- **Any replica not in `state = streaming`** is an immediate issue
- **Replay lag > 30 seconds** suggests overload on replica or WAL bottleneck on primary
- **Inactive replication slots** retain WAL and can fill disk on dbprimary
- **`last_failed_wal` populated** means WAL archiving is broken
- **No automated failover tool** means a real outage will require manual intervention; document the exact steps needed

## Follow-Up Actions

- If a replica is disconnected, investigate networking and PostgreSQL logs on both ends.
- If WAL archive is failing, check the archive destination (disk space, network, permissions).
- If failover is fully manual, this maps to the existing Automatic Database Failover Zoho issue.
- If replication slots are inactive and retaining WAL, this is a disk-fill risk; investigate why the slot is inactive.

## Related Resources

- `references/cheatsheet.md` §§2-3
- `agents/dba.md`
- `agents/incident-responder.md` (if replication is down right now)
