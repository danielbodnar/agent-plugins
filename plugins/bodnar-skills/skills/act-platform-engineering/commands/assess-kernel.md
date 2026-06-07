# Command: Assess Kernel & sysctl

Check kernel tuning, sysctls, THP, I/O scheduler, ulimits, and NUMA on the target host.

## Trigger

User says:
- "Check kernel tuning"
- "Are the sysctls right?"
- "THP status"
- "Is the kernel tuned for the database?"

## Steps

1. **Current sysctl values (§8.1):** Run the listed sysctl checks for `vm.*`, `kernel.*`, `net.*`, `fs.*`.
2. **Compare against recommended values table in §8.1.**
3. **Transparent Huge Pages (§8.2):** Should be `[never]` for both `enabled` and `defrag`.
4. **I/O scheduler (§8.3):** Should be `[none]` or `[mq-deadline]` for NVMe.
5. **ulimits for postgres process (§8.4):** Should be `nofile >= 65536`, `nproc >= 4096`.
6. **NUMA topology (§8.5):** If multiple nodes, ensure `vm.zone_reclaim_mode = 0`.
7. **System overview (§8.6):** Capture OS version, kernel, CPU, RAM, ZFS version.

## Critical Things to Look For

### High-impact for PostgreSQL + ZFS on NVMe
- `vm.swappiness = 1` (default 60 is too aggressive)
- `vm.overcommit_memory = 2` (prevents OOM killer targeting PG)
- `vm.dirty_ratio = 10` and `vm.dirty_background_ratio = 3`
- THP off (causes latency spikes on DBs)
- I/O scheduler `none` or `mq-deadline` (not bfq/cfq) for NVMe
- ulimits: open files >= 65536

### ACT context
- The Filesystem Tuning on DB Primary issue captures most of these. Assessment findings should confirm or refute specific gaps.

## Output Format

```
## Kernel & sysctl Assessment — [hostname], [date]

### sysctl Values
| Parameter | Current | Recommended | Status |
|-----------|---------|-------------|--------|
| vm.swappiness | 60 | 1 | ❌ |
| vm.dirty_ratio | 20 | 10 | ❌ |
| ... | ... | ... | ... |

### THP
- enabled: [value]
- defrag: [value]
- Status: [OK/Issue]

### I/O Scheduler
- nvme0: [scheduler]
- nvme1: [scheduler]
- Status: [OK/Issue]

### ulimits (postgres process)
- nofile: [value]
- nproc: [value]
- Status: [OK/Issue]

### System Overview
- OS: [name and version]
- Kernel: [version]
- CPU: [model, sockets/cores/threads]
- RAM: [total]
- NUMA nodes: [count]

### Findings
- [Healthy]
- [Concerns]
- [Issues]
```

## Follow-Up Actions

- Capture findings into the Filesystem Tuning on DB Primary Zoho issue.
- For each parameter that's wrong, note whether it can be changed live (`sysctl -w`) or requires reboot.
- For ulimits changes, the postgres systemd unit needs the change in `LimitNOFILE=` etc., not /etc/security/limits.conf.

## Related Resources

- `references/cheatsheet.md` §8
- `agents/sysadmin.md`
- `agents/dba.md` (for ulimits and connection-related tuning)
