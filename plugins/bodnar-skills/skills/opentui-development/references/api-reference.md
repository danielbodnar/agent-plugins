# OpenTUI API Reference

Complete API documentation for all OpenTUI renderables and their properties.

## Common Properties

All renderables support these base properties from Yoga layout:

### Positioning
- `position`: "relative" | "absolute" | "static"
- `left`, `right`, `top`, `bottom`: number | string (percentage)
- `width`, `height`: number | string ("100%", "auto")
- `minWidth`, `minHeight`, `maxWidth`, `maxHeight`: number

### Flexbox Layout
- `flexDirection`: "row" | "column" | "row-reverse" | "column-reverse"
- `flexWrap`: "wrap" | "nowrap" | "wrap-reverse"
- `flexGrow`, `flexShrink`, `flexBasis`: number
- `justifyContent`: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly"
- `alignItems`, `alignSelf`: "flex-start" | "flex-end" | "center" | "stretch" | "baseline"
- `alignContent`: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around"

### Spacing
- `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`: number
- `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`: number
- `gap`, `rowGap`, `columnGap`: number

### Display
- `display`: "flex" | "none"
- `overflow`: "visible" | "hidden" | "scroll"
- `aspectRatio`: number

## TextRenderable

Display styled text content.

### Properties
```typescript
interface TextRenderableOptions {
  id?: string
  content: string | StyledText  // StyledText from t`` template literal
  
  // Colors
  fg?: string | RGBA            // Foreground color
  bg?: string | RGBA            // Background color
  
  // Text attributes (bitwise OR to combine)
  attributes?: TextAttributes   // BOLD | UNDERLINE | ITALIC | STRIKETHROUGH | DIM | REVERSE
  
  // Selection
  selectable?: boolean          // Enable text selection (default: false)
  
  // Layout (inherits all common properties)
}
```

### Text Attributes
```typescript
enum TextAttributes {
  NONE = 0,
  BOLD = 1 << 0,
  DIM = 1 << 1,
  ITALIC = 1 << 2,
  UNDERLINE = 1 << 3,
  BLINK = 1 << 4,
  REVERSE = 1 << 5,
  HIDDEN = 1 << 6,
  STRIKETHROUGH = 1 << 7,
}

// Combine with bitwise OR
const attrs = TextAttributes.BOLD | TextAttributes.UNDERLINE
```

### Template Literals
```typescript
import { t, bold, underline, italic, fg, bg } from "@opentui/core"

// Combine styling functions
const styled = t`${bold("Bold text")} ${fg("#FF0000")(underline("Red underlined"))}`

// Available functions: bold, dim, italic, underline, strikethrough, reverse, fg, bg
```

### Methods
- `setContent(content: string | StyledText): void` - Update text content
- `select(): void` - Enable selection mode
- `deselect(): void` - Disable selection mode

### Events
None - text is display-only unless selectable

## BoxRenderable

Container component with borders, background, and layout capabilities.

### Properties
```typescript
interface BoxRenderableOptions {
  id?: string
  
  // Visual
  backgroundColor?: string | RGBA
  
  // Borders
  border?: boolean              // Simple border
  borderStyle?: BorderStyle     // "single" | "double" | "rounded" | "bold" | "none"
  borderColor?: string | RGBA
  borderTop?: boolean
  borderRight?: boolean
  borderBottom?: boolean
  borderLeft?: boolean
  
  // Title (displayed in top border)
  title?: string
  titleAlignment?: "left" | "center" | "right"
  
  // Layout (inherits all common properties)
  
  // Mouse events
  onMouseDown?: (event: MouseEvent) => void
  onMouseUp?: (event: MouseEvent) => void
  onMouseMove?: (event: MouseEvent) => void
  onClick?: (event: MouseEvent) => void
}
```

### Border Styles
- `"single"` - Single line box drawing characters
- `"double"` - Double line box drawing characters
- `"rounded"` - Rounded corners
- `"bold"` - Bold/thick lines
- `"none"` - No border

