# Command: Assess ZFS

One-shot assessment of ZFS pool health, dataset tuning, and snapshot state on any specified host.

## Trigger

User says:
- "Check ZFS on [host]"
- "Assess the pools"
- "Is the ZFS tuning right?"
- "Check snapshots"

## Steps

1. Confirm target host (default dbprimary; relevant for any PostgreSQL host or PVE node).
2. Walk through cheatsheet sections:
   - §4.1 `zpool status -v` (health, errors, scrub history)
   - §4.2 `zpool list` (capacity, fragmentation)
   - §4.3 `zfs list` (dataset sizes, compression ratios)
   - §4.4 Pool topology (mirror, raidz, stripe?)
   - §4.5 Scrub schedule
   - §5.1 Dataset properties for PostgreSQL datasets (CRITICAL: check `recordsize`)
   - §5.2 ARC hit ratio
   - §5.3 ARC size limits vs RAM
   - §5.4 ARC vs shared_buffers split
   - §6.1-6.3 Snapshot state and tooling
3. Interpret findings against green/red criteria.

## Critical Things to Look For

### On dbprimary
- **`recordsize` on the PG dataset.** If 128K (the default), this is the highest-impact tuning gap. PostgreSQL pages are 8K; 128K causes massive write amplification.
- **`atime` should be `off`** for DB datasets to avoid metadata writes on reads.
- **`compression` should be `lz4` or `zstd`** for performance and space.
- **ARC size limits** should not be unlimited if `shared_buffers` is sized aggressively (they compete for RAM).
- **`sync = standard`** (NEVER disabled on a database).
- **Snapshot tooling** (sanoid preferred) should be installed and scheduled.

### On PVE nodes (10.0.50.1-3, plus new PowerEdge 730)
- Pool capacity (>80% is bad)
- Pool topology (mirror or raidz; NEVER stripe without redundancy)
- Snapshot space consumption (stale VM snapshots are common)
- Drive health on PVE3 specifically (known failing)

## Output Format

```
## ZFS Assessment — [hostname], [date]

### Pool Health
- [State, capacity, scrub history]

### Tuning
- [recordsize, compression, atime, sync — for each relevant dataset]
- [ARC sizing]

### Snapshots
- [Tooling, schedule, space consumption]

### Findings
- Healthy: [list]
- Concerns: [list]
- Issues: [list]
```

## Follow-Up Actions

- If `recordsize` is wrong on dbprimary, this is the Filesystem Tuning on DB Primary issue (already in `references/bodnar-tasks.md`). Add findings to the assessment doc.
- If snapshots are missing or stale, this is an Auto Snapshots issue. Draft a Zoho issue.
- If PVE3 drives show errors, hand off to `commands/assess-disks.md` and link to Failing Hard Drives in PVE3 issue.

## Related Resources

- `references/cheatsheet.md` §§4-6
- `agents/sysadmin.md` (for filesystem-level reasoning)
- `agents/dba.md` (for shared_buffers vs ARC sizing decisions)
