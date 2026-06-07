# OpenTUI Troubleshooting Guide

Common issues and their solutions when working with OpenTUI.

## Build Issues

### "Zig not found" Error

**Problem:** Build fails with "zig: command not found" or similar error.

**Solution:**
1. Install Zig from https://ziglang.org/download/
2. Ensure Zig is in your PATH: `zig version`
3. Minimum version requirements may vary - check repo docs

### "Cannot find module" After Build

**Problem:** TypeScript imports fail after building native code.

**Solution:**
Build creates platform-specific libraries. Check:
1. Correct platform library exists in `zig-out/lib/`
2. Platform detection in `src/lib/ffi.ts` matches your system
3. Try rebuilding: `bun run build:native`

### Build Succeeds But Tests Fail

**Problem:** Native tests fail after building.

**Solution:**
```bash
# From packages/core
cd packages/core
bun run test:native

# Check for specific test failures
bun run test:native -Dtest-filter="specific test name"
```

Common causes:
- Platform-specific issues (especially Windows)
- Memory allocation problems
- FFI binding mismatches

## Runtime Issues

### "Cannot Load Native Library" Error

**Problem:** Error loading `.dylib`, `.so`, or `.dll` file at runtime.

**Solution:**
1. Ensure you ran `bun run build:native` before running TypeScript
2. Check platform-specific library exists:
   - macOS: `libopentui.dylib`
   - Linux: `libopentui.so`
   - Windows: `opentui.dll`
3. Verify library path in error message matches expected location

### Terminal Output Not Visible

**Problem:** Application runs but no output appears in terminal.

**Solution:**
1. Check `OTUI_NO_NATIVE_RENDER` environment variable (should be false or unset)
2. Verify `OTUI_USE_ALTERNATE_SCREEN` is true (default)
3. Try setting `OTUI_OVERRIDE_STDOUT=true`
4. Check if console is capturing output: Set `OTUI_USE_CONSOLE=false` temporarily

### Console.log Not Showing Up

**Problem:** `console.log()` calls don't appear anywhere.

**Remember:** OpenTUI captures console output in an overlay by default.

**Solutions:**
1. Toggle console overlay: `renderer.console.toggle()`
2. Check console at startup: `SHOW_CONSOLE=true`
3. Disable console capture: `OTUI_USE_CONSOLE=false`
4. Dump captured output on exit: `OTUI_DUMP_CAPTURES=true`

### Application Freezes or Hangs

**Problem:** TUI becomes unresponsive.

**Solution:**
1. Check for infinite loops in event handlers
2. Verify async operations aren't blocking
3. Use `renderer.start()` for animation loops (caps at target FPS)
4. Check for memory leaks in long-running applications

## Development Issues

### TypeScript Changes Not Reflecting

**Problem:** Code changes don't appear when running.

**Remember:** You do NOT need to build for TypeScript-only changes.

**Solution:**
1. Just run: `bun run src/examples/index.ts`
2. Build only needed for Zig code changes
3. If using `bun run build`, check it's not caching old code

### Local Development Linking Not Working

**Problem:** Changes in OpenTUI repo don't appear in test project.

**Solution:**
```bash
# Verify symlinks were created
ls -la /path/to/test-project/node_modules/@opentui/core

# Re-link with correct flags
./scripts/link-opentui-dev.sh /path/to/test-project --solid

# If symlinks don't work (Windows/Docker), use copy mode
./scripts/link-opentui-dev.sh /path/to/test-project --dist --copy
```

### "Cannot focus" or Input Not Working

**Problem:** Input/Select components don't respond to keyboard.

**Solution:**
Components MUST be focused to receive input:
```typescript
const input = new InputRenderable(renderer, { id: "my-input" })
input.focus() // Required!

// Or with delegation
const component = LabeledInput({ id: "username" })
component.focus() // Delegates to input
```

## Layout Issues

### Components Not Visible

**Problem:** Components are added but don't appear.

**Solution:**
1. Check dimensions: Components with 0 width/height won't render
2. Verify position: Absolute positioning may place off-screen
3. Check z-index: Components may be behind others
4. Ensure parent has space: Check parent's dimensions

### Flexbox Layout Not Working as Expected

**Problem:** Layout doesn't match expectations.