### Methods
- `add(child: Renderable): void` - Add child renderable
- `remove(child: Renderable): void` - Remove child renderable
- `getRenderable(id: string): Renderable | undefined` - Find child by ID

### Events
Mouse events via callbacks in options

## InputRenderable

Text input field with cursor support.

### Properties
```typescript
interface InputRenderableOptions {
  id?: string
  
  // Content
  value?: string                // Initial value
  placeholder?: string          // Placeholder text
  
  // Colors
  textColor?: string | RGBA
  backgroundColor?: string | RGBA
  cursorColor?: string | RGBA
  placeholderColor?: string | RGBA
  focusedBackgroundColor?: string | RGBA
  
  // Behavior
  maxLength?: number            // Maximum input length
  password?: boolean            // Mask input (default: false)
  
  // Layout (inherits all common properties)
}
```

### Methods
- `focus(): void` - Give focus to input (required to receive input)
- `blur(): void` - Remove focus
- `setValue(value: string): void` - Set input value
- `getValue(): string` - Get current value
- `clear(): void` - Clear input

### Events
```typescript
enum InputRenderableEvents {
  CHANGE = "change",          // Emitted on Enter/Return (will be fixed)
  FOCUS = "focus",
  BLUR = "blur",
}

input.on(InputRenderableEvents.CHANGE, (value: string) => {
  console.log("New value:", value)
})
```

**Note:** Currently CHANGE only fires on Enter/Return. This will be fixed in future versions.

## SelectRenderable

List selection component with scrolling support.

### Properties
```typescript
interface SelectOption {
  name: string
  description?: string
  value?: any                   // Optional associated data
}

interface SelectRenderableOptions {
  id?: string
  
  // Options
  options: SelectOption[]
  selectedIndex?: number        // Initial selection (default: 0)
  
  // Colors
  backgroundColor?: string | RGBA
  selectedBackgroundColor?: string | RGBA
  textColor?: string | RGBA
  selectedTextColor?: string | RGBA
  descriptionColor?: string | RGBA
  
  // Layout (inherits all common properties)
}
```

### Key Bindings
- `up` or `k` - Move selection up
- `down` or `j` - Move selection down
- `enter` - Select current item
- `esc` - Cancel (if configured)

### Methods
- `focus(): void` - Give focus (required to receive input)
- `blur(): void` - Remove focus
- `setSelectedIndex(index: number): void` - Change selection
- `getSelectedIndex(): number` - Get current selection
- `getSelectedOption(): SelectOption` - Get selected option

### Events
```typescript
enum SelectRenderableEvents {
  ITEM_SELECTED = "item_selected",
  SELECTION_CHANGED = "selection_changed",
}

select.on(SelectRenderableEvents.ITEM_SELECTED, (index: number, option: SelectOption) => {
  console.log("Selected:", option.name, "at index", index)
})

select.on(SelectRenderableEvents.SELECTION_CHANGED, (index: number) => {
  console.log("Selection moved to index:", index)
})
```

## TabSelectRenderable

Horizontal tab-based selection with scrolling.

### Properties
```typescript
interface TabSelectOption {
  name: string
  description?: string
  value?: any
}

interface TabSelectRenderableOptions {
  id?: string
  
  // Options
  options: TabSelectOption[]
  selectedIndex?: number
  tabWidth?: number             // Width of each tab
  
  // Colors
  backgroundColor?: string | RGBA
  selectedBackgroundColor?: string | RGBA
  textColor?: string | RGBA
  selectedTextColor?: string | RGBA
  descriptionColor?: string | RGBA
  
  // Layout (inherits all common properties)
}
```

### Key Bindings
- `left` or `[` - Move to previous tab
- `right` or `]` - Move to next tab
- `enter` - Select current tab
- `esc` - Cancel (if configured)

### Methods
Same as SelectRenderable

### Events
```typescript
enum TabSelectRenderableEvents {
  ITEM_SELECTED = "item_selected",
  SELECTION_CHANGED = "selection_changed",
}
```

