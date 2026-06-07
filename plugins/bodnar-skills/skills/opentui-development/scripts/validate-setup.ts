#!/usr/bin/env bun
/**
 * validate-setup.ts - Validate OpenTUI development environment
 * 
 * Checks:
 * - Zig installation and version
 * - Bun installation and version
 * - Native libraries built
 * - Dependencies installed
 * - Project structure
 */

import { $ } from "bun"
import { existsSync } from "node:fs"
import { join } from "node:path"

interface ValidationResult {
  passed: boolean
  message: string
  details?: string
}

class Validator {
  private results: ValidationResult[] = []
  private hasErrors = false

  check(name: string, fn: () => Promise<ValidationResult> | ValidationResult) {
    return async () => {
      try {
        const result = await fn()
        this.results.push({ ...result, message: `${name}: ${result.message}` })
        if (!result.passed) this.hasErrors = true
      } catch (error) {
        this.results.push({
          passed: false,
          message: `${name}: Error during check`,
          details: error instanceof Error ? error.message : String(error),
        })
        this.hasErrors = true
      }
    }
  }

  async run() {
    for (const check of this.checks) {
      await check()
    }
  }

  private checks: Array<() => Promise<void>> = []

  report() {
    console.log("\n=== OpenTUI Setup Validation ===\n")

    for (const result of this.results) {
      const icon = result.passed ? "✅" : "❌"
      console.log(`${icon} ${result.message}`)
      if (result.details) {
        console.log(`   ${result.details}`)
      }
    }

    console.log("\n" + "=".repeat(35) + "\n")

    if (this.hasErrors) {
      console.log("❌ Validation failed. Please fix the issues above.")
      return false
    } else {
      console.log("✅ All checks passed! Your OpenTUI setup is ready.")
      return true
    }
  }
}

async function validateZig(): Promise<ValidationResult> {
  try {
    const result = await $`zig version`.text()
    const version = result.trim()
    return {
      passed: true,
      message: "Zig installed",
      details: `Version: ${version}`,
    }
  } catch {
    return {
      passed: false,
      message: "Zig not found",
      details: "Install from https://ziglang.org/download/",
    }
  }
}

async function validateBun(): Promise<ValidationResult> {
  try {
    const result = await $`bun --version`.text()
    const version = result.trim()
    const [major, minor] = version.split(".").map(Number)

    const isValid = major > 1 || (major === 1 && minor >= 2)

    return {
      passed: isValid,
      message: isValid ? "Bun version OK" : "Bun version too old",
      details: `Version: ${version} (required: >= 1.2.0)`,
    }
  } catch {
    return {
      passed: false,
      message: "Bun not found",
      details: "Install from https://bun.sh",
    }
  }
}

function validateProjectStructure(): ValidationResult {
  const requiredPaths = ["packages/core", "packages/core/src/zig", "package.json"]

  const missing = requiredPaths.filter((path) => !existsSync(path))

  if (missing.length > 0) {
    return {
      passed: false,
      message: "Project structure incomplete",
      details: `Missing: ${missing.join(", ")}`,
    }
  }

  return {
    passed: true,
    message: "Project structure valid",
  }
}

function validateNativeLibraries(): ValidationResult {
  const platform = process.platform
  const arch = process.arch

  let expectedLib: string
  if (platform === "darwin") {
    expectedLib = "libopentui.dylib"
  } else if (platform === "linux") {
    expectedLib = "libopentui.so"
  } else if (platform === "win32") {
    expectedLib = "opentui.dll"
  } else {
    return {
      passed: false,
      message: "Unsupported platform",
      details: `Platform: ${platform}, Arch: ${arch}`,
    }
  }

  const libPath = join("packages/core/src/zig/zig-out/lib", expectedLib)

  if (!existsSync(libPath)) {
    return {
      passed: false,
      message: "Native library not built",
      details: `Expected: ${libPath}. Run: bun run build:native`,
    }
  }

  return {
    passed: true,
    message: "Native library found",
    details: libPath,
  }
}

function validateDependencies(): ValidationResult {
  if (!existsSync("node_modules")) {
    return {
      passed: false,
      message: "Dependencies not installed",
      details: "Run: bun install",
    }
  }

  const coreModules = ["@opentui/core", "@opentui/solid", "@opentui/react"].map((pkg) =>
    join("node_modules", pkg)
  )

  const missing = coreModules.filter((path) => !existsSync(path))

  if (missing.length === coreModules.length) {
    return {
      passed: false,
      message: "OpenTUI packages not found",
      details: "Run: bun install",
    }
  }

  return {
    passed: true,
    message: "Dependencies installed",
  }
}

async function validateBuild(): Promise<ValidationResult> {
  try {
    // Try importing the core package
    const core = await import("./packages/core/src/index.ts")

    if (typeof core.createCliRenderer !== "function") {
      return {
        passed: false,
        message: "Core package import failed",
        details: "createCliRenderer not found",
      }
    }

    return {
      passed: true,
      message: "Core package imports correctly",
    }
  } catch (error) {
    return {
      passed: false,
      message: "Core package import failed",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  const validator = new Validator()

  // Register all checks
  validator.checks.push(validator.check("Zig", validateZig))
  validator.checks.push(validator.check("Bun", validateBun))
  validator.checks.push(validator.check("Project Structure", validateProjectStructure))
  validator.checks.push(validator.check("Dependencies", validateDependencies))
  validator.checks.push(validator.check("Native Libraries", validateNativeLibraries))
  validator.checks.push(validator.check("Core Package", validateBuild))

  await validator.run()
  const success = validator.report()

  process.exit(success ? 0 : 1)
}

main()
