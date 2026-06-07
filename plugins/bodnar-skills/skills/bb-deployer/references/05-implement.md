# Phase 5: Implement

The goal is parity with the artifact, not improvement. The artifact was a prototype; improvements come after deploy in the Review phase. Translate component by component, smallest leaves first, working outward to the page level. Visible progress beats invisible perfection.

## Inputs

The `bb-deployer-analysis.md` from Phase 1 and the `bb-deployer-spec.json` from Phase 2. The analysis tells you what to translate; the spec tells you what to translate into.

## Translation order

Work bottom-up through the component graph from the analysis.

Start with presentational leaves (buttons, cards, icons). They have the fewest dependencies and translate cleanest.

Move outward to container components that compose the leaves.

End at the page-level components, which mostly orchestrate layout, routing, and data fetching.

For each component, read the React source, write the equivalent in the target framework, and move on. Do not stop to refactor neighbors mid-translation. Refactor passes happen after parity.

## React to Vue 3 (Composition API)

Vue 3 with `<script setup lang="ts">` is the target. The mapping below covers the common cases. Tailwind classes carry over unchanged.

| React | Vue 3 |
|---|---|
| `function Foo(props)` returning JSX | `Foo.vue` with `<script setup lang="ts">` and `<template>` |
| `useState(initial)` for primitives | `const x = ref(initial)`, read as `x.value`, in template as `x` |
| `useState({...})` for objects | `const state = reactive({...})` |
| `useEffect(fn, [deps])` with deps | `watch([deps], fn)` |
| `useEffect(fn, [])` once on mount | `onMounted(fn)` |
| `useMemo(fn, [deps])` | `const x = computed(fn)` |
| `useCallback(fn, [deps])` | usually unnecessary; Vue does not re-create function identities on render |
| `useContext(C)` | `inject(key)` in child, `provide(key, value)` in parent |
| `useReducer` for complex state | Pinia store |
| `props.children` | `<slot />` |
| `onClick={handler}` | `@click="handler"` |
| `className="..."` | `class="..."` |
| `style={{color: x}}` | `:style="{ color: x }"` |
| `{x && <A />}` | `<A v-if="x" />` |
| `{x ? <A /> : <B />}` | `<A v-if="x" />` followed by `<B v-else />` |
| `arr.map(item => <A key={item.id} />)` | `<A v-for="item in arr" :key="item.id" />` |
| `<input value={x} onChange={e => set(e.target.value)} />` | `<input v-model="x" />` |
| Fragment `<>...</>` | wrap in a single root, or use `<template>` |
| Portal | Teleport: `<Teleport to="body">...</Teleport>` |

Routing converts from `react-router` to `vue-router`. The router was scaffolded in Phase 3; add routes in `apps/web/src/router/index.ts` matching the route table from the analysis.

State that crosses multiple pages or persists across navigation belongs in a Pinia store under `apps/web/src/stores/`.

## React to Astro

Astro components are HTML-first with frontmatter in the fenced top block. Use plain `.astro` components for static content and only opt into interactivity via `client:*` directives when the analysis flags a component as interactive.

| React | Astro |
|---|---|
| Static presentational component | `.astro` file: frontmatter for props, then HTML body with `{expr}` interpolation |
| Interactive component | Author it as a Vue component, then import in Astro with `<MyVue client:visible />` |
| Pages | `src/pages/*.astro`, file-based routing |
| Layouts | `src/layouts/*.astro` with `<slot />` |
| Data fetching at request time | `await` in frontmatter; Astro runs it server-side per request |
| Conditional rendering | `{x && <Comp />}` works in `.astro` too |
| List rendering | `{items.map(item => <Item {...item} />)}` |

For islands, default to Vue (Daniel's preference). Add Solid only when the artifact uses a feature Vue handles poorly (fine-grained reactivity with thousands of cells, for example).

Be conservative with `client:*` directives. The point of Astro is to ship less JavaScript. Every island has a cost. When in doubt, leave it static.

## Backend (Hono on Workers)

For each fetch or POST in the analysis, create a Hono route. Group routes by resource (`/todos`, `/users`, `/uploads`). Use Zod for request validation; the schema lives in `packages/shared/src/` and both frontend and backend import it.

```ts
// packages/shared/src/schemas.ts
import { z } from "zod";

export const TodoSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  done: z.boolean(),
});
export type Todo = z.infer<typeof TodoSchema>;

export const NewTodoSchema = TodoSchema.omit({ id: true });
```

```ts
// apps/api/src/index.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { NewTodoSchema } from "@<project-name>/shared";

const app = new Hono<{ Bindings: Env }>();

app.get("/todos", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM todos ORDER BY id DESC"
  ).all();
  return c.json(results);
});

app.post(
  "/todos",
  zValidator("json", NewTodoSchema),
  async (c) => {
    const body = c.req.valid("json");
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO todos (id, title, done) VALUES (?, ?, ?)"
    ).bind(id, body.title, body.done ? 1 : 0).run();
    return c.json({ id, ...body }, 201);
  }
);

export default app;
```

The `Env` type is generated by `bunx wrangler types`. Re-run it after every `wrangler.jsonc` change.

For D1, write schema migrations under `apps/api/migrations/` named `0001_init.sql`, `0002_<change>.sql`, and so on. Phase 7 applies them with `bunx wrangler d1 execute`.

For static assets served by the Worker, the assets binding (configured in Phase 4) handles routing. Hono routes that do not match fall through to the asset handler automatically when configured correctly.

## Shared types

Every Zod schema lives in `packages/shared/src/`. Export both the schema and the inferred type. The frontend imports the types for form validation; the backend imports the schemas for `zValidator`.

```ts
// packages/shared/src/index.ts
export * from "./schemas";
```

Workspace dependencies are declared in Phase 3. If the imports fail, run `bun install` from the repo root to relink workspaces.

## Tailwind tokens

When Phase 4 extracted tokens into `tailwind.config.js`, use the named classes (`bg-brand`, `text-brand`, `font-sans`) instead of repeating hex codes inline. When Phase 5 surfaces additional load-bearing tokens, extend the config and update the components in the same commit.

## What to skip

Do not write tests yet (Phase 6 owns that). Do not deploy yet (Phase 7). Do not chase improvements over the artifact's behavior; the artifact's parity bar is the bar. The Review phase will surface improvements after deploy.

## When to stop and ask

When the artifact uses a feature with no clean equivalent in the target framework, surface the question. Examples: a React Server Component (unsupported in Vue and unnecessary in Astro), a third-party React-only library (look for a Vue port or a vanilla alternative first), a library that needs Node APIs unavailable in Workers (move to a Container, or simplify the feature).

Do not silently swap a library for "the closest thing". The closest thing usually behaves differently, and the difference will not surface until deploy.

## Verification

```bash
bun run lint
bun run build
bun run dev
```

Open the local URLs and click through every flow the artifact supports. Compare to the artifact side by side. Parity is the bar; close-enough is not.

Commit:

```bash
git add -A
git commit -m "feat: translate <artifact name> to <framework>"
```
