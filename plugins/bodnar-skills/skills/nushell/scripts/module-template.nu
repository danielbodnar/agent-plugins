# Module Template
# A template for creating Nushell modules
#
# This demonstrates:
# - Public exports (export def)
# - Private helpers (def)
# - Environment setup (export-env)
# - Constants (export const)
# - Documentation

# Module version
export const VERSION = "1.0.0"

# Initialize module environment
export-env {
    # Set module-specific environment variables
    $env.MY_MODULE_DIR = $env.PWD
}

# Public command: Process data
#
# Takes a list of items and processes them according to options
#
# # Parameters
# - items: List of items to process
# - --verbose: Enable verbose output
#
# # Examples
# ```nushell
# use my-module
# [1 2 3] | my-module process
# ```
export def process [
    --verbose (-v)  # Enable verbose output
]: list<any> -> list<any> {
    let items = $in
    
    if $verbose {
        print $"Processing ($items | length) items..."
    }
    
    $items | each {|item| transform-item $item }
}

# Public command: Filter items by condition
#
# # Examples
# ```nushell
# [1 2 3 4 5] | my-module filter {|x| $x > 2 }
# ```
export def filter [
    condition: closure  # Filter condition
]: list<any> -> list<any> {
    $in | where (do $condition $in)
}

# Public command: Get module information
export def info [] {
    {
        version: $VERSION
        description: "My Module - Template for Nushell modules"
        commands: (scope commands | where name =~ "my-module" | get name)
    }
}

# Private helper: Transform a single item
# Not exported, only available within this module
def transform-item [item: any] {
    # Transformation logic
    match ($item | describe) {
        "int" => ($item * 2)
        "string" => ($item | str upcase)
        _ => $item
    }
}

# Private helper: Validate input
def validate-input [data: any] {
    if ($data | is-empty) {
        error make {
            msg: "Input cannot be empty"
        }
    }
}

# Example of a command with multiple type signatures
export def convert []: [int -> string, string -> int] {
    match ($in | describe) {
        "int" => ($in | into string)
        "string" => ($in | into int)
    }
}

# Subcommand example
export def "convert upper" []: string -> string {
    $in | str upcase
}

export def "convert lower" []: string -> string {
    $in | str downcase
}

# Main command (optional, for when module is used as command)
export def main [] {
    info
}