**Solution:**
Remember Yoga layout rules:
1. Parent needs explicit dimensions: `width: "100%"` or specific size
2. `flexGrow` requires parent with `flexDirection` set
3. Check `flexDirection`: Default may not match expectations
4. Use `justifyContent` and `alignItems` on parent, not children

### Text Truncated or Wrapping Weirdly

**Problem:** Text doesn't display fully or wraps incorrectly.

**Solution:**
1. Set explicit width on TextRenderable
2. Check parent container's width
3. Consider using multiple lines or scrolling container
4. Long words may need explicit handling

## Tree-Sitter Issues

### "Parser not found for filetype" Error

**Problem:** Code highlighting fails for specific language.

**Solution:**
Add parser before using:
```typescript
import { addDefaultParsers } from "@opentui/core"

addDefaultParsers([{
  filetype: "python",
  wasm: "https://github.com/tree-sitter/tree-sitter-python/...",
  queries: { highlights: ["https://...highlights.scm"] }
}])
```

### Syntax Highlighting Missing Styles

**Problem:** Code displays but without proper colors.

**Solution:**
1. Enable warnings: `OTUI_TS_STYLE_WARN=true`
2. Check if highlight queries loaded correctly
3. Verify `SyntaxStyle` is configured with color mappings
4. Some tokens may not have style mappings yet

### Parser Download Fails

**Problem:** Cannot download WASM parser or query files.

**Solution:**
1. Check internet connection
2. Verify URLs are correct and accessible
3. Use local files instead:
```typescript
import pythonWasm from "./parsers/tree-sitter-python.wasm" with { type: "file" }
```
4. Check cache directory permissions: Default is `~/.cache/opentui`

## Performance Issues

### Slow Rendering

**Problem:** UI updates are sluggish.

**Solution:**
1. Use `renderer.start()` with target FPS: `renderer.start(60)`
2. Batch updates instead of updating each frame
3. Use `FrameBuffer` for complex graphics (more efficient)
4. Minimize layout recalculations: Group changes together
5. Profile with benchmarks: `bun run bench:native`

### High Memory Usage

**Problem:** Application memory grows over time.

**Solution:**
1. Remove renderables when done: `parent.remove(child)`
2. Clear event listeners: `renderable.removeAllListeners()`
3. Dispose of large buffers: `frameBuffer.clear()`
4. Check for circular references preventing garbage collection

### Input Lag

**Problem:** Keyboard/mouse input feels delayed.

**Solution:**
1. Reduce event handler complexity
2. Avoid synchronous heavy operations in handlers
3. Use debouncing for rapid events
4. Check if rendering is blocking input processing

## Bun-Specific Issues

### "Command not found: bun"

**Problem:** Bun commands fail.

**Solution:**
1. Install Bun: `curl -fsSL https://bun.sh/install | bash`
2. Add to PATH: `export PATH="$HOME/.bun/bin:$PATH"`
3. Verify: `bun --version`

### Package Installation Fails

**Problem:** `bun install` errors.

**Solution:**
1. Clear cache: `bun pm cache rm`
2. Delete `node_modules` and `bun.lockb`
3. Re-install: `bun install`
4. Check Bun version: Minimum v1.2.0+

### FFI Errors with Bun

**Problem:** FFI-related errors when loading native libraries.

**Solution:**
1. Enable debug logging: `OTUI_DEBUG_FFI=true`
2. Enable tracing: `OTUI_TRACE_FFI=true`
3. Check library file permissions
4. Verify architecture matches (arm64 vs x86_64)

## Testing Issues

### Tests Pass Locally But Fail in CI

**Problem:** Tests work on dev machine but fail in CI.

**Solution:**
1. Check platform differences (Linux vs macOS vs Windows)
2. Verify Zig version matches
3. Check environment variables in CI config
4. Ensure all dependencies installed

### Native Tests Crash

**Problem:** `bun run test:native` crashes or segfaults.

**Solution:**
1. Run with debugger: `zig build test --debug`
2. Check for memory issues: Invalid pointers, buffer overflows
3. Filter to specific test: `bun run test:native -Dtest-filter="test name"`
4. Review recent native code changes

## Color/Display Issues

### Colors Look Wrong

**Problem:** Colors don't match expectations.