## ASCIIFontRenderable

Display text using ASCII art fonts.

### Properties
```typescript
interface ASCIIFontRenderableOptions {
  id?: string
  
  // Content
  text: string
  font: string                  // Font name (e.g., "tiny", "banner", "big")
  
  // Colors
  fg?: RGBA
  bg?: RGBA
  
  // Layout (inherits all common properties)
}
```

### Available Fonts
Common fonts include: "tiny", "banner", "big", "block", "bubble", "digital", "ivrit", "lean", "mini", "script", "shadow", "slant", "small", "smscript", "smshadow", "smslant", "standard", "term"

### Methods
- `setText(text: string): void` - Update displayed text
- `setFont(font: string): void` - Change font

## FrameBufferRenderable

Low-level 2D rendering surface for custom graphics.

### Properties
```typescript
interface FrameBufferRenderableOptions {
  id?: string
  
  // Dimensions
  width: number
  height: number
  
  // Layout (inherits all common properties)
}
```

### FrameBuffer Methods
Access via `renderable.frameBuffer`:

```typescript
interface OptimizedBuffer {
  // Dimensions
  width: number
  height: number
  
  // Cell manipulation
  setCell(x: number, y: number, char: string, fg: RGBA, bg: RGBA, attributes?: number): void
  setCellWithAlphaBlending(x: number, y: number, char: string, fg: RGBA, bg: RGBA, attributes?: number): void
  getCell(x: number, y: number): Cell
  
  // Drawing
  drawText(text: string, x: number, y: number, fg: RGBA, bg?: RGBA, attributes?: number): void
  fillRect(x: number, y: number, width: number, height: number, fg: RGBA, bg?: RGBA, char?: string): void
  drawFrameBuffer(source: OptimizedBuffer, srcX: number, srcY: number, srcW: number, srcH: number, dstX: number, dstY: number): void
  
  // Utilities
  clear(): void
  fill(char: string, fg: RGBA, bg: RGBA): void
}

interface Cell {
  char: string
  fg: RGBA
  bg: RGBA
  attributes: number
}
```

### Example
```typescript
const fb = new FrameBufferRenderable(renderer, {
  id: "canvas",
  width: 50,
  height: 20,
})

// Draw a red rectangle
fb.frameBuffer.fillRect(5, 5, 10, 8, RGBA.fromHex("#FF0000"))

// Draw text
fb.frameBuffer.drawText("Hello", 7, 9, RGBA.fromHex("#FFFFFF"))

// Alpha blending
const semiTransparent = RGBA.fromValues(1.0, 0.0, 0.0, 0.5)
fb.frameBuffer.setCellWithAlphaBlending(10, 10, "X", semiTransparent, RGBA.transparent())
```

## CodeRenderable

Syntax-highlighted code display using Tree-Sitter.

### Properties
```typescript
interface CodeRenderableOptions {
  id?: string
  
  // Content
  content: string
  filetype?: string             // Language identifier (e.g., "typescript", "python")
  
  // Display
  showLineNumbers?: boolean     // Show line numbers (default: false)
  lineNumberColor?: string | RGBA
  
  // Colors
  backgroundColor?: string | RGBA
  
  // Layout (inherits all common properties)
}
```

### Methods
- `setContent(content: string): void` - Update code
- `setFiletype(filetype: string): void` - Change language

**Note:** Requires Tree-Sitter client to be initialized with appropriate language parsers.

## GroupRenderable

Container for grouping renderables without visual styling (pure layout).

### Properties
```typescript
interface GroupRenderableOptions {
  id?: string
  
  // Layout only (inherits all common properties)
  // No visual properties (no background, borders, etc.)
}
```

### Methods
- `add(child: Renderable): void`
- `remove(child: Renderable): void`
- `getRenderable(id: string): Renderable | undefined`

## ImageRenderable

Display images in the terminal.

