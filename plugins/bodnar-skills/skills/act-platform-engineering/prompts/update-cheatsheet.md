# Updating the Assessment Cheatsheet

The cheatsheet (`act-assessment-cheatsheet.md`) is a detailed runbook of assessment commands with expected output and diagnostic criteria. It's a Daniel-internal reference.

## When to Update

- A new command worth running is identified
- A new red/green diagnostic criterion is established
- A new investigation area gets enough commands to warrant its own section
- An existing command needs refinement (better flags, edge cases, related queries)

## Section Structure

Each major section follows this format:

```markdown
## N. Section Name

### N.M Subsection (specific task)

Brief description of what this checks and why.

\`\`\`bash
# Command with helpful comment
command --with-flags
\`\`\`

**Green:** What good looks like.
**Red:** What bad looks like, with consequences if not addressed.

**Action:** What to do about it (when applicable).
```

## Current Sections

1. PostgreSQL Performance (10 subsections covering connections, pg_stat_statements, EXPLAIN, seq scans, bloat, indexes, config, locks)
2. PostgreSQL Backups & Recovery (WAL archiving, archive lag, base backup, replication slots)
3. PostgreSQL Replication & HA (replication status, replica state, recovery config, failover readiness)
4. ZFS Pool Health (status, capacity, datasets, topology, scrub schedule)
5. ZFS Tuning for PostgreSQL (dataset properties, ARC stats, ARC size limits, sizing)
6. ZFS Auto Snapshots (current state, tooling, space consumption)
7. Disk Health (NVMe via nvme-cli, SMART via smartctl, drive identification)
8. Kernel & sysctl Tuning (DB-relevant values, THP, I/O scheduler, ulimits, NUMA, system overview)
9. Quick Reference (10-command triage sequence for dbprimary)

## Style Rules

- **Primary assessment target is `vsurv_production` on `172.28.2.1` (dbprimary).** Commands assume this context unless specified.
- **Commands use `psql -U postgres` and assume `sudo` access where needed.**
- **OS context is Debian/Ubuntu with PostgreSQL and ZFS on Linux.**
- **Show the command, then explain what green and red look like.** Don't just dump syntax.
- **Where rules of thumb exist, give specific values, not vague guidance.** "shared_buffers ~25% of RAM" beats "tune shared_buffers appropriately."
- **Use tables for parameter recommendations** with columns: Parameter, Recommended, Default, Why.

## When Adding a New Section

1. Number it sequentially after existing sections.
2. Add it to the section list at the top if there is one.
3. Update the "Quick Reference" section if any of the new commands belong in the first-run triage.

## When Refining a Command

1. Don't remove the original unless replacing it. Add the refinement as a related variant.
2. Update the green/red criteria if the new command changes what "normal" looks like.

## Cross-Reference with Checklist

When the cheatsheet covers an item that's also in the checklist, the checklist should reference the cheatsheet section: `(see cheatsheet §5.1)`. The cheatsheet doesn't need to back-reference unless the relationship is non-obvious.
