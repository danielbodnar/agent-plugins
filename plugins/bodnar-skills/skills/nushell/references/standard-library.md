# Standard Library

Guide to Nushell's standard library (std).

## Overview

The standard library includes:

- Assertions (std/assert)
- Alternative help system
- JSON variants
- XML access
- Logging (std/log)
- Benchmarking (std/bench)
- Directory stack (std/dirs)
- Iteration helpers (std/iters)
- Date utilities (std/dt)
- Format conversions (std/formats)
- Math constants (std/math)

## Importing

### Full Library (Not Recommended)

```nushell
# Slowest - loads everything
use std *
```

### Submodules (Recommended)

Import only what you need:

```nushell
# Command/subcommand form
use std/assert
use std/bench
use std/log

# Direct definitions
use std/formats *
use std/dt *
use std/math *
```

## std/assert

```nushell
use std/assert

# Basic assertion
assert (condition) "Optional message"

# Specialized
assert equal 5 5
assert not equal 5 6
assert str contains "hello" "ell"
assert greater 10 5
assert less 5 10
assert length [1 2 3] 3
```

## std/log

```nushell
use std/log

# Set log level
$env.NU_LOG_LEVEL = "debug"

# Log messages
log error "Critical error"
log warning "Watch out"
log info "FYI"
log debug "Debugging info"
```

## std/bench

```nushell
use std/bench

# Benchmark a closure
bench { sleep 100ms }

# With options
bench --rounds 10 { heavy-computation }
```

## std/dirs

```nushell
use std/dirs

# Directory stack
dirs next    # cd to next in stack
dirs prev    # cd to previous
dirs add path  # Add to stack
dirs drop     # Remove current from stack
```

## std/formats

```nushell
use std/formats *

# Additional format conversions
data | to jsonl    # JSON Lines
data | from jsonl
data | to msgpack
data | from msgpack
```

## std/dt

```nushell
use std/dt *

# Date utilities
date-now
datetime-diff $date1 $date2
```

## std/math

```nushell
use std/math *

# Constants
$E        # Euler's number
$PI       # Pi
$TAU      # Tau (2π)
$PHI      # Golden ratio

# Or prefixed
use std/math
$math.E
$math.PI
```

## std/iters

```nushell
use std/iters

# Additional iteration
iters scan {|acc, x| $acc + $x } 0
```

## std/input

```nushell
use std/input

input display "Press any key..."
```

## Optimal Startup

Avoid slow imports in config.nu:

```nushell
# ❌ Slow - loads entire stdlib
use std *
use std log

# ✅ Fast - loads only submodule
use std/log
```

Check for issues:

```nushell
view files
| enumerate
| flatten
| where filename !~ '^std'
| where {|file|
    (view span $file.start $file.end) =~ 'use\W+std[^\/]'
}
```

## Disabling Standard Library

```nushell
# Disable for faster startup
nu --no-std-lib

# Useful for scripts
nu --no-std-lib -c "commands"
```

## std/log in Modules

Important: std/log exports environment variables. To use in modules:

```nushell
# In your module
export-env {
    use std/log []
}
```

Or import in each command:

```nushell
export def my-command [] {
    use std/log
    log info "Message"
}
```
