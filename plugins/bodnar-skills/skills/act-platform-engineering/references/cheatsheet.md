# ACT Infrastructure Assessment — Cheatsheet & Runbook

> Detailed commands, expected outputs, and diagnostic criteria for assessing ACT infrastructure.
>
> **Primary target:** `vsurv_production` on `172.28.2.1` (dbprimary)
>
> Expand to other hosts as needed. Commands assume Debian/Ubuntu with PostgreSQL and ZFS on Linux.

---

## 1. PostgreSQL Performance

### 1.1 Confirm Version and Connection

```bash
# Version
psql -U postgres -c "SELECT version();"

# Current database
psql -U postgres -d vsurv_production -c "SELECT current_database(), pg_size_pretty(pg_database_size(current_database())) AS db_size;"
```

### 1.2 Active Connections and State

```bash
psql -U postgres -d vsurv_production -c "
SELECT
  state,
  count(*) AS count,
  max(now() - state_change) AS longest
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
GROUP BY state
ORDER BY count DESC;
"
```

**Green:** Mostly `idle`, a few `active`. No `idle in transaction` older than a few seconds.
**Red:** Many `idle in transaction`, or `active` queries running for minutes/hours. Indicates connection leaks or long-running queries blocking vacuums and causing bloat.

### 1.3 Connection Utilization

```bash
psql -U postgres -c "
SELECT
  setting AS max_connections
FROM pg_settings
WHERE name = 'max_connections';
"

psql -U postgres -c "
SELECT count(*) AS current_connections FROM pg_stat_activity;
"
```

**Green:** Current connections well below max (< 70%).
**Red:** Near or at max_connections. Consider connection pooling (PgBouncer).

### 1.4 pg_stat_statements — Top Queries

```bash
# Check if extension is installed
psql -U postgres -d vsurv_production -c "SELECT * FROM pg_available_extensions WHERE name = 'pg_stat_statements';"

# If not installed:
# psql -U postgres -d vsurv_production -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# Top 20 by total execution time
psql -U postgres -d vsurv_production -c "
SELECT
  queryid,
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round(max_exec_time::numeric, 2) AS max_ms,
  rows,
  left(query, 80) AS query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
"

# Top 20 by mean execution time (slow individual queries)
psql -U postgres -d vsurv_production -c "
SELECT
  queryid,
  calls,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round(max_exec_time::numeric, 2) AS max_ms,
  rows,
  left(query, 80) AS query_preview
FROM pg_stat_statements
WHERE calls > 10
ORDER BY mean_exec_time DESC
LIMIT 20;
"
```

**Action:** Any query with `mean_ms` > 1000 or `total_ms` dominating the list is a candidate for `EXPLAIN ANALYZE`.

### 1.5 EXPLAIN ANALYZE a Slow Query

```bash
# Replace <query> with an actual slow query from pg_stat_statements
psql -U postgres -d vsurv_production -c "
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
<query>;
"
```

**What to look for:**
- `Seq Scan` on large tables (missing index?)
- `Sort` with `Sort Method: external merge Disk` (work_mem too low)
- `Nested Loop` with high row estimates vs actuals (stale statistics, run ANALYZE)
- `Buffers: shared read` much higher than `shared hit` (data not in cache)

### 1.6 Sequential Scans vs Index Scans

```bash
psql -U postgres -d vsurv_production -c "
SELECT
  schemaname,
  relname AS table_name,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_live_tup AS row_estimate,
  CASE WHEN (seq_scan + idx_scan) > 0
    THEN round(100.0 * idx_scan / (seq_scan + idx_scan), 1)
    ELSE 0
  END AS idx_scan_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 10000
ORDER BY seq_scan DESC
LIMIT 20;
"
```

**Green:** `idx_scan_pct` > 90% on large tables.
**Red:** Large tables with high `seq_scan` and low `idx_scan_pct`. Likely missing indexes.

### 1.7 Table Bloat

```bash
psql -U postgres -d vsurv_production -c "
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup,
  n_dead_tup,
  CASE WHEN n_live_tup > 0
    THEN round(100.0 * n_dead_tup / n_live_tup, 1)
    ELSE 0
  END AS dead_pct,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 20;
"
```

**Green:** `dead_pct` < 10%, recent autovacuum timestamps.
**Red:** `dead_pct` > 20%, or `last_autovacuum` is NULL / very old. Autovacuum may be misconfigured or overwhelmed.