### Properties
```typescript
interface ImageRenderableOptions {
  id?: string
  
  // Source
  src: string                   // Path to image file
  
  // Display
  fitMode?: "contain" | "cover" | "fill" | "none"
  
  // Layout (inherits all common properties)
}
```

### Methods
- `setSource(src: string): void` - Change image source

**Note:** Terminal image support varies by terminal emulator.

## Console API

Access via `renderer.console`:

```typescript
interface Console {
  // Visibility
  toggle(): void                // Toggle visibility and focus
  show(): void                  // Show console
  hide(): void                  // Hide console
  
  // Focus
  focus(): void                 // Focus console for scrolling
  blur(): void                  // Remove focus
  
  // Size
  increaseSize(): void          // Increase console size
  decreaseSize(): void          // Decrease console size
  setSize(percent: number): void // Set size (0-100)
  
  // Content
  clear(): void                 // Clear console buffer
  
  // Position
  position: ConsolePosition     // Get/set position
}

enum ConsolePosition {
  TOP = "top",
  BOTTOM = "bottom",
  LEFT = "left",
  RIGHT = "right",
}
```

### Console Key Bindings
When focused:
- `↑` `↓` - Scroll up/down
- `+` - Increase size
- `-` - Decrease size
- `esc` - Unfocus console

## Keyboard Events

```typescript
interface KeyEvent {
  name: string                  // Key name ("escape", "return", "a", "f1", etc.)
  sequence: string              // Raw escape sequence
  ctrl: boolean                 // Ctrl modifier
  shift: boolean                // Shift modifier
  meta: boolean                 // Alt/Meta modifier
  option: boolean               // Option modifier (macOS)
}

// Usage
renderer.keyInput.on("keypress", (key: KeyEvent) => {
  if (key.ctrl && key.name === "c") {
    // Handle Ctrl+C
  }
})

renderer.keyInput.on("paste", (text: string) => {
  // Handle pasted text
})
```

## Mouse Events

```typescript
interface MouseEvent {
  x: number                     // Column
  y: number                     // Row
  button: number                // Button number (0 = left, 1 = middle, 2 = right)
  shift: boolean
  ctrl: boolean
  meta: boolean
}

// Usage on renderables
box.onMouseDown = (event: MouseEvent) => {
  console.log(`Mouse down at ${event.x}, ${event.y}`)
}

box.onMouseUp = (event: MouseEvent) => {
  console.log("Mouse up")
}

box.onMouseMove = (event: MouseEvent) => {
  console.log(`Mouse moved to ${event.x}, ${event.y}`)
}

box.onClick = (event: MouseEvent) => {
  console.log("Clicked")
}
```

## Color API

```typescript
class RGBA {
  r: number // 0.0 - 1.0
  g: number // 0.0 - 1.0
  b: number // 0.0 - 1.0
  a: number // 0.0 - 1.0
  
  // Constructors
  static fromInts(r: number, g: number, b: number, a: number): RGBA
  static fromValues(r: number, g: number, b: number, a: number): RGBA
  static fromHex(hex: string): RGBA
  static transparent(): RGBA
  
  // Methods
  toHex(): string
  toRgbString(): string
  toRgbaString(): string
  withAlpha(alpha: number): RGBA
  blend(other: RGBA): RGBA
}

// Utility function
function parseColor(color: string | RGBA): RGBA
```

## VNode API (Constructs)

```typescript
// Creating VNodes
function Box(props: BoxProps, ...children: VNode[]): VNode
function Text(props: TextProps): VNode
function Input(props: InputProps): VNode
// ... etc for all renderables

// Delegation
function delegate(mapping: Record<string, string>, vnode: VNode): VNode

// Example
const component = delegate(
  { focus: "input-id" },
  Box({}, Input({ id: "input-id" }))
)

// Calling methods on VNode delegates to the specified renderable
component.focus() // Calls focus() on the Input with id "input-id"

// Instantiation (usually automatic)
function instantiate(ctx: RenderContext, vnode: VNode): Renderable
```
