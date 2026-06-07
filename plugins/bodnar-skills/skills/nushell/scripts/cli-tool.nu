#!/usr/bin/env nu
# CLI Tool Template
# A template for creating command-line tools with Nushell
# 
# Features:
# - Argument parsing with types
# - Flag/option handling
# - Subcommands
# - Error handling
# - Help text

# Process files with various options
def "main process" [
    input: path          # Input file to process
    --output (-o): path  # Output file (default: stdout)
    --format (-f): string = "json"  # Output format (json, csv, yaml)
    --verbose (-v)       # Enable verbose output
] {
    if $verbose {
        print $"Processing ($input) in ($format) format..."
    }
    
    # Validate input file exists
    if not ($input | path exists) {
        error make {
            msg: "Input file not found"
            label: {
                text: $"File does not exist: ($input)"
                span: (metadata $input).span
            }
        }
    }
    
    # Process the file
    try {
        let data = open $input
        
        # Transform data based on format
        let result = match $format {
            "json" => ($data | to json)
            "csv" => ($data | to csv)
            "yaml" => ($data | to yaml)
            _ => {
                error make {
                    msg: $"Unknown format: ($format)"
                }
            }
        }
        
        # Output or save
        if $output != null {
            $result | save --force $output
            if $verbose {
                print $"Saved to ($output)"
            }
        } else {
            $result
        }
    } catch {|err|
        print --stderr $"Error: ($err.msg)"
        exit 1
    }
}

# Validate file format
def "main validate" [
    file: path           # File to validate
    --strict (-s)        # Enable strict validation
] {
    if not ($file | path exists) {
        print --stderr $"File not found: ($file)"
        exit 1
    }
    
    try {
        let data = open $file
        
        # Validation logic here
        if $strict {
            # Strict validation
            print "Performing strict validation..."
        }
        
        print $"✓ ($file) is valid"
    } catch {|err|
        print --stderr $"✗ Validation failed: ($err.msg)"
        exit 1
    }
}

# Show information about a file
def "main info" [
    file: path           # File to inspect
] {
    if not ($file | path exists) {
        print --stderr $"File not found: ($file)"
        exit 1
    }
    
    let stat = ls $file | first
    
    {
        name: $stat.name
        type: $stat.type
        size: $stat.size
        modified: $stat.modified
        format: (try { open $file | describe } catch { "unknown" })
    }
}

# Main help text
def main [] {
    print "CLI Tool - Process and validate files"
    print ""
    print "Usage:"
    print "  cli-tool <command> [options]"
    print ""
    print "Commands:"
    print "  process  Process files with format conversion"
    print "  validate Validate file format"
    print "  info     Show file information"
    print ""
    print "Examples:"
    print "  cli-tool process data.json -o output.csv -f csv"
    print "  cli-tool validate config.toml --strict"
    print "  cli-tool info data.json"
    print ""
    print "Run 'cli-tool <command> --help' for more information"
}