### 1.8 Index Bloat and Unused Indexes

```bash
# Unused indexes (candidates for removal)
psql -U postgres -d vsurv_production -c "
SELECT
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%pkey%'
  AND indexrelname NOT LIKE '%unique%'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
"
```

**Action:** Indexes with 0 scans are dead weight. They slow writes and waste space. Verify they aren't used by replicas before dropping.

### 1.9 Key Configuration Parameters

```bash
psql -U postgres -c "
SELECT name, setting, unit, source, context
FROM pg_settings
WHERE name IN (
  'shared_buffers',
  'effective_cache_size',
  'work_mem',
  'maintenance_work_mem',
  'max_connections',
  'checkpoint_completion_target',
  'wal_buffers',
  'max_wal_size',
  'min_wal_size',
  'random_page_cost',
  'effective_io_concurrency',
  'huge_pages',
  'max_worker_processes',
  'max_parallel_workers_per_gather',
  'max_parallel_workers',
  'max_parallel_maintenance_workers',
  'autovacuum_max_workers',
  'autovacuum_naptime',
  'autovacuum_vacuum_cost_delay',
  'autovacuum_vacuum_cost_limit',
  'log_min_duration_statement',
  'log_checkpoints',
  'log_lock_waits',
  'track_io_timing'
)
ORDER BY name;
"
```

**Rules of thumb (adjust for actual RAM):**
- `shared_buffers`: ~25% of total RAM
- `effective_cache_size`: ~75% of total RAM
- `work_mem`: 32MB-256MB depending on workload (careful: multiplied by sort operations * connections)
- `maintenance_work_mem`: 512MB-2GB
- `checkpoint_completion_target`: 0.9
- `random_page_cost`: 1.1 for SSD/NVMe (default 4.0 is for spinning disks)
- `effective_io_concurrency`: 200 for NVMe
- `log_min_duration_statement`: 1000 (log queries > 1s) or lower for investigation
- `track_io_timing`: on (required for meaningful EXPLAIN BUFFERS)

### 1.10 Lock Contention

```bash
psql -U postgres -d vsurv_production -c "
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_query,
  blocking_activity.query AS blocking_query,
  now() - blocked_activity.query_start AS blocked_duration
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
"
```

**Green:** Empty result set.
**Red:** Any rows here mean active lock contention. Long `blocked_duration` is a problem.

---

## 2. PostgreSQL Backups & Recovery

### 2.1 WAL Archiving Status

```bash
psql -U postgres -c "
SELECT
  name, setting
FROM pg_settings
WHERE name IN (
  'archive_mode',
  'archive_command',
  'archive_timeout',
  'wal_level',
  'max_wal_senders',
  'max_replication_slots'
)
ORDER BY name;
"
```

**Green:** `archive_mode = on`, `wal_level = replica` (or `logical`), sensible `archive_command`.
**Red:** `archive_mode = off` means no PITR capability. `wal_level = minimal` means replication is impossible.

### 2.2 WAL Archive Lag

```bash
psql -U postgres -c "
SELECT
  last_archived_wal,
  last_archived_time,
  last_failed_wal,
  last_failed_time,
  now() - last_archived_time AS archive_lag
FROM pg_stat_archiver;
"
```

**Green:** `last_failed_wal` is empty, `archive_lag` < a few minutes.
**Red:** `last_failed_wal` is populated (archive failures), or `archive_lag` is large.

### 2.3 Check for Base Backup Schedule

```bash
# Check crontab for pg_basebackup or pgBackRest
crontab -l 2>/dev/null | grep -i 'pg_basebackup\|pgbackrest\|barman'
sudo crontab -l 2>/dev/null | grep -i 'pg_basebackup\|pgbackrest\|barman'

# Check systemd timers
systemctl list-timers --all 2>/dev/null | grep -i 'backup\|pgbackrest\|barman'

# Check for pgBackRest
which pgbackrest 2>/dev/null && pgbackrest info
```

**Green:** Scheduled base backups with a tested restore process.
**Red:** No base backup schedule. WAL shipping alone is not a backup strategy (WAL chain can break).

### 2.4 Replication Slots

```bash
psql -U postgres -c "
SELECT
  slot_name,
  slot_type,
  active,
  restart_lsn,
  confirmed_flush_lsn,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;
"
```

**Green:** All slots `active = true`, `retained_wal` is small (< 1GB).
**Red:** Inactive slots retaining large amounts of WAL. Inactive slots prevent WAL cleanup and can fill disk.

