#!/usr/bin/env bash
# =============================================================================
# triage-dbprimary.sh
#
# The 10-command fast read on vsurv_production at 172.28.2.1 (dbprimary).
# Run this when you sit down to investigate anything, or as a daily morning check.
#
# Usage:
#   ssh dbprimary "bash -s" < triage-dbprimary.sh
#   # or copy the script to dbprimary and run there
#
# Output: structured findings printed to stdout. Capture to a file for review:
#   ssh dbprimary "bash -s" < triage-dbprimary.sh > triage-$(date +%Y%m%d-%H%M).log
# =============================================================================

set +e  # We want to continue even if individual commands fail

PSQL="sudo -u postgres psql -At"
DB="vsurv_production"

section() {
  echo ""
  echo "============================================================"
  echo "  $1"
  echo "============================================================"
}

section "1. System Identity"
hostname
cat /etc/os-release 2>/dev/null | head -3
uname -r
uptime

section "2. Memory & CPU"
free -h
echo ""
lscpu | grep -E 'Model name|Socket|Core|Thread|NUMA'

section "3. ZFS Pool Status"
zpool status -v 2>/dev/null || echo "(ZFS not available)"
echo ""
zpool list 2>/dev/null

section "4. Disk Health (NVMe)"
nvme list 2>/dev/null || echo "(nvme-cli not available)"
echo ""
for dev in /dev/nvme0 /dev/nvme1 /dev/nvme2; do
  if [ -e "$dev" ]; then
    echo "--- $dev ---"
    nvme smart-log "$dev" 2>/dev/null | grep -E 'critical_warning|temperature|percentage_used|available_spare|media_errors' || echo "(could not read SMART)"
  fi
done

section "5. PostgreSQL Version & DB Size"
$PSQL -c "SELECT version();" 2>/dev/null || echo "(PostgreSQL not reachable)"
$PSQL -d "$DB" -c "SELECT pg_size_pretty(pg_database_size('$DB'));" 2>/dev/null

section "6. Active Connections"
$PSQL -c "SELECT state, count(*) FROM pg_stat_activity WHERE pid <> pg_backend_pid() GROUP BY state ORDER BY count DESC;" 2>/dev/null

section "7. Replication Status (from primary)"
$PSQL -c "SELECT client_addr, state, sync_state, pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) AS replay_lag_bytes, replay_lag FROM pg_stat_replication ORDER BY client_addr;" 2>/dev/null

section "8. WAL Archive Status"
$PSQL -c "SELECT last_archived_wal, last_archived_time, last_failed_wal, last_failed_time, now() - last_archived_time AS archive_lag FROM pg_stat_archiver;" 2>/dev/null

section "9. ZFS Dataset Properties (PostgreSQL data)"
PG_DATASETS=$(zfs list -H -o name,mountpoint 2>/dev/null | grep -iE 'postgres|pgdata|pgsql' | awk '{print $1}')
if [ -n "$PG_DATASETS" ]; then
  for ds in $PG_DATASETS; do
    echo "--- $ds ---"
    zfs get recordsize,compression,atime,logbias,sync,primarycache "$ds" 2>/dev/null
  done
else
  echo "(no PG-named datasets found; check zfs list manually)"
fi

section "10. Key sysctls & THP"
for param in vm.swappiness vm.dirty_ratio vm.dirty_background_ratio vm.overcommit_memory kernel.sched_autogroup_enabled; do
  val=$(sysctl -n "$param" 2>/dev/null)
  printf "%-45s %s\n" "$param" "${val:-NOT SET}"
done
echo ""
echo "THP enabled: $(cat /sys/kernel/mm/transparent_hugepage/enabled 2>/dev/null)"
echo "THP defrag:  $(cat /sys/kernel/mm/transparent_hugepage/defrag 2>/dev/null)"

section "Triage Complete"
echo "Review output above. Common anomalies to flag:"
echo "  - ZFS pool not ONLINE, or recordsize=128K on PG datasets"
echo "  - NVMe percentage_used > 80% or critical_warning != 0"
echo "  - idle_in_transaction count > 5"
echo "  - Replication state != streaming, or replay_lag > 30s"
echo "  - last_failed_wal populated"
echo "  - vm.swappiness != 1, vm.overcommit_memory != 2"
echo "  - THP not [never]"
