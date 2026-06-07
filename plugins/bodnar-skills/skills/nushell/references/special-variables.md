# Special Variables

Reference for Nushell's special variables and constants.

## $nu Constant

Record with system information:

```nushell
$nu.default-config-dir  # Config directory
$nu.config-path         # config.nu path
$nu.env-path            # env.nu path
$nu.history-path        # History file
$nu.loginshell-path     # login.nu path
$nu.plugin-path         # Plugin registry
$nu.home-path           # Home directory (~)
$nu.data-dir            # Data directory
$nu.cache-dir           # Cache directory
$nu.vendor-autoload-dirs  # Vendor autoload
$nu.user-autoload-dirs    # User autoload
$nu.temp-path           # Temp directory
$nu.pid                 # Current PID
$nu.os-info             # OS information
$nu.startup-time        # Startup duration
$nu.is-interactive      # Interactive shell?
$nu.is-login            # Login shell?
$nu.history-enabled     # History enabled?
$nu.current-exe         # Path to nu binary
```

## $env Variable

Environment variables:

```nushell
$env.HOME
$env.PATH
$env.USER

# Set environment
$env.MY_VAR = "value"
```

### Special Environment Variables

#### $env.CMD_DURATION_MS

Previous command duration:

```nushell
ls
$env.CMD_DURATION_MS
# => 2 (milliseconds)
```

#### $env.config

Main configuration record:

```nushell
$env.config.table.mode = "rounded"
```

#### $env.CURRENT_FILE

Current script/module file:

```nushell
# Inside script.nu
print $env.CURRENT_FILE
# => /path/to/script.nu
```

Also available as:

```nushell
path self
```

#### $env.FILE_PWD

Directory of current file:

```nushell
# Inside script.nu
print $env.FILE_PWD
# => /path/to
```

Also:

```nushell
path self | path dirname
```

#### $env.LAST_EXIT_CODE

Exit code of last command:

```nushell
^ls missing-file e> /dev/null
$env.LAST_EXIT_CODE
# => 2

# In try-catch
try {
    ^ls missing e> /dev/null
} catch {|e|
    print $e.exit_code
}
```

#### $env.NU_LIB_DIRS

Module search path:

```nushell
$env.NU_LIB_DIRS = [
    ($nu.default-config-dir | path join "modules")
    ...$env.NU_LIB_DIRS
]
```

#### $env.NU_LOG_LEVEL

Log level for std/log:

```nushell
$env.NU_LOG_LEVEL = "debug"
use std/log
log debug "Message"
```

#### $env.NU_PLUGIN_DIRS

Plugin search path:

```nushell
$env.NU_PLUGIN_DIRS = [
    ($nu.current-exe | path dirname)
]
```

#### $env.NU_VERSION

Nushell version:

```nushell
$env.NU_VERSION
# => 0.108.0
```

#### $env.PATH

Command search path:

```nushell
# View
$env.PATH

# Add to path
$env.PATH = ($env.PATH | prepend "/new/path")
```

#### $env.PROCESS_PATH

Script invocation path:

```nushell
# In script
$env.PROCESS_PATH
# => ./my-script.nu (as invoked)
```

#### $env.PROMPT_*

Prompt configuration:

```nushell
$env.PROMPT_COMMAND = { ... }
$env.PROMPT_INDICATOR = "› "
$env.TRANSIENT_PROMPT_COMMAND = { ... }
```

#### $env.SHLVL

Shell nesting level:

```nushell
$env.SHLVL
# => 1

nu
$env.SHLVL
# => 2
```

#### $env.XDG_CONFIG_HOME

Override config directory:

```nushell
$env.XDG_CONFIG_HOME = "~/.config"
```

#### $env.XDG_DATA_DIR

Override data directory:

```nushell
$env.XDG_DATA_DIR = "~/.local/share"
```

## $in Variable

Pipeline input. See [pipelines-and-composition.md](pipelines-and-composition.md).

```nushell
[1 2 3] | $in.1 * $in.2
# => 6
```

## $it Variable

Only in `where` row conditions:

```nushell
ls | where $it.size > 1mb
# Shorthand for: where {|it| $it.size > 1mb }
```

## Constants

### $NU_LIB_DIRS

Constant version of `$env.NU_LIB_DIRS`:

```nushell
const NU_LIB_DIRS = [
    ($nu.default-config-dir | path join "modules")
    ...$NU_LIB_DIRS
]
```

### $NU_PLUGIN_DIRS

Constant version of `$env.NU_PLUGIN_DIRS`:

```nushell
const NU_PLUGIN_DIRS = [
    ($nu.current-exe | path dirname)
    ...$NU_PLUGIN_DIRS
]
```

## Best Practices

1. Use `$nu` for system info
2. Use `$env` for environment
3. Use `$in` for pipeline values
4. Prefer constants over env vars when possible
5. Check `$env.LAST_EXIT_CODE` after external commands
6. Set `$env.NU_LOG_LEVEL` for debugging
