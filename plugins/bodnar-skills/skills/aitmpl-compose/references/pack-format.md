# Pack format

Packs are local syntactic sugar: named bundles of components that can be
referenced from a workflow.yaml. They always expand to upstream components
before YAML is emitted, so packs themselves never leave the local environment.

## File format

```yaml
name: "bodnar/cf-platform"
description: "Cloudflare Workers + observability + types base"
components:
  - { type: agent,   name: development-team/backend-developer }
  - { type: mcp,     name: development/cloudflare-developer-platform }
  - { type: command, name: deployment/deploy-cloudflare-worker }
  - { type: skill,   name: development/cloudflare-compose }
```

| Field | Required | Notes |
|------|------|------|
| `name` | yes | Pack identifier, conventionally `<scope>/<name>` (e.g. `bodnar/cf-platform`, `lauren/content-creator`) |
| `description` | yes | One-line description |
| `components` | yes | Array of `{ type, name }` entries where `name` is the upstream install identifier |

## Discovery cascade

Packs are loaded from three locations, in order. Later sources override
earlier ones by `name`:

1. **Bundled** (`<skill>/packs/*.yaml`)
2. **User-global** (`~/.config/aitmpl-compose/packs/*.yaml`)
3. **Project-local** (`<cwd>/.claude/packs/*.yaml`)

This lets a project pin a custom variant of a Bodnar pack without touching
the user-global or bundled copies.

## Authoring

Use `aitmpl-compose new-pack`:

```sh
aitmpl-compose new-pack \
  --name bodnar/cf-platform \
  --description "Cloudflare Workers + observability base" \
  --component agent:development-team/backend-developer \
  --component mcp:development/cloudflare-developer-platform \
  --component skill:development/cloudflare-compose \
  --scope user   # or project
```

Every `--component <type>:<install_name>` is validated against the live catalog
before the file is written. Unknown components fail with fuzzy-match suggestions.

## Forking

To customize a bundled pack:

```sh
aitmpl-compose packs show bodnar/cf-platform > ~/.config/aitmpl-compose/packs/bodnar__cf-platform.yaml
# Edit the file, then aitmpl-compose loads the user-global version.
```

## Using in a workflow

In a workflow.yaml (local, intermediate form):

```yaml
name: "BitBuilder Worker"
steps:
  - step: 1
    pack: "bodnar/cf-platform"
  - step: 2
    type: agent
    name: "development-team/rust-systems-expert"
```

Expand inline with `aitmpl-compose expand <workflow.yaml>`. The output is
ready for `npx claude-code-templates@latest --workflow ... --yes`.
