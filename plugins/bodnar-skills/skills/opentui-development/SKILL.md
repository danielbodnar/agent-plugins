---
name: opentui-development
description: Development guide for OpenTUI terminal UI library and OpenCode AI integration. Use when working with OpenTUI codebase (github.com/sst/opentui), building TUI applications, integrating OpenCode AI capabilities (@opencode-ai/sdk), creating structured AI-powered CLI tools (NEVER conversational), using Zod schemas for tool definitions, contributing to OpenTUI packages (@opentui/core, @opentui/solid, @opentui/react), or building terminal applications with OpenTUI + OpenCode.
---

# OpenTUI Development Skill

OpenTUI is a TypeScript library for building terminal user interfaces (TUIs) with native Zig performance. This skill covers development workflows, architecture patterns, and best practices for working with the OpenTUI codebase.

## Quick Reference

**Core packages:**
- `@opentui/core` - Standalone library with imperative API and all primitives
- `@opentui/solid` - SolidJS reconciler for OpenTUI
- `@opentui/react` - React reconciler for OpenTUI
- `@opentui/vue` - Vue reconciler (unmaintained)
- `@opentui/go` - Go bindings (unmaintained)

**Required tools:**
- [Zig](https://ziglang.org/) - Required for building native code
- [Bun](https://bun.sh) v1.2.0+ - Runtime, package manager, build tool

## Runtime and Package Management

OpenTUI is Bun-first. **Always use Bun, never Node.js, npm, yarn, or pnpm.**

```bash
# Run TypeScript files
bun <file>                    # NOT: node <file> or ts-node <file>

# Package management
bun install                   # NOT: npm install or yarn install
bun run <script>              # NOT: npm run <script>

# Testing
bun test                      # NOT: jest or vitest
```

**Key Bun APIs to prefer:**
- `Bun.serve()` - Built-in HTTP/WebSocket/HTTPS server (NOT express)
- `bun:sqlite` - Built-in SQLite (NOT better-sqlite3)
- `Bun.redis` - Built-in Redis client (NOT ioredis)
- `Bun.sql` - Built-in Postgres client (NOT pg)
- `WebSocket` - Built-in WebSocket (NOT ws package)
- `Bun.file` - File I/O (prefer over node:fs readFile/writeFile)
- `Bun.$` - Shell commands (NOT execa)

**Note:** Bun automatically loads `.env` files - don't use dotenv package.

## Build and Test Commands

### Building the Project

**CRITICAL:** When changing TypeScript code, you do NOT need to run the build script. The build is only needed when changing native Zig code.

```bash
# Build everything (from repo root)
bun run build

# Build only native code
bun run build:native

# Build only library (TypeScript)
bun run build:lib
```

### Testing

```bash
# Run all tests (from repo root)
bun test

# TypeScript tests (from packages/core)
cd packages/core
bun test

# Native tests (from packages/core)
cd packages/core
bun run test:native

# Filter native tests
bun run test:native -Dtest-filter="test name"

# Native benchmarks
bun run bench:native
```

### Running Examples

```bash
# From repo root
bun install
cd packages/core
bun run src/examples/index.ts
```

## Local Development Linking

Use `scripts/link-opentui-dev.sh` to test local changes in another project without publishing.

```bash
# Link core only (default)
./scripts/link-opentui-dev.sh /path/to/your/project

# Link core and solid
./scripts/link-opentui-dev.sh /path/to/your/project --solid

# Link core and react
./scripts/link-opentui-dev.sh /path/to/your/project --react

# Link built dist directories (for testing builds)
./scripts/link-opentui-dev.sh /path/to/your/project --dist

# Copy dist instead of symlink (for Docker/Windows)
./scripts/link-opentui-dev.sh /path/to/your/project --dist --copy
```

**Requirements:**
- Target project must have run `bun install` first
- Default: links to source packages (hot-reloading)
- `--dist`: links to built artifacts
- `--copy`: copies instead of symlinking (for environments with symlink issues)

## Architecture Overview

### Core Concepts

**CliRenderer** - The main rendering engine that manages terminal output, input events, and the rendering loop. Can run in "live" mode (via `renderer.start()`) with target FPS, or auto-render on changes.

**Renderables** - Hierarchical building blocks for UI. Each represents a visual element (text, boxes, inputs) with positioning via Yoga layout engine. Used imperatively with `new TextRenderable(renderer, {...})`.

**Constructs (Components)** - Functional composition of renderables. Look like React/Solid components but are constructor functions, not render functions. Return VNodes that are instantiated later. More declarative than raw renderables.

**FrameBuffer** - Low-level 2D rendering surface for custom graphics. Supports alpha blending, cell manipulation, text drawing, and rect filling.

**Console** - Built-in debugging overlay that captures all console output (`log`, `info`, `warn`, `error`, `debug`). Toggle with `renderer.console.toggle()`, scroll with arrow keys, resize with `+`/`-`.

### Renderables vs Constructs

See `packages/core/docs/renderables-vs-constructs.md` for detailed comparison.

**Imperative (Renderables):**
```typescript
const box = new BoxRenderable(renderer, { id: "my-box", width: 20 })
const text = new TextRenderable(renderer, { id: "my-text", content: "Hello" })
box.add(text)
renderer.root.add(box)
```

**Declarative (Constructs):**
```typescript
import { Box, Text, instantiate } from "@opentui/core"

const myComponent = Box(
  { id: "my-box", width: 20 },
  Text({ id: "my-text", content: "Hello" })
)

renderer.root.add(myComponent)
```

Use `delegate()` to route API calls to specific descendants in constructs:
```typescript
function LabeledInput(props) {
  return delegate(
    { focus: `${props.id}-input` },
    Box(
      {},
      Text({ content: props.label }),
      Input({ id: `${props.id}-input`, placeholder: props.placeholder })
    )
  )
}

const input = LabeledInput({ id: "username", label: "Name:", placeholder: "..." })
input.focus() // Delegates to the Input renderable
```

## Available Components

### TextRenderable
Display styled text with colors, attributes, and selection support.

```typescript
import { TextRenderable, TextAttributes, t, bold, underline, fg } from "@opentui/core"

const text = new TextRenderable(renderer, {
  id: "text-1",
  content: "Important",
  fg: "#FFFF00",
  attributes: TextAttributes.BOLD | TextAttributes.UNDERLINE,
  position: "absolute",
  left: 5,
  top: 2,
})

// Template literals for complex styling
const styled = new TextRenderable(renderer, {
  content: t`${bold("Important")} ${fg("#FF0000")(underline("Message"))}`,
})
```

### BoxRenderable
Container with borders, background colors, and layout capabilities.

```typescript
const panel = new BoxRenderable(renderer, {
  id: "panel",
  width: 30,
  height: 10,
  backgroundColor: "#333366",
  borderStyle: "double",
  borderColor: "#FFFFFF",
  title: "Settings Panel",
  titleAlignment: "center",
})
```

### InputRenderable
Text input field with cursor, placeholder, and focus states. **Must be focused to receive input.**

```typescript
const input = new InputRenderable(renderer, {
  id: "name-input",
  width: 25,
  placeholder: "Enter your name...",
  focusedBackgroundColor: "#1a1a1a",
})

input.on(InputRenderableEvents.CHANGE, (value) => {
  console.log("Input:", value)
})

input.focus()
```

### SelectRenderable
List selection component. **Must be focused.** Keys: `up`/`k` and `down`/`j` to navigate, `enter` to select.

```typescript
const menu = new SelectRenderable(renderer, {
  id: "menu",
  options: [
    { name: "New File", description: "Create a new file" },
    { name: "Open File", description: "Open existing file" },
  ],
})

menu.on(SelectRenderableEvents.ITEM_SELECTED, (index, option) => {
  console.log("Selected:", option.name)
})

menu.focus()
```

### TabSelectRenderable
Horizontal tab selection. **Must be focused.** Keys: `left`/`[` and `right`/`]` to navigate, `enter` to select.

```typescript
const tabs = new TabSelectRenderable(renderer, {
  id: "tabs",
  width: 60,
  options: [
    { name: "Home", description: "Dashboard" },
    { name: "Files", description: "File management" },
  ],
  tabWidth: 20,
})
```

### ASCIIFontRenderable
Display text using ASCII art fonts.

```typescript
const title = new ASCIIFontRenderable(renderer, {
  id: "title",
  text: "OPENTUI",
  font: "tiny",
  fg: RGBA.fromInts(255, 255, 255, 255),
})
```

### FrameBufferRenderable
Low-level rendering surface for custom graphics.

```typescript
const canvas = new FrameBufferRenderable(renderer, {
  id: "canvas",
  width: 50,
  height: 20,
})

canvas.frameBuffer.fillRect(10, 5, 20, 8, RGBA.fromHex("#FF0000"))
canvas.frameBuffer.drawText("Custom", 12, 7, RGBA.fromHex("#FFFFFF"))
```

## Color System

OpenTUI uses the `RGBA` class internally (float values 0.0-1.0) but provides convenient constructors:

```typescript
import { RGBA, parseColor } from "@opentui/core"

const red = RGBA.fromInts(255, 0, 0, 255)           // RGB integers
const blue = RGBA.fromValues(0.0, 0.0, 1.0, 1.0)    // Float values
const green = RGBA.fromHex("#00FF00")                // Hex strings
const transparent = RGBA.fromValues(1.0, 1.0, 1.0, 0.5) // Semi-transparent

// parseColor() accepts RGBA objects or color strings
const color = parseColor("#FF0000") // or "red" or "transparent"
```

## Keyboard Input

Access keyboard handler via `renderer.keyInput`:

```typescript
import { type KeyEvent } from "@opentui/core"

renderer.keyInput.on("keypress", (key: KeyEvent) => {
  console.log("Key:", key.name)
  console.log("Sequence:", key.sequence)
  console.log("Modifiers:", { ctrl: key.ctrl, shift: key.shift, alt: key.meta })

  if (key.name === "escape") {
    // Handle escape
  } else if (key.ctrl && key.name === "c") {
    // Handle Ctrl+C
  }
})

renderer.keyInput.on("paste", (text: string) => {
  console.log("Pasted:", text)
})
```

## Layout System (Yoga)

OpenTUI uses Yoga layout engine for CSS Flexbox-like layouts:

```typescript
const container = new GroupRenderable(renderer, {
  id: "container",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  height: 10,
})

const leftPanel = new BoxRenderable(renderer, {
  id: "left",
  flexGrow: 1,
  height: 10,
})

const rightPanel = new BoxRenderable(renderer, {
  id: "right",
  width: 20,
  height: 10,
})

container.add(leftPanel)
container.add(rightPanel)
```

## Console Debugging

Configure console overlay in renderer options:

```typescript
import { createCliRenderer, ConsolePosition } from "@opentui/core"

const renderer = await createCliRenderer({
  consoleOptions: {
    position: ConsolePosition.BOTTOM,
    sizePercent: 30,
    colorInfo: "#00FFFF",
    colorWarn: "#FFFF00",
    colorError: "#FF0000",
    startInDebugMode: false,
  },
})

// All console.* calls appear in overlay
console.log("This appears in the overlay")
console.error("Errors are red")

// Toggle console
renderer.console.toggle()

// When focused: arrow keys scroll, +/- resize
```

## Tree-Sitter Integration

See `packages/core/docs/tree-sitter.md` for complete guide.

### Adding Custom Parsers

**Global default parsers** (recommended for app-wide support):

```typescript
import { addDefaultParsers, getTreeSitterClient } from "@opentui/core"

addDefaultParsers([
  {
    filetype: "python",
    wasm: "https://github.com/tree-sitter/tree-sitter-python/releases/download/v0.23.6/tree-sitter-python.wasm",
    queries: {
      highlights: ["https://raw.githubusercontent.com/tree-sitter/tree-sitter-python/master/queries/highlights.scm"],
    },
  },
])

const client = getTreeSitterClient()
await client.initialize()
const result = await client.highlightOnce(pythonCode, "python")
```

**Per-client parsers:**

```typescript
const client = new TreeSitterClient({ dataPath: "./cache" })
await client.initialize()

client.addFiletypeParser({
  filetype: "rust",
  wasm: "https://github.com/tree-sitter/tree-sitter-rust/releases/download/v0.23.2/tree-sitter-rust.wasm",
  queries: {
    highlights: ["https://raw.githubusercontent.com/tree-sitter/tree-sitter-rust/master/queries/highlights.scm"],
  },
})
```

### Automated Parser Management

Use `updateAssets` utility for multiple languages:

```typescript
// parsers-config.json
{
  "parsers": [
    {
      "filetype": "python",
      "wasm": "https://github.com/tree-sitter/tree-sitter-python/releases/download/v0.23.6/tree-sitter-python.wasm",
      "queries": {
        "highlights": ["https://raw.githubusercontent.com/tree-sitter/tree-sitter-python/master/queries/highlights.scm"]
      }
    }
  ]
}

// In package.json
{
  "scripts": {
    "prebuild": "bun node_modules/@opentui/core/lib/tree-sitter/assets/update.ts --config ./parsers-config.json --assets ./src/parsers --output ./src/parsers.ts"
  }
}

// Or programmatically
import { updateAssets } from "@opentui/core"

await updateAssets({
  configPath: "./parsers-config.json",
  assetsDir: "./src/parsers",
  outputPath: "./src/parsers.ts",
})
```

### Using with CodeRenderable

```typescript
import { CodeRenderable, getTreeSitterClient } from "@opentui/core"

const client = getTreeSitterClient()
await client.initialize()

const code = new CodeRenderable("code-1", {
  content: 'def hello():\n    print("world")',
  filetype: "python",
  width: 40,
  height: 10,
})
```

## Code Style Guidelines

**TypeScript:**
- Strict mode, ES2024+ features
- Modern ESM imports
- Prefer async/await over Promises
- Minimal comments, NO JSDoc
- Naming: camelCase (variables/functions), PascalCase (classes/interfaces), UPPER_CASE (constants)
- Files: kebab-case

**Formatting:**
- Prettier with `semi: false`, `printWidth: 120`
- Run: `bun run prettier:write`

**Error Handling:**
- Proper Error objects
- No silent failures
- Explicit error handling in async code

## Environment Variables

Key environment variables (see `packages/core/docs/env-vars.md` for full list):

- `OTUI_DEBUG_FFI` - Enable debug logging for FFI bindings
- `OTUI_TRACE_FFI` - Enable tracing for FFI bindings
- `OTUI_USE_CONSOLE` - Whether to capture console output (default: true)
- `SHOW_CONSOLE` - Show console at startup (default: false)
- `OTUI_DUMP_CAPTURES` - Dump captured output on exit
- `OTUI_NO_NATIVE_RENDER` - Disable native rendering (debugging)
- `OTUI_USE_ALTERNATE_SCREEN` - Use alternate screen buffer (default: true)
- `OTUI_OVERRIDE_STDOUT` - Override stdout stream (default: true)
- `OTUI_TS_STYLE_WARN` - Warn for missing syntax styles (default: false)
- `OTUI_TREE_SITTER_WORKER_PATH` - Path to TreeSitter worker
- `XDG_CONFIG_HOME` - Base directory for config files
- `XDG_DATA_HOME` - Base directory for data files

## Debugging Guidelines

**CRITICAL:** This is a terminal UI library. When running examples or apps:
- You CANNOT see `console.log` output in the normal way
- Ask the user to run the example/app and provide the output

**Best practices:**
1. Reproduce issues in test cases before fixing
2. Use debug logs to see what's happening
3. Never guess - always verify with tests
4. For large files, ask whether to:
   - Loop sequentially
   - Analyze first X lines (ask how many)
   - Create batch processing script

## Publishing Workflow

```bash
# Prepare release (updates versions)
bun run prepare-release

# Run pre-publish checks
bun run pre-publish

# Publish all packages
bun run publish

# Or publish individual packages
bun run publish:core
bun run publish:react
bun run publish:solid
```

## Common Patterns

### Basic Setup

```typescript
import { createCliRenderer, TextRenderable } from "@opentui/core"

const renderer = await createCliRenderer()

const greeting = new TextRenderable(renderer, {
  id: "greeting",
  content: "Hello, OpenTUI!",
  fg: "#00FF00",
  position: "absolute",
  left: 10,
  top: 5,
})

renderer.root.add(greeting)
```

### Component Composition

```typescript
function LabeledInput(props: { id: string; label: string; placeholder: string }) {
  return delegate(
    { focus: `${props.id}-input` },
    Box(
      { flexDirection: "row", backgroundColor: "gray" },
      Text({ content: props.label + " " }),
      Input({
        id: `${props.id}-input`,
        placeholder: props.placeholder,
        width: 20,
      })
    )
  )
}

const username = LabeledInput({
  id: "username",
  label: "Username:",
  placeholder: "Enter your username...",
})

username.focus() // Delegates to the input
```

### Event Handling

```typescript
import { InputRenderableEvents, SelectRenderableEvents } from "@opentui/core"

// Input events
input.on(InputRenderableEvents.CHANGE, (value) => {
  console.log("Changed:", value)
})

// Select events
menu.on(SelectRenderableEvents.ITEM_SELECTED, (index, option) => {
  console.log("Selected:", option.name)
})

// Keyboard events
renderer.keyInput.on("keypress", (key) => {
  if (key.ctrl && key.name === "q") {
    process.exit(0)
  }
})

// Mouse events
box.onMouseDown = (event) => {
  console.log("Mouse down at:", event.x, event.y)
}
```

## Contributing Guidelines

From `CONTRIBUTING.md`:

1. Bug fixes and feature suggestions always welcome
2. Bug fixes: Open PR for review
3. Feature suggestions: Discuss via issues first
4. Follow existing code style (see `AGENTS.md`)
5. Treat everyone with respect and empathy
6. Be kind, constructive, assume good intent
7. Keep feedback specific and actionable
8. No unsolicited DMs unless invited
9. Follow project guidelines and maintainer decisions

## OpenCode Integration

**CRITICAL ANTI-PATTERN**: NEVER create conversational interfaces with AI in CLI/TUI applications. Always use structured, tool-based interactions.

### Why OpenCode + OpenTUI?

OpenCode (https://opencode.ai) provides AI coding agent capabilities via TypeScript SDK. OpenTUI is the perfect framework for building CLI/TUI interfaces that leverage OpenCode's AI capabilities.

**Installation:**
```bash
bun add @opencode-ai/sdk
bun add zod  # For schema validation
```

### The Non-Conversational Rule

**NEVER DO THIS** (Conversational anti-pattern):
```typescript
// ❌ BAD: Conversational interaction
async function badCLI() {
  const response = await client.chat.send("What would you like to do?")
  const userInput = await getUserInput()
  const nextResponse = await client.chat.send(userInput)
  // This creates a frustrating back-and-forth conversation
}
```

**ALWAYS DO THIS** (Structured tool pattern):
```typescript
// ✅ GOOD: Structured tool-based interaction
import { createOpencodeClient } from "@opencode-ai/sdk"
import { tool } from "@opencode-ai/plugin"
import { z } from "zod"

// Define clear, structured tool schema
const analyzeCodeTool = tool({
  description: "Analyze code quality and suggest improvements",
  args: {
    filePath: tool.schema.string().describe("Path to file to analyze"),
    checkTypes: tool.schema.array(
      tool.schema.enum(["performance", "security", "readability"])
    ).describe("Types of checks to run"),
    outputFormat: tool.schema.enum(["json", "table", "summary"]).describe("Output format"),
  },
  async execute(args) {
    // Execute structured analysis
    return { findings: [], score: 85 }
  },
})
```

### OpenCode SDK Basics

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"
import type { Session, Message, Part } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",  // Default OpenCode server
})

// Use SDK for structured operations
const projects = await client.project.list()
const agents = await client.app.agents()

// Log events
await client.app.log({
  body: {
    service: "my-tui-app",
    level: "info",
    message: "Operation completed",
  },
})
```

### Structured Tool Pattern for TUI

**Pattern: Command → Tool → Structured Output**

```typescript
// 1. Define Zod schemas for all operations
const RefactorSchema = z.object({
  targetFunction: z.string().describe("Function name to refactor"),
  extractMethods: z.array(z.string()).describe("Methods to extract"),
  renameVariables: z.record(z.string()).describe("Variable renames"),
})

// 2. Create tool with schema
const refactorTool = tool({
  description: "Refactor code with specific transformations",
  args: {
    filePath: tool.schema.string(),
    operations: tool.schema.object(RefactorSchema.shape),
  },
  async execute(args) {
    // Execute deterministic refactor
    return { success: true, changes: [] }
  },
})

// 3. Build TUI with structured input/output
function buildRefactorTUI(renderer) {
  const form = Box(
    {},
    Text({ content: "Refactor Code", attributes: TextAttributes.BOLD }),
    Input({ id: "file-path", placeholder: "Enter file path..." }),
    Select({
      id: "operations",
      options: [
        { name: "Extract Method", value: "extract" },
        { name: "Rename Variable", value: "rename" },
      ],
    }),
    Button({
      id: "execute",
      label: "Execute Refactor",
      onClick: async () => {
        const result = await refactorTool.execute({
          filePath: getInputValue("file-path"),
          operations: getSelectedOperations(),
        })
        displayResults(result)  // Show structured results
      },
    })
  )
  return form
}
```

### Custom Tools for TUI Commands

**Create tools in `.opencode/tool/` directory:**

```typescript
// .opencode/tool/tui-analyze.ts
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Analyze codebase and display in TUI",
  args: {
    path: tool.schema.string().describe("Directory to analyze"),
    depth: tool.schema.number().optional().describe("Max depth to traverse"),
    format: tool.schema.enum(["tree", "table", "graph"]).describe("Display format"),
  },
  async execute(args, context) {
    // Return structured data for TUI rendering
    return {
      totalFiles: 42,
      languages: { typescript: 30, javascript: 12 },
      suggestions: [
        { file: "src/main.ts", issue: "Large function", severity: "medium" }
      ],
    }
  },
})
```

### Multiple Tools Pattern

```typescript
// .opencode/tool/database-tools.ts
import { tool } from "@opencode-ai/plugin"

