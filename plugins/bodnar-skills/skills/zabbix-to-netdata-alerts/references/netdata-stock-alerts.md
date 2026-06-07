# Netdata stock alerts, discovery, and overrides

Netdata ships more than 900 stock health checks. The migration's first job is to reuse them, not rebuild them. This reference covers where they live, how to discover what already exists, and how to tune one without forking it.

## Contents

1. Where stock alerts live
2. Discovering what exists (MCP first, catalog second)
3. The adopt-and-tune override mechanism
4. The four-way classification, restated
5. MCP connection and token nuance

## 1. Where stock alerts live

On a running node, stock definitions are installed under `/usr/lib/netdata/conf.d/health.d/`, one file per subsystem. The canonical source, browsable without a node, is the repository:

`https://github.com/netdata/netdata/tree/master/src/health/health.d/`

Filenames map to subsystems and services: `cpu.conf`, `ram.conf`, `disks.conf`, `net.conf`, `httpcheck.conf`, `x509check.conf`, `postgres.conf`, `mysql.conf`, `redis.conf`, `ping.conf`, and many more. Each per-integration page in the Netdata integrations catalog also lists the alerts that ship with that collector. When you need to know whether an intent is already covered and at what threshold, read the matching file there.

## 2. Discovering what exists

Prefer the Netdata MCP when it is connected, because it answers against the live node rather than against assumptions:

- Metrics discovery searches contexts, instances, dimensions, and labels. Use it to confirm the exact `on` context and `of` dimension for a trigger, which removes the guesswork that otherwise becomes a `# TODO confirm context` note.
- Alert discovery lists the alerts already configured and raised on the node. Use it to see whether a stock alert already covers the trigger before you write anything.

When no MCP is connected, fall back to the repository catalog above, the integrations docs, and a reachable node's HTTP API: `http://NODE:19999/api/v1/charts` for contexts and `http://NODE:19999/api/v1/alarm_variables?chart=CHART` for the variables available to an expression.

## 3. The adopt-and-tune override mechanism

Stock alerts are loaded from the stock directory. To change one, you do not edit the stock file (your change would be lost on upgrade and, in current versions, stock files are managed). Instead you write an entity with the same name into the user directory `/etc/netdata/health.d/`, and it overrides the stock definition. Change only the lines that differ, typically `warn` and `crit`, sometimes `lookup` or `every`.

For example, if stock `disk.conf` warns at 80 percent and the Zabbix trigger warned at 90, the override is just enough to shift the threshold and record why:

```
# Override of stock disk_space_usage to match Zabbix threshold (was 80, Zabbix used 90)
template: disk_space_usage
      on: disk.space
    warn: $this > 90
    info: tuned from Netdata stock (80) to the Zabbix value (90)
```

Reuse the stock alert's exact name so the override binds to it. Confirm the name from the stock file or via the MCP rather than assuming it.

See the Netdata docs page "Overriding Stock Alerts" under Alerts and Notifications for the current rules, since the override loading behavior has changed across versions and is worth verifying against the node's version.

## 4. The four-way classification, restated

Every Zabbix trigger lands in exactly one bucket:

- **Adopt** when a stock alert already covers the intent at a comparable threshold. Emit nothing; record it.
- **Tune** when a stock alert covers the metric but the threshold or window differs materially. Emit a minimal override.
- **Author** when Netdata has the metric but ships no matching alert. Write a new entity; note any required collector.
- **Gap** when there is no clean Netdata equivalent. Flag-and-comment.

Bias toward Adopt and Tune. Reaching for Author when a stock alert exists creates a parallel alert that shadows the stock one and becomes a maintenance burden.

## 5. MCP connection and token nuance

The Netdata MCP has two endpoints. The Cloud endpoint `https://app.netdata.cloud/api/v1/mcp` sees all claimed nodes and authenticates with a Cloud API token carrying `scope:mcp`. A local agent or parent exposes `http://NODE:19999/mcp` and uses a locally generated API key for the sensitive functions. Either way the credential is an API token or local key, not an OAuth token, so an OAuth-only client environment cannot connect to it and should fall back to the catalog and HTTP API described above. The token is created in Netdata Cloud under User Settings, API Tokens.
