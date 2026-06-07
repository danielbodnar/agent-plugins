# Data Loading and Processing

Guide to loading and processing data in Nushell.

## Opening Files

```nushell
# Auto-detect format by extension
open data.json
open config.toml
open spreadsheet.xlsx

# Raw mode (no parsing)
open file.txt --raw
```

## Supported Formats

- CSV/TSV
- JSON (including JSONL, NDJSON)
- TOML
- YAML/YML
- XML
- SQLite databases
- Excel (XLSX/XLS)
- ODS (OpenDocument Spreadsheet)
- NUON (Nushell Object Notation)
- INI
- VCF (vCard)
- ICS (iCalendar)
- EML (Email)
- URL encoded data

## NUON Format

Nushell Object Notation - superset of JSON:

```nushell
# NUON allows:
{
    # Comments
    menus: [
        {
            name: completion_menu  # No quotes needed
            marker: "| "
            type: {
                layout: columnar
                columns: 4
            }
        }
    ]
}

# NUON is valid Nushell
# JSON is valid NUON
```

## Handling Strings

### Lines

```nushell
open file.txt | lines
# => List of lines
```

### Split

```nushell
# Split by delimiter
open people.txt
| lines
| split column "|" first last job
| str trim

# Split by whitespace
"one two three" | split row " "

# Split by regex
"a1b2c3" | split row -r '\d'
```

### Parse

```nushell
# Extract patterns
'Nushell 0.80' | parse '{shell} {version}'
# => [{shell: "Nushell", version: "0.80"}]

# With regex
'IP: 192.168.1.1' | parse -r 'IP: (?<ip>\d+\.\d+\.\d+\.\d+)'
```

## Format Conversion

### From Commands

```nushell
# Parse from format
open data.txt | from json
open data.txt | from csv
open data.txt | from toml
open data.txt | from yaml
open data.txt | from xml

# Binary formats
open data | from msgpack
```

### To Commands

```nushell
# Convert to format
$data | to json
$data | to csv
$data | to toml
$data | to yaml
$data | to xml
$data | to msgpack

# Special formats
$data | to text    # Plain text
$data | to nuon    # NUON format
$data | to jsonl   # JSON Lines
```

## SQLite Databases

```nushell
# Open entire database
open database.db

# Get specific table
open database.db | get users

# Run SQL query
open database.db
| query db "SELECT * FROM users WHERE age > 21"
```

## HTTP Requests

```nushell
# GET request
http get https://api.example.com/data

# POST with JSON
http post https://api.example.com/users {
    name: "Alice"
    email: "alice@example.com"
}

# With headers
http get https://api.example.com/data
    --headers {Authorization: "Bearer token"}
```

## Working with External Data

### CSV Processing

```nushell
# Read CSV
open data.csv

# Parse CSV string
"name,age\nAlice,30\nBob,25" | from csv

# Write CSV
$data | to csv | save output.csv

# Custom delimiter
open data.tsv | from csv --separator "\t"
```

### JSON Processing

```nushell
# Read JSON
open data.json

# Parse JSON string
'{"name": "Alice"}' | from json

# Pretty print
$data | to json --indent 2

# JSON Lines
open data.jsonl | from jsonl
$data | to jsonl | save output.jsonl
```

### XML Processing

```nushell
use std/xml *

# Parse XML
open data.xml

# XPath queries
open data.xml | xml xpath '//user[@id="1"]'
```

## Streaming Large Files

```nushell
# Process line by line
open large-file.txt
| lines
| each {|line| process $line }
| save output.txt

# CSV streaming
open large-file.csv
| where amount > 1000
| select id amount
| save filtered.csv
```

## Data Transformation Patterns

### Filtering

```nushell
# By condition
$data | where status == "active"

# By type
$data | where ($it | describe) == "int"

# Multiple conditions
$data | where status == "active" and age > 21
```

### Mapping

```nushell
# Transform each item
$data | each {|item| $item.name | str upcase }

# With index
$data | enumerate | each {|item|
    {index: $item.index, value: $item.item}
}
```

### Aggregation

```nushell
# Sum
$data | get amount | reduce {|it, acc| $acc + $it }

# Or use math sum
$data | get amount | math sum

# Group by
$data | group-by status | transpose key values
```

### Joining

```nushell
# Merge records
{a: 1} | merge {b: 2}
# => {a: 1, b: 2}

# Join tables
$users | join $orders user_id
```

## Error Handling

```nushell
# Try to open, handle missing file
try {
    open data.json
} catch {
    {}  # Return empty record
}

# Optional chaining
let data = (try { open data.json })
let value = $data?.field?.nested?
```

## Best Practices

1. **Use appropriate formats** - JSON for APIs, CSV for data, NUON for config
2. **Stream large files** - Don't load entirely into memory
3. **Filter early** - Reduce data before processing
4. **Use structured data** - Easier to work with than strings
5. **Handle errors** - Files may be missing or malformed
6. **Validate data** - Check structure before processing
7. **Use type conversions** - `into int`, `into float`, etc.
8. **Cache processed data** - Don't re-process on each run
