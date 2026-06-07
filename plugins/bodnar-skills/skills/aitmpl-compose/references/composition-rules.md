# Composition rules

When `aitmpl-compose compose` merges multiple sources into a single workflow,
the following rules apply, in order.

## 1. Source resolution

Sources are collected in this order:

1. `--templates <a,b,...>` — resolved against the known-templates table
2. `--workflows <path1,path2,...>` — parsed as YAML; `pack:` steps are expanded
3. `--packs <name1,name2,...>` — resolved against the pack discovery cascade
4. `--add <type:install_name>` — cherry-picked components (one per flag)

## 2. Validation against the catalog

Every resolved component is checked against the live catalog cached in
`~/.cache/aitmpl-compose/catalog.json`. Any unknown `(type, install_name)`
fails the operation with a fuzzy-match suggestion list.

The cache refreshes once per 24 hours. Force refresh with
`aitmpl-compose catalog refresh`.

## 3. Deduplication

Components are deduplicated by `(type, install_name)`. First occurrence wins
for ordering and pack-origin tracking. Order of sources:

> templates → workflows → packs → add

This means cherry-picked `--add` components always appear last within their
type group, after anything inherited from templates, workflows, or packs.

## 4. Conflict resolution

The upstream installer treats components as independent files. There is no
property-level merge (no settings.json key merging, no hook chain composition).
If two sources reference the same component by `(type, install_name)`,
deduplication makes the conflict invisible — the user gets one copy.

If two sources reference *different* settings that would conflict at install
time (e.g., two different `output-style` settings), the installer will overwrite
in arrival order. The composer surfaces this as a warning when more than one
`setting` component is selected.

## 5. Type ordering

Within the final workflow, steps are grouped and ordered by type:

```
agent → command → mcp → setting → hook → skill
```

This is the upstream best-practice order documented at
https://docs.aitmpl.com/guides/workflows#order-components-logically

Within each type group, components retain their source-arrival order.

## 6. Pack-origin traceability

Components inherited from a pack receive an inline trailing comment on their
`name` line:

```yaml
  - step: 3
    type: mcp
    name: development/cloudflare-developer-platform  # from pack: bodnar/cf-platform
```

Cherry-picked components (`--add`) have no such comment.

## 7. Header comment block

Every emitted workflow.yaml starts with a `#`-comment block listing:

- The composer timestamp
- Every template included
- Every workflow included by path
- Every pack expanded

This makes the file self-documenting for code review and team handoff.
