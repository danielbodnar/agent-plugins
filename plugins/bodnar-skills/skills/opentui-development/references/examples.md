# OpenTUI Examples and Patterns

Common patterns and recipes for building TUI applications with OpenTUI.

## Basic Application Structure

### Minimal Application

```typescript
import { createCliRenderer, Box, Text } from "@opentui/core"

async function main() {
  const renderer = await createCliRenderer()
  
  const app = Box(
    { width: "100%", height: "100%" },
    Text({ content: "Hello, OpenTUI!", fg: "#00FF00" })
  )
  
  renderer.root.add(app)
  
  // Handle exit
  renderer.keyInput.on("keypress", (key) => {
    if (key.ctrl && key.name === "c") {
      process.exit(0)
    }
  })
}

main()
```

### Application with Layout

```typescript
async function main() {
  const renderer = await createCliRenderer()
  
  // Create a full-screen container
  const container = Box({
    width: "100%",
    height: "100%",
    flexDirection: "column",
  })
  
  // Header
  const header = Box(
    { height: 3, backgroundColor: "#333", borderBottom: true },
    Text({ content: "My Application", fg: "#FFF" })
  )
  
  // Main content area
  const content = Box({
    flexGrow: 1,
    padding: 2,
  })
  
  // Footer
  const footer = Box(
    { height: 1, backgroundColor: "#333" },
    Text({ content: "Press Ctrl+C to exit", fg: "#AAA" })
  )
  
  container.add(header)
  container.add(content)
  container.add(footer)
  
  renderer.root.add(container)
}
```

## Form Patterns

### Simple Login Form

```typescript
import { Box, Text, Input, delegate, InputRenderableEvents } from "@opentui/core"

function LabeledInput(props: { id: string; label: string; placeholder: string; password?: boolean }) {
  return delegate(
    { focus: `${props.id}-input` },
    Box(
      { flexDirection: "row", marginBottom: 1 },
      Text({ content: props.label, width: 12 }),
      Input({
        id: `${props.id}-input`,
        placeholder: props.placeholder,
        password: props.password,
        width: 30,
      })
    )
  )
}

function Button(props: { id: string; label: string; onClick: () => void }) {
  return Box(
    {
      border: true,
      borderStyle: "rounded",
      padding: 0.5,
      backgroundColor: "#444",
      onMouseDown: props.onClick,
    },
    Text({ content: props.label, selectable: false })
  )
}

async function createLoginForm(renderer) {
  const form = Box(
    { width: 50, height: 15, padding: 2, border: true, borderStyle: "double" },
    Text({ content: "Login", attributes: TextAttributes.BOLD, marginBottom: 2 }),
    LabeledInput({ id: "username", label: "Username:", placeholder: "Enter username" }),
    LabeledInput({ id: "password", label: "Password:", placeholder: "Enter password", password: true }),
    Box(
      { flexDirection: "row", gap: 2, marginTop: 2 },
      Button({
        id: "login",
        label: "Login",
        onClick: () => {
          const username = form.getRenderable("username-input")?.getValue()
          const password = form.getRenderable("password-input")?.getValue()
          console.log("Login:", username, password)
        },
      }),
      Button({
        id: "cancel",
        label: "Cancel",
        onClick: () => process.exit(0),
      })
    )
  )
  
  return form
}
```

### Form with Validation

```typescript
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function ValidatedInput(props: {
  id: string
  label: string
  placeholder: string
  validator: (value: string) => boolean
  errorMessage: string
}) {
  let errorText: TextRenderable | null = null
  
  const input = Input({
    id: `${props.id}-input`,
    placeholder: props.placeholder,
    width: 30,
  })
  
  const container = Box({ flexDirection: "column" })
  
  const inputRow = Box(
    { flexDirection: "row", marginBottom: 0.5 },
    Text({ content: props.label, width: 12 }),
    input
  )
  
  // Listen for changes
  input.on(InputRenderableEvents.CHANGE, (value: string) => {
    if (!props.validator(value)) {
      if (!errorText) {
        errorText = Text({ content: props.errorMessage, fg: "#FF0000", marginLeft: 12 })
        container.add(errorText)
      }
    } else {
      if (errorText) {
        container.remove(errorText)
        errorText = null
      }
    }
  })
  
  container.add(inputRow)
  return delegate({ focus: `${props.id}-input` }, container)
}

// Usage
const emailInput = ValidatedInput({
  id: "email",
  label: "Email:",
  placeholder: "user@example.com",
  validator: validateEmail,
  errorMessage: "Invalid email address",
})
```

## Menu and Navigation Patterns

### Sidebar Menu

