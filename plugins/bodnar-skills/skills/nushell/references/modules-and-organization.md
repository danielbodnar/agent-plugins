# Modules and Organization

Complete guide to creating and managing Nushell modules.

## Module Files

Two forms:

1. **File-form**: `<module_name>.nu`
2. **Directory-form**: `<module_name>/mod.nu`

```nushell
# File-form
increment.nu

# Directory-form
increment/
  mod.nu
```

## Basic Module Example

```nushell
# inc.nu
export def increment []: int -> int {
    $in + 1
}

# Usage
use inc.nu *
5 | increment
# => 6
```

## Exports

### export def

```nushell
export def public-command [] {
    # Available to importers
}

def private-command [] {
    # Only available inside module
}
```

### export main

```nushell
# increment.nu
export def main []: int -> int {
    $in + 1
}

# Usage
use ./increment.nu
2024 | increment
# => 2025
```

### export alias

```nushell
export alias ll = ls -l
```

### export const

```nushell
export const VERSION = "1.0.0"
```

### export-env

```nushell
export-env {
    $env.MY_VAR = "value"
}
```

### export use

```nushell
# Re-export from another module
export use ./submodule.nu *
```

## Subcommands

Two ways to create subcommands:

```nushell
# 1. Quoted name with space
export def "increment by" [amount: int]: int -> int {
    $in + $amount
}

# 2. Simple name (when imported as submodule)
export def by [amount: int]: int -> int {
    $in + $amount
}

# Both result in: increment by <amount>
```

## Submodules

### With export module

```nushell
# my-utils/mod.nu
export module ./increment.nu
export module ./range-into-list.nu

# Usage
use my-utils *
5 | increment by 4
```

### With export use

```nushell
# my-utils/mod.nu
export use ./increment.nu
export use ./range-into-list.nu

# Commands become part of my-utils directly
use my-utils *
```

## Documentation

```nushell
# Module documentation (at top of file)
# A collection of helpful utility functions

# Command documentation
# Increments a value by 1
export def increment []: int -> int {
    $in + 1
}

# View help
help my-utils
help increment
```

## Environment Variables

```nushell
export-env {
    $env.NU_MODULES_DIR = ($nu.default-config-dir | path join "scripts")
}
```

**Important Caveat**: `export-env` only runs when `use` is evaluated. For nested modules, you may need to import twice:

```nushell
# In go.nu
use my-utils
export-env {
    use my-utils []  # Import environment separately
}
```

## Module Search Path

```nushell
# Constant (immediate effect)
const NU_PLUGIN_DIRS = [
    ($nu.current-exe | path dirname)
    ...$NU_PLUGIN_DIRS
]

# Environment variable (next parse)
$env.NU_LIB_DIRS = [
    ($nu.default-config-dir | path join "modules")
    ...$env.NU_LIB_DIRS
]
```

## Selective Export

```nushell
# Export only specific items from submodule
export use ./go.nu [home, modules]

# With prefix
export module go {
    export use ./go.nu [home, modules]
}
# Results in: go home, go modules
```

## Best Practices

1. **One main export per file** - Focused modules
2. **Use mod.nu for packages** - Better organization
3. **Document all exports** - Help users understand
4. **Keep private helpers private** - No `export` for internals
5. **Use export-env sparingly** - Only when needed
6. **Test your modules** - Add tests in tests/ directory

## Caveats

1. Export cannot have same name as module
2. Module files cannot have same name as parent directory
3. `export-env` only runs on `use` evaluation
4. Mutable variables cannot be captured across module boundaries
