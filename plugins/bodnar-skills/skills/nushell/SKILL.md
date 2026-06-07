---
name: "nushell"
description: "Comprehensive guide for writing Nushell (v0.112.2+) scripts, modules, and commands. Use when creating or working with Nushell code, pipelines, data transformations, structured data processing, custom commands, modules, or any task involving Nushell scripting. Covers syntax, idioms, functional programming patterns, Unix Philosophy principles, type system, error handling, testing, tooling (nu-lint, LSP, MCP), and v0.111/v0.112 features (try..catch..finally, let mid-pipeline, % sigil, from md, alias parent commands, new config options)."
---

# Nushell Skill

Comprehensive guide for writing idiomatic, functional Nushell code aligned with Unix Philosophy principles. Targets Nushell v0.112.2 and newer.

## Quick Start

Nushell is a modern, structured-data shell that extends Unix pipeline philosophy with a rich type system and functional programming patterns.

**Core Principles:**

- Data flows through pipelines as typed values, not just text
- Commands are composable functions
- Prefer immutable operations
- Use functional patterns (`each`, `where`, `reduce`)
- Follow Unix Philosophy: do one thing well

**Essential Patterns:**

```nushell
# Pipeline composition
ls | where size > 10mb | sort-by modified | first 5

# Structured data transformation
open data.json | select name age | where age > 21

# Functional iteration
[1 2 3 4] | each {|x| $x * 2 } | reduce {|acc, x| $acc + $x }

# String interpolation
let name = "World"
$"Hello, ($name)!"

# Type-safe transformations
"42" | into int | $in * 2

# let mid-pipeline (v0.111+): capture a value, keep flowing
"hello" | let msg | str length  # returns 5, $msg is "hello"

# try..catch..finally (v0.111+): finally always runs
try { risky } catch {|e| handle $e } finally { cleanup }
```

## When to Read References

The `references/` directory contains detailed documentation organized by topic:

1. **[references/deprecated-and-errors.md](references/deprecated-and-errors.md)** — Deprecated commands, removed commands, and common syntax errors.
   - Read when: encountering syntax errors, migrating older code, or verifying a command still exists.

2. **[references/quick-reference.md](references/quick-reference.md)** — Cheat sheet and quick tour.
   - Read when: need quick syntax lookup or getting started.

3. **[references/types-and-data.md](references/types-and-data.md)** — Types system and data structures.
   - Read when: working with complex types, type conversions, or structured data.

4. **[references/pipelines-and-composition.md](references/pipelines-and-composition.md)** — Pipeline patterns and the `$in` variable.
   - Read when: building complex pipelines or debugging `$in` behavior.

5. **[references/programming-guide.md](references/programming-guide.md)** — Variables, control flow, functions, error handling.
   - Read when: writing custom commands or complex logic.

6. **[references/modules-and-organization.md](references/modules-and-organization.md)** — Module creation and management.
   - Read when: creating reusable modules or organizing large projects.

7. **[references/scripts-and-cli.md](references/scripts-and-cli.md)** — Script files, main commands, shebangs.
   - Read when: creating standalone scripts or CLI tools.

8. **[references/style-guide.md](references/style-guide.md)** — Formatting, naming conventions, best practices.
   - Read when: ensuring code consistency or reviewing code.

9. **[references/testing.md](references/testing.md)** — Testing framework and assertions.
   - Read when: writing tests for modules or commands.

10. **[references/standard-library.md](references/standard-library.md)** — Standard library modules.
    - Read when: using std assertions, logging, or utilities.

11. **[references/special-variables.md](references/special-variables.md)** — `$nu`, `$env`, `$in`, and other special variables.
    - Read when: accessing system info or environment.

12. **[references/data-loading.md](references/data-loading.md)** — File formats, parsing, data import.
    - Read when: working with external data sources.

13. **[references/plugins.md](references/plugins.md)** — Plugin system and extensions.
    - Read when: using or creating plugins.

