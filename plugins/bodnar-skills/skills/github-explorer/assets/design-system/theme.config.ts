/**
 * theme.config.ts — the single source of truth for the Stars Workbench design system.
 *
 * Every colour, font, size, and motion value the UI uses is declared here once, validated
 * with Zod, and compiled into CSS custom properties by `styles/hallmark/build-tokens.ts`.
 * Nothing downstream invents a value. If a component needs a token that does not exist,
 * it is added here and recompiled, never hardcoded at the call site.
 *
 * The palette is the "Quiet" theme: a near-white paper, a cool blue-grey ink, and a single
 * chromatic accent at hue 244 (cool blue). Dark mode is a full re-mapping, not an inversion.
 *
 * Design language: functional-compositional. The config is plain data. The compiler is a
 * pure function from this data to a CSS string. There is no class hierarchy and no runtime
 * mutation of theme state beyond the documented light/dark switch.
 */

import { z } from "zod";

/* ─────────────────────────────────────────────────────────────────────────
 * Schemas
 *
 * OKLCH is the only colour space the system speaks. Every colour token is
 * validated as a well-formed `oklch(...)` string so a typo cannot reach the
 * compiled stylesheet. Alpha-bearing values (shadows) are allowed the slash form.
 * ───────────────────────────────────────────────────────────────────────── */

const Oklch = z
  .string()
  .regex(
    /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+(\s*\/\s*[\d.]+)?\s*\)$/,
    "must be a valid oklch(L C H) or oklch(L C H / A) string",
  );

const Shadow = z.string().min(1);
const Length = z.string().regex(/^(-?[\d.]+(px|rem|em|ch|vw|vh|%)|0|clamp\(.+\))$/, "must be a CSS length");
const Duration = z.string().regex(/^\d+ms$/, "must be a duration in ms");
const Easing = z.string().regex(/^cubic-bezier\(.+\)$/, "must be a cubic-bezier easing");
const FontStack = z.string().min(1);

/** A colour scheme is the full set of surface, ink, line, accent, and status tokens. */
const ColorScheme = z.object({
  // Surfaces — paper is the base; higher numbers sit visually "above" the page.
  paper: Oklch,
  paper2: Oklch,
  paper3: Oklch,
  paper4: Oklch,
  // Ink — text and icon foreground; ink is primary, higher numbers recede.
  ink: Oklch,
  ink2: Oklch,
  ink3: Oklch,
  ink4: Oklch,
  // Lines — hairline rules and stronger dividers.
  rule: Oklch,
  rule2: Oklch,
  // Accent — the single chromatic voice and its tinted backgrounds.
  accent: Oklch,
  accent2: Oklch,
  accentBg: Oklch,
  accentBgStrong: Oklch,
  // Status — semantic signals. Used sparingly: activity dots, README badges.
  success: Oklch,
  warning: Oklch,
  danger: Oklch,
  // Focus ring — usually the accent at the scheme's most legible chroma.
  focus: Oklch,
  // Row states — the datagrid and list rely on these for hover and selection.
  rowHover: Oklch,
  rowSelected: Oklch,
  rowSelectedRule: Oklch,
  // Elevation — three shadow steps, tuned per scheme (darker schemes need denser shadow).
  shadowSm: Shadow,
  shadow: Shadow,
  shadowLg: Shadow,
});

const ThemeConfig = z.object({
  meta: z.object({
    name: z.string(),
    description: z.string(),
    /** Hallmark macrostructure this system was extracted from, for the build stamp. */
    macrostructure: z.string(),
    accentHue: z.number().min(0).max(360),
  }),

  font: z.object({
    display: FontStack,
    body: FontStack,
    mono: FontStack,
    /** Google Fonts families to preload, with the weights actually used. */
    webfonts: z.array(z.object({ family: z.string(), weights: z.array(z.number()) })),
  }),

  /** Major-third-ish type scale. Values are rem unless a clamp is needed. */
  text: z.object({
    xs: Length,
    sm: Length,
    base: Length,
    lg: Length,
    xl: Length,
    "2xl": Length,
    "3xl": Length,
  }),

  /** 4-pt spacing scale. The UI is dense, so the low end is fine-grained. */
  space: z.object({
    1: Length,
    2: Length,
    3: Length,
    4: Length,
    5: Length,
    6: Length,
    7: Length,
    8: Length,
  }),

  radius: z.object({
    sm: Length,
    md: Length,
    lg: Length,
    pill: Length,
  }),

  motion: z.object({
    easeOut: Easing,
    durationFast: Duration,
    duration: Duration,
  }),

  /** Application chrome dimensions. These are layout contracts, not decoration.
   *  Express these in rem (not px) so the whole workbench scales with the reader's
   *  font-size. Borders and shadow offsets are the deliberate exception and stay in px,
   *  because a 1px hairline expressed in rem can sub-pixel-round away at some zoom levels.
   *  These are starting widths only: the panels resize without min or max bounds, so a
   *  reader can drag any pane to any size. The flexible content column carries min-width:0
   *  so it can collapse fully when an adjacent pane is dragged wide. */
  layout: z.object({
    topbarH: Length,
    sidebarW: Length,
    detailW: Length,
    listW: Length,
  }),

  light: ColorScheme,
  dark: ColorScheme,
});

