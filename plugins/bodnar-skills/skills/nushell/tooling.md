# Nushell Tooling Reference

Comprehensive guide for nu-lint, nu --lsp, nu --mcp, IDE integration, CI/CD pipelines, and development workflows.

## Table of Contents

- [Validation Hierarchy](#validation-hierarchy)
- [nu-check — Syntax Validation](#nu-check--syntax-validation)
- [nu-lint — Linting](#nu-lint--linting)
- [nu --lsp — Language Server Protocol](#nu---lsp--language-server-protocol)
- [nu --mcp — Model Context Protocol](#nu---mcp--model-context-protocol)
- [IDE / Editor Integration](#ide--editor-integration)
- [CI/CD Integration](#cicd-integration)
- [Pre-commit Hooks](#pre-commit-hooks)
- [Debugging](#debugging)

---

## Validation Hierarchy

Nushell validation tools form a layered hierarchy, from fast syntax checks to deep idiomatic analysis:

| Tool | Purpose | Speed | Scope |
|------|---------|-------|-------|
| `nu-check` | Syntax & parse validation | Fastest | Syntax errors only |
| `nu-lint check` | Idiomatic linting | Fast | Style, patterns, best practices |
| `nu-lint --lsp` | Real-time linting in editor | Continuous | Same as nu-lint, streamed |
| `nu --lsp` | Full LSP (completion, hover, goto) | Continuous | Parser diagnostics + IDE features |

**Recommended setup:** Use `nu --lsp` for general IDE support and `nu-lint --lsp` as a secondary language server for additional lint rules.

---

## nu-check — Syntax Validation

Built into Nushell. Validates that code parses correctly without executing it.

```bash
# Check a script file
nu-check script.nu

# Check as module (validates exports)
nu-check --as-module module.nu

# Verbose/debug output
nu-check --debug script.nu

# Check from string
echo 'ls | where size > 1mb' | nu-check --stdin
```

**Use cases:**
- Quick pre-flight validation in CI
- Verifying syntax before committing
- Testing module structure without loading

**Limitations:** Only catches parse errors, not logic errors or style issues. Use `nu-lint` for deeper analysis.

---

## nu-lint — Linting

Third-party linter that analyzes Nushell code for idiomatic patterns and potential improvements.

### Installation

```bash
cargo install nu-lint
```

### CLI Usage

```bash
# Lint a file
nu-lint check script.nu

# Lint recursively
nu-lint check --recursive ./src/

# Start as LSP server (for editors)
nu-lint --lsp
```

### Configuration (.nu-lint.toml)

Place in project root to configure rules:

```toml
# Ignore specific rules by name
ignored = ["snake_case_variables"]

# Global settings for configurable rules
max_pipeline_length = 80
pipeline_placement = "start"

# Set lint severity for entire groups of rules
[groups]
performance = "warning"
type-safety = "error"

# Override individual rule severity
[rules]
dispatch_with_subcommands = "hint"
turn_positional_into_stream_input = "warning"
```

### Key Rules

**`turn_positional_into_stream_input`** — Encourages lazy pipeline input over positional list arguments:
```nushell
# ❌ Loads all data into memory
def process-data [data] {
    $data | where active == true
}

# ✅ Processes elements lazily via pipeline
def process-data []: list<record> -> list<record> {
    $in | where active == true
}
```

**`dispatch_with_subcommands`** — Suggests using Nushell's subcommand dispatch pattern.

**Compatibility:** nu-lint rule definitions are compatible with the official Nu parser (`nu-parser`) and the TreeSitter-based formatter (`topiary-nushell`).

---

## nu --lsp — Language Server Protocol

Nushell's built-in LSP server, powered by the `nu-lsp` crate.

### Starting

```bash
nu --lsp
```

### Capabilities

| Feature | Description |
|---------|-------------|
| Completion | Commands, variables, flags, custom completions |
| Hover | Command signatures, help text, type info |
| Go to Definition | Jump to command/variable definitions |
| Diagnostics | Parser errors and warnings in real-time |
| Document Symbols | Navigate command definitions in a file |

### LSP Detection

Use `$nu.is-lsp` (added v0.108.0) to guard against side effects during LSP analysis:

```nushell
# In env.nu or config.nu
if not $nu.is-lsp {
    # These only run in interactive/script mode
    print "Welcome!"
    some-expensive-startup
}
```

### Editor Configurations

See the [IDE / Editor Integration](#ide--editor-integration) section below.

---

## nu --mcp — Model Context Protocol

Built-in MCP server for AI agent integration.

| Version | Availability |
|---------|-------------|
| v0.108.0 | Optional (compile with `mcp` feature) |
| v0.110.0+ | Included by default |

### Starting

```bash
nu --mcp
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `list_commands` | List all available commands with signatures |
| `command_help` | Detailed help for a specific command |
| `evaluate` | Execute Nushell code, return structured results |

### Configuration for AI Agents

**Claude Code** (`~/.claude/mcp.json`):
```json
{
    "mcpServers": {
        "nushell": {
            "command": "nu",
            "args": ["--mcp"]
        }
    }
}
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
    "mcpServers": {
        "nushell": {
            "command": "nu",
            "args": ["--mcp"]
        }
    }
}
```

### v0.110.0 Improvements

- **State persistence**: REPL-style state carries across evaluations within a session
- **Structured responses**: Results returned in structured format for better AI parsing

### Third-party MCP servers

For more control or sandboxing, consider:
- [mcp-server-nu](https://github.com/cablehead/mcp-server-nu) — spawns `nu -c` processes
- [nu-mcp](https://github.com/ck3mp3r/nu-mcp) — Rust-based with extensible tool system and security sandbox

---

## IDE / Editor Integration

### Zed

Nushell LSP (`settings.json`):
```json
{
    "languages": {
        "Nushell": {
            "language_servers": ["nu-lsp"]
        }
    },
    "lsp": {
        "nu-lsp": {
            "binary": {
                "path": "nu",
                "arguments": ["--lsp"]
            }
        }
    }
}
```

nu-lint: Install the [Nu-Lint extension](https://zed.dev/extensions/nu-lint) from the Zed extension marketplace.

### Neovim

**nu --lsp** via nvim-lspconfig:
```lua
require("lspconfig").nushell.setup({
    cmd = { "nu", "-I", vim.fn.getcwd(), "--no-config-file", "--lsp" },
    filetypes = { "nu" },
})
```

**nu-lint** as additional LSP:
```lua
vim.lsp.config['nu-lint'] = {
    cmd = { 'nu-lint', '--lsp' },
    filetypes = { 'nu' },
    root_markers = { '.git' }
}
vim.lsp.enable('nu-lint')
```

### VS Code

- Install [vscode-nushell-lang](https://marketplace.visualstudio.com/items?itemName=TheNuProjectContributors.vscode-nushell-lang) for syntax highlighting and LSP
- Install [nu-lint-vscode](https://marketplace.visualstudio.com/items?itemName=WillemVanhulle.nu-lint) for linting

### Emacs

**nu-lint** via Eglot (built-in since Emacs 29):
```elisp
(with-eval-after-load 'eglot
  (add-to-list 'eglot-server-programs
    '(nushell-mode "nu-lint" "--lsp")))
```

### Kate

Add to `~/.config/kate/lspclient/settings.json`:
```json
{
    "servers": {
        "nushell": {
            "command": ["nu-lint", "--lsp"],
            "highlightingModeRegex": "^Nushell$"
        }
    }
}
```

### Helix

Tree-sitter queries for Nushell are integrated into Helix. The LSP can be configured in `languages.toml`:
```toml
[[language]]
name = "nu"
language-servers = ["nu-lsp"]

[language-server.nu-lsp]
command = "nu"
args = ["--lsp"]
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Nushell CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Nushell
        uses: hustcer/setup-nu@v3
        with:
          version: '0.110.0'
      - name: Install nu-lint
        run: cargo install nu-lint
      - name: Syntax check
        run: nu -c "glob **/*.nu | each { |f| nu-check $f }"
      - name: Lint
        run: nu-lint check --recursive ./src/

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Nushell
        uses: hustcer/setup-nu@v3
        with:
          version: '0.110.0'
      - name: Run tests
        run: nu tests/run_all.nu
```

### Validation Script

```nushell
# validate.nu — Run all checks
def main [--fix] {
    print "🔍 Checking syntax..."
    let nu_files = glob **/*.nu

    let syntax_results = $nu_files | each {|f|
        let result = do { ^nu-check $f } | complete
        {file: $f, ok: ($result.exit_code == 0), error: $result.stderr}
    }

    let failures = $syntax_results | where not ok
    if ($failures | is-not-empty) {
        print $"❌ Syntax errors in ($failures | length) files:"
        $failures | each {|f| print $"  ($f.file): ($f.error)" }
        exit 1
    }
    print $"✅ All ($nu_files | length) files pass syntax check"

    print "🔍 Running nu-lint..."
    let lint_result = do { ^nu-lint check --recursive . } | complete
    if $lint_result.exit_code != 0 {
        print $lint_result.stdout
        print "⚠️  Lint warnings found"
    } else {
        print "✅ No lint issues"
    }
}
```

---

## Pre-commit Hooks

### Git pre-commit hook

Save as `.git/hooks/pre-commit` (make executable with `chmod +x`):

```nu
#!/usr/bin/env nu

# Lint all staged .nu files
let files = (
    ^git diff --cached --name-only --diff-filter=d
    | lines
    | where ($it | str ends-with ".nu")
)

if ($files | is-empty) {
    exit 0
}

mut has_errors = false

$files | each {|f|
    let result = do { ^nu-check $f } | complete
    if $result.exit_code != 0 {
        print $"❌ ($f):"
        print $result.stderr
        $has_errors = true
    }
}

if $has_errors {
    print "\nFix syntax errors before committing."
    exit 1
}

print $"✅ ($files | length) Nushell files pass"
```

---

## Debugging

### Common debugging techniques

```nushell
# Inspect pipeline values
ls | inspect | where size > 1mb

# Print intermediate values
ls | each {|f| print $f; $f } | where size > 1mb

# Use describe to check types
$value | describe

# Time operations
use std/bench
timeit { open large-file.json | get items | length }

# With --output (v0.110.0+) to get both result and duration
timeit --output { open large-file.json | get items | length }

# Check variable memory size (v0.110.0+)
scope variables | select name mem_size

# Free memory from large variables (v0.110.0+)
unlet $large_data
```

### Debug environment

```nushell
# Show Nushell build info
version

# Check if newer version exists
version check

# Show all config
$env.config

# List loaded plugins
plugin list

# Check where config files are
echo $nu.config-path
echo $nu.env-path
```