---

## 3. PostgreSQL Replication & HA

### 3.1 Replication Status (run on dbprimary)

```bash
psql -U postgres -c "
SELECT
  client_addr,
  usename,
  application_name,
  state,
  sync_state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) AS replay_lag_bytes,
  write_lag,
  flush_lag,
  replay_lag
FROM pg_stat_replication
ORDER BY client_addr;
"
```

**Green:** All replicas showing `state = streaming`, `replay_lag` < 1s, `replay_lag_bytes` small.
**Red:** Missing replicas, `state != streaming`, large `replay_lag`, or replicas stuck at a specific LSN.

### 3.2 Replica Status (run on each replica)

```bash
psql -U postgres -c "
SELECT
  status,
  received_lsn,
  latest_end_lsn,
  latest_end_time,
  conninfo,
  now() - latest_end_time AS time_since_last_wal
FROM pg_stat_wal_receiver;
"
```

**Green:** `status = streaming`, `time_since_last_wal` < a few seconds.
**Red:** Status not streaming, or large gap since last WAL received.

### 3.3 Check Recovery Configuration (on replicas)

```bash
# PostgreSQL 12+: standby.signal file
ls -la $PGDATA/standby.signal 2>/dev/null

# Check primary_conninfo
psql -U postgres -c "
SELECT name, setting
FROM pg_settings
WHERE name IN ('primary_conninfo', 'primary_slot_name', 'hot_standby', 'restore_command')
ORDER BY name;
"

# Confirm in recovery
psql -U postgres -c "SELECT pg_is_in_recovery();"
```

### 3.4 Failover Readiness

```bash
# Is there an automated failover tool?
which patronictl 2>/dev/null && patronictl list
which repmgr 2>/dev/null && repmgr cluster show
dpkg -l | grep -i 'patroni\|repmgr' 2>/dev/null

# If none found, failover is manual:
# On the replica: SELECT pg_promote();
# Then update DNS / connection strings / application configs
```

**Green:** Patroni, repmgr, or similar with tested automatic failover.
**Red:** No failover automation means manual intervention during an outage. Document the exact steps needed.

---

## 4. ZFS Pool Health

### 4.1 Pool Status

```bash
zpool status -v
```

**Green:** `state: ONLINE`, all devices `ONLINE`, `errors: No known data errors`, recent scrub with 0 errors.
**Red:**
- `state: DEGRADED` — a drive has failed or been removed
- `CKSUM` errors — silent data corruption, ZFS caught it but the drive is failing
- `READ`/`WRITE` errors — I/O failures
- No scrub history or scrub older than 30 days

### 4.2 Pool Capacity

```bash
zpool list -o name,size,alloc,free,cap,frag,health
```

**Green:** `CAP` < 75%, `FRAG` < 50%.
**Red:** `CAP` > 80% degrades ZFS performance significantly (copy-on-write needs free space). > 90% is an emergency. `FRAG` > 60% on non-SSD pools is a concern.

### 4.3 Dataset Space Consumption

```bash
zfs list -o name,used,avail,refer,mountpoint,compressratio -r -t filesystem
```

### 4.4 Pool Topology (VDEV Layout)

```bash
zpool status | head -30
```

**What to look for:**
- `mirror` — good, single-drive failure tolerance
- `raidz1` — good for 3+ drives, tolerates 1 failure
- `raidz2` — better, tolerates 2 failures
- `stripe` (no redundancy label) — **critical risk**, any drive failure = total pool loss
- Mixed VDEV sizes — leads to unbalanced I/O

### 4.5 Scrub Schedule

```bash
# Check for cron/timer-based scrub
crontab -l 2>/dev/null | grep -i scrub
sudo crontab -l 2>/dev/null | grep -i scrub
systemctl list-timers --all 2>/dev/null | grep -i scrub

# Last scrub info
zpool status | grep -A3 'scan:'
```

**Green:** Monthly scrub schedule, last scrub completed with 0 errors.
**Red:** No scrub schedule or scrub has never run. Scrubs detect silent corruption before it's too late.

---

## 5. ZFS Tuning for PostgreSQL

### 5.1 Dataset Properties

```bash
# Find the PostgreSQL data dataset
zfs list -o name,mountpoint | grep -i 'postgres\|pgdata\|pgsql'

# Then check all relevant properties (replace DATASET with actual name)
DATASET="<pool/dataset>"
zfs get recordsize,compression,atime,logbias,primarycache,secondarycache,sync,checksum,xattr,acltype "$DATASET"
```