**Solution:**
1. Verify terminal supports true color: Most modern terminals do
2. Check `TERM` environment variable: Should be `xterm-256color` or similar
3. Test with explicit RGB: `RGBA.fromInts(255, 0, 0, 255)` for pure red
4. Some terminals may not support all features

### Unicode Characters Not Displaying

**Problem:** Special characters (borders, icons) show as boxes.

**Solution:**
1. Ensure terminal font supports Unicode
2. Check locale: `echo $LANG` (should include UTF-8)
3. Try different `borderStyle`: "single" is most compatible
4. Consider ASCII-only alternatives for maximum compatibility

### Transparency/Alpha Not Working

**Problem:** Semi-transparent colors appear solid.

**Solution:**
1. Not all terminals support transparency
2. Use `setCellWithAlphaBlending()` in FrameBuffer for better support
3. Check if terminal background is set to transparent
4. Consider dithering patterns as fallback

## Mouse Issues

### Mouse Events Not Firing

**Problem:** Click/move handlers don't trigger.

**Solution:**
1. Verify terminal supports mouse: Most modern ones do
2. Check if another app is capturing mouse
3. Ensure renderable has mouse handlers set:
```typescript
box.onMouseDown = (event) => { /* ... */ }
```
4. Check if renderable is actually visible and has dimensions

### Mouse Position Incorrect

**Problem:** Event coordinates don't match visual position.

**Solution:**
1. Remember coordinates are character cells, not pixels
2. Check if terminal has been resized
3. Absolute positioning may affect coordinate calculations
4. Verify parent container dimensions

## Keyboard Issues

### Special Keys Not Working

**Problem:** Function keys, arrows, etc. don't trigger events.

**Solution:**
1. Check terminal key mappings
2. Some terminals send different sequences for same keys
3. Test with: `renderer.keyInput.on("keypress", key => console.log(key))`
4. May need custom key sequence handling for specific terminals

### Modifier Keys Not Detected

**Problem:** Ctrl, Shift, Alt not working with keys.

**Solution:**
1. Check `key.ctrl`, `key.shift`, `key.meta` properties
2. Some key combinations may be caught by terminal/OS
3. Test combinations that are likely to work: Ctrl+C, Ctrl+D, etc.
4. Consider alternative keybindings for problematic combinations

## Debugging Tools

### Enable Debug Logging

```bash
# FFI debug logs
OTUI_DEBUG_FFI=true bun run src/examples/index.ts

# FFI tracing
OTUI_TRACE_FFI=true bun run src/examples/index.ts

# Dump console captures on exit
OTUI_DUMP_CAPTURES=true bun run src/examples/index.ts

# Show console at startup
SHOW_CONSOLE=true bun run src/examples/index.ts

# Disable native rendering (debugging)
OTUI_NO_NATIVE_RENDER=true bun run src/examples/index.ts
```

### Inspect Layout

```typescript
// Print computed layout
console.log(renderable.layout)

// Check dimensions
console.log(`Width: ${renderable.width}, Height: ${renderable.height}`)

// Verify position
console.log(`Left: ${renderable.left}, Top: ${renderable.top}`)
```

### Monitor Events

```typescript
// Log all key events
renderer.keyInput.on("keypress", (key) => {
  console.log("Key:", JSON.stringify(key))
})

// Log mouse events
box.onMouseMove = (event) => {
  console.log("Mouse:", event.x, event.y)
}
```

## Common Error Messages

### "Cannot read property of undefined"

**Likely cause:** Trying to access renderable before it's created or after it's destroyed.

**Solution:** Check lifecycle and ensure renderable exists before accessing.

### "Maximum call stack size exceeded"

**Likely cause:** Infinite recursion in layout calculation or event handlers.

**Solution:** Review recent changes to layout code or event handlers.

### "Segmentation fault"

**Likely cause:** Native code error (Zig/FFI issue).

**Solution:** Enable debug logging, check recent native code changes, test with native tests.

## Getting Help

When reporting issues:

1. Include OpenTUI version: Check `package.json`
2. Include Bun version: `bun --version`
3. Include Zig version: `zig version`
4. Include OS and terminal: `uname -a`, terminal name
5. Minimal reproduction: Simplest code that shows the issue
6. Error messages: Full error output with stack traces
7. Environment variables: Any OTUI_* variables set

Check existing issues: https://github.com/sst/opentui/issues