14. **[tooling.md](tooling.md)** — `nu-check`, `nu-lint`, `nu --lsp`, `nu --mcp`, IDE integration, CI/CD.
    - Read when: setting up validation, editor integration, or CI.

## Common Patterns

### Custom Commands

```nushell
# Basic command
export def greet [name: string] {
    $"Hello, ($name)!"
}

# With flags
export def greet [
    name: string
    --loud (-l)  # Flag with shorthand (boolean switch, no type)
] {
    let msg = $"Hello, ($name)!"
    if $loud { $msg | str upcase } else { $msg }
}

# Pipeline input
export def double []: int -> int {
    $in * 2
}

# Main command (for scripts)
def main [path: string, --verbose (-v)] {
    if $verbose { print "Processing..." }
    open $path | process
}
```

### Data Transformation

```nushell
# Table operations
ls
| where size > 1mb
| select name size modified
| sort-by size --reverse

# Record manipulation
{ name: "Alice", age: 30 }
| update age ($in.age + 1)
| insert job "Engineer"

# List processing
[1 2 3 4 5]
| each {|x| $x * 2 }
| where $in > 5
| reduce {|acc, x| $acc + $x }
```

### `let` Mid-Pipeline (v0.111+)

`let` can be placed inside a pipeline to capture a value and continue processing. The value passes through unchanged.

```nushell
# Capture and continue (value passes through)
"hello" | let msg | str length
# => 5
$msg
# => hello

# End of pipeline: value is assigned AND output
ls | length | let y
# => 36 (output)
$y
# => 36

# With $in mid-pipeline
10 | let x | $in + 5
# => 15
$x
# => 10
```

Use `| ignore` if you do not want the end-of-pipeline value displayed.

### Error Handling with `try..catch..finally` (v0.111+)

`finally` runs whether `try` succeeded, `catch` ran, a `return` was hit, or even `exit` was called.

```nushell
# Basic try..finally (cleanup always runs)
try { risky-operation } finally { cleanup }

# try..catch..finally
try {
    open file.txt
} catch {|e|
    print $"Error: ($e.msg)"
    ""
} finally {
    print "done"
}

# finally receives a value from try/catch
try { 111 } finally {|v| print $v }
# prints 111

try { 1 / 0 } finally {|v| print $v.msg }
# prints the error message

# finally runs even on early return
def work [] {
    try {
        return 10
    } finally {
        print "cleanup"
    }
}
work
# prints "cleanup" then returns 10

# finally runs even on exit (unless --abort)
try { exit } finally { print "saved!" }          # prints "saved!"
try { exit --abort } finally { print "saved!" }  # does NOT print
```

**Streaming note:** `try` does not stream if `catch` or `finally` exists. `catch` does not stream if `finally` exists.

### Explicitly Calling Built-ins with `%` (v0.112.1+)

The `%` sigil forces resolution to a built-in command, bypassing custom commands, aliases, and any shadowing. It is the complement to `^` (force external).

```nushell
# User shadowed the built-in
def ls [] { "my custom ls" }
ls           # calls the custom command
%ls          # calls the built-in ls
^ls          # calls the external binary

# Useful when a built-in has been hidden
hide version
version      # ERROR: not found
%version     # works, uses the built-in
```

Error if the name is not a built-in:

```nushell
%lss  # Error: "percent sigil requires a built-in command"
```

### Module Structure

```nushell
# module.nu
export def public-command [] {
    helper-function
}

# Local/private function
def helper-function [] {
    "internal use only"
}

# Export environment
export-env {
    $env.MY_VAR = "value"
}
```

### Aliasing Parent Commands (v0.111+)

Aliasing a parent command makes sub-commands usable under the alias.

```nushell
alias pl = polars
ps | pl into-df | pl select [(pl col name)] | pl collect

alias m = math
[1 2 3] | m sum
```

## Type System Essentials

**Primitives:** `int`, `float`, `string`, `bool`, `duration`, `filesize`, `date`
**Structured:** `list`, `record`, `table`, `range`
**Special:** `nothing` (null), `any`, `cell-path`, `closure`, `block`

**Type Annotations:**

