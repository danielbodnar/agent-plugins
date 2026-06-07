# Command: Assess Proxmox VE Cluster

Check PVE cluster health, VM inventory, storage, and provisioning posture across the 3 known nodes (10.0.50.1-3) plus the new PowerEdge 730.

## Trigger

User says:
- "Check PVE"
- "Proxmox health"
- "Pims Garden status"
- "How are the hypervisors?"
- "Check the VM fleet"

## Steps

### Cluster level (run on any node)

1. `pvecm status` — cluster quorum and node membership
2. `pvesh get /nodes` — node-level summary
3. `pvesh get /cluster/resources --type vm` — VM inventory across the cluster

### Per-node checks

For each PVE node (10.0.50.1, 10.0.50.2, 10.0.50.3, plus the new PowerEdge 730 when added):

1. **Storage:**
   - `zpool status` — ZFS pool health (since PVE storage is ZFS-backed)
   - `zpool list` — capacity
   - `pvesm status` — storage availability and capacity

2. **Hardware health:**
   - Hand off to `commands/assess-disks.md` for NVMe SMART
   - `dmesg | tail -50` for kernel-level errors
   - `journalctl -p err -b` for system errors since boot

3. **PVE-specific:**
   - `pveversion` — PVE version
   - `systemctl --failed` — any failed units
   - `pveperf` (optional) — quick performance benchmark

### VM inventory

- For each VM: name, ID, state, host, CPU/RAM allocation, disk size, snapshots
- Identify abandoned/orphaned VMs
- Identify stale snapshots eating disk

### Backup configuration

- `cat /etc/pve/jobs.cfg` (if it exists) for vzdump jobs
- Check for Proxmox Backup Server integration

### HA configuration

- `ha-manager status` — what's HA-enabled
- Note: HA requires shared storage or replication; check whether prerequisites are met

## Critical Things to Look For

### Cluster
- Quorum (3-node = minimum; loss of 1 = degraded but functional, loss of 2 = no writes)
- All nodes Online in `pvecm status`

### Storage
- ZFS pool capacity (>80% degrades performance)
- ZFS pool errors (CKSUM/READ/WRITE > 0)
- PVE3 specifically: failing drives are known

### VM hygiene
- Orphaned VMs (powered off for long periods, no clear owner)
- Stale snapshots (months old)
- Resource overcommit (RAM allocated > physical, with no ballooning)

### Backup
- Are VMs being backed up?
- Where do the backups go?
- When was the last successful backup of each VM?

## Output Format

```
## PVE Cluster Assessment — [date]

### Cluster
- Nodes online: [N/total]
- Quorum: [Yes/No]
- PVE version: [version]

### Nodes
| Node | IP | PVE Ver | Pool Health | Pool Cap | Failed Units |
|------|-----|---------|-------------|----------|--------------|
| pve1 | 10.0.50.1 | [ver] | [status] | [%] | [count] |
| pve2 | 10.0.50.2 | [ver] | [status] | [%] | [count] |
| pve3 | 10.0.50.3 | [ver] | [status] | [%] | [count] |

### VM Inventory
- Total VMs: [count]
- Running: [count]
- Stopped: [count]
- HA-enabled: [count]

### Backup
- Backup target: [path/PBS host]
- Last successful backup: [timestamp]
- VMs with no recent backup: [list]

### Findings
- [Healthy]
- [Concerns]
- [Issues]
```

## Follow-Up Actions

- If PVE3 drive issues are confirmed, update the Failing Hard Drives in PVE3 issue.
- If the new PowerEdge 730 hasn't joined yet, that's the Provision and Install New Dell PowerEdge 730 issue.
- VM provisioning improvements feed into the Virtual Environment ("Pims Garden") issue.
- Backup gaps may be related to the Dead Backup Servers issue (verify if it's the same backup infrastructure).

## Related Resources

- `references/cheatsheet.md` §§4-7
- `commands/assess-disks.md`
- `commands/assess-zfs.md`
- `agents/sysadmin.md`
- `agents/platform-engineer.md` (for VM provisioning automation discussion)