export const queryTool = tool({
  description: "Execute SQL query with validation",
  args: {
    query: tool.schema.string().describe("SQL query to execute"),
    limit: tool.schema.number().max(1000).optional(),
  },
  async execute(args) {
    // Execute and return structured results
    return { rows: [], count: 0, executionTime: "12ms" }
  },
})

export const schemaTool = tool({
  description: "Get database schema information",
  args: {
    tableName: tool.schema.string().optional(),
  },
  async execute(args) {
    return { tables: [], columns: [] }
  },
})

// Creates: database-tools_query and database-tools_schema
```

### Complete TUI + OpenCode Example

See `references/opencode-integration.md` for complete examples including:
- File browser with AI analysis
- Code review TUI
- Database query builder
- Test generator interface
- All using structured tools, no conversations

### Key Principles

1. **Never Conversational** - CLI/TUI is not a chat interface
2. **Always Structured** - Use Zod schemas for all inputs/outputs
3. **Tool-Based** - Every AI operation is a tool call with defined interface
4. **Deterministic** - Same input → Same output
5. **Immediate Feedback** - Show structured results, not "I will..." responses
6. **No Back-and-Forth** - Get all parameters upfront via forms/menus

### Anti-Patterns to Avoid

❌ Multi-turn conversations in CLI
❌ "What would you like me to do?" prompts
❌ Ambiguous natural language without structure
❌ AI responses that ask questions back
❌ Free-form chat interfaces in terminal

✅ Structured forms with Zod validation
✅ Tool calls with complete parameters
✅ Immediate execution with structured output
✅ Progress indicators for long operations
✅ Results displayed in tables/trees/lists

## Resources

**Documentation:**
- Getting Started: `packages/core/docs/getting-started.md`
- Tree-Sitter: `packages/core/docs/tree-sitter.md`
- Environment Variables: `packages/core/docs/env-vars.md`
- Renderables vs Constructs: `packages/core/docs/renderables-vs-constructs.md`
- OpenCode Integration: `references/opencode-integration.md`

**Examples:**
- `packages/core/src/examples/` - Reference implementations

**Agent Guidelines:**
- `AGENTS.md` - Development standards and best practices

**GitHub:**
- Repository: https://github.com/sst/opentui
- Issues: https://github.com/sst/opentui/issues
- OpenCode: https://github.com/sst/opencode
- Workflows: `.github/workflows/opencode.yml` - OpenCode integration
