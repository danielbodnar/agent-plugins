# Scripts and CLI Tools

Guide to creating Nushell scripts and command-line tools.

## Running Scripts

```nushell
# Run script
nu myscript.nu

# Source into current session
source myscript.nu
```

## Script Structure

```nushell
# myscript.nu

# Definitions run first
def greet [name] {
    ["hello" $name]
}

# Main script runs after definitions
greet "world"
```

## Script Lines

```nushell
# Each line runs separately
a
b; c | d

# 'a' runs first
# 'b; c | d' runs second (following semicolon rules)
```

## Parameterizing Scripts (main)

```nushell
# myscript.nu
def main [x: int] {
    $x + 10
}

# Run with arguments
nu myscript.nu 100
# => 110
```

### Argument Types

```nushell
# Implicit typing (interprets based on appearance)
def main [x] {
    $"Hello ($x | describe) ($x)"
}
nu implicit.nu +1
# => Hello int 1

# Explicit typing (always treats as string)
def main [x: string] {
    $"Hello ($x | describe) ($x)"
}
nu explicit.nu +1
# => Hello string +1
```

## Subcommands

```nushell
# myscript.nu
def "main run" [] {
    print "running"
}

def "main build" [] {
    print "building"
}

def main [] {
    print "hello from myscript!"
}

# Usage
nu myscript.nu          # => hello from myscript!
nu myscript.nu build    # => building
nu myscript.nu run      # => running
```

**Note**: You must define `main` for subcommands to work. Use `def main [] {}` if empty.

## Shebangs

On Linux/macOS, use shebang for executable scripts:

```nushell
#!/usr/bin/env nu
"Hello World!"

# Make executable
chmod +x myscript
./myscript
# => Hello World!
```

### With stdin

```nushell
#!/usr/bin/env -S nu --stdin
def main [] {
    echo $"stdin: ($in)"
}

# Usage
echo "Hello World!" | ./myscript
# => stdin: Hello World!
```

## CLI Tool Pattern

```nushell
#!/usr/bin/env nu

# CLI Tool Example
# Usage: ./tool.nu <command> [options]

def "main process" [
    file: path      # Input file
    --output (-o): path  # Output file
    --verbose (-v)  # Verbose output
] {
    if $verbose {
        print $"Processing ($file)..."
    }
    
    let data = open $file
    let result = $data | transform
    
    if $output != null {
        $result | save $output
    } else {
        $result
    }
}

def "main validate" [file: path] {
    open $file | validate-format
}

def main [] {
    print "Usage: tool.nu <command> [options]"
    print "Commands:"
    print "  process <file> [--output FILE] [--verbose]"
    print "  validate <file>"
}
```

## Script Best Practices

1. **Add help text** - Document main and subcommands
2. **Use type annotations** - Make arguments explicit
3. **Handle errors** - Use try-catch
4. **Return exit codes** - Use `exit <code>` for CLI tools
5. **Make scripts executable** - Use shebang + chmod
6. **Test your scripts** - Run before deploying
7. **Use flags for options** - Better than positional args
8. **Keep main simple** - Delegate to helper functions

## Exit Codes

```nushell
def main [] {
    try {
        do-work
    } catch {
        print "Error occurred"
        exit 1
    }
    
    exit 0
}
```

## Reading from stdin

```nushell
def main [] {
    # $in contains piped input
    $in | process
}

# Usage
cat data.txt | ./script.nu
```

## Environment Access

```nushell
def main [] {
    # Access environment variables
    let home = $env.HOME
    let path = $env.PATH
    
    # Set environment (only affects script)
    $env.MY_VAR = "value"
}
```
