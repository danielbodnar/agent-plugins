# Observability

Metrics, logs, traces. The three pillars and how we use them.

**DRI:** [TBD]
**Review cadence:** Quarterly
**Last reviewed:** [YYYY-MM-DD]

## Why this exists

Observability is what turns "the site is slow" into "the database query at line 47 of `OrderService` exceeded 500ms in 12% of requests for client X." The investment is in the framing (consistent event vocabulary, structured logs, sampled traces); the payoff is debugging time during incidents.

## [Body section heading]

[TBD: Fill in from `references/monitoring-quality.md` or the relevant skill reference. Keep imperative voice for processes, descriptive voice for context. Use concrete examples.]

## Success criteria

[TBD: List measurable outcomes that indicate this process is working.]

## Related

- [`../04-incident-management/slos-and-error-budgets.md`](../04-incident-management/slos-and-error-budgets.md): the SLOs measured against this telemetry
- [`performance.md`](./performance.md): the latency story observability surfaces
