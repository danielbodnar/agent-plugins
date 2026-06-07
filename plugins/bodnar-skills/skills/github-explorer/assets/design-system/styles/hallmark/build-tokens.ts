/**
 * build-tokens.ts — compiles theme.config.ts into tokens.css.
 *
 * Run with: bun run styles/hallmark/build-tokens.ts
 *
 * This is a pure transform. It reads the validated `theme` object and emits a CSS file
 * of custom properties: a `:root` block for light, a `prefers-color-scheme: dark` block
 * that respects a manual light override, and a `[data-theme="dark"]` block for the manual
 * toggle. The scale tokens (type, space, radius, motion, layout) are scheme-independent and
 * live in `:root` only. Colour and shadow tokens are emitted per scheme.
 *
 * The naming contract: a config key like `accentBg` becomes `--color-accent-bg`. The camelCase
 * to kebab-case mapping is mechanical and total, so the CSS variable names are derivable from
 * the type without a lookup table.
 */

import { theme, type ColorScheme } from "../../theme.config";

/**
 * camelCase -> kebab-case, with a digit boundary rule so `paper2` -> `paper-2`
 * and `accentBgStrong` -> `accent-bg-strong`. The digit rule matters because the
 * surface and ink ramps are numbered, and the app's CSS expects `--color-paper-2`.
 */
const camelToKebab = (s: string): string =>
  s
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .toLowerCase();

/** Map a colour-scheme object to its `--color-*` and `--shadow-*` declarations. */
function schemeVars(scheme: ColorScheme): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(scheme)) {
    const kebab = camelToKebab(key);
    // Shadows are top-level (--shadow, --shadow-sm); everything else is a colour.
    const name = kebab.startsWith("shadow") ? `--${kebab}` : `--color-${kebab}`;
    lines.push(`  ${name}: ${value};`);
  }
  return lines;
}

/** The scale tokens are scheme-independent: type, space, radius, motion, layout, fonts. */
function scaleVars(): string[] {
  const t = theme;
  const lines: string[] = [];

  lines.push(`  /* Typography */`);
  lines.push(`  --font-display: ${t.font.display};`);
  lines.push(`  --font-body: ${t.font.body};`);
  lines.push(`  --font-mono: ${t.font.mono};`);
  for (const [k, v] of Object.entries(t.text)) lines.push(`  --text-${k}: ${v};`);

  lines.push(``, `  /* Spacing (4-pt scale) */`);
  for (const [k, v] of Object.entries(t.space)) lines.push(`  --space-${k}: ${v};`);

  lines.push(``, `  /* Radius (rem) */`);
  for (const [k, v] of Object.entries(t.radius)) lines.push(`  --radius-${k}: ${v};`);

  lines.push(``, `  /* Motion */`);
  lines.push(`  --ease-out: ${t.motion.easeOut};`);
  lines.push(`  --duration-fast: ${t.motion.durationFast};`);
  lines.push(`  --duration: ${t.motion.duration};`);

  lines.push(``, `  /* Layout contracts (rem, so panels scale with user font-size) */`);
  for (const [k, v] of Object.entries(t.layout)) lines.push(`  --${camelToKebab(k)}: ${v};`);

  lines.push(``, `  /* Composed rules (borders stay in px: sub-pixel rem rounding can drop a hairline) */`);
  lines.push(`  --hairline: 1px solid var(--color-rule);`);
  lines.push(`  --hairline-strong: 1px solid var(--color-rule-2);`);

  return lines;
}

export function buildTokensCss(): string {
  const stamp = `/* Stars Workbench design tokens — generated from theme.config.ts. Do not edit by hand.\n * theme: ${theme.meta.name} · macrostructure: ${theme.meta.macrostructure} · accent hue: ${theme.meta.accentHue}\n * Units: type, spacing, radius, and layout are rem so they scale with the user's font-size.\n * Borders and shadow offsets stay in px on purpose (hairlines must not sub-pixel-round away).\n */`;

  const root = [
    `:root {`,
    `  color-scheme: light dark;`,
    ...scaleVars(),
    ``,
    `  /* Light scheme (default) */`,
    ...schemeVars(theme.light),
    `}`,
  ].join("\n");

  // Auto dark mode, but only when the user has not forced light via data-theme.
  const autoDark = [
    `@media (prefers-color-scheme: dark) {`,
    `  :root:not([data-theme="light"]) {`,
    ...schemeVars(theme.dark).map((l) => `  ${l}`),
    `    color-scheme: dark;`,
    `  }`,
    `}`,
  ].join("\n");

  // Manual dark toggle.
  const manualDark = [
    `:root[data-theme="dark"] {`,
    ...schemeVars(theme.dark),
    `  color-scheme: dark;`,
    `}`,
  ].join("\n");

  return [stamp, root, autoDark, manualDark, ``].join("\n\n");
}

/** Emit the Google Fonts <link> href for the webfonts the theme declares. */
export function buildFontsHref(): string {
  const families = theme.font.webfonts
    .map((f: { family: string; weights: number[] }) => `family=${f.family.replace(/ /g, "+")}:wght@${f.weights.join(";")}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

// When executed directly (bun run), write the file next to this script.
if (import.meta.main) {
  const out = new URL("./tokens.css", import.meta.url);
  await Bun.write(out, buildTokensCss());
  console.log(`Wrote ${out.pathname}`);
  console.log(`Fonts: ${buildFontsHref()}`);
}