```typescript
function SidebarMenu(props: {
  items: Array<{ name: string; icon?: string; onClick: () => void }>
  selectedIndex?: number
}) {
  const menu = new SelectRenderable(renderer, {
    id: "sidebar-menu",
    width: 20,
    height: "100%",
    options: props.items.map(item => ({
      name: `${item.icon || ""} ${item.name}`,
      value: item,
    })),
    selectedIndex: props.selectedIndex || 0,
    backgroundColor: "#1e1e1e",
    selectedBackgroundColor: "#2d2d2d",
  })
  
  menu.on(SelectRenderableEvents.ITEM_SELECTED, (index, option) => {
    option.value.onClick()
  })
  
  return menu
}

// Usage
const app = Box(
  { flexDirection: "row", width: "100%", height: "100%" },
  SidebarMenu({
    items: [
      { name: "Dashboard", icon: "📊", onClick: () => showDashboard() },
      { name: "Files", icon: "📁", onClick: () => showFiles() },
      { name: "Settings", icon: "⚙️", onClick: () => showSettings() },
    ],
  }),
  Box({ flexGrow: 1 }) // Content area
)
```

### Tab Navigation

```typescript
function TabbedView(props: {
  tabs: Array<{ name: string; content: () => VNode }>
  initialTab?: number
}) {
  let currentContent: Renderable | null = null
  let currentIndex = props.initialTab || 0
  
  const contentArea = Box({ flexGrow: 1, padding: 2 })
  
  const tabs = new TabSelectRenderable(renderer, {
    id: "tabs",
    options: props.tabs.map(tab => ({ name: tab.name })),
    selectedIndex: currentIndex,
    width: "100%",
    height: 3,
    tabWidth: 20,
  })
  
  function showTab(index: number) {
    if (currentContent) {
      contentArea.remove(currentContent)
    }
    currentContent = instantiate(renderer, props.tabs[index].content())
    contentArea.add(currentContent)
  }
  
  tabs.on(TabSelectRenderableEvents.ITEM_SELECTED, (index) => {
    currentIndex = index
    showTab(index)
  })
  
  const container = Box({ flexDirection: "column", width: "100%", height: "100%" })
  container.add(tabs)
  container.add(contentArea)
  
  // Show initial tab
  showTab(currentIndex)
  
  return container
}

// Usage
const app = TabbedView({
  tabs: [
    {
      name: "Home",
      content: () => Text({ content: "Home content" }),
    },
    {
      name: "Profile",
      content: () => Text({ content: "Profile content" }),
    },
  ],
})
```

## Data Display Patterns

### Table/List View

```typescript
function TableView(props: {
  columns: Array<{ key: string; title: string; width: number }>
  data: Array<Record<string, any>>
}) {
  const table = Box({ flexDirection: "column", width: "100%" })
  
  // Header
  const header = Box({ flexDirection: "row", backgroundColor: "#333", height: 1 })
  for (const col of props.columns) {
    header.add(Text({
      content: col.title,
      width: col.width,
      attributes: TextAttributes.BOLD,
    }))
  }
  table.add(header)
  
  // Rows
  for (let i = 0; i < props.data.length; i++) {
    const row = Box({
      flexDirection: "row",
      backgroundColor: i % 2 === 0 ? "#1a1a1a" : "#0d0d0d",
      height: 1,
    })
    
    for (const col of props.columns) {
      row.add(Text({
        content: String(props.data[i][col.key] || ""),
        width: col.width,
      }))
    }
    
    table.add(row)
  }
  
  return table
}

// Usage
const userTable = TableView({
  columns: [
    { key: "id", title: "ID", width: 10 },
    { key: "name", title: "Name", width: 20 },
    { key: "email", title: "Email", width: 30 },
  ],
  data: [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
  ],
})
```

### Progress Indicators

```typescript
function ProgressBar(props: {
  value: number      // 0-100
  width?: number
  height?: number
  color?: string
  backgroundColor?: string
}) {
  const width = props.width || 40
  const height = props.height || 1
  
  const container = Box({
    width,
    height,
    backgroundColor: props.backgroundColor || "#333",
    border: true,
  })
  
  const filled = Math.floor((props.value / 100) * (width - 2))
  
  const bar = new FrameBufferRenderable(renderer, {
    id: "progress-bar",
    width: width - 2,
    height: height - 2,
  })
  
  const color = RGBA.fromHex(props.color || "#00FF00")
  bar.frameBuffer.fillRect(0, 0, filled, height - 2, color)
  
  const percent = Text({
    content: `${props.value}%`,
    position: "absolute",
    left: Math.floor(width / 2) - 2,
    top: Math.floor(height / 2),
  })
  
  container.add(bar)
  container.add(percent)
  
  return container
}

// Animated progress
async function showProgress(renderer) {
  const progress = ProgressBar({ value: 0 })
  renderer.root.add(progress)
  
  for (let i = 0; i <= 100; i += 5) {
    // Update progress
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
```

