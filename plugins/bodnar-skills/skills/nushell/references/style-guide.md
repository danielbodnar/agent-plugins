# Style Guide

Best practices and conventions for Nushell code.

## Formatting

### Defaults

- Default to no spaces/tabs unless specified below
- One space before and after pipe `|`
- One space before and after commands, subcommands, options, and arguments
- No consecutive spaces (unless in strings)
- Omit commas between list items

### One-line Format

Use for:

- All commands in REPL
- Scripts: lists/records under 80 characters without nesting
- Pipelines under 80 characters

**Rules:**

- One space after comma `,` in parameters
- One space after pipe `|` in closures
- One space after opening brace `{` (if no parameters)
- One space before closing brace `}`
- One space after `:` in records
- One space after comma in records/lists

```nushell
# ✅ Correct
[[status]; [UP]] | all {|el| $el.status == UP }
[1 2 3 4] | reduce {|elt, acc| $elt + $acc }
{x: 1, y: 2}
[1 2] | zip [3 4]

# ❌ Incorrect
[[status]; [UP]] | all { |el| $el.status == UP }  # space before |el|
[1 2 3 4] | reduce {|elt , acc| $elt + $acc }     # space before comma
{ x: 1, y: 2}                                      # space after {
```

### Multi-line Format

Use for:

- Scripts (generally)
- Lists/records over 80 characters or with nesting
- Pipelines over 80 characters

**Rules:**

- No trailing spaces
- Each pipeline on separate line
- Each record key-value on separate line
- Each list item on separate line

```nushell
# ✅ Correct
[[status]; [UP]] | all {|el|
    $el.status == UP
}

{
    name: "Teresa"
    age: 24
}

[
    {name: "Teresa", age: 24}
    {name: "Thomas", age: 26}
]

# ❌ Incorrect
[[status]; [UP]] | all { |el|  # space before |el|
    $el.status == UP}           # missing newline before }
```

## Naming Conventions

### Commands

Use `kebab-case`:

```nushell
# ✅ Correct
fetch-user --id 123
def query-database [] {}

# ❌ Incorrect
fetch_user
fetchUser
```

### Sub-commands

Use `kebab-case`, separated by space:

```nushell
# ✅ Correct
date now
date list-timezone
def "login basic-auth" [user pass] {}

# ❌ Incorrect
date_now
dateNow
```

### Flags

Use `--kebab-case`:

```nushell
# ✅ Correct
def greet [name: string, --all-caps] {}

# ❌ Incorrect
def greet [name: string, --all_caps] {}
```

Access flags with snake_case:

```nushell
def greet [name: string, --all-caps] {
    if $all_caps {  # Note: underscore, not dash
        $name | str upcase
    }
}
```

### Variables and Parameters

Use `snake_case`:

```nushell
# ✅ Correct
let user_id = 123
def fetch-user [user_id: int] {}

# ❌ Incorrect
let user-id = 123
let userId = 123
```

### Environment Variables

Use `SCREAMING_SNAKE_CASE`:

```nushell
# ✅ Correct
$env.ENVIRONMENT_CODE = "prod"
$env.APP_VERSION = "1.0.0"

# ❌ Incorrect
$env.ENVIRONMENT-CODE
$env.app_version
```

## Abbreviations

Use full words over abbreviations (unless well-known):

```nushell
# ✅ Correct
query-user --id 123
$user.name | str downcase

# ❌ Incorrect
qry-usr --id 123
$user.name | string downcase
```

## Parameters and Options

1. **Limit positional parameters to ≤ 2**
   - Use options/flags for remaining inputs
   - Example: `mv source dest` (2 positional)

2. **Prefer positional when possible**
   - Use options when optional or multiple kinds exist
   - Example: `ansi gradient --fg-start X --fg-end Y`

3. **Provide both long and short options**

   ```nushell
   def process [
       --verbose (-v)
       --output (-o): path
   ] {}
   ```

## Documentation

Document all exported entities:

```nushell
# Fetches user data from the database
#
# # Parameters
# - user_id: The unique identifier for the user
#
# # Examples
# ```
# fetch-user 123
# ```
export def fetch-user [
    user_id: int  # The user's ID
] {
    # Implementation
}
```

## Best Practices

1. **Keep commands focused** - Do one thing well
2. **Return structured data** - Easier to compose
3. **Use type annotations** - Better errors and documentation
4. **Prefer pipelines** - Over nested calls
5. **Use functional patterns** - each, where, reduce
6. **Avoid mutation** - Prefer immutable operations
7. **Handle errors explicitly** - Use try-catch or ?
8. **Test your code** - Use std/assert

## Code Organization

```nushell
# 1. Module-level documentation
# 2. Imports
# 3. Constants
# 4. Public exports (export def)
# 5. Private helpers (def)
# 6. Environment setup (export-env)

# User management utilities
use std/assert

const VERSION = "1.0.0"

export def fetch-user [id: int] {
    query-db "SELECT * FROM users WHERE id = ?" $id
}

def query-db [sql: string, ...params] {
    # Private helper
}

export-env {
    $env.DB_CONN = "postgresql://..."
}
```
