# Command: Assess PostgreSQL

One-shot assessment for PostgreSQL on dbprimary (or any specified PG host). Output is structured findings ready to drop into the assessment doc.

## Trigger

User says:
- "Assess Postgres on dbprimary"
- "Check the database"
- "Run a Postgres health check on [host]"
- "What's the state of vsurv_production?"

## Steps

1. Ask the user which host (default: dbprimary at `172.28.2.1`). Skip if obvious from context.
2. Walk through sections from `references/cheatsheet.md`:
   - §1.1-1.2 Version, connections, activity
   - §1.3 Connection utilization
   - §1.4 pg_stat_statements top queries
   - §1.6 Sequential scans vs index scans
   - §1.7 Table bloat
   - §1.8 Unused indexes
   - §1.9 Key configuration parameters
   - §1.10 Lock contention
3. For each section, output the command and ask the user to run it (or run via available tools), then interpret against the green/red criteria.
4. Summarize findings at the end with:
   - Healthy areas
   - Concerns (needs investigation)
   - Confirmed issues (needs remediation)

## Output Format

```
## PostgreSQL Assessment — [hostname], [date]

### Healthy
- [Item with brief evidence]

### Concerns
- [Item with brief evidence and what to check next]

### Issues
- [Item with brief evidence and recommended action]
```

## Follow-Up Actions

- If an issue is confirmed, suggest drafting a Zoho issue via `prompts/zoho-issue.md`.
- If a deeper investigation is needed, recommend the relevant agent perspective (e.g., DBA agent for query-level work).
- If the issue is replication-related, hand off to `commands/assess-replication.md`.
- If the issue is backup-related, hand off to `commands/assess-backups.md`.

## Related Resources

- `references/cheatsheet.md` §1 (full command reference)
- `agents/dba.md` (when query-level reasoning is needed)
