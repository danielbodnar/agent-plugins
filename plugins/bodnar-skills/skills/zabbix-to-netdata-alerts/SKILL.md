---
name: zabbix-to-netdata-alerts
description: Convert Zabbix monitoring definitions into Netdata health alerts (health.d/*.conf). Use this skill whenever the user wants to migrate, translate, or port Zabbix triggers, items, templates, or alerts to Netdata, mentions a Zabbix XML export, asks to turn Zabbix checks into Netdata health config, or is moving observability from Zabbix to Netdata. Trigger on phrases like "convert my Zabbix triggers", "migrate Zabbix to Netdata", "turn this Zabbix template into Netdata alerts", "zabbix export to health.d", "port these checks to netdata", or when the user pastes a Zabbix trigger expression and wants the Netdata equivalent. Also use when the user shares a .xml Zabbix template and talks about Netdata alerting, even if they do not name health.d explicitly.
---

# Zabbix to Netdata Alerts

Translate the alerting intent in a Zabbix XML export into Netdata health configuration. The scope is alerts. Zabbix triggers become Netdata health entities, and Zabbix items are consumed only as the mapping aid that resolves a trigger's item key to a Netdata chart context and dimension.

The single most important principle: Netdata already ships more than 900 stock health checks, covering CPU, memory, disk, network, and a large catalog of services (PostgreSQL replication, x509 certificate expiry, HTTP and port checks, MySQL, Redis, and more). Do not re-author what already exists. For most standard system, database, and web triggers the correct output is to adopt the stock alert and, only if the Zabbix threshold differs materially, emit a small override that tunes the changed lines. Author new config only for genuinely custom triggers, and flag-and-comment the ones that do not translate.

The value of this conversion is not the syntax, it is judgment about what to reuse, what to tune, and what cannot be expressed at all. A plausible-looking custom alert that duplicates or shadows a stock one is a maintenance liability; an alert that silently never fires is worse than an honest TODO.

## What this skill produces

A set of files for `/etc/netdata/health.d/`, split by intent: override files that tune adopted stock alerts, new entity files for genuinely custom triggers, and a `zabbix-custom.conf` of flagged stubs for what did not translate. Plus a conversion report that classifies every source trigger as adopted, tuned, custom, or gap. The output is meant to be committed to version control and reloaded with `netdatacli reload-health`.

## Workflow

Work through these phases in order. Do not skip the report at the end, since the honest accounting of gaps is half the deliverable.

### Phase 1: Parse the export

If Bun is available, normalize the export to JSON first:

```sh
./scripts/init                                  # one time, installs the XML parser
./scripts/parse-zabbix-export <export.xml> > /tmp/zbx.json
```

The parser emits one record per trigger with its referenced items resolved and attached, the template macros collected, and trigger dependencies preserved. This is the deterministic part, and it keeps large exports (hundreds of triggers) from being eyeballed.

If Bun or the script is unavailable, read the XML directly. Zabbix exports are readable in context. Extract for each trigger: its `expression`, `recovery_expression`, `priority` (severity), `name`, `description`, `dependencies`, and the item keys the expression references. Pull each referenced item's `key`, `delay`, `value_type`, and `units` from the `<items>` block, and collect template-level `<macros>`.

In 4.x and 5.x exports most triggers use the item-level shorthand (`{last()}`, `{avg(5m)}`, `{diff()}` with no host or key), and the implied item is the one the trigger is nested inside. Resolve the key from the enclosing `<item>` or `<item_prototype>`. Missing this makes every such trigger look like it references nothing, so confirm the resolved key before mapping.

### Phase 2: Discover what Netdata already provides

Before mapping anything, find out what Netdata already ships and already runs, because the goal is to reuse it. There are two ways, in order of preference.

If a Netdata MCP server is connected (the Cloud endpoint `https://app.netdata.cloud/api/v1/mcp` or a local agent or parent at `http://NODE:19999/mcp`), use it. Its metrics discovery searches contexts, instances, dimensions, and labels, which confirms the exact `on` and `of` values instead of guessing them, and its alert discovery lists the alerts already configured and raised, which tells you what not to duplicate. This is the difference between emitting a verified entity and emitting one with a `# TODO confirm context` note. See `references/netdata-stock-alerts.md` for the connection note and the token nuance (the MCP needs a `scope:mcp` API token or a local key, not OAuth).

If no MCP is connected, fall back to the stock alert catalog at `https://github.com/netdata/netdata/tree/master/src/health/health.d/` (one file per subsystem) and the per-integration alert listings in the Netdata integrations docs, plus a live node's `http://NODE:19999/api/v1/charts` and `/api/v1/alarm_variables` when reachable.

### Phase 3: Classify and map each trigger

For every trigger, first classify it, then act on the classification. Read `references/zabbix-mapping.md` for the full mapping tables and `references/netdata-stock-alerts.md` for the adopt-and-tune mechanism.

Classify into one of four outcomes:

Before mapping, apply these quick screens, learned from real exports, because they settle a large share of triggers immediately:

- If the referenced item's `value_type` is `CHAR`, `TEXT`, or `LOG`, it is a string or log check regardless of the function used. It is a Gap. Value type is the most reliable single signal for this.
- If the key is a Zabbix aggregate (`grpsum`, `grpavg`, `grpmax`, `grpmin`, or any `grp...[group,...]` form), it computes across a host group. Netdata health is per-node, so it is a cross-host Gap.
- If the key is a Zabbix internal item (`zabbix[...]`, for example `zabbix[process,poller,avg,busy]`), it monitors the Zabbix server itself and is obsolete once Zabbix is retired. Do not translate it; record it in the report as "drop (Zabbix-internal)".

Then the four outcomes:

1. **Adopt.** A stock alert already covers this intent at a comparable threshold. Do not emit any entity. Record it in the report as adopted and name the stock alert so the reviewer can confirm it is enabled.
2. **Tune.** A stock alert covers the metric but the Zabbix threshold or window differs in a way that matters. Emit an override into `/etc/netdata/health.d/` that reuses the stock alert's name and changes only the differing lines (usually `warn`/`crit`, sometimes `lookup`). Record the original stock value and the Zabbix value in `info`.
3. **Author.** No stock alert matches, but Netdata has the metric (natively or through a collector). Write a new entity using the mapping rules below. If the metric needs a collector that may not be enabled, prefix a `# REQUIRES <collector>` note, because the chart will not exist until it is on.
4. **Gap.** The trigger has no clean Netdata equivalent. Handle it in Phase 4.

The mapping rules for the Author case:

- **Item key to `on` + dimensions.** A Zabbix item key resolves to a Netdata chart context and one or more dimensions. `vfs.fs.size[/,pused]` becomes context `disk.space` with a `mount_point` chart label and a calc over `used`/`avail`. `system.cpu.util[,user]` becomes `system.cpu` with the `user` dimension. The mapping table in the reference covers the common Linux and agent keys. For a key not in the table, confirm the context via the MCP or `/api/v1/charts`; if still uncertain, do not invent a context. Emit the entity with a flagged `# TODO` comment naming the original key.

- **`template` vs `alarm`.** Default to `template:` attached to the context. Stock Netdata alerts work this way, it deploys identically across every node and every instance of the context (all disks, all interfaces), and Zabbix low-level discovery (LLD) trigger prototypes map onto it naturally. Use `alarm:` on a specific chart ID only when the trigger targets one named instance and must not apply to siblings.

- **Function to `lookup`.** Zabbix `avg`/`max`/`min`/`sum`/`count` over a time window become a Netdata `lookup: METHOD AFTER of DIMENSIONS`. `avg(/h/k,5m)` becomes `lookup: average -5m of <dim>`. `last(...)` has no lookup form; reference the dimension as a variable in `calc` instead. `nodata(...,5m)=1` becomes the last-collected pattern (`calc: $now - $last_collected_t` with a `warn`/`crit` multiple of `$update_every`). The function table in the reference is authoritative, including the cases that have no equivalent.

- **Threshold to `warn`/`crit`.** A single Zabbix trigger carries one severity, so on its own it produces one line. Severity maps as: Disaster and High to `crit`; Average, Warning, and Information to `warn`; Not classified to `warn` with a flag. Resolve user macros (`{$CPU_THRESHOLD}`) to their template default value and keep the macro name in the `info` line for traceability.

- **Merge severity pairs.** Zabbix commonly expresses Netdata's two-tier model as two separate triggers on the same item at different severities and thresholds (a Warning at >80 and a High at >90). Detect triggers that share an item and differ mainly in threshold, and merge them into one entity with both `warn` and `crit`. Apply hysteresis with the conditional operator so the merged alert does not flap: `warn: $this > (($status >= $WARNING) ? (low) : (high))`. See `references/zabbix-mapping.md` for the merge heuristic.

- **Collector-backed keys ship their own stock alerts.** SSL cert checks (`x509check`), `net.tcp.service`/`curl` (`httpcheck`/`portcheck`), `icmpping` (`ping`), `pgsql.*` (`postgres`), and SNMP all have Netdata collectors, and those collectors generally ship stock alerts too. So these usually land in the Adopt or Tune bucket, not Author: enable the collector, then adopt or tune the stock alert rather than writing a parallel one. Only Author when you confirm no stock alert exists for that metric. Section 8 of the mapping reference lists the collectors and contexts.

- **Cadence.** Set `every` from the referenced item's `delay`. Default to `every: 10s` for fast signals and `1m` for slow ones if no delay is present. `every` is the alert evaluation frequency and is independent of collection.

### Phase 4: Handle what does not translate

Check each Gap-classified trigger against `references/gaps-and-gotchas.md`. Constructs with no clean Netdata equivalent (string/regex matching, log content, file integrity, trigger dependencies, cross-host calculated items, host-reachability semantics) must be emitted as a commented stub that states what the Zabbix trigger did and why it did not translate, with a pointer to the Netdata feature that actually addresses it. Do not bury these only in the report. They belong inline in `zabbix-custom.conf` so the gap is visible during review.

### Phase 5: Emit the files

Produce three kinds of file under `/etc/netdata/health.d/`. Put tuned stock-alert overrides in subsystem files named to make the override relationship obvious (for example `cpu.conf` overriding stock `cpu.conf` entities). Put genuinely custom entities in their own subsystem files. Put flagged gaps in `zabbix-custom.conf`. Each file starts with a header comment recording the source export and date. Each entity carries a `summary` and `info` derived from the Zabbix trigger so provenance survives. Adopted alerts produce no file; they live only in the report.

### Phase 6: Report

Produce a conversion report that classifies every source trigger as adopted, tuned, custom, or gap, with counts. For adopted, name the stock alert. For tuned, show the stock value and the Zabbix value. For custom, note any required collector. For gaps, give the reason. This classification is what makes the migration reviewable and is half the deliverable.

## Output conventions

Read `references/netdata-health-format.md` for the exact line syntax. Hold to these conventions so the output is reviewable and honest:

- Every emitted entity must satisfy Netdata's requirements: the `template`/`alarm` line first, `on` always present, and at least one of `lookup`, `calc`, `warn`, or `crit`.
- A flagged item uses a `# TODO(zabbix): <reason>` comment on its own line directly above the affected entity line, and never a silently guessed value.
- Preserve the Zabbix trigger name in `summary` and the description in `info` so reviewers can trace each entity back to its origin.
- Do not hardcode node names, IP addresses, or recipients. Leave `to:` as `sysadmin` unless the user specified roles.

## Reference files

- `references/netdata-stock-alerts.md` — where the 900+ stock alerts live, how to discover them via the Netdata MCP or the catalog, the adopt-and-tune override mechanism, and the MCP token nuance. Read this in Phase 2 and Phase 3.
- `references/zabbix-mapping.md` — item key to context/dimension table, function to lookup table, severity mapping, macro handling, the severity-pair merge heuristic, and collector-backed keys. Read this in Phase 3.
- `references/netdata-health-format.md` — distilled Netdata health entity syntax: every line, the expression and variable system, hysteresis, and worked examples. Read this when authoring or tuning config.
- `references/gaps-and-gotchas.md` — constructs that do not translate and the flag-and-comment pattern for each. Read this in Phase 4.

## Scripts

- `scripts/parse-zabbix-export` — Bun executable that parses a Zabbix XML export into normalized JSON (triggers with resolved items, macros, dependencies). Run it first on real exports. Falls back to direct XML reading if Bun is absent.
- `scripts/init` — checks for Bun and installs the XML parser dependency. Run once before the parser.
