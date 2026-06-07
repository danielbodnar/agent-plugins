# Netdata health entity format

Distilled from the Netdata alert configuration reference. This is the target syntax. Use it when emitting config in Phase 4.

## Contents

1. Entity skeleton and required lines
2. Line-by-line reference
3. lookup syntax
4. Expressions and variables
5. Hysteresis
6. Worked patterns

## 1. Entity skeleton and required lines

A health file lives at `health.d/<name>.conf` and holds one or more entities. Each entity begins with `template:` or `alarm:`.

```
template: NAME
      on: CONTEXT
   class: Utilization
    type: System
component: CPU
  lookup: average -5m of user,system
   units: %
   every: 10s
    warn: $this > 80
    crit: $this > 90
   delay: down 15m multiplier 1.5 max 1h
 summary: short title
    info: longer description
      to: sysadmin
```

Requirements: the `template`/`alarm` line is first, `on` is always present, and the entity has at least one of `lookup`, `calc`, `warn`, or `crit`. Everything else is optional. A line ending in `\` continues on the next line with no inserted space.

`template:` attaches to a context (every disk, every interface, every node running the same config). `alarm:` attaches to one named chart. Alarms are processed before templates; if both share a name and match a chart, only the alarm fires.

Names use alphanumerics plus `.` and `_`, and cannot collide with a chart, dimension, family, or chart variable name.

## 2. Line-by-line reference

| Line | Purpose |
| --- | --- |
| `on` | Chart ID (alarm) or context (template) to attach to. |
| `class` | Errors, Latency, Utilization, or Workload. Defaults to Unknown. |
| `type` | Broad system area (System, Database, Web Server, and so on). Defaults to Unknown. |
| `component` | Narrower area within the type (CPU, MySQL). Defaults to Unknown. |
| `lookup` | Database query producing `$this`. See section 3. |
| `calc` | Expression that overwrites `$this`. Usable with or without `lookup`. |
| `every` | Evaluation frequency, units s/m/h/d. |
| `green`/`red` | Optional chart thresholds, available as `$green`/`$red`. |
| `warn`/`crit` | Expressions; non-zero means the alert is raised. |
| `to` | Space-separated notification roles. `silent` stops notification while keeping the check. |
| `exec` | Script run on status change. Defaults to `alarm-notify.sh`. |
| `delay` | Hysteresis on notification timing: `[up U] [down D] [multiplier M] [max X]`. |
| `repeat` | Re-notify interval: `[off] [warning DURATION] [critical DURATION]`. |
| `options` | `no-clear-notification` keeps the alert from auto-clearing. |
| `host labels` | Restrict to hosts whose labels match (simple patterns). |
| `chart labels` | Restrict to charts whose labels match (AND logic across labels). |
| `summary` | Short title for notifications and dashboard. Supports `${label:NAME}` and `${family}`. |
| `info` | Longer description. Same variable support. |

## 3. lookup syntax

```
lookup: METHOD(GROUPING) AFTER [at BEFORE] [every DURATION] [OPTIONS] [of DIMENSIONS]
```

METHOD is a grouping method: `average`, `min`, `max`, `sum`, `median`, `stddev`, `percentile`, and others. AFTER is how far back to look as a negative duration (`-5m`). OPTIONS include `percentage`, `absolute`, `unaligned`, `min2max`, `match-names`. `of DIMENSIONS` is a space-separated dimension list with pattern support. The result is `$this`, and the query window endpoints are `$after` and `$before`.

```
lookup: average -10m unaligned of user,system,softirq,irq,guest
```

## 4. Expressions and variables

Operators: arithmetic `+ - * /`, comparison `< <= == != <> > >=` (return 1 or 0), logical `&&` and `||`, plus `abs()` and the conditional `(cond) ? (a) : (b)`. Special values `nan` (lookup failed) and `inf` (division by zero) should be guarded against.

Useful variables:

| Variable | Meaning |
| --- | --- |
| `$this` | Current value (result of `calc`, else `lookup`). |
| `$status` | Current status, compared to constants below. |
| `$now` | Current unix timestamp. |
| `$last_collected_t` | Timestamp of last collection. |
| `$update_every` | Chart update frequency. |
| `$<dimension>` | Last interpolated value of a dimension on the chart. |
| `$<dimension>_raw` | Last collected (non-interpolated) value. |

Status constants, increasing with severity: `$REMOVED` (-2), `$UNINITIALIZED` (-1), `$UNDEFINED` (0), `$CLEAR` (1), `$WARNING` (2), `$CRITICAL` (3).

## 5. Hysteresis

The conditional operator makes thresholds sticky so values hovering near the boundary do not spam notifications:

```
warn: $this > (($status >= $WARNING)  ? (75) : (85))
crit: $this > (($status == $CRITICAL) ? (85) : (95))
```

Read this as: trigger warning at 85, but once warning, do not clear until below 75. Same idea for critical at 95 clearing at 85. Use this whenever merging a Zabbix warn/crit pair.

## 6. Worked patterns

No-data / stale collection (the Zabbix `nodata` equivalent):

```
template: example_last_collected_secs
      on: apache.requests
    calc: $now - $last_collected_t
   every: 10s
    warn: $this > ( 5 * $update_every)
    crit: $this > (10 * $update_every)
```

Disk space percentage used (the Zabbix `vfs.fs.size[,pused]` equivalent):

```
template: disk_full_percent
      on: disk.space
    calc: $used * 100 / ($avail + $used)
   every: 1m
    warn: $this > 80
    crit: $this > 95
```

Predictive time-to-full (the Zabbix `timeleft` equivalent), as two cooperating entities:

```
template: disk_fill_rate
      on: disk.space
  lookup: max -1s at -30m unaligned of avail
    calc: ($this - $avail) / (30 * 60)
   every: 15s

template: disk_full_after_hours
      on: disk.space
    calc: $avail / $disk_fill_rate / 3600
   every: 10s
    warn: $this > 0 and $this < 48
    crit: $this > 0 and $this < 24
```