### Spinner/Loading

```typescript
function Spinner(props: { message?: string }) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
  let frameIndex = 0
  
  const spinner = Text({
    content: frames[0] + (props.message ? ` ${props.message}` : ""),
    fg: "#00FF00",
  })
  
  const interval = setInterval(() => {
    frameIndex = (frameIndex + 1) % frames.length
    spinner.setContent(frames[frameIndex] + (props.message ? ` ${props.message}` : ""))
  }, 80)
  
  // Cleanup
  spinner.on("destroy", () => clearInterval(interval))
  
  return spinner
}
```

## Modal/Dialog Patterns

### Confirmation Dialog

```typescript
function ConfirmDialog(props: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const overlay = Box({
    width: "100%",
    height: "100%",
    backgroundColor: RGBA.fromValues(0, 0, 0, 0.7),
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 0,
    left: 0,
  })
  
  const dialog = Box(
    {
      width: 50,
      height: 12,
      backgroundColor: "#2d2d2d",
      border: true,
      borderStyle: "double",
      padding: 2,
      flexDirection: "column",
    },
    Text({
      content: props.title,
      attributes: TextAttributes.BOLD,
      marginBottom: 2,
    }),
    Text({
      content: props.message,
      marginBottom: 3,
    }),
    Box(
      { flexDirection: "row", gap: 2, justifyContent: "center" },
      Button({
        id: "confirm",
        label: "Confirm",
        onClick: () => {
          props.onConfirm()
          overlay.destroy()
        },
      }),
      Button({
        id: "cancel",
        label: "Cancel",
        onClick: () => {
          props.onCancel()
          overlay.destroy()
        },
      })
    )
  )
  
  overlay.add(dialog)
  return overlay
}

// Usage
function showDeleteConfirmation(renderer, fileName) {
  const dialog = ConfirmDialog({
    title: "Delete File",
    message: `Are you sure you want to delete ${fileName}?`,
    onConfirm: () => {
      console.log("Deleting", fileName)
      // Perform delete
    },
    onCancel: () => {
      console.log("Cancelled")
    },
  })
  
  renderer.root.add(dialog)
}
```

### Input Dialog

```typescript
function InputDialog(props: {
  title: string
  prompt: string
  placeholder?: string
  onSubmit: (value: string) => void
  onCancel: () => void
}) {
  const overlay = Box({
    width: "100%",
    height: "100%",
    backgroundColor: RGBA.fromValues(0, 0, 0, 0.7),
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
  })
  
  const input = Input({
    id: "dialog-input",
    placeholder: props.placeholder,
    width: 40,
  })
  
  const dialog = Box(
    {
      width: 50,
      height: 10,
      backgroundColor: "#2d2d2d",
      border: true,
      padding: 2,
      flexDirection: "column",
    },
    Text({ content: props.title, attributes: TextAttributes.BOLD, marginBottom: 1 }),
    Text({ content: props.prompt, marginBottom: 1 }),
    input,
    Box(
      { flexDirection: "row", gap: 2, marginTop: 2 },
      Button({
        id: "submit",
        label: "Submit",
        onClick: () => {
          props.onSubmit(input.getValue())
          overlay.destroy()
        },
      }),
      Button({
        id: "cancel",
        label: "Cancel",
        onClick: () => {
          props.onCancel()
          overlay.destroy()
        },
      })
    )
  )
  
  overlay.add(dialog)
  input.focus()
  
  return overlay
}
```

## Animation Patterns

### Smooth Transitions

```typescript
function animateProperty(
  renderable: Renderable,
  property: string,
  from: number,
  to: number,
  duration: number,
  easing: (t: number) => number = (t) => t // linear
) {
  const startTime = Date.now()
  
  function update() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const value = from + (to - from) * easing(progress)
    
    renderable[property] = value
    
    if (progress < 1) {
      requestAnimationFrame(update)
    }
  }
  
  update()
}

// Easing functions
const easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
}

// Usage
animateProperty(box, "left", 0, 100, 1000, easing.easeInOutQuad)
```

### Fade In/Out

```typescript
function fadeIn(renderable: Renderable, duration: number = 500) {
  // Animate alpha channel of background/foreground colors
  // Note: This requires accessing and modifying RGBA values
  const startAlpha = 0
  const endAlpha = 1
  
  animateProperty(renderable, "alpha", startAlpha, endAlpha, duration, easing.easeInQuad)
}

function fadeOut(renderable: Renderable, duration: number = 500) {
  animateProperty(renderable, "alpha", 1, 0, duration, easing.easeOutQuad)
}
```

## Advanced Patterns

### Custom Component with State