```nushell
def typed [x: int]: list<string> -> string {
    $in | each {|s| $"($x): ($s)" } | str join "\n"
}
```

## Best Practices

1. **Naming Conventions:**
   - Commands: `kebab-case` (e.g., `fetch-user`)
   - Variables: `snake_case` (e.g., `user_id`)
   - Flags: `--kebab-case` (accessed as `$snake_case`)
   - Environment: `SCREAMING_SNAKE_CASE`

2. **Code Organization:**
   - Keep commands focused and composable
   - One command per file for large modules
   - Use `mod.nu` for directory modules
   - Export only public interfaces

3. **Pipeline Design:**
   - Prefer pipelines over nested calls
   - Use `$in` for pipeline values
   - Use `let` mid-pipeline for intermediate capture (v0.111+)
   - Return structured data, not strings
   - Design commands to compose

4. **Functional Style:**
   - Prefer `each`, `where`, `reduce` over loops
   - Use closures for data transformations
   - Avoid mutable variables in modules
   - Compose small, focused functions

5. **Documentation:**
   - Document all exported commands
   - Include examples in help text
   - Explain complex type signatures
   - Add module-level documentation

6. **Linting and Validation:**
   - Run `nu-check` for syntax validation
   - Run `nu-lint check` for idiomatic code
   - Set up `nu --lsp` in your editor for real-time feedback
   - See [tooling.md](tooling.md) for full setup

## Script Templates

Common script patterns are available in `scripts/`:

- `scripts/cli-tool.nu` — CLI tool with argument parsing
- `scripts/data-pipeline.nu` — Data transformation pipeline
- `scripts/module-template.nu` — Module structure template
- `scripts/test-syntax-patterns.nu` — Test suite demonstrating correct syntax patterns

The test script validates syntax patterns and can verify that common patterns work correctly:

```bash
nu scripts/test-syntax-patterns.nu
```

## Testing

```nushell
use std/assert

# Test command
def "test my-command" [] {
    assert equal (my-command "input") "expected"
    assert ($result | str contains "substring")
}

# Run tests
nu -c 'source tests.nu; test my-command'
```

## Performance Tips

1. Use streams for large data
2. Avoid collecting unless necessary
3. Filter early in pipelines
4. Use `--no-std-lib` for scripts that do not need it
5. Profile with `timeit` from `std/bench`
6. `par-each` (unordered) now streams as of v0.112.1
7. `input list` now streams upstream lists/ranges incrementally (v0.112.1)

## Removed Commands (v0.112.1)

These commands and flags were removed in v0.112.1 and will fail with parser errors:

| Removed | Replacement |
|---------|-------------|
| `random dice` | `std/random dice` |
| `metadata set --merge {...}` | `metadata set {\|\| merge {...} }` |
| `watch --debounce-ms <n>` | `watch --debounce <duration>` |
| `into value --columns` | `detect type --columns` |
| `into value --prefer-filesizes` | `detect type --prefer-filesizes` |
| `into value` (inference from strings) | `detect type` + `update cells` |

See [references/deprecated-and-errors.md](references/deprecated-and-errors.md) for migration details.

## Deprecated Commands

### `filter` → `where` (deprecated v0.105.0)

```nushell
# ❌ DEPRECATED
[1 2 3 4] | filter {|x| $x > 2 }

# ✅ CORRECT
[1 2 3 4] | where {|x| $x > 2 }
```

The `where` command accepts closure predicates from variables, making it fully equivalent to the old `filter` command.

## Common Syntax Errors

### 1. Boolean Switches Must Not Have Type Annotations

```nushell
# ❌ WRONG - type annotation on switch
def cmd [
    --verbose: bool = false
    --flag: bool
] { }

# ✅ CORRECT - plain switches (implicitly boolean)
def cmd [
    --verbose
    --flag
] { }
```

Switches are implicitly boolean. They default to `false` when not provided and `true` when provided. Adding `: bool` or `= false` causes a parser error. Since v0.111 switch flags are properly typed as `bool` at parse time.

### 2. Multi-line Boolean Expressions

