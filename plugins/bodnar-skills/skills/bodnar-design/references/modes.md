# The three modes

This skill merges three modes. Pick the right one for the ask, or combine them. Read the matching section before building.

## §1. Mode: Hi-fi design

Produce polished, pixel-precise design output. Two presentation formats:

- **Purely visual** (color, type, static layout of one element) uses the `design_canvas` starter component, with options laid out side by side.
- **Interactions, flows, multi-option** mocks the product as a hi-fi clickable prototype using the Astro + Vue scaffold, with variants exposed as **Tweaks**.

### Hi-fi rules

- Ground designs in real context: an existing UI kit, codebase, screenshots, or brand. If none exists, ask the user via `questions_v2` before starting.
- One file with many variants beats N loose files. Use `<DCArtboard>` inside a `<design_canvas>` for side-by-side comparison, or Tweaks for stateful variants.
- Placeholders beat bad attempts at unavailable assets. Use subtly striped SVG placeholders with monospace explainer labels such as `[product shot 1200x800]`.
- Spend real effort on type pairing, the spacing scale, the color system, and the motion language. Hi-fi means decisions, not defaults.
- Astro pages render the static shell. Anything dynamic (form state, hover reveals, drag, audio) goes in a `.vue` island with the right directive:
  - `client:load` for UI that needs JS on first paint
  - `client:idle` for non-critical interactive UI
  - `client:visible` for below-the-fold widgets
  - `client:only="vue"` for pure-client UI with no SSR (use sparingly, weak for SEO)

### Vue island template

```vue
<!-- src/components/PriceCard.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{ basePrice: number; currency?: string }>();
const qty = ref(1);
const total = computed(() => props.basePrice * qty.value);
</script>

<template>
  <article class="card">
    <header>
      <slot name="title" />
    </header>
    <output>{{ currency ?? '$' }}{{ total.toFixed(2) }}</output>
    <input type="number" min="1" v-model.number="qty" />
  </article>
</template>

<style scoped>
.card { /* ... */ }
</style>
```

### Astro page that mounts it

```astro
---
// src/pages/index.astro
import Layout from '~/layouts/Base.astro';
import PriceCard from '~/components/PriceCard.vue';

const { runtime } = Astro.locals;
// const featured = await runtime.env.DB.prepare('SELECT ...').first();
---

<Layout title="Pricing">
  <PriceCard client:visible basePrice={49}>
    <span slot="title">Pro plan</span>
  </PriceCard>
</Layout>
```

## §2. Mode: Interactive prototype

Behaves like a real app. Real state, real transitions, real edge cases.

### Rules

- Reach for **Vue islands** for stateful UI. Reserve Astro components for layout and SSR data fetching.
- Persist meaningful state. For prototypes, use `localStorage` keyed per feature. For real apps on this stack, use KV or D1 via `Astro.locals.runtime.env`.
- Use **View Transitions** (`<ViewTransitions />` in the layout) for cross-page motion. Inside an island, use CSS transitions or the Web Animations API.
- Build multi-step flows with explicit state machines: an `enum` of phases plus a `phase` ref, rather than ad-hoc booleans.
- Hover, focus, disabled, loading, empty, and error states are all part of the prototype, not polish for later.
- Forms are HTML-first: native validation, then enhance with Vue. Server endpoints go in `src/pages/api/*.ts` and run on Workers, so they use no node-specific APIs.

### Server endpoint pattern (runs on Workers)

```ts
// src/pages/api/subscribe.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  const data = await request.formData();
  const email = String(data.get('email') ?? '');

  if (!email.includes('@')) {
    return new Response(JSON.stringify({ error: 'bad email' }), { status: 400 });
  }

  // await env.DB.prepare('INSERT INTO subs (email) VALUES (?)').bind(email).run();
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  });
};
```

### Tweaks (in-design controls)

When the user wants to compare variants, add a Tweaks panel. See the system prompt's Tweaks section for the protocol. For Vue prototypes:

```vue
<!-- src/components/TweaksPanel.vue -->
<script setup lang="ts">
import { reactive, watch, onMounted } from 'vue';

const tweaks = reactive(/*EDITMODE-BEGIN*/{
  "accent": "#D97757",
  "radius": 12,
  "dense": false
}/*EDITMODE-END*/);

function persist(patch: Record<string, unknown>) {
  window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
}

onMounted(() => {
  window.addEventListener('message', (e) => {
    if (e.data?.type === '__activate_edit_mode') show.value = true;
    if (e.data?.type === '__deactivate_edit_mode') show.value = false;
  });
  window.parent.postMessage({ type: '__edit_mode_available' }, '*');
});
</script>
```

## §3. Mode: Frontend design (no existing brand)

When there is no design system or brand to follow, there are two paths.

- **Default path** uses the **bodnar.sh system** documented in `references/bodnar-system.md`. It is the house style baked into this skill: terminal-first, mono-primary type, four swappable themes (dark, light, editorial, blueprint), and a rich library of system-software-flavored components. Reach for this unless the user signals a different mood.
- **Custom path** is for off-system work (luxury minimal, brutalist, art deco, retro-futuristic, soft pastel, and so on). Commit to one extreme and execute it with precision. Process below.

### Custom-path process

1. **Purpose.** What problem, and who uses it.
2. **Tone.** Pick one extreme and declare it out loud before writing code: brutalist, editorial, retro-futuristic, art deco, soft pastel, industrial, maximalist chaos, luxury minimal, and so on.
3. **Differentiation.** What is the one thing someone will remember?

### Aesthetic constraints

- **Typography.** Pair a distinctive display face with a refined body face. Avoid Inter, Roboto, Arial, and system fonts. Self-host Google Fonts via Astro's font helpers or `link rel=preload` so there is no FOUT during the hero load.
- **Color.** A dominant color with sharp accents beats an evenly distributed palette. Define colors via CSS custom properties in `src/styles/tokens.css` and consume them everywhere. Use `oklch()` for accents, sharing chroma and lightness while varying hue.
- **Motion.** One well-orchestrated page load with staggered reveals beats scattered micro-interactions. Prefer CSS `@keyframes` and view transitions.
- **Layout.** Use asymmetry, overlap, diagonal flow, and intentional density or generous negative space. Avoid centered-stacked-card SaaS defaults.
- **Background.** Gradient meshes, grain overlays, geometric patterns, layered transparencies. Atmosphere rather than flat color.
- **SVG.** Never hand-draw illustrative SVG. Geometric primitives only; everything else is a labeled placeholder.

### Tokens file

For the default house style, use the bodnar.sh token set shipped as `assets/tokens.css`. Do not re-roll it. Only invent new tokens when explicitly going off-system.