export type Oklch = z.infer<typeof Oklch>;
export type ColorScheme = z.infer<typeof ColorScheme>;
export type ThemeConfig = z.infer<typeof ThemeConfig>;

/* ─────────────────────────────────────────────────────────────────────────
 * The theme
 * ───────────────────────────────────────────────────────────────────────── */

const config: ThemeConfig = {
  meta: {
    name: "Quiet",
    description:
      "Near-white paper, cool blue-grey ink, a single accent at hue 244. A restrained, " +
      "tool-grade surface that stays out of the way of dense repository data.",
    macrostructure: "Workbench",
    accentHue: 244,
  },

  font: {
    display: `"Inter Tight", system-ui, sans-serif`,
    body: `"Inter", system-ui, sans-serif`,
    mono: `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace`,
    webfonts: [
      { family: "Inter Tight", weights: [400, 500, 600, 700] },
      { family: "Inter", weights: [400, 450, 500, 600] },
      { family: "JetBrains Mono", weights: [400, 500, 600] },
    ],
  },

  text: {
    xs: "0.75rem",
    sm: "0.8125rem",
    base: "0.9375rem",
    lg: "1.0625rem",
    xl: "1.25rem",
    "2xl": "1.625rem",
    "3xl": "2.125rem",
  },

  space: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.5rem",
    6: "2rem",
    7: "3rem",
    8: "4.5rem",
  },

  radius: {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    pill: "62.5rem",
  },

  motion: {
    easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
    durationFast: "120ms",
    duration: "200ms",
  },

  layout: {
    topbarH: "3.5rem",
    sidebarW: "17.5rem",
    detailW: "25rem",
    listW: "23.75rem",
  },

  light: {
    paper: "oklch(99% 0 0)",
    paper2: "oklch(96.8% 0 0)",
    paper3: "oklch(94% 0.003 240)",
    paper4: "oklch(91% 0.005 240)",
    ink: "oklch(17% 0.012 240)",
    ink2: "oklch(36% 0.008 240)",
    ink3: "oklch(54% 0.005 240)",
    ink4: "oklch(70% 0.004 240)",
    rule: "oklch(89% 0.003 240)",
    rule2: "oklch(82% 0.005 240)",
    accent: "oklch(52% 0.17 244)",
    accent2: "oklch(60% 0.16 244)",
    accentBg: "oklch(96% 0.025 244)",
    accentBgStrong: "oklch(92% 0.04 244)",
    success: "oklch(56% 0.14 148)",
    warning: "oklch(70% 0.16 75)",
    danger: "oklch(55% 0.18 25)",
    focus: "oklch(52% 0.17 244)",
    rowHover: "oklch(96.8% 0 0)",
    rowSelected: "oklch(94% 0.025 244)",
    rowSelectedRule: "oklch(82% 0.06 244)",
    shadowSm: "0 1px 2px oklch(0% 0 0 / 0.04)",
    shadow: "0 1px 2px oklch(0% 0 0 / 0.04), 0 8px 24px oklch(0% 0 0 / 0.06)",
    shadowLg: "0 1px 2px oklch(0% 0 0 / 0.04), 0 16px 48px oklch(0% 0 0 / 0.08)",
  },

  dark: {
    paper: "oklch(13% 0.008 240)",
    paper2: "oklch(16% 0.01 240)",
    paper3: "oklch(20% 0.012 240)",
    paper4: "oklch(25% 0.012 240)",
    ink: "oklch(95% 0.005 240)",
    ink2: "oklch(76% 0.005 240)",
    ink3: "oklch(58% 0.008 240)",
    ink4: "oklch(42% 0.008 240)",
    rule: "oklch(26% 0.012 240)",
    rule2: "oklch(34% 0.012 240)",
    accent: "oklch(72% 0.15 244)",
    accent2: "oklch(78% 0.14 244)",
    accentBg: "oklch(28% 0.07 244)",
    accentBgStrong: "oklch(34% 0.09 244)",
    success: "oklch(70% 0.14 148)",
    warning: "oklch(78% 0.16 75)",
    danger: "oklch(70% 0.16 25)",
    focus: "oklch(72% 0.15 244)",
    rowHover: "oklch(18% 0.01 240)",
    rowSelected: "oklch(24% 0.05 244)",
    rowSelectedRule: "oklch(40% 0.08 244)",
    shadowSm: "0 1px 2px oklch(0% 0 0 / 0.3)",
    shadow: "0 1px 2px oklch(0% 0 0 / 0.3), 0 8px 24px oklch(0% 0 0 / 0.4)",
    shadowLg: "0 1px 2px oklch(0% 0 0 / 0.3), 0 16px 48px oklch(0% 0 0 / 0.5)",
  },
};

/** Parse at module load so an invalid edit fails fast, at import, not at render. */
export const theme: ThemeConfig = ThemeConfig.parse(config);

export { ThemeConfig as ThemeConfigSchema, ColorScheme as ColorSchemeSchema };
export default theme;