```nushell
# ❌ WRONG - operators at line end
data | where {|x|
    ($x.field1 > 10) and
    ($x.field2 == "value") and
    ($x.field3 != null)
}

# ✅ CORRECT - wrap in parens, operators at line start
data | where {|x|
    (
        ($x.field1 > 10)
        and ($x.field2 == "value")
        and ($x.field3 != null)
    )
}
```

Nushell's parser treats `and`/`or` at the end of a line as incomplete. Wrap the expression in parentheses and place operators at the start of lines.

### 3. Closure Syntax

```nushell
# ❌ WRONG - missing parameter syntax for complex uses
[1 2 3] | each { $in * 2 }  # Only works for simple cases

# ✅ CORRECT - explicit parameter
[1 2 3] | each {|x| $x * 2 }
```

## Common Gotchas

1. **Mutable variables cannot be captured in closures**

   ```nushell
   # ❌ Error
   mut x = 0
   [1 2 3] | each { $x += 1 }

   # ✅ Use reduce instead
   [1 2 3] | reduce {|_, acc| $acc + 1 } --fold 0
   ```

2. **`$in` changes in different contexts**
   - First position in pipeline: refers to pipeline input
   - After pipe: refers to previous expression result
   - See [references/pipelines-and-composition.md](references/pipelines-and-composition.md) for details

3. **Commands vs Externals vs Built-ins**

   ```nushell
   ls       # Normal resolution (custom > built-in)
   ^ls      # External system command (forced)
   %ls      # Built-in (forced, v0.112.1+)
   ```

4. **String interpolation requires parentheses**

   ```nushell
   $"Value: ($x)"    # ✅
   $"Value: $x"      # ❌
   ```

5. **`it` is a reserved variable name (v0.111+)**

   ```nushell
   # ❌ Error in v0.111+
   let $it = 1
   mut $it = 1

   # ✅ Use any other name
   let item = 1
   ```

6. **`$nu`, `$env`, `$in` cannot be used as implicit loop variables (v0.112.1+)**

   ```nushell
   # ❌ Error
   for nu: int in [1 2 3] {}
   match [1 2 3] { [$in, $nu, $env] => ... }

   # ✅ Use different names
   for n in [1 2 3] {}
   ```

7. **`open file.md` returns an AST, not a string (v0.112.1+)**

   ```nushell
   # ❌ Surprise: now returns a structured AST
   open README.md

   # ✅ Get raw string
   open --raw README.md

   # ✅ Or hide the converter
   hide 'from md'
   open README.md  # now returns a string again
   ```

8. **`pipefail` is on by default (v0.111+)**

   ```nushell
   # A non-zero external exit code now fails the pipeline
   ^false | lines  # returns [] with failure status
   ```

## Unix Philosophy Alignment

Nushell embodies Unix Philosophy through:

- **Modularity**: small, composable commands
- **Composition**: rich pipeline support
- **Clarity**: structured data instead of text parsing
- **Simplicity**: intuitive syntax for common tasks
- **Extensibility**: module and plugin system

## Validation and Testing

### Pre-Generation Checklist

Before generating Nushell code, verify:

- [ ] No `filter` commands (use `where` instead)
- [ ] No removed commands: `random dice`, `metadata set --merge`, `watch --debounce-ms`, `into value --columns`, `into value --prefer-filesizes`
- [ ] Boolean switches have no type annotations
- [ ] Multi-line boolean expressions wrapped in parens
- [ ] `and`/`or` operators at start of lines, not end
- [ ] All closures use proper `{|param| body }` syntax
- [ ] Pipeline variables use `$in` correctly
- [ ] String interpolation uses `($var)` not `$var`
- [ ] No use of `it` as a variable name
- [ ] `open` on markdown files uses `--raw` if raw string is wanted

### Syntax Validation

Always validate generated Nushell scripts. Full tooling details in [tooling.md](tooling.md).

