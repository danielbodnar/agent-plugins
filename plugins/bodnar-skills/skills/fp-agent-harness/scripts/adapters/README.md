# Adapters

An adapter is a small module that implements one `Executor` for one provider.
The `Executor` type is defined in `../lib/core.ts`:

```
(rendered: string, closure: Closure) => Promise<string>
```

A rendered instruction plus the agent's closure go in; completion text comes
out. That is the entire provider interface. The kernel and the harness import
no adapter by name; an adapter is a value passed in at the edge, selected once
by configuration.

None of these adapters is special. The fake is a peer of the rest, and it is
what lets the whole kernel and a whole pipeline run offline and deterministically.

## Adding an adapter

Create `<name>.ts` exporting one function of type `Executor`. Read whatever the
provider needs from `closure` (model, sampling) and from the environment
(credentials). Keep the file small: it is mechanism, not policy. Map a transport
error to a thrown error; the kernel turns a missing or malformed completion into
a `Result` failure on its own.

## Provided here

- `fake.ts` — an offline executor backed by a reply function. No network.
- `http-json.ts` — a generic adapter for any HTTP endpoint that accepts and
  returns JSON. The endpoint, headers, and field paths are read from the
  closure, so one adapter covers most hosted and local model servers without a
  vendor name appearing anywhere.

## Selecting one

Selection happens at the edge, in the runner, by configuration. A runner reads
an environment variable or a config field, picks the matching adapter, and
hands the resulting `Executor` to the harness. The harness never sees the choice.
