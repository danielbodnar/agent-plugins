# Gaps and gotchas

Constructs that do not translate cleanly, and the flag-and-comment pattern for each. Check every trigger against this list in Phase 3. The rule is constant: emit a commented stub that states what the Zabbix trigger did and points at the Netdata feature that actually addresses the need. Do not emit a working-looking alert that does not do the job.

## The flag-and-comment pattern

```
# TODO(zabbix): <one line: what the original trigger did and why it does not translate>
# Netdata: <the feature or approach that addresses this need>
# Original expression: <verbatim Zabbix expression>
```

Place this in `zabbix-custom.conf` (or inline above the nearest related entity when there is one), never silently dropped and never only in the report.

## Log and string pattern monitoring

Triggers using `log[]`, `logrt[]`, or `count(...,"regex")` watch log content. Netdata does not evaluate health on log text; log analysis lives in the Netdata logs pipeline (systemd-journal integration and the Logs view), and alerting on log patterns is done there, not in `health.d`. Flag these and point to Netdata Logs. Do not approximate a log-pattern count with a metric lookup, because the two measure different things.

## Trigger dependencies

Zabbix suppresses a child trigger while its parent is in problem state, which encodes a causal hierarchy (do not alert on the database being down if the host is down). Netdata health has no dependency graph. Preserve the intent by noting the dependency in a comment and suggesting one of: routing both alerts to the same role so a human correlates them, using `delay` to let the upstream alert land first, or handling correlation in Netdata Cloud. Flag rather than drop, because losing a dependency silently produces alert storms.

## Host reachability and agent.ping

Zabbix often has a `nodata(agent.ping)` or `icmpping` trigger meaning "the host is down." In Netdata, node liveness is observed by a Netdata parent or Netdata Cloud (the node goes unreachable), not by a health entity the node runs on itself, because a down node cannot evaluate its own alert. The last-collected pattern can stand in for "this metric stopped arriving" on a parent that aggregates children, but it is not the same as host-down. Flag the semantic difference and point to parent or Cloud node-status alerts.

## Cross-host calculated and aggregate items

Zabbix calculated items and aggregate functions can combine metrics across multiple hosts (average CPU across a cluster, sum of sessions across a pool). Netdata health is per-node by design. Aggregation across nodes belongs to Netdata Cloud or a Netdata parent with a suitable query, not to a per-node `health.d` entity. Flag and point to Cloud or parent-level aggregation.

## Recovery expressions and manual close

Zabbix supports a separate recovery expression and manual problem close. Netdata clears an alert automatically when the triggering expression returns to false, with hysteresis via the conditional operator. If a trigger used a distinct recovery expression, fold its bound into the hysteresis band rather than treating it as a separate construct. If it relied on manual close (the problem stays open until a human acknowledges it), the closest Netdata behavior is `options: no-clear-notification`, which keeps the notification from clearing on its own. Note the difference, because Netdata has no acknowledge-to-close concept in `health.d`.

## Maintenance windows and event correlation

Zabbix maintenance periods and event correlation rules have no `health.d` equivalent. Scheduled suppression in Netdata is done at runtime through the health management API or by silencing, and correlation is a Cloud concern. Flag any trigger whose behavior depended on a maintenance window or correlation rule, and point to the health management API.

## Time specifiers and counts

Zabbix count specifiers like `#5` (the last five values) and mixed time-and-count windows do not have a direct lookup form. Approximate with a time window of roughly `count * delay` seconds and say so in a comment, or flag if the exact count is load-bearing (for example a trigger that fires on exactly three consecutive failures).

## Units and rate conversions

Two quiet sources of wrong thresholds. First, Netdata's `net.net` chart is in kilobits per second while Zabbix `net.if` items are bytes per second, so an absolute bandwidth threshold needs an 8x-and-1000 conversion. Second, Zabbix byte-size macros use 1024-based `K`/`M`/`G` while some Netdata charts present base-10 or already-scaled values. When a threshold carries a unit, convert it to the unit the target chart actually uses, and when unsure, flag rather than risk an alert that is off by a factor of 8 or 1024.

## String and status-value triggers

A large share of real 4.x triggers match a string rather than a number: `{str(...)}`, `{regexp(...)}`, `{iregexp(good,#1)}<>1`, `{strlen()}`, often on `CHAR`, `TEXT`, or `LOG` items, and frequently on a custom probe like `db.odbc.select[...]` that returns a status word. Netdata health evaluates numeric expressions over chart dimensions and has no string or regex matching, so these do not translate. Flag them with the original expression and the item, and point at the right destination: if it is a service or endpoint health string, the metric usually exists numerically through a collector (see section 8 of the mapping reference, for example httpcheck status), so suggest re-expressing the intent against that numeric chart; if it is a free-form status from a SQL probe or script, note that reproducing it needs a custom collector that emits a numeric metric, which is out of scope here.

## Log-presence triggers

Watch for the inverted idiom `{nodata(5m)}=0` on a `LOG` item whose collection filter already matches the bad pattern (for example a log item keyed on `archive command failed`). It does not mean "no data," it means "a matching line appeared," so it is really log-content alerting wearing a nodata expression. Treat it as a log gap and point at the Netdata Logs pipeline, not the last-collected pattern, because the semantics are opposite.

## File integrity and checksums

`vfs.file.cksum[/etc/passwd]` with a `{diff()}` trigger watches a file for change. Netdata does not do file-integrity monitoring in health, and approximating it with a metric is meaningless. Flag and point at a purpose-built tool (auditd, AIDE, or similar); this is not a monitoring-metric concern.

## External and custom script items

Keys that are clearly shell scripts or custom programs (`zext_ssl_cert.sh[...]`, bare names like `ezyvetchecker`, `datamapper`, `4act_transactions`, `list.db.inprogress`) collect data Netdata has no knowledge of. Some have a native collector equivalent (cert checks map to x509check, see mapping section 8) and should be routed there. The rest require a custom Netdata collector before any alert can fire, so emit the translated threshold as a `# REQUIRES custom collector` stub that records what the script measured and the threshold, so the intent is preserved for whoever builds the collector. Do not emit a live alert against a chart that will never exist.

## Zabbix aggregate items (cross-host)

Keys of the form `grpsum[...]`, `grpavg[...]`, `grpmax[...]`, `grpmin[...]` compute a value across a host group (for example, the sum of an item over every host in a PgPool group). Netdata health evaluates per node and has no per-node equivalent for a group aggregate. Flag as a cross-host Gap and point at a Netdata parent or Netdata Cloud, where multi-node aggregation lives. Do not translate these into a per-node entity, which would silently measure something different.

## Zabbix internal self-monitoring items

Keys of the form `zabbix[...]` (such as `zabbix[process,poller,avg,busy]`, `zabbix[wcache,...]`, `zabbix[queue]`) monitor the Zabbix server's own internals. Once Zabbix is being retired, they have no subject left to monitor. Do not translate them. Record them in the report as "drop (Zabbix-internal)" so the reviewer sees they were considered and intentionally dropped rather than missed. The Netdata equivalent, if you want to monitor Netdata itself, is the stock `netdata.conf`-driven internal alerts, which already exist.

## Value type is the strongest gap signal

When in doubt about whether a trigger is numeric or string, look at the referenced item's `value_type`. `CHAR`, `TEXT`, and `LOG` items are not numeric, so any trigger on them (even one that looks arithmetic) is a string or log check and belongs in the Gap bucket. This single check catches a large share of real-world gaps that a function-name scan alone would miss, because custom probes often wrap a status string the trigger then matches.
