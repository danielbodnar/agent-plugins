# Daniel Bodnar's Agent Plugins Directory

`bodnar-agent-plugins` is a curated directory of high-quality plugins and skills for Claude Code, OpenCode, and other AI agents.

> **⚠️ Important:** Make sure you trust a plugin before installing, updating, or using it. This marketplace does not control what MCP servers, files, or other software are included in plugins and cannot verify that they will work as intended or that they won't change. See each plugin's homepage for more information.

> This directory was forked from Anthropic's [`claude-plugins-official`](https://github.com/anthropics/claude-plugins-public) marketplace and extended with Daniel Bodnar's personal skill bundles and additional sources. Individual plugins retain their original authors and homepages.

## Structure

- **`/plugins`** - First-party plugins and skills curated by Daniel Bodnar, plus plugins inherited from the upstream marketplace (each retains its original author)
- **`/external_plugins`** - Third-party plugins from partners and the community

## Installation

Plugins can be installed directly from this marketplace via Claude Code's plugin system.

To install, run `/plugin install {plugin-name}@bodnar-agent-plugins`

or browse for the plugin in `/plugin > Discover`

## Contributing

### First-party Plugins

First-party plugins are maintained in this repository. See `/plugins/example-plugin` for a reference implementation.

### External Plugins

Plugins can be added to the catalog by referencing their source repository. External plugins should meet reasonable quality and security standards. Open an issue or pull request to propose a new plugin.

## Daniel Bodnar repositories

This marketplace gathers Daniel Bodnar's skills and plugins in one place. Some are vendored or referenced directly as catalog entries; others live in their own repositories and are linked here for discovery:

**Referenced as installable catalog entries**

- [`claude-code-templates`](https://github.com/danielbodnar/claude-code-templates) - 870+ skills across 27 categories, exposed as `cct-*` entries
- [`compound-engineering-plugin`](https://github.com/danielbodnar/compound-engineering-plugin) - `compound-engineering`, `coding-tutor`
- [`nushell-dev`](https://github.com/danielbodnar/nushell-dev) - Nushell development plugin
- [`nushell-pro`](https://github.com/danielbodnar/nushell-pro) - Nushell best practices and security skill
- [`claude-skillz`](https://github.com/danielbodnar/claude-skillz) - 21 programming-workflow skills

**Vendored personal bundle**

- `bodnar-skills` - 28 personal skills (sourced from the private [`skills`](https://github.com/danielbodnar/skills) repository)

**Related repositories** (not yet wired as catalog entries)

- [`claude-plugins`](https://github.com/danielbodnar/claude-plugins), [`agentskills`](https://github.com/danielbodnar/agentskills), [`autoskills`](https://github.com/danielbodnar/autoskills), [`everything-claude-code`](https://github.com/danielbodnar/everything-claude-code), [`hallmark`](https://github.com/danielbodnar/hallmark), [`cloudflare-skills`](https://github.com/danielbodnar/cloudflare-skills), [`gws-cli`](https://github.com/danielbodnar/gws-cli)

## Plugin Structure

Each plugin follows a standard structure:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json      # Plugin metadata (required)
├── .mcp.json            # MCP server configuration (optional)
├── commands/            # Slash commands (optional)
├── agents/              # Agent definitions (optional)
├── skills/              # Skill definitions (optional)
└── README.md            # Documentation
```

## Skill-bundle plugins

When a plugin's source repository ships skills (`SKILL.md` files) without a `.claude-plugin/plugin.json` manifest, the marketplace entry can declare the skills directly using `strict: false` and an explicit `skills` array.

```json
{
  "name": "example-bundle",
  "description": "Brief description of the bundled skills.",
  "author": { "name": "Author Name" },
  "category": "development",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/example-org/sdk.git",
    "path": "packages/agent-skills",
    "ref": "main",
    "sha": "<commit sha>"
  },
  "strict": false,
  "skills": [
    "./skill-a",
    "./skill-b",
    "./skill-c"
  ],
  "homepage": "https://github.com/example-org/sdk"
}
```

Each path in `skills` is relative to `source.path` and points at a directory containing a `SKILL.md`. Paths can reach deeper than a single level — for example, `["./libA/skill-1", "./libB/skill-2"]` exposes a curated subset across multiple library subdirectories. Each skill is registered as `<plugin-name>:<skill-name>` in Claude Code.

For the underlying schema, see [Strict mode](https://code.claude.com/docs/en/plugin-marketplaces) in the marketplace documentation.

## License

Please see each linked plugin for the relevant LICENSE file.

## Documentation

For more information on developing Claude Code plugins, see the [official documentation](https://code.claude.com/docs/en/plugins).
