#!/usr/bin/env nu
# Data Pipeline Template
# A template for data transformation pipelines
#
# Features:
# - ETL (Extract, Transform, Load) pattern
# - Error handling
# - Progress reporting
# - Data validation

# Extract data from source
def extract [source: path] {
    print $"Extracting data from ($source)..."
    
    if not ($source | path exists) {
        error make {
            msg: "Source file not found"
            label: {
                text: $"File does not exist: ($source)"
                span: (metadata $source).span
            }
        }
    }
    
    try {
        open $source
    } catch {|err|
        error make {
            msg: $"Failed to extract data: ($err.msg)"
        }
    }
}

# Transform data
def transform [] {
    print "Transforming data..."
    
    # Pipeline input transformation
    $in
    | where status == "active"            # Filter
    | update name {|row| $row.name | str upcase }  # Transform
    | select id name email created         # Select columns
    | sort-by created --reverse            # Sort
}

# Validate transformed data
def validate [] {
    print "Validating data..."
    
    let data = $in
    
    # Check required fields
    let required_fields = ["id" "name" "email"]
    let missing = $required_fields | where {|field|
        not ($field in ($data | first | columns))
    }
    
    if ($missing | length) > 0 {
        error make {
            msg: $"Missing required fields: ($missing | str join ', ')"
        }
    }
    
    # Return validated data
    $data
}

# Load data to destination
def load [destination: path, format: string = "json"] {
    print $"Loading data to ($destination) as ($format)..."
    
    let data = $in
    
    match $format {
        "json" => ($data | to json | save --force $destination)
        "csv" => ($data | to csv | save --force $destination)
        "yaml" => ($data | to yaml | save --force $destination)
        "nuon" => ($data | to nuon | save --force $destination)
        _ => {
            error make {
                msg: $"Unknown format: ($format)"
            }
        }
    }
    
    print $"Successfully loaded ($data | length) records"
}

# Run the complete pipeline
def "main run" [
    source: path         # Source data file
    destination: path    # Destination file
    --format (-f): string = "json"  # Output format
    --validate (-v)      # Enable validation
] {
    try {
        let data = extract $source
            | transform
        
        if $validate {
            $data | validate | load $destination $format
        } else {
            $data | load $destination $format
        }
        
        print "✓ Pipeline completed successfully"
    } catch {|err|
        print --stderr $"✗ Pipeline failed: ($err.msg)"
        exit 1
    }
}

# Test the pipeline with sample data
def "main test" [] {
    print "Testing pipeline with sample data..."
    
    let sample_data = [
        {id: 1, name: "alice", email: "alice@example.com", status: "active", created: "2024-01-01"}
        {id: 2, name: "bob", email: "bob@example.com", status: "inactive", created: "2024-01-02"}
        {id: 3, name: "charlie", email: "charlie@example.com", status: "active", created: "2024-01-03"}
    ]
    
    # Save sample data
    let temp_file = $"($nu.temp-path)/sample-(random uuid).json"
    $sample_data | save $temp_file
    
    # Run pipeline
    try {
        let result = extract $temp_file | transform
        print $"Processed ($result | length) records:"
        $result | table
        
        rm $temp_file
    } catch {|err|
        rm --force $temp_file
        error make $err
    }
}

def main [] {
    print "Data Pipeline - ETL operations"
    print ""
    print "Usage:"
    print "  data-pipeline <command> [options]"
    print ""
    print "Commands:"
    print "  run   Run the complete pipeline"
    print "  test  Test pipeline with sample data"
    print ""
    print "Examples:"
    print "  data-pipeline run input.json output.csv --format csv"
    print "  data-pipeline run data.json transformed.json --validate"
    print "  data-pipeline test"
}
