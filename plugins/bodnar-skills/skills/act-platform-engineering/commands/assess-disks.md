# Command: Assess Disk Health

Check NVMe SMART data, drive wear, PLP status, and identify consumer vs enterprise drives.

## Trigger

User says:
- "Check disk health"
- "NVMe SMART"
- "Are the drives healthy?"
- "Drive wear status"

## Steps

1. **NVMe via nvme-cli (§7.1):**
   - `nvme list` for inventory
   - `nvme smart-log` for each device
   - Critical fields: `percentage_used`, `available_spare`, `critical_warning`, `temperature`, `media_errors`

2. **SMART via smartctl (§7.2):**
   - Detailed health check
   - Check for `Power Loss Protection` indication (consumer drives lack PLP)

3. **Drive model identification (§7.3):**
   - `lsblk -d -o NAME,MODEL,SIZE,ROTA,TRAN,REV`
   - Look up each model:
     - Consumer (Samsung 970 EVO) vs Enterprise (Samsung PM9A3)
     - PLP support
     - TBW (Total Bytes Written) rating
     - Known firmware issues

## Critical Things to Look For

### Wear and health
- `percentage_used > 80%`: concerning
- `percentage_used > 95%`: urgent
- `available_spare` near or below `available_spare_threshold`: end-of-life
- `critical_warning != 0`: alert
- `temperature` sustained > 70C: concerning
- `media_errors > 0`: hardware degradation

### Power Loss Protection
- **Consumer NVMe lacks PLP.** Unexpected power loss can corrupt in-flight writes.
- On ZFS this is partially mitigated by checksums and ZIL, but it's still a data integrity risk.
- **For dbprimary specifically**, this matters a lot. Check what's installed.

### Per-host context
- **dbprimary**: production database. If consumer NVMe, document the risk and consider it for the Filesystem Tuning issue or a new issue.
- **PVE3**: known failing drives. Confirm which drives, get model numbers for replacements.
- **New PowerEdge 730**: opportunity to spec enterprise drives with PLP.

## Output Format

```
## Disk Health Assessment — [hostname], [date]

### Inventory
| Device | Model | Size | Class (Consumer/Enterprise) | PLP |
|--------|-------|------|----------------------------|-----|
| nvme0n1 | [model] | [size] | [class] | [yes/no/unknown] |
| ... | ... | ... | ... | ... |

### Health
| Device | % Used | Spare | Crit. Warn | Temp | Media Errors |
|--------|--------|-------|-----------|------|--------------|
| nvme0n1 | [%] | [%] | [value] | [C] | [count] |
| ... | ... | ... | ... | ... | ... |

### Findings
- [Healthy drives]
- [Concerns: high wear, no PLP, near-threshold]
- [Issues: failing, critical warning, replacement needed]
```

## Follow-Up Actions

- If drives on PVE3 are confirmed failing, update the Failing Hard Drives in PVE3 issue with specific models and serial numbers for replacement procurement.
- If consumer NVMe is in production database use, document the risk in the Filesystem Tuning on DB Primary issue or as a separate hardware risk issue.
- For drives near end-of-life, schedule replacement proactively before they fail.

## Related Resources

- `references/cheatsheet.md` §7
- `agents/sysadmin.md`
- `commands/assess-zfs.md` (pool health and drive replacement procedure)
