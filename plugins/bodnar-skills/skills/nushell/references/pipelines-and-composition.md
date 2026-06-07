# Pipelines and Composition

Guide to Nushell's pipeline system and the `$in` variable.

## Pipeline Basics

A pipeline has three parts:

1. **Input** (source/producer): Creates or loads data
2. **Filter**: Processes or transforms data
3. **Output** (sink): Final operation or display

```nushell
open Cargo.toml | update version "2.0.0" | save Cargo_new.toml
# ^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^
#     input              filter                  output
```

## Multi-line Pipelines

```nushell
let year = (
    "01/22/2021"
    | parse "{month}/{day}/{year}"
    | get year
)
```

## Semicolons

```nushell
line1; line2 | line3
# line1 runs to completion (no pipe)
# line2 pipes to line3
```

## The `$in` Variable

`$in` holds the current pipeline input and is key to Nu's composability.

### Rule 1: First Position in Pipeline

When used in the first position of a pipeline in a closure/block, `$in` refers to the pipeline input to that closure/block:

```nushell
def echo_me [] { print $in }
true | echo_me
# => true

# Throughout the scope
[a b c] | each {
    print $in
    print $in
    $in
}
# All three $in values are the same on each iteration
```

### Rule 2: After Pipe Operator

Elsewhere in a pipeline, `$in` refers to the previous expression's result:

```nushell
4
| $in * $in    # $in is 4
| $in / 2      # $in is now 16
| $in          # $in is now 8
# => 8
```

### Rule 2.5: Scoped Usage

Inside sub-expressions, Rule 2 creates a new scope:

```nushell
4 | do {
    print $in          # closure-scope $in is 4
    let p = (
        $in * $in      # initial-pipeline $in is 4
        | $in / 2      # $in is now 16
    )                  # $p is 8
    print $in          # closure-scope $in is still 4
    print $p           # 8
}
# => 4
# => 4
# => 8
```

### Rule 3: No Input

Without input, `$in` is null:

```nushell
do { $in | describe }
# => nothing
```

### Rule 4: Semicolons Break Pipeline

`$in` cannot capture results across semicolons:

```nushell
ls / | get name; $in | describe
# => nothing

# Use pipes instead
ls / | get name | $in | describe
# => list<string>
```

## Using `$in` Effectively

### As Command Argument

```nushell
date now
| $in + 1day
| format date '%F'
| $'($in) Report'
| mkdir $in
```

### In Filter Closures

```nushell
1..10 | each {$in * 2}

# Some filters modify $in for convenience
ls | update name {str upcase}
# $in in the closure refers to the 'name' column
```

### Best Practice

Assign `$in` early for readability:

```nushell
def "date info" [] {
    let day = $in
    print ($day | format date '%v')
    print $'... was a ($day | format date '%A')'
    print $'... was day ($day | format date '%j') of the year'
}
```

## Collectability

`$in` currently collects streams. For explicit collection, use `collect`:

```nushell
large-stream | collect | $in
```

## External Commands

### Data Flow

```nushell
# Internal -> External
internal_cmd | external_cmd
# Data converted to string, sent to stdin

# External -> Internal
external_cmd | internal_cmd
# Bytes converted to UTF-8 text or binary

# External -> External
external_cmd_1 | external_cmd_2
# Works like bash - stdout to stdin
```

### Command Types

```nushell
# Nushell built-in
ls

# External system command
^ls

# Check input/output types
help ls
# => Input/output types:
# => ╭───┬─────────┬────────╮
# => │ # │ input │ output │
# => ├───┼─────────┼────────┤
# => │ 0 │ nothing │ table │
# => ╰───┴─────────┴────────╯
```

## Pipeline Tips

1. Filter early - reduce data as soon as possible
2. Use structured output - easier to work with than strings
3. Design commands for composition
4. Return meaningful types, not just strings
5. Use `$in` when commands need arguments

## Output Rendering

In interactive mode, pipeline output is rendered by the `display_output` hook:

```nushell
# Expanded table
$env.config.hooks.display_output = { table -e }

# Compact table
$env.config.hooks.display_output = { table }

# Simple output
$env.config.hooks.display_output = {||}

# Default behavior
$env.config.hooks.display_output = null
```

## Piping to External Commands

Convert structured data to text first:

```nushell
ls
| get name
| to text      # Convert to text
| ^grep pattern
```