```bash
# Check syntax (built-in, fastest)
nu-check script.nu

# Lint for idiomatic issues (requires nu-lint)
nu-lint check script.nu

# Validate from a function
def validate-nushell-script [path: path] {
    try {
        ^nu -c $'nu-check ($path)'
        print $"✓ ($path) is valid"
        true
    } catch {
        print $"✗ ($path) has syntax errors"
        false
    }
}
```

### Version Compatibility

**This skill targets: Nushell v0.112.2+**

Before generating code, verify version compatibility:

```bash
nu --version  # Should be 0.112.2 or newer
```

**Known breaking changes by version:**

- **v0.112.1**: `from md` — `open *.md` now returns structured AST, not string (use `open --raw`)
- **v0.112.1**: `job tag` renamed to `job describe`; `--tag` flag renamed to `--description`
- **v0.112.1**: `$nu`, `$env`, `$in` reserved more aggressively in implicit variable declarations
- **v0.111.0**: `pipefail` is now the default (non-zero external exit code fails pipeline)
- **v0.111.0**: `it` is now a reserved variable name
- **v0.111.0**: `input list` was rewritten (config shape, flags, keybindings changed)
- **v0.111.0**: `mktemp` without a template creates in tmpdir, not cwd
- **v0.110.0**: `$nu.temp-path` and `$nu.home-path` renamed
- **v0.110.0**: glob dotfile matching changed
- **v0.108.0**: `into value` (string-to-type inference) deprecated, later removed in v0.112.1
- **v0.105.0**: `filter` deprecated → use `where`
- **v0.96.0**: Boolean switches no longer accept type annotations
- **v0.95.0**: Stricter closure parameter syntax

When uncertain about syntax or features, use the context7 MCP to fetch the latest Nushell documentation:

```
context7:resolve-library-id --libraryName "nushell"
context7:get-library-docs --context7CompatibleLibraryID "/nushell/nushell"
```

## New Features Quick Reference (v0.111 - v0.112.1)

| Feature | Version | Syntax |
|---------|---------|--------|
| `finally` block | v0.111.0 | `try { ... } catch { ... } finally { ... }` |
| `let` mid-pipeline pass-through | v0.111.0 | `"x" \| let v \| str length` |
| Alias parent commands | v0.111.0 | `alias pl = polars; pl into-df` |
| `umask` command | v0.111.0 | `umask 0022` |
| `clip copy` / `clip paste` (experimental) | v0.111.0 | `NU_EXPERIMENTAL_OPTIONS=native-clip` |
| `from md` structured parsing | v0.112.1 | `open README.md` returns AST |
| `%` sigil for built-ins | v0.112.1 | `%ls`, `%version` |
| `cell-path-types` (experimental) | v0.112.1 | `NU_EXPERIMENTAL_OPTIONS=cell-path-types` |
| `str escape-regex` | v0.112.1 | `$input \| str escape-regex` |
| `to nuon --list-of-records` | v0.112.1 | `ls \| to nuon --list-of-records` |
| `into duration` hh:mm:ss | v0.112.1 | `"3:34:0" \| into duration` |
| `url parse --base` | v0.112.1 | `$url \| url parse --base "https://..."` |
| `group-by --prune` | v0.112.1 | `$t \| group-by col --prune` |
| `frameless` table theme | v0.112.1 | `$env.config.table.mode = "frameless"` |
| `$env.config.history.path` | v0.112.1 | configurable history file location |
| `$env.config.hinter.closure` | v0.112.1 | custom autosuggest hints |
| `$env.config.auto_cd_implicit` | v0.112.1 | `cd` without `./` prefix |

## Additional Resources

- Official Docs: <https://www.nushell.sh>
- Command Reference: `help commands` or <https://www.nushell.sh/commands/>
- Cookbook: <https://www.nushell.sh/cookbook/>
- Lang Guide: <https://www.nushell.sh/lang-guide/>
- Blog / Release Notes: <https://www.nushell.sh/blog/>

## Version

**This skill targets Nushell v0.112.2 and newer.**

Always validate generated code with `nu-check` and test in your target Nushell version. See [tooling.md](tooling.md) for `nu-lint`, LSP, and MCP setup.
