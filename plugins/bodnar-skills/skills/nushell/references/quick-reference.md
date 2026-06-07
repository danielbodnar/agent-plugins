# Quick Reference

Cheat sheet and quick tour of Nushell essentials. Target: v0.112.2+.

## Table of Contents

- [New in v0.111 / v0.112](#new-in-v0111--v0112)
- [Cheat Sheet](#cheat-sheet)
- [Quick Tour](#quick-tour)

---

## New in v0.111 / v0.112

### Mid-Pipeline `let` (v0.111+)

```nushell
# Pass-through capture
"hello" | let msg | str length  # => 5,  $msg == "hello"

# End-of-pipeline capture (assigns AND outputs)
ls | length | let y  # prints 36, $y == 36

# With $in
10 | let x | $in + 5  # => 15, $x == 10
```

### `try..catch..finally` (v0.111+)

```nushell
try { risky } catch {|e| handle $e } finally { cleanup }

# finally receives the try/catch value (or error)
try { 1 / 0 } finally {|v| print $v.msg }

# Runs on early return and on exit (unless --abort)
try { exit } finally { print "saved!" }
```

### `%` Sigil for Built-ins (v0.112.1+)

Force resolution to a built-in command, bypassing shadowing.

```nushell
def ls [] { "custom" }
ls     # custom command
%ls    # built-in ls (forced)
^ls    # external binary (forced)
```

### Aliasing Parent Commands (v0.111+)

```nushell
alias pl = polars
ps | pl into-df | pl select [(pl col name)] | pl collect

alias m = math
[1 2 3] | m sum
```

### `from md` / Markdown Parsing (v0.112.1+)

```nushell
# Returns a structured AST by default
open README.md

# Get raw string instead
open --raw README.md

# Parse inline
"# Title" | from md
```

### New Commands (v0.112.1)

```nushell
# Escape strings for regex
"a.b*c" | str escape-regex   # => "a\.b\*c"

# Parse clock-style durations
"3:34:0" | into duration       # => 3hr 34min
"16:59:58.235" | into duration # => 16hr 59min 58sec 235ms

# Resolve relative URLs against a base
"/docs" | url parse --base "https://example.com"

# List-of-records NUON (one record per line, no inline-table shape)
ls | to nuon --list-of-records --indent 2

# Drop grouping columns after group-by
$table | group-by meta.year --prune
```

### New Config Options (v0.112.1)

```nushell
# Custom history file path (null disables history)
$env.config.history.path = "~/custom/history.txt"

# Space-prefixed commands skip history
$env.config.history.ignore_space_prefixed = true

# Type a directory name without ./ prefix
$env.config.auto_cd_implicit = true

# Custom hinter closure (fish-style autosuggestions)
$env.config.hinter.closure = {|ctx| ... }

# New frameless table theme
$env.config.table.mode = "frameless"
```

### Experimental Options (set via `NU_EXPERIMENTAL_OPTIONS` or `--experimental-option`)

| Name | Effect |
|------|--------|
| `native-clip` | Native `clip copy` / `clip paste` via OS API (replaces std/clip) |
| `cell-path-types` | Parse-time type inference for cell paths like `{foo: 1}.foo` |
| `pipefail` | On by default v0.111+; non-zero external exit fails pipeline |
| `reorder-cell-paths` | On by default v0.108+; reorders mutable cell assignment |

---

## Cheat Sheet

### Data Types

```nushell
# String to integer
"12" | into int

# Date conversion
date now | date to-timezone "Europe/London"

# Update record
{'name': 'nu', 'stars': 5, 'language': 'Python'} | upsert language 'Rust'

# Convert to YAML
[one two three] | to yaml

# Print table
[[framework, language]; [Django, Python] [Laravel, PHP]]
```

### Strings

```nushell
# String interpolation
let name = "Alice"
$"greetings, ($name)!"
# => greetings, Alice!

# Split on delimiter
let string_list = "one,two,three" | split row ","

# Check contains
"Hello, world!" | str contains "o, w"
# => true

# Join with delimiter
[zero one two] | str join ','
# => zero,one,two

# Substring
'Hello World!' | str substring 4..8
# => o Wor

# Parse into named columns
'Nushell 0.80' | parse '{shell} {version}'

# Parse CSV
"acronym,long\nAPL,A Programming Language" | from csv

# Color text
$'(ansi purple_bold)This text is a bold purple!(ansi reset)'
```

### Lists

```nushell
# Insert at index
[foo bar baz] | insert 1 'beeze'

# Update by index
[1, 2, 3, 4] | update 1 10

# Prepend
[1, 2, 3] | prepend 0

# Append
[1, 2, 3] | append 4

# First n items
[cammomile marigold rose forget-me-not] | first 2

# Iterate with each
[Mercury Venus Earth Mars] | each { |elt| $"($elt) is a planet" }

# Enumerate with index
let planets = [Mercury Venus Earth]
$planets | enumerate | each { |elt| $"($elt.index + 1) - ($elt.item)" }

# Reduce
[3 8 4] | reduce { |elt, acc| $acc + $elt }
# => 15

# Reduce with initial value
[3 8 4] | reduce --fold 1 { |elt, acc| $acc * $elt }
# => 96

# Access by index
let planets = [Mercury Venus Earth]
$planets.2
# => Earth

# Any condition
[Mercury Venus Earth] | any {|elt| $elt | str starts-with "E" }
# => true

# Take while condition
[-1 -2 9 1] | take while {|x| $x < 0 }
```

### Tables

```nushell
# Sort table
ls | sort-by size

# Sort and get first
ls | sort-by size | first 5

# Concatenate tables
let $a = [[first second third]; [foo bar snooze]]
let $b = [[first second third]; [hex seeze feeze]]
$a | append $b

# Drop column
let teams = [[team score]; ['Boston' 311] ['Warriors' 245]]
$teams | drop column
```

### Files and Filesystem

```nushell
# Open with default editor
start file.txt

# Save string to file
'lorem ipsum' | save file.txt

# Append to file
'dolor sit amet' | save --append file.txt

# Save record to JSON
{ a: 1, b: 2 } | save file.json

# Recursive glob search
glob **/*.{rs,toml} --depth 2

# Watch file for changes
watch . --glob=**/*.rs {|| cargo test }
```

### Custom Commands

```nushell
# With type annotation
def greet [name: string] {
    $"hello ($name)"
}

# With default parameter
def greet [name = "nushell"] {
    $"hello ($name)"
}

# Named parameter with flag
def greet [
    name: string
    --age: int
] {
    [$name $age]
}
greet world --age 10

# Flag as switch with shorthand
def greet [
    name: string
    --age (-a): int
    --twice
] {
    if $twice {
        [$name $age $name $age]
    } else {
        [$name $age]
    }
}

# Rest parameters (variadic)
def greet [...name: string] {
    print "hello all:"
    for $n in $name {
        print $n
    }
}
greet earth mars jupiter
```

### Variables

```nushell
# Immutable variable
let val = 42

# Shadowing
let val = 42
do { let val = 101; $val }
# => 101
$val
# => 42

# Mutable variable
mut val = 42
$val += 27
$val
# => 69

# Constant (parse-time)
const file = 'path/to/file.nu'
source $file

# Optional operator
let files = (ls)
$files.name?.0?

# Pipeline to variable
let big_files = (ls | where size > 10kb)
```

### Modules

```nushell
# Inline module
module greetings {
    export def hello [name: string] {
        $"hello ($name)!"
    }
}
use greetings hello
hello "world"

# Import with environment
# greetings.nu
export-env {
    $env.MYNAME = "Arthur"
}
export def hello [] {
    $"hello ($env.MYNAME)"
}

use greetings.nu
$env.MYNAME

# Main command
# greetings.nu
export def hello [name: string] {
    $"hello ($name)!"
}
export def main [] {
    "greetings and salutations!"
}

use greetings.nu
greetings
# => greetings and salutations!
```

---

## Quick Tour

### Nushell Commands Output Data

Unlike traditional shells, Nushell commands return structured data:

```nushell
ls
# Returns a table with columns: name, type, size, modified
```

### Acting on Data

```nushell
# Sort by size, largest first
ls | sort-by size | reverse

# Filter by size
ls | where size > 10kb
```

### More Than Just Directories

```nushell
# Process table
ps
# Returns: pid, ppid, name, status, cpu, mem, virtual

# Filter processes
ps | where status == Running
```

### Command Arguments in a Pipeline

Use `$in` to pass pipeline output as an argument:

```nushell
ls
| sort-by size
| reverse
| first
| get name
| cp $in ~
```

### Getting Help

```nushell
# Command help
help ls
ls --help

# Search help
help --find filesize

# All commands
help commands

# Interactive exploration
explore
$env.config | explore
```

### Key Differences from Unix Shells

1. **Structured Data**: Commands return typed data, not text
2. **Type System**: Files have filesize types, not strings
3. **Built-in Commands**: Cross-platform by default (use `^cmd` for system commands)
4. **describe Command**: Shows data types
5. **Pipeline Values**: Use `$in` to access pipeline data as a variable
