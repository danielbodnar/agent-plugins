# Programming Guide

Comprehensive guide to programming in Nushell.

## Core Concepts

Nushell programming revolves around:

- Custom commands (functions)
- Aliases (shortcuts)
- Operators (arithmetic, comparison, regex)
- Variables (immutable, mutable, constants)
- Scripts (files with code)
- Modules (code organization)
- Overlays (layered modules)

See the specific reference files for detailed coverage of each topic.

## Variables

### Immutable Variables

```nushell
let val = 42
print $val
# => 42

# Shadowing (new variable, same name)
let val = 42
do {
    let val = 101
    $val  # => 101
}
$val  # => 42
```

### Mutable Variables

```nushell
mut val = 42
$val += 27
$val
# => 69
```

**Important**: Mutable variables cannot be captured in closures:

```nushell
# ❌ Error
mut x = 0
[1 2 3] | each { $x += 1 }

# ✅ Use reduce or other functional approaches
[1 2 3] | reduce {|_, acc| $acc + 1 } --fold 0
```

### Constants

```nushell
const FILE = 'config.nu'
source $FILE

# Evaluated at parse time
const PI = 3.14159
```

## Control Flow

### If-Else

```nushell
let num = -2
if $num < 0 {
    print "It's negative"
} else if $num > 0 {
    print "It's positive"
} else {
    print "It's zero"
}
```

### Loops

```nushell
# For loop
for x in [1 2 3] {
    print $x
}

# While loop
mut x = 0
while $x < 5 {
    print $x
    $x += 1
}

# Loop (infinite)
loop {
    if (some_condition) {
        break
    }
}
```

### Match

```nushell
match $value {
    0 => "zero"
    1 => "one"
    2 => "two"
    _ => "many"
}
```

## Operators

### Arithmetic

```nushell
1 + 1    # Addition
5 - 2    # Subtraction
3 * 4    # Multiplication
10 / 2   # Division
10 mod 3 # Modulo
2 ** 3   # Power
```

### Comparison

```nushell
1 == 1    # Equal
1 != 2    # Not equal
1 < 2     # Less than
2 > 1     # Greater than
1 <= 1    # Less than or equal
2 >= 2    # Greater than or equal
```

### Logical

```nushell
true and false   # Logical AND
true or false    # Logical OR
not true         # Logical NOT
```

### String Operations

```nushell
"hello" =~ "h.*"   # Regex match
"hello" !~ "x.*"   # Regex non-match
"test" in "testing"  # Substring check
"test" not-in "hello"  # Not substring
"test" starts-with "te"  # Starts with
"test" ends-with "st"    # Ends with
```

### List/Collection Operations

```nushell
1 in [1 2 3]      # Element in list
5 not-in [1 2 3]  # Element not in list
[1 2] ++ [3 4]    # Concatenate
```

## Functions (Custom Commands)

See [quick-reference.md](quick-reference.md#custom-commands) for basic examples.

### Advanced Patterns

```nushell
# Type annotations with input/output types
def double []: int -> int {
    $in * 2
}

# Multiple input types
def process []: [string -> string, int -> int] {
    match ($in | describe) {
        "string" => ($in | str upcase)
        "int" => ($in * 2)
    }
}

# Optional parameters
def greet [name?: string] {
    let n = $name | default "friend"
    $"Hello, ($n)!"
}

# Var-args (rest parameters)
def sum [...nums: int] {
    $nums | reduce {|it, acc| $acc + $it }
}
```

## Error Handling

### try..catch

```nushell
# Basic try-catch
try {
    open missing-file.txt
} catch {|err|
    print $"Error: ($err.msg)"
    ""
}

# Optional chaining
$record.field?.nested?.value?

# Default values
let val = ($env.MISSING? | default "fallback")

# Error creation
error make {
    msg: "Something went wrong"
    label: {
        text: "here"
        span: (metadata $value).span
    }
}
```

### try..catch..finally (v0.111+)

`finally` runs whether `try` succeeded, `catch` handled an error, a `return` was executed, or even `exit` was called. The `finally` closure can receive the result or error value.

```nushell
# finally always runs
try { risky } catch {|e| handle $e } finally { cleanup }

# finally receives the try value
try { 111 } finally {|v| print $v }  # prints 111

# finally receives the error if try failed
try { 1 / 0 } finally {|v| print $v.msg }

# finally receives the catch value if catch ran
try { 1 / 0 } catch { 33 } finally {|v| print $v }  # prints 33

# finally runs even on early return
def work [] {
    try { return 10 } finally { print "cleanup" }
}
work  # prints "cleanup", returns 10

# finally runs even on exit (use --abort to skip it)
try { exit } finally { print "saved!" }          # prints "saved!"
try { exit --abort } finally { print "saved!" }  # does NOT print
```

Streaming note: `try` does not stream when `catch` or `finally` exists. `catch` does not stream when `finally` exists. Design accordingly for large pipelines.

## Mid-Pipeline Assignment (v0.111+)

`let` can be placed inside a pipeline to capture a value and continue processing. Assignment happens and the value passes through unchanged.

```nushell
# Capture mid-stream and keep flowing
"hello" | let msg | str length
# => 5
$msg
# => hello

# At the end of a pipeline the value is assigned and output
ls | length | let y
# => 36
$y
# => 36

# With $in after the capture
10 | let x | $in + 5
# => 15
$x
# => 10
```

Use `| ignore` at the end if you do not want the final value displayed.

## Deleting Variables with `unlet` (v0.110+)

```nushell
let a = 1
let b = 2
unlet $a $b
$a  # Error: variable not found
```

## Best Practices

1. **Prefer immutable variables** - Use `let` over `mut`
2. **Use functional patterns** - `each`, `where`, `reduce` over loops
3. **Type your functions** - Add input/output type signatures
4. **Document your code** - Add help comments
5. **Handle errors explicitly** - Use try-catch or optional chaining
6. **Keep functions small** - Single responsibility principle
7. **Return structured data** - Not strings when possible
