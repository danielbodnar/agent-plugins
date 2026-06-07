# OpenCode Integration with OpenTUI

**CRITICAL**: This guide shows how to integrate OpenCode's AI capabilities into OpenTUI applications using STRUCTURED, TOOL-BASED patterns. **NEVER create conversational interfaces in CLI/TUI applications.**

## Table of Contents

1. [The Non-Conversational Imperative](#the-non-conversational-imperative)
2. [OpenCode SDK Setup](#opencode-sdk-setup)
3. [Tool-Based Architecture](#tool-based-architecture)
4. [Complete Examples](#complete-examples)
5. [Anti-Patterns Reference](#anti-patterns-reference)

## The Non-Conversational Imperative

### Why No Conversations in CLI/TUI?

Terminal interfaces are for **execution**, not conversation. Users expect:
- **Immediate results** - Not "Let me think about that..."
- **Structured output** - Tables, lists, JSON - not prose
- **Deterministic behavior** - Same input → Same output
- **No surprises** - Clear parameters, predictable results

### The Rule

**EVERY AI interaction in a TUI MUST:**
1. Use a tool with defined Zod schema
2. Collect all parameters upfront (forms, menus, flags)
3. Execute deterministically
4. Return structured data (objects, arrays, primitives)
5. Display results in UI components (tables, trees, lists)

**NEVER:**
1. Show conversational responses ("I'll help you with that...")
2. Ask follow-up questions mid-execution
3. Use free-form natural language without structure
4. Create chat-style interfaces

## OpenCode SDK Setup

### Installation

```bash
bun add @opencode-ai/sdk
bun add @opencode-ai/plugin  # For tool helpers
bun add zod                   # For schema validation
```

### Basic Client Setup

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"
import type { Session, Message, Part } from "@opencode-ai/sdk"

// Create client (connects to local OpenCode server)
const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",  // Default
})

// Type-safe API access
const projects = await client.project.list()
const agents = await client.app.agents()

// Logging
await client.app.log({
  body: {
    service: "my-tui",
    level: "info",
    message: "Started analysis",
  },
})
```

### Error Handling

```typescript
try {
  const result = await client.session.get({
    path: { id: "session-id" }
  })
} catch (error) {
  if (error instanceof Error) {
    console.error("OpenCode error:", error.message)
  }
}
```

## Tool-Based Architecture

### Tool Structure

Tools are defined in `.opencode/tool/` (project) or `~/.config/opencode/tool/` (global).

**Basic tool:**

```typescript
// .opencode/tool/analyze.ts
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Analyze code complexity",
  args: {
    filePath: tool.schema.string().describe("Path to file"),
    metrics: tool.schema.array(
      tool.schema.enum(["cyclomatic", "cognitive", "lines"])
    ).describe("Metrics to calculate"),
  },
  async execute(args) {
    // Return structured data
    return {
      file: args.filePath,
      complexity: {
        cyclomatic: 12,
        cognitive: 8,
        lines: 342,
      },
      issues: [
        { line: 45, message: "Function too complex", severity: "high" }
      ],
    }
  },
})
```

### Zod Schema Patterns

```typescript
import { tool } from "@opencode-ai/plugin"
import { z } from "zod"

// Enum for fixed choices
const OutputFormat = tool.schema.enum(["json", "table", "tree"])

// Object with nested structure
const FileFilter = tool.schema.object({
  extensions: tool.schema.array(tool.schema.string()).optional(),
  exclude: tool.schema.array(tool.schema.string()).optional(),
  maxSize: tool.schema.number().optional(),
})

// Complex tool with validation
export default tool({
  description: "Search codebase with filters",
  args: {
    query: tool.schema.string().min(1).describe("Search query"),
    filter: FileFilter.describe("File filtering options"),
    format: OutputFormat.describe("Output format"),
  },
  async execute(args) {
    // args is fully typed and validated
    return {
      results: [],
      totalFiles: 0,
      executionTime: "123ms",
    }
  },
})
```

### Multiple Tools Per File

```typescript
// .opencode/tool/git-tools.ts
import { tool } from "@opencode-ai/plugin"

export const status = tool({
  description: "Get git repository status",
  args: {},
  async execute() {
    return {
      branch: "main",
      modified: ["src/main.ts"],
      staged: [],
      untracked: ["new-file.ts"],
    }
  },
})

export const blame = tool({
  description: "Get git blame for file",
  args: {
    filePath: tool.schema.string(),
    lineStart: tool.schema.number().optional(),
    lineEnd: tool.schema.number().optional(),
  },
  async execute(args) {
    return {
      lines: [
        { line: 1, author: "Alice", date: "2025-01-01", commit: "abc123" }
      ],
    }
  },
})

// Creates: git-tools_status and git-tools_blame
```

### Tool Context

```typescript
export default tool({
  description: "Analyze project dependencies",
  args: {},
  async execute(args, context) {
    // Access context
    const { project, directory, worktree } = context
    
    return {
      projectName: project.name,
      workingDir: directory,
      dependencies: [],
    }
  },
})
```

## Complete Examples

### Example 1: File Browser with AI Analysis

```typescript
import { createCliRenderer, Box, Text, Select, SelectRenderableEvents } from "@opentui/core"
import { tool } from "@opencode-ai/plugin"

// Define analysis tool
const analyzeFileTool = tool({
  description: "Analyze file with AI",
  args: {
    filePath: tool.schema.string(),
    analysisType: tool.schema.enum(["complexity", "security", "performance"]),
  },
  async execute(args) {
    // Execute AI analysis via OpenCode
    return {
      score: 85,
      issues: [
        { line: 23, severity: "medium", message: "Consider refactoring this loop" }
      ],
      suggestions: [
        "Extract method at line 45",
        "Add error handling at line 67"
      ],
    }
  },
})

async function createFileBrowser() {
  const renderer = await createCliRenderer()
  
  // File list
  const fileSelect = new SelectRenderable(renderer, {
    id: "files",
    width: 40,
    height: 20,
    options: [
      { name: "src/main.ts", value: "src/main.ts" },
      { name: "src/utils.ts", value: "src/utils.ts" },
    ],
  })
  
  // Analysis type selector
  const analysisTypeSelect = new SelectRenderable(renderer, {
    id: "analysis-type",
    width: 30,
    height: 5,
    options: [
      { name: "Complexity Analysis", value: "complexity" },
      { name: "Security Scan", value: "security" },
      { name: "Performance Check", value: "performance" },
    ],
  })
  
  // Results display
  const resultsBox = new BoxRenderable(renderer, {
    id: "results",
    width: 60,
    height: 15,
    border: true,
    title: "Analysis Results",
  })
  
  // Execute analysis button
  const executeButton = new BoxRenderable(renderer, {
    id: "execute",
    border: true,
    onMouseDown: async () => {
      const filePath = fileSelect.getSelectedOption().value
      const analysisType = analysisTypeSelect.getSelectedOption().value
      
      // Show loading
      const loading = new TextRenderable(renderer, {
        content: "Analyzing...",
      })
      resultsBox.add(loading)
      
      // Execute tool
      const result = await analyzeFileTool.execute({
        filePath,
        analysisType,
      })
      
      // Display structured results
      resultsBox.remove(loading)
      displayResults(resultsBox, result)
    },
  })
  
  const layout = Box(
    { flexDirection: "row", width: "100%", height: "100%" },
    Box({ flexDirection: "column" }, fileSelect, analysisTypeSelect, executeButton),
    resultsBox
  )
  
  renderer.root.add(layout)
  fileSelect.focus()
}

function displayResults(container, result) {
  // Clear previous results
  container.children.forEach(child => container.remove(child))
  
  // Score
  container.add(new TextRenderable(renderer, {
    content: `Score: ${result.score}/100`,
    attributes: TextAttributes.BOLD,
  }))
  
  // Issues table
  if (result.issues.length > 0) {
    const issuesTitle = new TextRenderable(renderer, {
      content: "\nIssues:",
      attributes: TextAttributes.BOLD,
    })
    container.add(issuesTitle)
    
    result.issues.forEach(issue => {
      const issueText = new TextRenderable(renderer, {
        content: `  Line ${issue.line}: ${issue.message} [${issue.severity}]`,
      })
      container.add(issueText)
    })
  }
  
  // Suggestions list
  if (result.suggestions.length > 0) {
    const suggestionsTitle = new TextRenderable(renderer, {
      content: "\nSuggestions:",
      attributes: TextAttributes.BOLD,
    })
    container.add(suggestionsTitle)
    
    result.suggestions.forEach((suggestion, i) => {
      const suggestionText = new TextRenderable(renderer, {
        content: `  ${i + 1}. ${suggestion}`,
      })
      container.add(suggestionText)
    })
  }
}
```

### Example 2: Code Review TUI

```typescript
// Tool definition
const reviewCodeTool = tool({
  description: "Review code changes",
  args: {
    files: tool.schema.array(tool.schema.string()),
    checkTypes: tool.schema.array(
      tool.schema.enum(["style", "bugs", "security", "performance"])
    ),
    severity: tool.schema.enum(["all", "high", "critical"]),
  },
  async execute(args) {
    return {
      filesReviewed: args.files.length,
      findings: [
        {
          file: args.files[0],
          line: 34,
          type: "security",
          severity: "high",
          message: "SQL injection vulnerability",
          suggestion: "Use parameterized queries",
        }
      ],
      summary: {
        critical: 1,
        high: 3,
        medium: 7,
        low: 12,
      },
    }
  },
})

async function createReviewTUI() {
  const renderer = await createCliRenderer()
  
  // File selection with checkboxes (custom component)
  const fileList = new MultiSelectRenderable(renderer, {
    id: "files",
    options: getModifiedFiles(),  // Git diff files
  })
  
  // Check type selection
  const checkTypes = new MultiSelectRenderable(renderer, {
    id: "check-types",
    options: [
      { name: "Style", value: "style", selected: true },
      { name: "Bugs", value: "bugs", selected: true },
      { name: "Security", value: "security", selected: true },
      { name: "Performance", value: "performance", selected: false },
    ],
  })
  
  // Severity filter
  const severitySelect = new SelectRenderable(renderer, {
    id: "severity",
    options: [
      { name: "All Issues", value: "all" },
      { name: "High & Critical", value: "high" },
      { name: "Critical Only", value: "critical" },
    ],
  })
  
  // Results table
  const resultsTable = new TableRenderable(renderer, {
    id: "results",
    columns: [
      { key: "file", title: "File", width: 30 },
      { key: "line", title: "Line", width: 6 },
      { key: "type", title: "Type", width: 12 },
      { key: "severity", title: "Severity", width: 10 },
      { key: "message", title: "Message", width: 50 },
    ],
  })
  
  // Execute button
  const reviewButton = Box(
    {
      border: true,
      onMouseDown: async () => {
        const result = await reviewCodeTool.execute({
          files: fileList.getSelected(),
          checkTypes: checkTypes.getSelected(),
          severity: severitySelect.getSelectedOption().value,
        })
        
        // Update table with structured results
        resultsTable.setData(result.findings)
        
        // Update summary
        updateSummary(result.summary)
      },
    },
    Text({ content: "Run Review" })
  )
  
  const layout = Box(
    { flexDirection: "column", width: "100%", height: "100%" },
    Box(
      { flexDirection: "row", height: 15 },
      Box({ flexDirection: "column" }, fileList, checkTypes),
      severitySelect
    ),
    reviewButton,
    resultsTable
  )
  
  renderer.root.add(layout)
}
```

### Example 3: Database Query Builder

```typescript
// Tool definitions
const queryDatabaseTool = tool({
  description: "Execute SQL query with validation",
  args: {
    query: tool.schema.string().describe("SQL query"),
    limit: tool.schema.number().max(1000).optional(),
    format: tool.schema.enum(["table", "json", "csv"]),
  },
  async execute(args) {
    return {
      rows: [
        { id: 1, name: "Alice", email: "alice@example.com" },
        { id: 2, name: "Bob", email: "bob@example.com" },
      ],
      rowCount: 2,
      columns: ["id", "name", "email"],
      executionTime: "12ms",
    }
  },
})

const validateQueryTool = tool({
  description: "Validate SQL query without executing",
  args: {
    query: tool.schema.string(),
  },
  async execute(args) {
    return {
      valid: true,
      syntax: "correct",
      warnings: [],
      estimatedRows: 100,
    }
  },
})

async function createQueryBuilder() {
  const renderer = await createCliRenderer()
  
  // Query input
  const queryInput = new InputRenderable(renderer, {
    id: "query",
    placeholder: "SELECT * FROM users WHERE...",
    width: 80,
    height: 5,
  })
  
  // Limit input
  const limitInput = new InputRenderable(renderer, {
    id: "limit",
    placeholder: "1000",
    width: 10,
  })
  
  // Format selector
  const formatSelect = new SelectRenderable(renderer, {
    id: "format",
    options: [
      { name: "Table", value: "table" },
      { name: "JSON", value: "json" },
      { name: "CSV", value: "csv" },
    ],
  })
  
  // Validate button
  const validateButton = Box(
    {
      border: true,
      onMouseDown: async () => {
        const result = await validateQueryTool.execute({
          query: queryInput.getValue(),
        })
        
        if (result.valid) {
          showSuccess(`Query valid. Estimated rows: ${result.estimatedRows}`)
        } else {
          showError("Invalid query")
        }
      },
    },
    Text({ content: "Validate" })
  )
  
  // Execute button
  const executeButton = Box(
    {
      border: true,
      backgroundColor: "#00FF00",
      onMouseDown: async () => {
        const result = await queryDatabaseTool.execute({
          query: queryInput.getValue(),
          limit: parseInt(limitInput.getValue()) || undefined,
          format: formatSelect.getSelectedOption().value,
        })
        
        // Display results based on format
        if (result.format === "table") {
          displayAsTable(result)
        } else if (result.format === "json") {
          displayAsJson(result)
        } else {
          displayAsCsv(result)
        }
        
        showInfo(`${result.rowCount} rows in ${result.executionTime}`)
      },
    },
    Text({ content: "Execute Query" })
  )
  
  const layout = Box(
    { flexDirection: "column", width: "100%", height: "100%" },
    Box({ height: 1 }, Text({ content: "SQL Query Builder" })),
    queryInput,
    Box(
      { flexDirection: "row", gap: 2 },
      Text({ content: "Limit:" }),
      limitInput,
      Text({ content: "Format:" }),
      formatSelect
    ),
    Box({ flexDirection: "row", gap: 2 }, validateButton, executeButton),
    Box({ id: "results", flexGrow: 1 })  // Results area
  )
  
  renderer.root.add(layout)
  queryInput.focus()
}
```

### Example 4: Test Generator Interface

```typescript
// Tool definition
const generateTestsTool = tool({
  description: "Generate unit tests for code",
  args: {
    filePath: tool.schema.string(),
    functions: tool.schema.array(tool.schema.string()),
    framework: tool.schema.enum(["bun:test", "jest", "vitest"]),
    coverage: tool.schema.enum(["basic", "comprehensive", "edge-cases"]),
  },
  async execute(args) {
    return {
      testsGenerated: args.functions.length,
      tests: [
        {
          functionName: args.functions[0],
          testCode: `test("${args.functions[0]} handles valid input", () => {\n  expect(${args.functions[0]}("test")).toBe(expected)\n})`,
          assertions: 3,
        }
      ],
      outputFile: `${args.filePath}.test.ts`,
    }
  },
})

async function createTestGenerator() {
  const renderer = await createCliRenderer()
  
  // File selector
  const fileSelect = new SelectRenderable(renderer, {
    id: "file",
    options: getSourceFiles(),
  })
  
  // Function multi-select
  const functionSelect = new MultiSelectRenderable(renderer, {
    id: "functions",
    options: [],  // Populated when file selected
  })
  
  // Update functions when file changes
  fileSelect.on(SelectRenderableEvents.SELECTION_CHANGED, async (index) => {
    const functions = await analyzeFunctions(fileSelect.getSelectedOption().value)
    functionSelect.setOptions(functions.map(f => ({
      name: f.name,
      value: f.name,
      selected: true,
    })))
  })
  
  // Framework selector
  const frameworkSelect = new SelectRenderable(renderer, {
    id: "framework",
    options: [
      { name: "Bun Test", value: "bun:test" },
      { name: "Jest", value: "jest" },
      { name: "Vitest", value: "vitest" },
    ],
  })
  
  // Coverage selector
  const coverageSelect = new SelectRenderable(renderer, {
    id: "coverage",
    options: [
      { name: "Basic", value: "basic" },
      { name: "Comprehensive", value: "comprehensive" },
      { name: "Edge Cases", value: "edge-cases" },
    ],
  })
  
  // Preview area
  const previewCode = new CodeRenderable(renderer, {
    id: "preview",
    content: "",
    filetype: "typescript",
    showLineNumbers: true,
    width: 80,
    height: 20,
  })
  
  // Generate button
  const generateButton = Box(
    {
      border: true,
      onMouseDown: async () => {
        const result = await generateTestsTool.execute({
          filePath: fileSelect.getSelectedOption().value,
          functions: functionSelect.getSelected(),
          framework: frameworkSelect.getSelectedOption().value,
          coverage: coverageSelect.getSelectedOption().value,
        })
        
        // Show preview
        const allTests = result.tests.map(t => t.testCode).join("\n\n")
        previewCode.setContent(allTests)
        
        showInfo(`Generated ${result.testsGenerated} tests → ${result.outputFile}`)
      },
    },
    Text({ content: "Generate Tests" })
  )
  
  // Save button
  const saveButton = Box(
    {
      border: true,
      onMouseDown: async () => {
        await saveTestFile(previewCode.getContent())
        showSuccess("Tests saved!")
      },
    },
    Text({ content: "Save Tests" })
  )
  
  const layout = Box(
    { flexDirection: "row", width: "100%", height: "100%" },
    Box(
      { flexDirection: "column", width: 40 },
      Text({ content: "Test Generator", attributes: TextAttributes.BOLD }),
      Text({ content: "\nSource File:" }),
      fileSelect,
      Text({ content: "\nFunctions:" }),
      functionSelect,
      Text({ content: "\nFramework:" }),
      frameworkSelect,
      Text({ content: "\nCoverage:" }),
      coverageSelect,
      Box({ flexDirection: "row", gap: 2, marginTop: 2 }, generateButton, saveButton)
    ),
    Box(
      { flexDirection: "column", flexGrow: 1 },
      Text({ content: "Preview:", attributes: TextAttributes.BOLD }),
      previewCode
    )
  )
  
  renderer.root.add(layout)
  fileSelect.focus()
}
```

## Anti-Patterns Reference

### ❌ DON'T: Conversational Prompt

```typescript
// BAD: Asking user what they want
const response = await ai.chat("What would you like me to help you with?")
const userReply = await getInput()
const nextResponse = await ai.chat(userReply)
// This creates a frustrating back-and-forth
```

### ✅ DO: Structured Menu

```typescript
// GOOD: Clear options upfront
const menu = new SelectRenderable(renderer, {
  options: [
    { name: "Analyze Code", value: "analyze" },
    { name: "Generate Tests", value: "test" },
    { name: "Refactor Function", value: "refactor" },
  ],
})

menu.on(SelectRenderableEvents.ITEM_SELECTED, async (index, option) => {
  // Execute specific tool based on selection
  switch (option.value) {
    case "analyze":
      await analyzeTool.execute({ /*...*/ })
      break
    // ...
  }
})
```

### ❌ DON'T: Free-Form Natural Language

```typescript
// BAD: Ambiguous input
const userInput = await getInput("Describe what you want to do:")
const result = await ai.execute(userInput)
// Unpredictable results, no validation
```

### ✅ DO: Structured Form

```typescript
// GOOD: Validated inputs with schemas
const form = Box(
  {},
  Input({ id: "file-path", placeholder: "File path..." }),
  Select({
    id: "action",
    options: [
      { name: "Extract Method", value: "extract" },
      { name: "Rename Variable", value: "rename" },
    ],
  }),
  Button({
    onClick: async () => {
      const schema = z.object({
        filePath: z.string().min(1),
        action: z.enum(["extract", "rename"]),
      })
      
      const validated = schema.parse({
        filePath: getInput("file-path"),
        action: getSelected("action"),
      })
      
      await refactorTool.execute(validated)
    },
  })
)
```

### ❌ DON'T: AI Asking Questions Back

```typescript
// BAD: AI needs clarification
const result = await ai.execute({ task: "refactor" })
// AI: "Which file do you want to refactor?"
// Now you need another round trip...
```

### ✅ DO: Get All Parameters Upfront

```typescript
// GOOD: Collect everything before execution
const refactorDialog = Box(
  {},
  Text({ content: "Refactor Code" }),
  Input({ id: "file", placeholder: "File path" }),
  Input({ id: "function", placeholder: "Function name" }),
  Select({ id: "method", options: [/*...*/] }),
  Button({
    onClick: async () => {
      // All parameters collected
      await refactorTool.execute({
        file: getValue("file"),
        function: getValue("function"),
        method: getSelected("method"),
      })
    },
  })
)
```

### ❌ DON'T: Prose Responses in Output

```typescript
// BAD: AI returns conversational text
const result = await ai.execute({ task: "analyze" })
// result = "I found 3 issues. Let me explain each one..."
// User has to parse prose
```

### ✅ DO: Structured Data Output

```typescript
// GOOD: Return structured objects
const result = await analyzeTool.execute({ file: "main.ts" })
// result = {
//   issues: [
//     { line: 23, severity: "high", message: "..." },
//     { line: 45, severity: "medium", message: "..." },
//   ],
//   score: 75,
// }

// Display in UI components
displayIssuesTable(result.issues)
displayScore(result.score)
```

## Best Practices Summary

### Always

1. **Define Zod schemas** for all tool arguments
2. **Collect parameters upfront** via forms/menus
3. **Return structured data** (objects, arrays, primitives)
4. **Display results** in UI components (tables, lists, trees)
5. **Show progress** for long-running operations
6. **Validate inputs** before execution
7. **Handle errors** explicitly with user feedback

### Never

1. **Create chat interfaces** in CLI/TUI
2. **Use free-form natural language** without structure
3. **Ask follow-up questions** mid-execution
4. **Return prose responses** - use structured data
5. **Assume user intent** - make them select explicitly
6. **Skip validation** - always use Zod schemas
7. **Hide what's happening** - show progress/results clearly

## Additional Resources

- **OpenCode Docs**: https://opencode.ai/docs/
- **Custom Tools**: https://opencode.ai/docs/custom-tools/
- **Zod Documentation**: https://zod.dev
- **OpenTUI Examples**: packages/core/src/examples/
