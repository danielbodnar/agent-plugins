# Zabbix to Netdata mapping reference

This is the translation knowledge the conversion depends on. The tables are not exhaustive, and they are not meant to be. When a row is missing, infer from Netdata's known contexts, confirm against a live node if one is reachable, or flag the entity. Never fabricate a context.

## Contents

1. Trigger expression syntax (both Zabbix dialects)
2. Item key to Netdata context and dimension
3. Zabbix function to Netdata lookup
4. Severity to warn/crit
5. Severity-pair merge heuristic
6. User macros
7. Low-level discovery prototypes
8. Collector-backed item keys (need a Netdata collector enabled)

## 1. Trigger expression syntax

Zabbix exports use one of two dialects depending on version, and both can appear in the same migration.

New syntax (Zabbix 5.4+):

```
avg(/Linux/system.cpu.util,5m)>90
last(/Linux/vfs.fs.size[/,pused])>90
min(/Linux/vm.memory.size[available],5m)<10M
nodata(/Linux/agent.ping,5m)=1
```

Old syntax (pre-5.4):

```
{Linux:system.cpu.util.avg(5m)}>90
{Linux:vfs.fs.size[/,pused].last()}>90
```

Extract three things from either form: the item key (`system.cpu.util`, with any bracketed parameters), the function and its time window (`avg`, `5m`), and the operator and constant (`>`, `90`). The constant may be a macro (`{$CPU.UTIL.CRIT}`) or carry a unit suffix (`10M`, `5K`, `2G`); resolve both before emitting.

### Item-level shorthand (very common in 4.x and 5.x exports)

Older exports define most triggers inside their item, and the expression omits the host and key entirely: `{last()}=0`, `{avg(5m)}>90`, `{diff()}>0`, `{nodata(5m)}=1`. The implied item is the enclosing one. When you read the XML directly, resolve the key from the `<item>` (or `<item_prototype>`) the trigger is nested in. The bundled parser does this for you and sets `item_level_shorthand: true` on those records. A trigger may also reference a different host or item explicitly with `{host:key.func()}`; treat that as a cross-reference, and if it points at another host, see the host-reachability note in gaps-and-gotchas.md.

## 2. Item key to Netdata context and dimension

| Zabbix item key | Netdata `on` (context) | Dimension / calc | Notes |
| --- | --- | --- | --- |
| `system.cpu.util` (total) | `system.cpu` | `calc: 100 - $idle` | Netdata has no single util dimension; total utilization is the complement of idle. |
| `system.cpu.util[,user]` | `system.cpu` | `of user` | Per-state dimensions: user, system, nice, iowait, irq, softirq, steal, guest. |
| `system.cpu.load[percpu,avg1]` | `system.load` | `of load1` | Also load5, load15. |
| `vm.memory.size[available]` | `system.ram` | `of free` plus `cached` and `buffers` | Zabbix "available" is roughly free+cached+buffers; sum them in a lookup or calc. |
| `vm.memory.size[pavailable]` | `system.ram` | `calc: ($free + $cached + $buffers) * 100 / ($free + $used + $cached + $buffers)` | Percentage available. |
| `system.swap.size[,pfree]` | `mem.swap` | `calc: $free * 100 / ($free + $used)` | |
| `vfs.fs.size[/,pused]` | `disk.space` | `calc: $used * 100 / ($avail + $used)` | Use `chart labels: mount_point=/` to target a mount, or omit for all. |
| `vfs.fs.inode[/,pfree]` | `disk.inodes` | `calc: $avail * 100 / ($avail + $used)` | |
| `vfs.dev.read` / `vfs.dev.write` | `disk.io` | `of reads` / `of writes` | |
| `net.if.in[eth0]` | `net.net` | `of received`, `chart labels: device=eth0` | Netdata net.net is kilobits/s; Zabbix net.if is bytes/s. Convert if the threshold is absolute. |
| `net.if.out[eth0]` | `net.net` | `of sent`, `chart labels: device=eth0` | |
| `net.if.errors` | `net.errors` | `of inbound`, `of outbound` | |
| `net.if.dropped` | `net.drops` | `of inbound`, `of outbound` | |
| `system.uptime` | `system.uptime` | `of uptime` | |
| `proc.num[]` | `system.processes` | `of running` | Per-process counts map to apps contexts and are fuzzy; flag if specific. |
| `agent.ping` / `icmpping` | none (host reachability) | last-collected pattern | Conceptually different; see gaps-and-gotchas.md. |

