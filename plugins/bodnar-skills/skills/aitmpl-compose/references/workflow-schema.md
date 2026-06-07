# Workflow and template schemas

## workflow.yaml (upstream-native, the primary output)

The format is documented at https://docs.aitmpl.com/guides/workflows.

```yaml
name: "Display name of the workflow"
description: "Optional description"
tags:
  - tag-a
  - tag-b

steps:
  - step: 1
    type: agent          # agent | command | mcp | setting | hook | skill
    name: "category/leaf-name"
  - step: 2
    type: mcp
    name: "development/github-integration"
```

| Field | Required | Notes |
|------|------|------|
| `name` | yes | Display name (any string) |
| `description` | no | Free-form |
| `tags` | no | Array of strings, used for discovery |
| `steps` | yes | Ordered list |
| `steps[].step` | yes | Integer for ordering |
| `steps[].type` | yes | One of `agent`, `command`, `mcp`, `setting`, `hook`, `skill` |
| `steps[].name` | yes | Install identifier in `category/leaf-name` format |

Install with:

```sh
npx claude-code-templates@latest --workflow path/to/workflow.yaml --yes
```

## Bodnar pack: extension (always expanded before emission)

A workflow.yaml authored locally may include `pack:` entries. These are NOT
upstream-native and must be expanded by `aitmpl-compose expand` (or implicitly
by `aitmpl-compose compose`) before the YAML hits disk for upstream install.

```yaml
# Local-only intermediate form. Not directly installable.
name: "BitBuilder Worker"
steps:
  - step: 1
    pack: "bodnar/cf-platform"
  - step: 2
    type: agent
    name: "development-team/rust-systems-expert"
```

After expansion the file contains only upstream-compatible `type`/`name` steps.

## template.json (upstream catalog format, secondary output)

Templates are the 14 curated bundles in the upstream catalog. To contribute
a new one upstream, emit a `template.json`:

```json
{
  "name": "fullstack-web",
  "description": "Complete fullstack web development setup",
  "components": {
    "agents": ["development-team/frontend-developer", "development-team/backend-developer"],
    "commands": ["testing/setup-testing"],
    "mcps": ["development/github-integration"],
    "hooks": ["git/conventional-commits"],
    "settings": []
  }
}
```

Install:

```sh
npx claude-code-templates@latest --template fullstack-web
```

Emit via `aitmpl-compose compose --emit-template --out template.json ...`.