**Optimal for PostgreSQL:**

| Property | Recommended | Why |
|----------|-------------|-----|
| `recordsize` | `8K` or `16K` | Matches PostgreSQL's 8KB page size. Default 128K causes massive write amplification. |
| `compression` | `lz4` or `zstd` | Free performance gain. lz4 for lowest CPU, zstd for better ratio. |
| `atime` | `off` | Eliminates unnecessary metadata writes on every read. |
| `logbias` | `latency` | Optimizes for low-latency writes (default). |
| `primarycache` | `all` | Default is fine. |
| `secondarycache` | `all` | Default is fine unless L2ARC is absent. |
| `sync` | `standard` | **Never** set to `disabled` on a database. |
| `checksum` | `on` (sha256 or fletcher4) | Data integrity verification. Never disable. |

**Critical:** If `recordsize` is `128K` (the default), this is the single highest-impact tuning change. On an existing dataset, changing recordsize only affects new writes. For full benefit, the dataset would need to be recreated and data reloaded.

### 5.2 ARC (Adaptive Replacement Cache) Statistics

```bash
# ARC summary
arc_summary 2>/dev/null || cat /proc/spl/kstat/zfs/arcstats

# Quick hit ratio
awk '/^hits/ {hits=$3} /^misses/ {misses=$3} END {printf "ARC Hit Ratio: %.1f%%\n", 100*hits/(hits+misses)}' /proc/spl/kstat/zfs/arcstats

# ARC size
awk '/^size/ {printf "ARC Size: %.1f GB\n", $3/1073741824; exit}' /proc/spl/kstat/zfs/arcstats
```