Service collectors (MySQL, nginx, PostgreSQL, Redis, and so on) expose their own contexts through Netdata's go.d collectors, and the context name usually mirrors the metric (`mysql.queries`, `nginx.requests`, `postgres.connections`). The collector must be enabled on the node for the chart to exist. For any service key not listed, instruct the reader to find the context from the dashboard tooltip or `/api/v1/charts`, and flag the entity until confirmed.

Unit suffixes in thresholds follow Zabbix conventions: `K`/`M`/`G`/`T` are powers of 1024 for byte values and powers of 1000 for others, and `s`/`m`/`h`/`d`/`w` are time. Resolve them to base units that match the Netdata chart before comparing.

## 3. Zabbix function to Netdata lookup

| Zabbix function | Netdata equivalent | Notes |
| --- | --- | --- |
| `avg(/h/k,5m)` | `lookup: average -5m of <dim>` | |
| `max(/h/k,5m)` | `lookup: max -5m of <dim>` | |
| `min(/h/k,5m)` | `lookup: min -5m of <dim>` | |
| `sum(/h/k,5m)` | `lookup: sum -5m of <dim>` | |
| `last(/h/k)` | reference the dimension in `calc`, e.g. `calc: $used` | No lookup form for "current value"; use the dimension variable directly. |
| `count(/h/k,5m,,">N")` | `lookup: sum -5m of <dim>` with a grouping condition, or rethink as a rate | Counting samples over a threshold is awkward in health; prefer a rate or average. Flag if the count semantics are load-bearing. |
| `count(/h/k,10m,,"regex")` | none | Log/string pattern counting is not health; see gaps-and-gotchas.md. |
| `nodata(/h/k,5m)=1` | `calc: $now - $last_collected_t` with `warn: $this > (N * $update_every)` | The last-collected pattern. |
| `change` / `diff` / `abschange` | `calc` against a prior lookup; often two entities | Possible but verbose; flag if the trigger is complex. |
| `percentile(/h/k,5m,95)` | `lookup: percentile95 -5m of <dim>` if supported, else flag | Confirm the grouping method exists on the target version. |
| `timeleft(/h/k,1h,0)` | predictive pattern (fill-rate entity feeding a time-to-empty entity) | See the predictive disk example in netdata-health-format.md. |
| `diff()` / `change()` / `abschange()` | `calc` comparing a short lookup to a prior lookup, often two entities | Common in 4.x. Verbose in health; flag if the trigger fires on any change of a string or status value. |
| `strlen()`, `str()`, `regexp()`, `iregexp()`, `logseverity()` | none | String and pattern matching on item values is not numeric health. See gaps-and-gotchas.md. |

Zabbix count specifiers like `#5` (last 5 values) have no direct lookup form. Approximate with a time window of roughly `5 * delay` seconds and note the approximation, or flag if exactness matters.

## 4. Severity to warn/crit

Netdata has two alert levels, Zabbix has six. A lone trigger maps to a single line:

| Zabbix severity (priority) | Netdata line |
| --- | --- |
| 5 Disaster | `crit` |
| 4 High | `crit` |
| 3 Average | `warn` |
| 2 Warning | `warn` |
| 1 Information | `warn` (consider `to: silent`) |
| 0 Not classified | `warn` with a `# TODO(zabbix): severity was Not classified` flag |

This collapse is lossy by definition. State it in the conversion report.

## 5. Severity-pair merge heuristic

Two Zabbix triggers should merge into one Netdata entity (with both `warn` and `crit`) when all of these hold: they reference the same item key, they use the same function and window, their operators match, and their severities differ such that one is warn-tier and the other crit-tier. The lower threshold becomes `warn`, the higher becomes `crit`.

