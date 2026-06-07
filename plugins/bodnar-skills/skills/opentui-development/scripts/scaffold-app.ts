#!/usr/bin/env bun
/**
 * scaffold-app.ts - Create a new OpenTUI application from template
 * 
 * Usage:
 *   bun scripts/scaffold-app.ts my-app
 *   bun scripts/scaffold-app.ts my-app --solid
 *   bun scripts/scaffold-app.ts my-app --react
 */

import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

interface ScaffoldOptions {
  name: string
  framework?: "core" | "solid" | "react"
  path?: string
}

async function scaffoldApp(options: ScaffoldOptions) {
  const appPath = options.path || options.name
  const framework = options.framework || "core"

  console.log(`Creating OpenTUI app: ${options.name}`)
  console.log(`Framework: @opentui/${framework}`)
  console.log(`Location: ${appPath}`)

  // Create directory structure
  await mkdir(appPath, { recursive: true })
  await mkdir(join(appPath, "src"), { recursive: true })

  // Create package.json
  const packageJson = {
    name: options.name,
    version: "0.1.0",
    type: "module",
    scripts: {
      dev: "bun run src/index.ts",
      build: "bun build src/index.ts --outdir dist --target bun",
      start: "bun run dist/index.js",
    },
    dependencies: {
      [`@opentui/${framework}`]: "latest",
    },
    devDependencies: {
      "@types/bun": "latest",
      typescript: "^5",
    },
  }

  await writeFile(join(appPath, "package.json"), JSON.stringify(packageJson, null, 2))

  // Create tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: "ES2024",
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      types: ["bun-types"],
    },
    include: ["src/**/*"],
  }

  await writeFile(join(appPath, "tsconfig.json"), JSON.stringify(tsConfig, null, 2))

  // Create main app file based on framework
  let appCode = ""

  if (framework === "core") {
    appCode = `import { createCliRenderer, Box, Text } from "@opentui/core"

async function main() {
  const renderer = await createCliRenderer()

  const app = Box(
    {
      width: "100%",
      height: "100%",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
    },
    Text({
      content: "Hello, OpenTUI!",
      fg: "#00FF00",
    })
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
`
  } else if (framework === "solid") {
    appCode = `import { createCliRenderer } from "@opentui/core"
import { render, Box, Text } from "@opentui/solid"

async function main() {
  const renderer = await createCliRenderer()

  render(
    () => (
      <Box
        width="100%"
        height="100%"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
      >
        <Text content="Hello, OpenTUI with Solid!" fg="#00FF00" />
      </Box>
    ),
    renderer.root
  )

  renderer.keyInput.on("keypress", (key) => {
    if (key.ctrl && key.name === "c") {
      process.exit(0)
    }
  })
}

main()
`
  } else if (framework === "react") {
    appCode = `import { createCliRenderer } from "@opentui/core"
import { render, Box, Text } from "@opentui/react"

async function main() {
  const renderer = await createCliRenderer()

  render(
    <Box
      width="100%"
      height="100%"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <Text content="Hello, OpenTUI with React!" fg="#00FF00" />
    </Box>,
    renderer.root
  )

  renderer.keyInput.on("keypress", (key) => {
    if (key.ctrl && key.name === "c") {
      process.exit(0)
    }
  })
}

main()
`
  }

  await writeFile(join(appPath, "src", "index.ts"), appCode)

  // Create README
  const readme = `# ${options.name}

OpenTUI application using @opentui/${framework}

## Getting Started

\`\`\`bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build

# Run production build
bun run start
\`\`\`

## Project Structure

\`\`\`
${options.name}/
├── src/
│   └── index.ts        # Main application entry point
├── package.json
├── tsconfig.json
└── README.md
\`\`\`

## Learn More

- [OpenTUI Documentation](https://github.com/sst/opentui)
- [OpenTUI Examples](https://github.com/sst/opentui/tree/main/packages/core/src/examples)
`

  await writeFile(join(appPath, "README.md"), readme)

  // Create .gitignore
  const gitignore = `node_modules/
dist/
.DS_Store
*.log
`

  await writeFile(join(appPath, ".gitignore"), gitignore)

  console.log("\n✅ Application created successfully!")
  console.log("\nNext steps:")
  console.log(`  cd ${appPath}`)
  console.log("  bun install")
  console.log("  bun run dev")
}

// Parse command line arguments
const args = process.argv.slice(2)
const name = args[0]

if (!name) {
  console.error("Error: Application name is required")
  console.error("\nUsage:")
  console.error("  bun scripts/scaffold-app.ts <name> [options]")
  console.error("\nOptions:")
  console.error("  --solid    Use @opentui/solid")
  console.error("  --react    Use @opentui/react")
  console.error("\nExamples:")
  console.error("  bun scripts/scaffold-app.ts my-app")
  console.error("  bun scripts/scaffold-app.ts my-app --solid")
  process.exit(1)
}

const options: ScaffoldOptions = {
  name,
  framework: args.includes("--solid") ? "solid" : args.includes("--react") ? "react" : "core",
}

scaffoldApp(options).catch((error) => {
  console.error("Error creating application:", error)
  process.exit(1)
})