```typescript
class Counter {
  private count = 0
  private text: TextRenderable
  private renderer: RenderContext
  
  constructor(renderer: RenderContext) {
    this.renderer = renderer
    this.text = new TextRenderable(renderer, {
      id: "counter-text",
      content: `Count: ${this.count}`,
    })
  }
  
  increment() {
    this.count++
    this.updateDisplay()
  }
  
  decrement() {
    this.count--
    this.updateDisplay()
  }
  
  private updateDisplay() {
    this.text.setContent(`Count: ${this.count}`)
  }
  
  getRenderable() {
    return Box(
      { flexDirection: "row", gap: 2 },
      Button({ id: "dec", label: "-", onClick: () => this.decrement() }),
      this.text,
      Button({ id: "inc", label: "+", onClick: () => this.increment() })
    )
  }
}

// Usage
const counter = new Counter(renderer)
renderer.root.add(counter.getRenderable())
```

### Virtual Scrolling (Large Lists)

```typescript
function VirtualList(props: {
  items: any[]
  itemHeight: number
  visibleCount: number
  renderItem: (item: any, index: number) => VNode
}) {
  let scrollOffset = 0
  
  const container = Box({
    height: props.itemHeight * props.visibleCount,
    width: "100%",
    overflow: "hidden",
  })
  
  function render() {
    container.clear()
    
    const startIndex = Math.floor(scrollOffset / props.itemHeight)
    const endIndex = Math.min(startIndex + props.visibleCount + 1, props.items.length)
    
    for (let i = startIndex; i < endIndex; i++) {
      const item = props.renderItem(props.items[i], i)
      const y = i * props.itemHeight - scrollOffset
      item.position = "absolute"
      item.top = y
      container.add(item)
    }
  }
  
  // Handle scroll
  renderer.keyInput.on("keypress", (key) => {
    if (key.name === "up") {
      scrollOffset = Math.max(0, scrollOffset - props.itemHeight)
      render()
    } else if (key.name === "down") {
      const maxScroll = (props.items.length - props.visibleCount) * props.itemHeight
      scrollOffset = Math.min(maxScroll, scrollOffset + props.itemHeight)
      render()
    }
  })
  
  render()
  return container
}
```

### Drag and Drop

```typescript
function DraggableBox(props: { id: string; initialX: number; initialY: number }) {
  let isDragging = false
  let dragStartX = 0
  let dragStartY = 0
  let currentX = props.initialX
  let currentY = props.initialY
  
  const box = Box({
    width: 10,
    height: 5,
    position: "absolute",
    left: currentX,
    top: currentY,
    backgroundColor: "#444",
    border: true,
  })
  
  box.onMouseDown = (event) => {
    isDragging = true
    dragStartX = event.x
    dragStartY = event.y
  }
  
  box.onMouseUp = () => {
    isDragging = false
  }
  
  box.onMouseMove = (event) => {
    if (isDragging) {
      const deltaX = event.x - dragStartX
      const deltaY = event.y - dragStartY
      
      currentX += deltaX
      currentY += deltaY
      
      box.left = currentX
      box.top = currentY
      
      dragStartX = event.x
      dragStartY = event.y
    }
  }
  
  return box
}
```

## Code Editor Pattern

```typescript
async function createCodeEditor(renderer, initialContent: string = "", filetype: string = "typescript") {
  // Initialize Tree-Sitter
  const client = getTreeSitterClient()
  await client.initialize()
  
  const editor = Box(
    { width: "100%", height: "100%", flexDirection: "column" },
    
    // Header
    Box(
      { height: 1, backgroundColor: "#1e1e1e" },
      Text({ content: "Code Editor", fg: "#aaa" })
    ),
    
    // Code area
    new CodeRenderable(renderer, {
      id: "code",
      content: initialContent,
      filetype,
      showLineNumbers: true,
      width: "100%",
      height: "100%",
    }),
    
    // Status bar
    Box(
      { height: 1, backgroundColor: "#1e1e1e" },
      Text({ content: `Language: ${filetype}`, fg: "#aaa" })
    )
  )
  
  return editor
}
```

## Testing Patterns

### Component Testing

```typescript
import { expect, test } from "bun:test"
import { createCliRenderer, Text } from "@opentui/core"

test("TextRenderable displays content", async () => {
  const renderer = await createCliRenderer()
  
  const text = new TextRenderable(renderer, {
    id: "test-text",
    content: "Hello",
  })
  
  expect(text.content).toBe("Hello")
  
  text.setContent("World")
  expect(text.content).toBe("World")
})

test("BoxRenderable can add children", async () => {
  const renderer = await createCliRenderer()
  
  const box = new BoxRenderable(renderer, { id: "box" })
  const child = new TextRenderable(renderer, { id: "child", content: "Child" })
  
  box.add(child)
  
  expect(box.getRenderable("child")).toBe(child)
})
```
