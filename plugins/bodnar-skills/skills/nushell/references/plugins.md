# Plugins

Guide to using and creating Nushell plugins.

## Plugin Basics

Plugins extend Nushell with new commands. They must use the same `nu-plugin` protocol version as Nushell.

**Important**: Update plugins when updating Nushell!

## Plugin Lifecycle

1. **Install** - Get the plugin binary
2. **Add** - Register with `plugin add`
3. **Import** - Use with `plugin use`

## Core Plugins

Official plugins:

- `nu_plugin_polars` - DataFrames (Polars)
- `nu_plugin_formats` - EML, ICS, INI, plist, VCF
- `nu_plugin_gstat` - Git status
- `nu_plugin_query` - SQL, XML, JSON, HTML queries
- `nu_plugin_inc` - Increment values/versions

## Installing Core Plugins

### Package Managers

Most package managers install core plugins automatically.

### Cargo

```nushell
# Install from crates.io
cargo install nu_plugin_polars --locked

# Install all default plugins
[
    nu_plugin_polars
    nu_plugin_formats
    nu_plugin_gstat
    nu_plugin_query
    nu_plugin_inc
] | each { cargo install $in --locked } | ignore
```

## Plugin Search Path

Set search path for plugins:

```nushell
# As constant (immediate effect)
const NU_PLUGIN_DIRS = [
    ($nu.current-exe | path dirname)
    ...$NU_PLUGIN_DIRS
]

# As environment (next parse)
$env.NU_PLUGIN_DIRS = [
    ($nu.current-exe | path dirname)
    ...$env.NU_PLUGIN_DIRS
]
```

## Adding Plugins

```nushell
# By name (searches NU_PLUGIN_DIRS)
plugin add nu_plugin_polars

# By path
plugin add ~/.cargo/bin/nu_plugin_polars

# Windows
plugin add nu_plugin_polars.exe
```

## Importing Plugins

```nushell
# Import immediately
plugin use polars

# All registered plugins auto-load at startup
```

## Managing Plugins

### List Plugins

```nushell
plugin list
# Shows: name, is_running, pid, filename, commands
```

### Stop Plugin

```nushell
plugin stop polars
```

### Remove Plugin

```nushell
plugin rm polars
# Removes from registry
# Commands remain until restart
```

### Update Plugin

```nushell
# After updating binary
plugin add nu_plugin_polars  # Re-add
plugin use polars            # Re-import
```

## Plugin Garbage Collection

Plugins auto-stop after inactivity (default: 10 seconds).

Configure:

```nushell
$env.config.plugin_gc = {
    default: {
        enabled: true
        stop_after: 10sec
    }
    plugins: {
        gstat: {
            stop_after: 1min
        }
        inc: {
            stop_after: 0sec  # Stop ASAP
        }
        polars: {
            enabled: false    # Never stop
        }
    }
}
```

## Using Polars Plugin

```nushell
plugin add nu_plugin_polars
plugin use polars

# Convert to DataFrame
ls | polars into-df

# Operations
ls
| polars into-df
| polars filter (polars col size | polars gt 1mb)
| polars sort-by size --reverse
```

## Third-Party Plugins

Find plugins:

- crates.io
- GitHub repositories
- awesome-nu list

Install from crates.io:

```nushell
cargo install nu_plugin_<name> --locked
```

Install from repository:

```nushell
git clone <repo>
cd <repo>
cargo install --path . --locked
```

## Plugin Development

### Example Plugin Structure

```rust
use nu_plugin::{serve_plugin, JsonSerializer, Plugin};

struct MyPlugin;

impl Plugin for MyPlugin {
    fn signature(&self) -> Vec<PluginSignature> {
        vec![
            PluginSignature::build("my-command")
                .usage("My plugin command")
                .input_output_type(
                    Type::String,
                    Type::String,
                )
        ]
    }

    fn run(&mut self, /* ... */) -> Result</* ... */> {
        // Implementation
    }
}

fn main() {
    serve_plugin(&mut MyPlugin, JsonSerializer)
}
```

### Plugin Protocol

- Communicates via stdin/stdout or sockets
- Uses JSON or MessagePack encoding
- Must match Nu's plugin protocol version

### Testing Plugins

```nushell
# Run without cache
nu --plugins '[./target/debug/nu_plugin_my]'

# Debug with stderr
# Plugins can print to stderr for debugging
```

## Best Practices

1. **Keep protocol version in sync** - Update with Nu
2. **Use plugin GC** - Configure auto-stop behavior
3. **Stop when done** - Free resources with `plugin stop`
4. **Check compatibility** - Verify Nu version matches
5. **Handle errors gracefully** - Return proper error types
6. **Document commands** - Provide usage and examples
7. **Test thoroughly** - Plugins can crash Nu if buggy

## Troubleshooting

```nushell
# Check if plugin is registered
plugin list

# Check if plugin is running
plugin list | where name == polars | select is_running

# Re-add plugin after update
plugin add nu_plugin_polars

# Force restart
plugin stop polars
polars --help  # Will start plugin
```
