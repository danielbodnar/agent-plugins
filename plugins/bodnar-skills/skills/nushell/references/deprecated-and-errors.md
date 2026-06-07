# Deprecated Commands and Common Errors

Quick reference for avoiding deprecated commands, removed commands, and common Nushell syntax errors. Current target: v0.112.2+.

## Table of Contents

- [Removed Commands (Hard Errors)](#removed-commands-hard-errors)
- [Deprecated Commands](#deprecated-commands)
- [Reserved Names](#reserved-names)
- [Common Syntax Errors](#common-syntax-errors)
- [Migration Patterns](#migration-patterns)
- [Error Messages and Solutions](#error-messages-and-solutions)
- [Version History](#version-history)

---

## Removed Commands (Hard Errors)

These commands and flags no longer exist. Using them produces a parser or runtime error.

### `random dice` — removed v0.112.1

```nushell
# ❌ REMOVED
random dice

# ✅ CORRECT
use std/random
random dice
```

### `metadata set --merge` — removed v0.112.1

```nushell
# ❌ REMOVED
"data" | metadata set --merge {key: value}

# ✅ CORRECT (closure form)
"data" | metadata set {|| merge {key: value} }
```

### `watch --debounce-ms` — removed v0.112.1

```nushell
# ❌ REMOVED
watch . --debounce-ms 500 {|| cargo test }

# ✅ CORRECT (use duration)
watch . --debounce 500ms {|| cargo test }
```

### `into value --columns` and `--prefer-filesizes` — removed v0.112.1

`into value` no longer performs type inference from strings. The inference features moved to `detect type`.

```nushell
# ❌ REMOVED
$table | into value --columns [size count]
$table | into value --prefer-filesizes

# ✅ CORRECT
$table | detect type --columns [size count]
$table | detect type --prefer-filesizes

# ✅ CORRECT (for per-cell conversion)
$table | update cells {|cell| $cell | detect type }
```

### `job tag` renamed to `job describe` — v0.112.1

```nushell
# ❌ REMOVED
job tag 1 "my job"

# ✅ CORRECT
job describe 1 "my job"

# The --tag flag on job spawn was renamed to --description
job spawn --description "my job" {|| sleep 10sec }

# The tag column in job list is now description
job list | select id description
```

---

## Deprecated Commands

These still work but emit deprecation warnings. Migrate before they get removed.

### `filter` → `where` (deprecated v0.105.0)

**Replacement:** `where`

```nushell
# ❌ DEPRECATED
[1 2 3 4 5] | filter {|x| $x > 2 }
data | filter {|row| $row.active == true }

# ✅ CORRECT
[1 2 3 4 5] | where {|x| $x > 2 }
data | where {|row| $row.active == true }
```

The `where` command was enhanced to accept closure predicates from variables, making `filter` redundant. Simply replace `filter` with `where`.

### `metadata set --datasource-ls` → `--path-columns` (deprecated v0.111.0)

```nushell
# ❌ DEPRECATED
[[name color]; [Cargo.lock '#ff0000']] | metadata set --datasource-ls

# ✅ CORRECT
[[name color]; [Cargo.lock '#ff0000']] | metadata set --path-columns [name]
```

### `ShellError::GenericError` → `ShellError::Generic` (plugin devs, v0.112.1)

For plugin developers only. The old variant is deprecated.

```rust
// Deprecated
ShellError::GenericError { ... }

// Use instead
ShellError::Generic(GenericError { ... })
```

---

## Reserved Names

Names that cannot be used as user variables.

### `it` — reserved as of v0.111.0

```nushell
# ❌ ERROR
let $it = 1
mut $it = 1

# ✅ CORRECT
let item = 1
```

Note: `it` was re-enabled for bare `let it = 1` (without the `$` sigil) in v0.112.1, but using the `$it` form is still forbidden.

### `$nu`, `$env`, `$in` — reserved in implicit declarations as of v0.112.1

These cannot appear as implicit variable names in `for`, `match`, or other contexts that declare variables.

```nushell
# ❌ ERROR
for nu: int in [1 2 3] {}
match [1 2 3] { [$in, $nu, $env] => { $in + $nu + $env }, _ => 0 }

# ✅ CORRECT
for n in [1 2 3] {}
match [1 2 3] { [$a, $b, $c] => { $a + $b + $c }, _ => 0 }
```

---

## Common Syntax Errors

### 1. Boolean Switches with Type Annotations

**Error:**
```
Error: nu::parser::error
× Type annotations are not allowed for boolean switches.
```

**Cause:** Adding type annotations or default values to boolean switches.

```nushell
# ❌ WRONG
def command [
    --verbose: bool
    --debug: bool = false
    --quiet = false
] { }

# ✅ CORRECT
def command [
    --verbose
    --debug
    --quiet
] { }
```

Boolean switches are implicitly `bool`. They default to `false` when absent and `true` when present. Adding `: bool` or `= false` causes a parser error. Since v0.111.0, parse-time type checking recognises them as `bool` automatically.

### 2. Incomplete Boolean Expressions

**Error:**
```
Error: nu::parser::incomplete_math_expression
× Incomplete math expression.
```

**Cause:** Boolean operators (`and`, `or`) at the end of a line.

```nushell
# ❌ WRONG
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

Nushell's parser treats expressions ending with `and`/`or` as incomplete. Wrap the expression in parentheses and place operators at the start of lines.

### 3. Mutable Variables in Closures

**Error:**
```
Error: nu::parser::mutable_variable_in_closure
× Mutable variable captured in closure
```

```nushell
# ❌ WRONG
mut sum = 0
[1 2 3 4] | each { $sum += $in }

# ✅ CORRECT (functional)
let sum = [1 2 3 4] | reduce {|item, acc| $acc + $item } --fold 0

# ✅ CORRECT (for loop)
mut sum = 0
for item in [1 2 3 4] {
    $sum += $item
}
```

Closures capture variables by value. Use `reduce` or loops for accumulation.

### 4. Missing Closure Parameters

```nushell
# ⚠️  INCONSISTENT - $in works in simple cases only
[1 2 3] | each { $in * 2 }

# ✅ CORRECT - explicit parameter
[1 2 3] | each {|x| $x * 2 }
[{name: "Alice"}] | each {|person| $person.name | str upcase }
```

Explicit parameters are more readable and always work.

### 5. String Interpolation Without Parentheses

```nushell
# ❌ WRONG
let name = "World"
$"Hello, $name"

# ✅ CORRECT
$"Hello, ($name)"

# ✅ CORRECT - complex expressions
let count = 42
$"Double is (($count * 2))"
```

Nushell requires parentheses around interpolated expressions.

### 6. `open` on Markdown Returns an AST (v0.112.1+)

```nushell
# ⚠️  BEHAVIOR CHANGE - returns structured AST, not a string
open README.md

# ✅ CORRECT - explicit raw string
open --raw README.md

# ✅ CORRECT - if you want the old behavior globally
hide 'from md'
open README.md  # now returns a string again
```

The `from md` command was added in v0.112.1. Because `open` dispatches to `from <ext>`, `open *.md` now returns an AST by default.

### 7. Non-Zero External Exit Codes Fail Pipelines (v0.111+)

`pipefail` is on by default as of v0.111.0.

```nushell
# This now returns [] with a failure exit status
^false | lines

# To explicitly ignore a failure:
try { ^false | lines } catch { [] }

# To opt out of pipefail for a script:
# Use the `--no-config-file` and unset the experimental option,
# or use: do { $env.config.error_style = "plain"; ^false | lines }
```

---

## Migration Patterns

### Migrating from `filter` to `where`

```nushell
# Simple
ls | filter {|f| $f.size > 1mb }        # ❌
ls | where {|f| $f.size > 1mb }          # ✅

# Multi-line conditions
data | filter {|row|                     # ❌
    ($row.status == "active") and
    ($row.count > 10)
}
data | where {|row|                      # ✅
    (
        ($row.status == "active")
        and ($row.count > 10)
    )
}
```

### Migrating `metadata set --merge`

```nushell
# Before (removed v0.112.1)
$data | metadata set --merge {content_type: "application/json"}

# After
$data | metadata set {|| merge {content_type: "application/json"} }
```

### Migrating `into value` Inference

```nushell
# Before (removed v0.112.1) - inferred types from strings
"42" | into value              # was int
["42" "3.14" "true"] | into value

# After - use detect type
"42" | detect type
["42" "3.14" "true"] | each { detect type }

# For tables
$table | update cells {|cell| $cell | detect type }
$table | detect type --columns [col_a col_b]
```

### Fixing Boolean Switch Definitions

```nushell
# Before (error)
def command [
    --verbose: bool = false
    --count: int = 10
] { }

# After (switches plain, typed flags unchanged)
def command [
    --verbose
    --count: int = 10
] { }
```

---

## Error Messages and Solutions

### Quick Lookup Table

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Command deprecated` (for `filter`) | Using `filter` | Replace with `where` |
| `unknown command random dice` | Removed command | Use `std/random dice` |
| `unknown flag --debounce-ms` | Removed flag | Use `--debounce <duration>` |
| `Type annotations are not allowed for boolean switches` | `: bool` on switch | Remove type annotation |
| `Incomplete math expression` | `and`/`or` at line end | Wrap in parens, operators at line start |
| `Mutable variable captured in closure` | Modifying `mut` in closure | Use `reduce` or a `for` loop |
| `Expected parameter declaration` | Missing closure parameter | Add `{\|param\| ... }` |
| `Unexpected token` in string | `$var` without parens | Use `($var)` |
| `External command had a non-zero exit code` | `pipefail` catches external failure | Wrap in `try`/`catch` if intentional |
| `percent sigil requires a built-in command` | Used `%name` where `name` is not built-in | Remove `%` or use `^name` for external |

### Validation Checklist

Before running Nushell code, verify:

- [ ] No `filter` commands (use `where`)
- [ ] No removed commands: `random dice`, `watch --debounce-ms`, `metadata set --merge`, `into value --columns/--prefer-filesizes`, `job tag`
- [ ] Boolean switches have no type annotations
- [ ] Multi-line boolean expressions wrapped in parens
- [ ] `and`/`or` at start of lines, not end
- [ ] Closure parameters explicitly declared
- [ ] String interpolation uses `($var)`
- [ ] No mutable variables captured in closures
- [ ] No `$it` as a variable name (use `$item`)
- [ ] `$nu`, `$env`, `$in` not used as implicit loop variables
- [ ] `open` on markdown files uses `--raw` if a string is wanted

### Testing Your Code

```bash
# Syntax check (built-in)
nu-check your-script.nu

# Lint (requires nu-lint)
nu-lint check your-script.nu

# Run with verbose errors
nu --log-level debug your-script.nu
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v0.112.2 | 2026-04-15 | Bug fixes: script arg quoting, `input list` regressions |
| v0.112.1 | 2026-04-11 | `from md` breaking; `%` sigil; `cell-path-types` experimental; removed `random dice`, `metadata set --merge`, `watch --debounce-ms`, `into value` inference; `job tag` → `job describe`; `$nu/$env/$in` reserved in implicit decls |
| v0.111.0 | 2026-02-28 | `try..catch..finally`; `let` mid-pipeline pass-through; alias parent commands; `input list` rewrite; `pipefail` default; `it` reserved; `umask` command; experimental `native-clip` |
| v0.110.0 | 2026-01-17 | `let` at end of pipeline; `unlet`; `$nu.temp-path`/`$nu.home-path` renamed; glob dotfile behavior |
| v0.108.0 | 2025-10-15 | MCP server; `pipefail` experimental option; `reorder-cell-paths` default; `into value` inference deprecated |
| v0.105.0 | 2025-05-?? | `filter` deprecated, use `where` |
| v0.96.0  | —          | Boolean switches cannot have type annotations |
| v0.95.0  | —          | Stricter closure parameter requirements |

## See Also

- [SKILL.md](../SKILL.md) — Main Nushell skill documentation
- [pipelines-and-composition.md](./pipelines-and-composition.md) — Pipeline patterns
- [programming-guide.md](./programming-guide.md) — Language features
- [../tooling.md](../tooling.md) — `nu-check`, `nu-lint`, LSP, MCP
- [test-syntax-patterns.nu](../scripts/test-syntax-patterns.nu) — Test suite with examples