**Green:** Hit ratio > 90%, ARC size is utilizing available RAM.
**Red:** Hit ratio < 80% (working set doesn't fit in ARC), or ARC size is artificially limited.

### 5.3 ARC Size Limits

```bash
# Current limits
cat /sys/module/zfs/parameters/zfs_arc_max
cat /sys/module/zfs/parameters/zfs_arc_min

# Compare to total RAM
free -h | head -2
```

**Note:** On a PostgreSQL server, ARC and `shared_buffers` compete for RAM. Typical split: `shared_buffers` = 25% RAM, ARC gets up to 50% RAM, leave 25% for OS/connections. If ARC is unlimited (0 = auto), ZFS will take what it can, potentially starving PostgreSQL.

### 5.4 ZFS ARC + PostgreSQL shared_buffers Sizing

```bash
# Get both values to compare against total RAM
TOTAL_RAM_GB=$(awk '/MemTotal/ {printf "%.1f", $2/1048576}' /proc/meminfo)
ARC_MAX_GB=$(awk '{printf "%.1f", $1/1073741824}' /sys/module/zfs/parameters/zfs_arc_max)
SHARED_BUFFERS=$(psql -U postgres -t -c "SHOW shared_buffers;" 2>/dev/null | xargs)

echo "Total RAM: ${TOTAL_RAM_GB} GB"
echo "ZFS ARC Max: ${ARC_MAX_GB} GB (0 = auto/unlimited)"
echo "PG shared_buffers: ${SHARED_BUFFERS}"
```

---

## 6. ZFS Auto Snapshots

### 6.1 Check Current Snapshot State

```bash
# List all snapshots with creation time and space used
zfs list -t snapshot -o name,creation,used,refer -s creation

# Count snapshots per dataset
zfs list -t snapshot -o name | awk -F@ '{print $1}' | sort | uniq -c | sort -rn
```

### 6.2 Check for Snapshot Tooling

```bash
# zfs-auto-snapshot
dpkg -l | grep zfs-auto-snapshot 2>/dev/null
which zfs-auto-snapshot 2>/dev/null

# sanoid (preferred for production)
dpkg -l | grep sanoid 2>/dev/null
which sanoid 2>/dev/null
cat /etc/sanoid/sanoid.conf 2>/dev/null

# Check cron/timers for snapshot jobs
crontab -l 2>/dev/null | grep -i 'snap\|sanoid\|syncoid'
sudo crontab -l 2>/dev/null | grep -i 'snap\|sanoid\|syncoid'
systemctl list-timers --all 2>/dev/null | grep -i 'snap\|sanoid\|syncoid'
```

**Green:** Sanoid or zfs-auto-snapshot with a defined retention policy, snapshots being created regularly.
**Red:** No snapshot tooling. Manual snapshots only, or no snapshots at all. This means zero rollback capability.

### 6.3 Snapshot Space Consumption

```bash
# Total space used by snapshots
zfs list -t snapshot -o used -p | awk 'NR>1 {sum+=$1} END {printf "Total snapshot space: %.1f GB\n", sum/1073741824}'

# Datasets consuming the most snapshot space
zfs list -o name,usedbysnapshots -r | sort -k2 -h | tail -10
```

**Green:** Snapshot space is a small fraction of total pool (< 20%).
**Red:** Snapshots consuming huge amounts of space — stale snapshots need pruning, or data churn is very high.

---

## 7. Disk Health

### 7.1 NVMe Health (nvme-cli)

```bash
# Install if needed: apt install nvme-cli

# List NVMe devices
nvme list

# Detailed SMART health for each device
for dev in /dev/nvme?; do
  echo "=== $dev ==="
  nvme smart-log "$dev"
  echo
done
```

**Key fields:**
- `percentage_used`: drive wear. **> 80% is concerning, > 95% is urgent.**
- `available_spare` / `available_spare_threshold`: when spare drops below threshold, drive is end-of-life.
- `critical_warning`: any non-zero value is an alert.
- `temperature`: sustained > 70C is concerning.
- `media_errors` / `num_err_log_entries`: should be 0.

### 7.2 SMART via smartctl

```bash
# Install if needed: apt install smartmontools

# For NVMe drives
for dev in /dev/nvme?n1; do
  echo "=== $dev ==="
  smartctl -a "$dev"
  echo
done

# For SATA drives (if any)
for dev in /dev/sd?; do
  echo "=== $dev ==="
  smartctl -a "$dev"
  echo
done
```

**Key fields for NVMe:**
- `Percentage Used`: same as above
- `Power Loss Protection` or `PLP`: **Consumer NVMe drives typically lack PLP.** This means an unexpected power loss can corrupt in-flight writes. On ZFS this is partially mitigated by checksums and ZIL, but it's still a data integrity risk for databases.

### 7.3 Drive Model Identification

```bash
# Quick identification of all drives
lsblk -d -o NAME,MODEL,SIZE,ROTA,TRAN,REV
```

**Action:** Google the model numbers. Look for:
- Consumer vs enterprise (e.g., Samsung 970 EVO = consumer, Samsung PM9A3 = enterprise)
- Power Loss Protection (PLP) support
- TBW (Total Bytes Written) rating vs current usage
- Known firmware issues

---

## 8. Kernel & sysctl Tuning

### 8.1 Current sysctl Values (DB-relevant)

```bash
cat <<'EOF' | while read param; do
  val=$(sysctl -n "$param" 2>/dev/null)
  printf "%-45s %s\n" "$param" "${val:-NOT SET}"
done
vm.swappiness
vm.dirty_ratio
vm.dirty_background_ratio
vm.dirty_expire_centisecs
vm.dirty_writeback_centisecs
vm.overcommit_memory
vm.overcommit_ratio
vm.min_free_kbytes
vm.zone_reclaim_mode
vm.nr_hugepages
kernel.sched_migration_cost_ns
kernel.sched_autogroup_enabled
net.core.somaxconn
net.ipv4.tcp_max_syn_backlog
net.ipv4.tcp_tw_reuse
net.ipv4.tcp_fin_timeout
fs.file-max
EOF
```

**Recommended values for PostgreSQL + ZFS on NVMe:**

| Parameter | Recommended | Default | Why |
|-----------|-------------|---------|-----|
| `vm.swappiness` | `1` | `60` | Avoid swapping database pages. Don't set to 0 (OOM killer becomes aggressive). |
| `vm.dirty_ratio` | `10` | `20` | Limit dirty page accumulation to prevent I/O stalls. |
| `vm.dirty_background_ratio` | `3` | `10` | Start flushing earlier in background. |
| `vm.overcommit_memory` | `2` | `0` | Prevent OOM killer from targeting PostgreSQL. |
| `vm.overcommit_ratio` | `80-90` | `50` | With overcommit_memory=2, allow up to this % of RAM. |
| `vm.min_free_kbytes` | `65536`+ | varies | Keep some free memory for kernel operations. |
| `vm.zone_reclaim_mode` | `0` | `0` | Prevent NUMA zone reclaim stalls. |
| `kernel.sched_migration_cost_ns` | `5000000` | `500000` | Reduce unnecessary CPU migration for DB processes. |
| `kernel.sched_autogroup_enabled` | `0` | `1` | Disable autogroup for server workloads. |
| `net.core.somaxconn` | `4096` | `4096` | Socket backlog for connection-heavy workloads. |
| `fs.file-max` | `2097152`+ | varies | Ensure enough file descriptors for connections + WAL + files. |

### 8.2 Transparent Huge Pages

```bash
cat /sys/kernel/mm/transparent_hugepage/enabled
cat /sys/kernel/mm/transparent_hugepage/defrag
```

**Green:** `[never]` for both. THP causes latency spikes for database workloads.
**Red:** `[always]` or `[madvise]`. Disable with:

```bash
# Temporary (until reboot)
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

# Permanent: add to /etc/default/grub or create a systemd unit
```

### 8.3 I/O Scheduler

```bash
# Check scheduler for each block device
for dev in /sys/block/nvme* /sys/block/sd*; do
  [ -f "$dev/queue/scheduler" ] && echo "$(basename $dev): $(cat $dev/queue/scheduler)"
done
```

**Green:** `[none]` or `[mq-deadline]` for NVMe. NVMe has its own internal scheduling; the kernel scheduler adds overhead.
**Red:** `[bfq]` or `[cfq]` on NVMe devices. These are for spinning disks.

### 8.4 ulimits for PostgreSQL

```bash
# Find the postgres process
PG_PID=$(pgrep -o postgres 2>/dev/null || pgrep -o postmaster 2>/dev/null)
if [ -n "$PG_PID" ]; then
  echo "=== Limits for PostgreSQL (PID $PG_PID) ==="
  cat /proc/$PG_PID/limits
fi

# Also check the systemd unit
systemctl show postgresql* 2>/dev/null | grep -i 'limitnofile\|limitas\|limitnproc\|limitmemlock'
```

**Green:** `Max open files` >= 65536, `Max processes` >= 4096.
**Red:** Default limits (1024 open files) can cause connection failures under load.

### 8.5 NUMA Topology

```bash
# Check if NUMA is relevant
numactl --hardware 2>/dev/null || echo "numactl not installed"
lscpu | grep -i numa
```

**If multiple NUMA nodes:** PostgreSQL should ideally be pinned to a single NUMA node, or at minimum `vm.zone_reclaim_mode = 0` to prevent cross-node stalls.

### 8.6 System Overview

```bash
# Quick system snapshot
echo "=== OS ==="
cat /etc/os-release | head -5
uname -r

echo "=== Uptime ==="
uptime

echo "=== CPU ==="
lscpu | grep -E 'Model name|Socket|Core|Thread|NUMA'

echo "=== Memory ==="
free -h

echo "=== Disk Overview ==="
lsblk -d -o NAME,MODEL,SIZE,ROTA,TRAN

echo "=== ZFS Version ==="
zfs version 2>/dev/null || modinfo zfs 2>/dev/null | grep -i version
```

---

## 9. Quick Reference — What to Run First

A minimal triage sequence for `172.28.2.1` (dbprimary). Run these first to get a fast read on the environment:

```bash
# 1. System identity
hostname; cat /etc/os-release | head -3; uname -r; uptime

# 2. Memory + CPU
free -h; lscpu | grep -E 'Model name|Socket|Core|Thread'

# 3. ZFS pool status (health + capacity)
zpool status -v; zpool list

# 4. Disk health
nvme list 2>/dev/null; nvme smart-log /dev/nvme0 2>/dev/null

# 5. PostgreSQL version + database size
sudo -u postgres psql -c "SELECT version();"
sudo -u postgres psql -d vsurv_production -c "SELECT pg_size_pretty(pg_database_size('vsurv_production'));"

# 6. Active connections
sudo -u postgres psql -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"

# 7. Replication status
sudo -u postgres psql -c "SELECT client_addr, state, replay_lag FROM pg_stat_replication;"

# 8. WAL archiving
sudo -u postgres psql -c "SELECT * FROM pg_stat_archiver;"

# 9. ZFS dataset properties for PG data
zfs get recordsize,compression,atime,logbias $(zfs list -o name,mountpoint | grep -i postgres | awk '{print $1}')

# 10. Key sysctls
sysctl vm.swappiness vm.dirty_ratio vm.dirty_background_ratio vm.overcommit_memory
cat /sys/kernel/mm/transparent_hugepage/enabled
```
