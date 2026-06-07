# Phase 6: Test

The goal is a regression net that catches translation bugs and breaks loudly when the deployed surface drifts. Coverage targets are the wrong frame here; the artifact was a prototype, and the tests exist to keep the translation honest, not to certify quality.

## Unit tests with Vitest

Install at the repo root so both apps share the version:

```bash
bun add -D vitest @vitest/ui happy-dom
```

In each app's `package.json` add:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

In each app, create `vitest.config.ts` next to the framework config:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: false
  }
});
```

For the Worker app, prefer the `node` environment over `happy-dom` since Workers run server-side logic.

## What to test

Test the things most likely to break in stack translation. Skip the rest.

**Shared schemas** in `packages/shared/`. Round-trip a valid object through the Zod schema and assert it parses. Round-trip an invalid object and assert it throws.

**Hono route handlers** in `apps/api/`. Use `app.request()` to drive the app in-memory without spinning up a real Worker:

```ts
import { describe, it, expect } from "vitest";
import app from "../src/index";

describe("POST /todos", () => {
  it("creates a todo and returns 201", async () => {
    const res = await app.request("/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "hello", done: false })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("hello");
  });

  it("rejects invalid input with 400", async () => {
    const res = await app.request("/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" })
    });
    expect(res.status).toBe(400);
  });
});
```

When bindings (D1, KV) are involved, use Cloudflare's local development bindings via `@cloudflare/workers-types` and `unstable_dev` from `wrangler`, or mock the bindings inline for unit tests.

**Vue composables or Astro utility functions** that contain non-trivial logic. Pure functions and reactive logic translate to straightforward Vitest assertions. Skip testing trivial template binding; the framework guarantees it.

## E2E smoke tests with Playwright

Daniel has `testgen-action` from prior work that auto-generates Vitest, Playwright, and Puppeteer tests. When available in the project's GitHub Actions, configure it and let it generate the smoke tests. Otherwise hand-write a minimal Playwright suite.

```bash
bun add -D @playwright/test
bunx playwright install --with-deps chromium
```

`tests/smoke.spec.ts` at the repo root:

```ts
import { test, expect } from "@playwright/test";

const BASE = process.env.SMOKE_URL ?? "http://localhost:5173";

test("home page renders without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(BASE);
  await expect(page.locator("h1")).toBeVisible();
  expect(errors).toHaveLength(0);
});

test("primary user flow completes", async ({ page }) => {
  await page.goto(BASE);
  // Replace with the artifact's actual primary flow
  // For a todo app: type, submit, assert it shows up
});
```

Configure `playwright.config.ts` at the root:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: { baseURL: process.env.SMOKE_URL ?? "http://localhost:5173" },
  webServer: process.env.CI
    ? undefined
    : {
        command: "bun run dev",
        url: "http://localhost:5173",
        reuseExistingServer: true
      }
});
```

In CI the smoke tests can run against the deployed URL by setting `SMOKE_URL`. Phase 7 sets this up.

## Verification

```bash
bun test
bunx playwright test
```

Both should pass. When `bun test` fails, fix the underlying logic before moving on. When Playwright fails on a smoke test that does match the artifact behavior, the translation has a bug; do not weaken the test to make it pass.

Commit:

```bash
git add -A
git commit -m "test: add unit and smoke tests"
```

## What to skip

Coverage targets. Snapshot tests for visual parity (the Tailwind config plus Phase 5 translation handles that). Exhaustive edge-case testing of framework features that the framework itself is tested for. The artifact was a prototype; the tests are a regression net, not a quality gate.

## When to stop and ask

When the artifact behavior is itself ambiguous (a flow that worked but only sometimes, or a UX choice that was unclear in the original), ask Daniel to nail down the intended behavior before encoding it in a test. Tests that codify an unintended behavior are worse than no test.
