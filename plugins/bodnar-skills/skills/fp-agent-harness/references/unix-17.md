# The seventeen Unix rules

The harness is designed against the seventeen rules of the Unix philosophy as
stated in Eric Raymond's *The Art of Unix Programming*. Read this to understand
the design constraints, and check any change against the rules it touches.

| # | Rule | How the harness honors it |
|---|------|---------------------------|
| 1 | Modularity | Each prompt node is one part with a clean interface: text in, schema-checked value out. |
| 2 | Clarity | Prompt files are plain markdown; the kernel is small and reads top to bottom. |
| 3 | Composition | A node expects the output of an unknown upstream node; `pipe` connects them. |
| 4 | Separation | The kernel holds mechanism and stays pure; `sdk.ts` holds the one effect; prompts hold policy. |
| 5 | Simplicity | The schema is a flat record, the pipeline is a list, a node is one file. No format grows a feature it does not need. |
| 6 | Parsimony | The kernel is one small file. The harness is one script. Nothing larger was built than the job required. |
| 7 | Transparency | A prompt is its file. You can read, grep, and diff exactly what each stage asks the model. |
| 8 | Robustness | Robustness follows from rules 5 and 7: a small, visible system has few places to hide a fault. |
| 9 | Representation | Node config lives in the JSON metadata block, so the kernel logic stays plain and the knowledge sits in data. |
| 10 | Least surprise | A node reads stdin and writes stdout. A pipeline reads stdin and writes stdout. The shapes match across scales. |
| 11 | Silence | A compiled pipeline prints only its result. The harness prints one line per stage and nothing else. |
| 12 | Repair | `pipe` fails noisily at the first broken stage and names it. `Result` carries the reason rather than swallowing it. |
| 13 | Economy | The harness writes the pipeline so a human does not hand-tune prompts; `cached` spends no call twice. |
| 14 | Generation | Harness mode is a program that writes programs: it generates the agent files and the runner. |
| 15 | Optimization | The per-node loop gets a node past the deterministic gate first, then the judges tighten it. Working precedes minimal. |
| 16 | Diversity | The executor is injected, so any provider or a fake backs the same kernel. No single backend is assumed. |
| 17 | Extensibility | New behavior is a new combinator, a new agent file, or a new judge in the bank. The agent and pipeline formats stay stable. |

## The two rules that shape the harness most

**Transparency.** Everything the harness emits is plain text a person can read
without a tool. The agent is data, the pipeline is data, the executable plan
is prose. When a run goes wrong, the agent file shows precisely what was asked.

**Simplicity.** Simplicity is the hard target. The harness leans on it twice:
the formats stay minimal so the kernel stays small, and the per-node loop
drives every generated agent toward its smallest form that still passes the
deterministic gate and draws no further findings.
