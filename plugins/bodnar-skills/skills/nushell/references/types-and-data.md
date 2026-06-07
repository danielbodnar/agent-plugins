# Types and Data Structures

Comprehensive guide to Nushell's type system and data structures.

## Type Overview

| Type | Example |
|------|---------|
| Integers | `-65535`, `0xff`, `0b1010` |
| Floats | `9.9999`, `Infinity` |
| Strings | `"hello"`, `'world'`, \`raw\`, `r#'regex'#` |
| Booleans | `true`, `false` |
| Dates | `2000-01-01`, `date now` |
| Durations | `2min + 12sec`, `3.14day` |
| File-sizes | `64mb`, `0.5kB`, `1GiB` |
| Ranges | `0..4`, `0..<5`, `0..`, `..4` |
| Binary | `0x[FE FF]`, `0o[1234]`, `0b[1010]` |
| Lists | `[0 1 'two' 3]` |
| Records | `{name:"Nu", lang: "Rust"}` |
| Tables | `[[x, y]; [12, 15], [8, 9]]` |
| Closures | `{|e| $e + 1}` |
| Cell-paths | `$.name.0` |
| Blocks | `if true { print "hi" }` |
| Nothing | `null` |

## Basic Data Types

### Integers

```nushell
10 / 2
# => 5

# Hex, octal, binary
0xff      # 255
0o234     # 156
0b10101   # 21

5 | describe
# => int
```

### Floats/Decimals

```nushell
2.5 / 5.0
# => 0.5

# Note: Approximate
10.2 * 5.1
# => 52.01999999999999
```

### Text/Strings

```nushell
let audience: string = "World"
$"Hello, ($audience)"
# => Hello, World

# Multiple quote styles
"double quotes"
'single quotes'
`raw strings`
r#'raw with # delimiter'#
```

### Booleans

```nushell
let mybool: bool = (2 > 1)
$mybool
# => true

if $mybool { print "It's true" }
```

### Dates

```nushell
date now
# => Mon, 12 Aug 2024 13:59:22 -0400

# Format as Unix epoch
date now | format date '%s'
# => 1723485562
```

### Durations

```nushell
3.14day
# => 3day 3hr 21min

30day / 1sec # Seconds in 30 days
# => 2592000
```

### File Sizes

```nushell
0.5kB
# => 500 B

1GiB / 1B
# => 1073741824

(1GiB / 1B) == 2 ** 30
# => true
```

### Ranges

```nushell
1..5
# => [1 2 3 4 5]

# With stride
2..4..20
# => [2 6 10 14 18]

# Open-ended
1..
..10

# Exclusive end
1..<5
# => [1 2 3 4]
```

## Structured Data Types

### Lists

```nushell
[Sam Fred George]
# Ordered sequence of values

# Access by index
[a b c].1
# => b

# Methods
[1 2 3] | length
[1 2 3] | append 4
[1 2 3] | prepend 0
```

### Records

```nushell
let my_record = {
    name: "Kylian"
    rank: 99
}

$my_record.name
# => Kylian

# Optional access
$my_record.missing?
# => null
```

### Tables

```nushell
[[x, y]; [12, 5], [3, 6]]

# Tables are lists of records
[{x:12, y:5}, {x:3, y:6}]

# Access row (returns record)
[{x:12, y:5}] | get 0
# => {x: 12, y: 5}
```

### Cell-Paths

```nushell
# Navigate structured data
let cp = $.2
[foo bar goo glue] | get $cp
# => goo

# Nested access
{a: {b: {c: 1}}}.a.b.c
# => 1
```

### Closures

```nushell
let compare = {|a| $a > 5 }
[40 -4 0 8 12] | where $compare
# => [40 8 12]

# Capture variables
let threshold = 5
let check = {|x| $x > $threshold}
```

### Binary Data

```nushell
# Hex representation
0x[ff d8]

# Octal
0o[1234567]

# Binary
0b[10101010]

# Check file magic bytes
open image.jpg
| into binary
| first 2
| $in == 0x[ff d8]
```

## Special Types

### Nothing (Null)

```nushell
let simple_record = { a: 5, b: 10 }

$simple_record.c?
# => null

$simple_record.c? | describe
# => nothing

$simple_record.c? == null
# => true
```

### Any

```nushell
# Accepts any type
let p: any = 5
let p: any = "string"
let p: any = [1 2 3]
```

### Blocks

```nushell
# Used in control flow
if true { print "It's true" }

loop { break }

for x in [1 2 3] {
    print $x
}
```

## Type Conversions

```nushell
# into <type> commands
"42" | into int
"3.14" | into float
42 | into string
[1 2 3] | into binary

# Format conversions
{a: 1} | to json
open file.csv | from csv
```

## Type Checking

```nushell
# describe command
42 | describe
# => int

[1 2 3] | describe
# => list<int>

{a: 1, b: "x"} | describe
# => record<a: int, b: string>
```
