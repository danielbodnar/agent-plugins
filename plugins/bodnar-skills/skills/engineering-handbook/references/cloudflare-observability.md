# Cloudflare Observability Reference

How to wire up Cloudflare Workers Observability for the services your engineering handbook documents. This reference is the Cloudflare-specific implementation of the generic observability concepts in `monitoring-quality.md`. If your team runs Workers, this is the file your `observability.md` and `slos-and-error-budgets.md` handbook pages should link to and draw configuration from.

## Contents

- [The platform at a glance](#the-platform-at-a-glance)
- [Workers Logs](#workers-logs)
- [Logs Explorer](#logs-explorer)
- [Real-time logs (`wrangler tail`)](#real-time-logs-wrangler-tail)
- [Workers Tracing](#workers-tracing)
- [OpenTelemetry export](#opentelemetry-export)
- [Logpush](#logpush)
- [CLI workflow](#cli-workflow)
- [Wiring this into the handbook](#wiring-this-into-the-handbook)

## The platform at a glance

Cloudflare's observability surface for Workers covers logs, traces, and (soon) metrics through a single configuration block in `wrangler.jsonc`, with first-class OpenTelemetry export to whatever third-party stack you already use. The mental model:

| Layer | What it captures | Where you read it |
|---|---|---|
| Workers Logs | `console.log`, errors, exceptions, invocation metadata | Logs Explorer in the Cloudflare dashboard |
| Real-time logs | Live tail of the above | `bunx wrangler@latest tail` or the dashboard |
| Workers Tracing | OpenTelemetry spans for fetch, KV, R2, D1, DO, bindings | Workers Observability dashboard, or exported via OTLP |
| Logpush | Bulk export of trace events | R2, S3, Datadog, Splunk, any HTTP endpoint |
| OTLP export | Traces and logs streamed to your existing stack | Honeycomb, Grafana Cloud, Axiom, Sentry, SigNoz, Last9 |

All of this is enabled in `wrangler.jsonc` with a single block:

```jsonc
{
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1,
    "logs": {
      "enabled": true,
      "invocation_logs": true
    }
  }
}
```

New Workers created on Wrangler 3.78.6 or later get `observability.enabled = true` by default.

## Workers Logs

The Cloudflare-native log destination. Workers Logs automatically collects structured `console.log` output, errors, exceptions, and invocation metadata, indexes JSON fields with unlimited cardinality, and stores them queryable for the retention window of your plan (3 days on Free, 7 days on Paid as of April 2026; check current docs).

**Why JSON over string logs.** Workers Logs auto-extracts JSON fields and lets you filter and aggregate on any of them in Logs Explorer, including high-cardinality fields like user ID or request ID. String logs work but force full-text search; structured logs work like a queryable database.

```typescript
// Good: structured, queryable on any field
console.log({
  event: 'rollback_initiated',
  worker: 'client-payment-gateway',
  deployment_id: env.DEPLOYMENT_ID,
  reason: 'elevated_5xx_rate',
  user_id: request.cf?.user?.id,
})

// Less good: locked into full-text search
console.log(`Rollback initiated for client-payment-gateway by ${user_id}`)
```

**Sampling.** Set `head_sampling_rate` between 0 and 1 to log a percentage of requests. The default is 1 (everything). Useful for high-traffic Workers where 100% logging would push you past the daily quota (5 billion logs per account per day, after which a 1% sample applies for the rest of the day). Per-environment overrides go in `[env.staging.observability]` etc.

## Logs Explorer

The query-builder UI in the Cloudflare dashboard at Workers & Pages → your Worker → Observability. Lets you filter by any indexed field, save and share queries with the team, and pivot quickly between request volume, error rate, and slow requests. Treat it the same way you would treat Datadog Log Search or Honeycomb Query Builder.

**Practical conventions to document in your handbook:**

- Establish a small set of saved queries every engineer should know: "5xx in the last hour", "all logs for request ID X", "deploys in the last 24h". Pin these in the team channel and link from `incident-management.md`.
- Use a consistent `event` field across all your Workers. The handbook's `observability.md` should publish the canonical event vocabulary for the team.
- For client-facing Workers, include a `client_id` field on every log line. Filtering by client during a per-tenant incident is a common need.

## Real-time logs (`wrangler tail`)

For active debugging or watching a deploy, real-time logs stream to your terminal:

```bash
bunx wrangler@latest tail <worker-name>

# Filter to errors only
bunx wrangler@latest tail <worker-name> --status error

# Filter to a specific HTTP method or sample 10% of requests
bunx wrangler@latest tail <worker-name> --method POST --sampling-rate 0.1
```

The same stream is available in the dashboard's Real-time Logs tab if you would rather watch in a browser. Useful in the Step 2 ("Roll back the Worker") of the rollback procedure: tail the Worker before and after the rollback to confirm the error pattern stops.

## Workers Tracing

Open beta as of April 2026, billed alongside log events on Workers Free, Paid, and Enterprise plans (as of March 1, 2026). Workers Tracing automatically instruments every I/O operation in a Worker (fetch calls, KV reads/writes, R2 ops, Durable Object invocations, binding calls, handler invocations) and emits OpenTelemetry-compliant spans. No code changes; no SDK to install for the auto-instrumentation path.

To enable in `wrangler.jsonc`:

```jsonc
{
  "compatibility_date": "2026-04-01",
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1,
    "logs": { "enabled": true },
    "traces": {
      "enabled": true,
      "head_sampling_rate": 0.1
    }
  }
}
```

Sampling traces at 10% (0.1) is a reasonable default for a moderate-traffic production Worker; trace events are billed per span, and high-cardinality routes can produce many spans per request. Tune up to 1.0 for staging or low-volume Workers.

**Custom spans.** When you need application-level spans beyond auto-instrumentation, use `@microlabs/otel-cf-workers` to create child spans inside handlers. Document this pattern in your `observability.md` if your team has non-trivial business logic worth tracing.

**Reading traces.** The Workers Observability dashboard shows traces alongside the logs they correlate with (logs and spans share trace IDs automatically). Click into a trace to see the waterfall, click any span to jump to the corresponding log line.

## OpenTelemetry export

Workers Tracing emits OTLP, which means you can ship traces and correlated logs to any OTLP-compatible backend without code changes. As of April 2026, common destinations:

| Provider | OTLP endpoint pattern |
|---|---|
| Honeycomb | `https://api.honeycomb.io/v1/traces` |
| Grafana Cloud | `https://otlp-gateway-<region>.grafana.net/otlp/v1/traces` |
| Axiom | `https://api.axiom.co/v1/traces` |
| Sentry | `https://o<org>.ingest.sentry.io/api/<project>/envelope/` |
| SigNoz Cloud | `https://ingest.<region>.signoz.cloud:443/v1/traces` |
| Last9 | `https://otlp-aps1.last9.io/v1/traces` |

Configure the destination in the Cloudflare dashboard at Workers Observability → Destinations. Set the OTLP endpoint URL, any required auth headers (typically a bearer token or API key), and whether to send logs, traces, or both. Multiple destinations are supported; you can ship traces to Honeycomb and logs to a different stack if that fits your team's tooling.

**Authentication.** Most providers require an API key in a header. Use Cloudflare dashboard custom headers for this rather than embedding tokens in `wrangler.jsonc`, and rotate them on the same cadence as your other production secrets.

**Limitations during beta:** metrics export is not yet supported (only traces and logs); some providers are still rolling out OTLP support.

## Logpush

For bulk export to object storage or older log management systems that do not speak OTLP, Logpush jobs ship Workers Trace Event Logs to:

- R2 (cheapest if you only need long-term archival)
- S3 / GCS / Azure Blob
- HTTP destinations (Datadog, Splunk, New Relic legacy, etc.)

Configure via dashboard or `bunx wrangler@latest logpush create`. Useful for: compliance retention requirements that exceed Workers Logs' built-in window, feeding a SIEM that does not support OTLP, or batch analytics in DuckDB / Snowflake / BigQuery.

## CLI workflow

The day-to-day commands for engineers working with this observability stack:

```bash
# Deploy with observability config
bunx wrangler@latest deploy

# Real-time tail
bunx wrangler@latest tail <worker-name>

# Query historical logs (Logs Explorer is more featured, but the CLI is scriptable)
bunx wrangler@latest logs <worker-name> --search "deployment_id:abc123"

# Manage Logpush jobs
bunx wrangler@latest logpush list
bunx wrangler@latest logpush create --dataset workers_trace_events --destination 'r2://bucket-name/path/'
```

For the next-generation unified Cloudflare CLI (technical preview as of April 2026):

```bash
# Install or use ad-hoc via bunx
bunx cf@latest

# Pull scoped context for an AI agent working on this Worker
bunx cf@latest agent-context

# Deploy via the unified CLI (eventually parity with wrangler deploy)
bunx cf@latest deploy
```

For Claude Code or any other AI agent that needs Cloudflare-aware context loaded:

```bash
# Install the Cloudflare Skills bundle
bunx skills cloudflare
```

The Skills bundle ([github.com/cloudflare/skills](https://github.com/cloudflare/skills)) includes scoped skills for Wrangler CLI, Workers, Pages, KV, D1, R2, Workers AI, Agents SDK, MCP server patterns, and the Cloudflare-specific code review checklist. The agent loads only the skill it needs for a given task instead of pulling all Cloudflare docs into context.

## Wiring this into the handbook

The handbook pages most affected by this stack:

**`05-monitoring-and-quality/observability.md`** should document:

- That Workers Logs is the canonical destination, with the JSON-logging convention.
- The team's saved Logs Explorer queries (with names and links).
- The standard event vocabulary (`event: rollback_initiated`, etc.).
- Whether tracing is enabled, and at what sampling rate per environment.
- Where exported telemetry goes (Honeycomb? Grafana Cloud? Both?), with auth-rotation cadence.

**`05-monitoring-and-quality/slos-and-error-budgets.md`** (if present) should document:

- Which Workers Logs queries calculate the SLI for each SLO.
- Error budget burn rate calculations, with concrete query examples.
- What an alert on burn rate looks like (Cloudflare alert, or a third-party alert fed by exported OTLP data).

**`04-incident-management/rollback-procedure.md`** should reference:

- `bunx wrangler@latest tail` as the live debugging tool during Step 1 (Confirm).
- The relevant Logs Explorer saved query as the post-rollback verification step.
- The trace ID of the failing request (when tracing is enabled) as the key artifact to attach to the postmortem.

**`04-incident-management/postmortems.md`** should require:

- A trace link or Logs Explorer query link in every postmortem, not just a description.
- The exported-telemetry equivalents for teams that ship to a third-party stack.

When the handbook references `wrangler.jsonc` or any of these CLI commands, it should link back to this reference rather than re-explaining the setup. The whole point of the single-source-of-truth principle is that the configuration story lives once and is referenced from many process docs.
