# Testing Framework

Guide to testing Nushell code using std/assert.

## Assert Commands

Foundation: `std assert`

```nushell
use std/assert

assert (1 == 2)
# Error: Assertion failed. It is not true.

# With custom message
let a = 0
assert ($a == 19) $"Wrong code, received: ($a)"
```

### Specialized Assertions

```nushell
use std/assert *

# Equality
assert equal 5 5
assert not equal 5 6

# String contains
assert str contains "haystack" "hay"

# Greater/less than
assert greater 10 5
assert less 5 10

# Lists
assert length [1 2 3] 3
assert ($list | all {|x| $x > 0 })
assert ($list | any {|x| $x == 5 })
```

### Custom Assertions

```nushell
def "assert even" [number: int] {
    assert ($number mod 2 == 0) --error-label {
        text: $"($number) is not even"
        span: (metadata $number).span
    }
}

let $a = 13
assert even $a
# Error: Assertion failed. 13 is not even.
```

## Running Tests

### Nupm Package Tests

For Nupm packages:

1. Create `tests/` directory next to `nupm.nuon`
2. Add `tests/mod.nu`
3. Write test commands
4. Run `nupm test`

Convention:

- `export def some-test` → runs
- `def helper` → does not run
- `export def nested-test` from `tests/spam.nu` → runs if `export use spam.nu *` in `tests/mod.nu`

### Standalone Tests

```nushell
# tests.nu
use std/assert
use math.nu fib

for t in [
    [input, expected];
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 2],
    [5, 5],
] {
    assert equal (fib $t.input) $t.expected
}

# Run
nu tests.nu
```

### Basic Test Framework

```nushell
use std/assert
source code.nu

def main [] {
    print "Running tests..."
    
    let tests = (
        scope commands
        | where ($it.type == "custom")
          and ($it.name | str starts-with "test ")
          and not ($it.description | str starts-with "ignore")
        | get name
        | each { |test| [$"print 'Running: ($test)'", $test] }
        | flatten
        | str join "; "
    )
    
    nu --commands $"source ($env.CURRENT_FILE); ($tests)"
    print "Tests completed!"
}

def "test feature" [] {
    assert equal (my_function "input") "expected"
}

# ignore
def "test ignored" [] {
    print "Not executed"
}
```

## Test Patterns

### Table-Driven Tests

```nushell
def "test transformation" [] {
    for case in [
        [input, expected];
        ["hello", "HELLO"],
        ["world", "WORLD"],
    ] {
        assert equal ($case.input | str upcase) $case.expected
    }
}
```

### Setup/Teardown

```nushell
def setup [] {
    mkdir test-dir
}

def teardown [] {
    rm -rf test-dir
}

def "test file-operations" [] {
    setup
    
    try {
        # Test code
        assert (test-dir | path exists)
    } catch {|e|
        teardown
        error make $e
    }
    
    teardown
}
```

### Mock Data

```nushell
def mock-data [] {
    [
        {id: 1, name: "Alice"}
        {id: 2, name: "Bob"}
    ]
}

def "test filter" [] {
    let data = mock-data
    let result = $data | where id > 1
    assert length $result 1
    assert equal $result.0.name "Bob"
}
```

## Best Practices

1. **Test public interfaces** - Focus on exports
2. **Use descriptive names** - `test feature-does-x`
3. **One assertion per test** - Or related assertions
4. **Test edge cases** - Empty lists, null, etc.
5. **Use table-driven tests** - For multiple inputs
6. **Clean up resources** - Use teardown
7. **Fast tests** - Avoid slow operations
8. **Independent tests** - No shared state

## Common Patterns

```nushell
# Test error handling
def "test error-case" [] {
    let result = try {
        risky-operation
        "success"
    } catch {
        "error"
    }
    assert equal $result "error"
}

# Test types
def "test returns-table" [] {
    let result = get-data
    assert equal ($result | describe | str starts-with "table") true
}

# Test with temp files
def "test file-processing" [] {
    let temp = $"($nu.temp-path)/test-(random uuid).txt"
    "test data" | save $temp
    
    try {
        let result = process-file $temp
        assert equal $result "processed"
    } catch {|e|
        rm $temp
        error make $e
    }
    
    rm $temp
}
```