Apply hysteresis so the merged alert does not flap around the boundary. Set the clear threshold a band below the trigger threshold using the conditional operator:

```
warn: $this > (($status >= $WARNING)  ? (warn_clear) : (warn_trigger))
crit: $this > (($status == $CRITICAL) ? (crit_clear) : (crit_trigger))
```

A 10 to 15 percent band is a reasonable default when Zabbix did not specify recovery thresholds. If the Zabbix triggers carried explicit recovery expressions, use those bounds instead.

When only one trigger exists for an item, emit the single corresponding line and do not invent a second tier.

## 6. User macros

Zabbix user macros (`{$CPU.UTIL.CRIT}`, `{$MEMORY.AVAILABLE.MIN}`) resolve from the template's `<macros>` block or a global default. Substitute the resolved numeric value into the expression, and record the original macro name in the `info` line so the threshold's origin stays traceable:

```
info: CPU utilization (was Zabbix macro {$CPU.UTIL.CRIT})
```

If a macro has no default in the export and no value is supplied, flag it rather than guessing a number.

## 7. Low-level discovery prototypes

Zabbix LLD discovers instances (filesystems, interfaces, cores) and stamps out item and trigger prototypes per instance. This maps cleanly onto Netdata templates: a trigger prototype on a discovered filesystem becomes a single `template:` entity on the `disk.space` context, which Netdata applies to every discovered instance automatically. Treat an LLD trigger prototype as a strong signal to emit `template:` rather than `alarm:`, and drop the per-instance duplication that Zabbix needed.

## 8. Collector-backed item keys

These keys are not collected by Netdata's core, but a specific Netdata collector reproduces them once enabled on the node. Translate the trigger as normal, and emit a `# REQUIRES` note above the entity naming the collector that must be configured, because the chart will not exist until it is. This is different from a true gap: the alert is correct and will work the moment the collector is on.

| Zabbix item key | Netdata collector | Context / dimension | Note |
| --- | --- | --- | --- |
| `net.tcp.service[...]`, `net.udp.service[...]`, `web.test...`, `curl[URL]` | `httpcheck` (HTTP) or `portcheck` (raw TCP) | `httpcheck.status` / `portcheck.status` | Service up/down and response time. A `=0` (down) trigger maps to a status-not-success check. |
| `icmpping[...]`, `icmppingloss[...]`, `icmppingsec[...]` | `ping` (go.d) | `ping.host_packet_loss`, `ping.host_rtt` | Packet loss and round-trip time per target host. |
| `zext_ssl_cert.sh[...]`, any cert-expiry script | `x509check` (go.d) | `x509check.time_until_expiration` | Days until certificate expiry; the usual "cert expires soon" trigger maps directly. |
| `pgsql.*`, `pgsql.streaming.lag.*`, `pgsql.db.size[...]` | `postgres` (go.d) | `postgres.replication_*`, `postgres.db_size`, connection and transaction contexts | Replication lag, sizes, and activity are first-class. Confirm the exact context name on the node. |
| `mysql.*` | `mysql` (go.d) | `mysql.*` | |
| SNMP keys like `sensor.temp.value[entPhySensorValue.{#SNMPINDEX}]`, `vfs.fs.pused[storageUsedPercentage.{#SNMPINDEX}]` | `snmp` (go.d) | depends on the SNMP profile configured | SNMP needs a per-device collector config mapping OIDs to charts. Flag with the OID so the user can build the profile, and treat the OID-to-context mapping as user-supplied. |
| `db.odbc.select[...]` (arbitrary SQL returning a value) | none generic | n/a | No native equivalent for arbitrary SQL probes. If the value is numeric, a custom go.d or StatsD feed is required; if it returns a string status, it is a gap. See gaps-and-gotchas.md. |

When the collector exists but you cannot confirm the exact context name, emit the entity with a `# TODO(zabbix): confirm context for <collector>` note rather than guessing a context that may not match.
