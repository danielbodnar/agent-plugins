# The bodnar.sh design system

The default house style baked into this skill. Use it whenever no other brand or design system is supplied. It is a terminal-first system with four swappable themes, a strong type pairing, a deep mono-flavored component library, and a print mode that is genuinely usable.

> Aesthetic in one line: **system-software literacy, applied to UI.** It reads like `man bodnar(1)`: mono primary, sans for long copy, serif optional for editorial mode. Sparse color. Function over flourish. Boring is a feature.

## Contents

- 8.1 Type pairing
- 8.2 Themes
- 8.3 Spacing, radii, rule
- 8.4 Section grammar (ASCII frames)
- 8.5 Status bar
- 8.6 Component vocabulary
- 8.7 Core primitives
- 8.8 Motion language
- 8.9 Texture
- 8.10 Copy voice
- 8.11 Print mode
- 8.12 Astro + Vue + Workers wiring
- 8.13 Don't

The CSS token block ships as `assets/tokens.css`. The primitives ship as `assets/primitives/`.

## 8.1 Type pairing

```css
--ff-mono:    "JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
--ff-sans:    "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--ff-serif:   "Newsreader", "Iowan Old Style", "Charter", Georgia, serif;
--ff-display: var(--ff-mono);   /* terminal + blueprint themes */
--ff-body:    var(--ff-mono);   /* mono-primary by default */
```

Rules:

- **Mono first.** Status bars, navigation, labels, kickers, tags, metadata, prompts, code, file listings: all mono.
- **Sans for long-form copy.** Hero subhead, paragraph body inside man-page descriptions, job summaries. Inter only.
- **Serif (Newsreader) only in the editorial theme.** It switches `--ff-display` and `--ff-body` to the serif, at slightly bigger sizes (`+2 to 4pt`) because serifs read denser.
- **No third sans.** Do not reach for Geist, Manrope, or Satoshi. Inter is the whole sans budget.

Display-font escape hatches for one-off hero treatments, each behind a `body[data-name-font="..."]` attribute: `jetbrains`, `fraunces`, `instrument` (Instrument Serif italic), `syne`, `unbounded`, `majormono` (Major Mono Display), `space` (Space Grotesk). Use sparingly, at most one display swap per design.

## 8.2 Themes

Four themes, switched via `[data-theme]` on `<body>` or per-component prop. They are distinct moods rather than light and dark variants. All token values ship in `assets/tokens.css`.

- **`dark` / terminal (default)** — warm near-black background, sage-lime accent, mono everything.
- **`light` / terminal light** — warm paper, deeper green accent.
- **`editorial`** — cream paper, burnt-orange accent, Newsreader serif on display.
- **`blueprint`** — deep navy with a grid texture, amber and sky accents.

The full palette across themes follows one rule: **every accent shares chroma and lightness, only hue varies.** That is why mixing colors never feels clashy. They all sit on the same plane in OKLCH space. The `dark` theme accent set:

```css
--accent:  oklch(78% 0.2 145);   /* green   */
--red:     oklch(74% 0.18 28);
--amber:   oklch(82% 0.16 80);
--blue:    oklch(74% 0.13 240);
--magenta: oklch(72% 0.18 320);
```

## 8.3 Spacing, radii, rule

```css
--r: 2px;          /* radius — small, almost-flat; nothing rounded */
--pad: 56px;       /* page padding */
--pad-card: 22px;  /* card padding */
--pad-sec-y: 32px 0 28px;  /* section vertical */
```

- Radius is `2px` everywhere. Never soft-card rounding, never `rounded-2xl`.
- Borders are 1px in `var(--rule)`. Dotted rule for sub-dividers, solid for card edges and section frames.
- Long content caps at roughly `720 to 820px` wide. Status and header rows span full width.
- Tabular numerics: set `font-variant-numeric: tabular-nums` on every timestamp, pid, percentage, version, and line count.

## 8.4 Section grammar (ASCII frames)

Every major section is wrapped in an ASCII rule with a kicker on the top-left and a meta string on the top-right. **This is the system's signature.**

```
╭─ §02 · runtime ──────────────── htop · journalctl --follow ──╮
                                                                
   …section body…                                               
                                                                
╰────────────────────────────────────────────────────────────────╯
```

```jsx
<SectionFrame
  kicker="§02 · runtime"
  right="htop · journalctl --follow"
  accent={T.amber}
>
  {/* body */}
</SectionFrame>
```

Build the rule with `─` repeated via flex `flex:1; white-space:nowrap; overflow:hidden`. Do not hand-count the dashes.

Section numbering goes `§00` (login banner or hero), `§01 · ABOUT`, `§02 · runtime`, `§03 · identity`, `§04 · WORK`, and so on through `§09 · CONTACT`. The right-side meta is always a command incantation, never marketing copy.

## 8.5 Status bar

Sits at the top of every page. `key=value` pairs in mono, 11px, dim.

```
host=bodnar.sh   uptime=30y 4mo   load=0.42 0.38 0.34   tty=/dev/pts/0   status=available
                                       tz=America/New_York  build=2026.04.27  theme=dark
```

The status bar should reflect real runtime state when possible: current timezone, build date from `import.meta.env.PACKAGE_VERSION`, and so on.

## 8.6 Component vocabulary

When the user asks for a UI surface, the system has an idiomatic answer already. Use the existing component before inventing something.

| User asks for...        | bodnar.sh answer                                |
|-------------------------|-------------------------------------------------|
| Hero / landing intro    | **MOTD banner** plus a sibling **terminal**     |
| About / bio             | **man-page** layout (`NAME` / `SYNOPSIS` / `DESCRIPTION` / `OPTIONS` / `FILES` / `SEE ALSO`) |
| Dashboard / metrics     | **htop** panel: CPU bars, mem and swap bars, process table |
| Live activity / news    | **journalctl --follow** stream                  |
| Identity card / profile | `/etc/passwd` row plus `id` output plus `env` grid |
| Project list            | `ls -la ./projects/` with PERMS / NAME / TYPE / DESCRIPTION / star |
| Skill / tech stack      | `pstree -ap` tree plus per-category proficiency bars |
| Experience / career     | `git log --pretty=full --stat` with a diffstat per commit |
| GitHub stats            | 52-week contribution grid plus recent commits plus a language bar |
| Writing / blog index    | `ls -la posts/` with mode bits, date, size, read time |
| Contact                 | `nc -lvnp 22 · listening` block with a grid of cards |
| Inline option chip      | `[--flag]` man-page pill                        |
| Status badge            | `● available` dot plus label                    |
| Loading state           | `▌` blinking caret, optionally with three dots  |
| Bar chart               | `[██████░░░░]` block-fill mono bar              |
| Sparkline               | `▁▂▃▄▅▆▇█` mapped from data                     |
| Footer                  | `EOF · exit 0` on the right, build and license on the left |

## 8.7 Core primitives

The copy-paste primitives ship in `assets/primitives/`: `primitives.tsx` for React prototypes and a `.vue` single-file component for each one for the Astro + Vue production target. Prop names are identical across both (`kicker`, `right`, `accent`, `pct`, `color`, `ch`, `data`) so the prototype-to-production port is mechanical.

- **`FlexRule`** — a horizontal mono rule that fills available flex space. Props: `ch`, `color`, `style`.
- **`SectionFrame`** — the signature section wrapper: top kicker, body, bottom rule. Props: `kicker`, `right`, `accent`, `padTop`, `padBottom`.
- **`Bar`** — an htop-style block-fill bar. Props: `pct`, `color`, `width`.
- **`Sparkline`** — a Unicode-block sparkline mapped from a data array. Props: `data`, `color`.
- **`Caret`** — a blinking block caret for the end of any live line.

The `Caret` and the section reveals depend on two keyframes that must exist in the global stylesheet:

```css
@keyframes v3blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
```

## 8.8 Motion language

Subtle, mostly entrance motion. Never parallax, never floating shapes, never gradient-shifting backgrounds.

- `secReveal` — sections slide up 12px and fade in, staggered 100ms, with nth-of-type delays from `0.05s`.
- `ruleSweep` — a single bright sweep across each section's rule on first reveal, 1.2s, eased.
- `caretSoft` / `v3blink` — the block caret blinks 1.1s with `steps(2)`.
- `dotPulse` — the status-bar `●` does a slow 2.4s shadow-pulse on the accent.
- `tagPop` — when a tag becomes active on a filter match, a 0.4s spring scale.
- `slotFill` — a selector slot fills with a 0.35s scale-bounce.
- `aiMsgIn` — chat messages fade and slide 8px in over 0.35s.
- `nameRise` — the display name rises 8px and tightens letter-spacing on first paint.

Always wrap motion in `@media (prefers-reduced-motion: reduce)` so every animation collapses to `0.01ms`. This is non-negotiable.

## 8.9 Texture

Faint, always present, never decorative for its own sake.

- **terminal**: horizontal scanlines via `repeating-linear-gradient` at `rgba(255,255,255,0.012)` every 24px. Almost imperceptible.
- **editorial**: none, clean paper.
- **blueprint**: a 24x24 grid overlay at `rgba(255,255,255,0.04)`.

```css
body::before {
  content: "";
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: repeating-linear-gradient(
    0deg, transparent 0 23px, rgba(255,255,255,0.012) 23px 24px);
}
[data-theme="blueprint"] body::before {
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 24px 24px;
}
[data-theme="editorial"] body::before { background-image: none; }
```

This texture block also ships inside `assets/tokens.css`.

## 8.10 Copy voice

The voice carries as much of the brand as the visuals. When ghost-writing filler copy in this system, match the tone.

- **Dry, declarative, slightly self-deprecating.** "I build the boring systems that don't page you at 2 AM." "Generalist by trade. Insomniac by incident."
- **Specific over abstract.** "Halved p99 by deleting code" beats "improved performance".
- **System-software metaphors are encouraged.** `cat`, `grep`, `man`, `nc`, `journalctl`, `pstree`. Use them like punctuation.
- **No exclamation marks. No emoji.** Color comes from precision, not energy.

## 8.11 Print mode

The system has real print styles. Invoke them when a downloadable PDF or a printable resume is requested. Rules baked into the resume stylesheet:

- `@page { size: letter; margin: 0.5in }`, body 10.5pt.
- White background, black ink. No theme colors survive.
- All `.statusbar`, selector panes, toggles, and chat overlays become `display: none`.
- Keep keyword underlines. Accent becomes black, dim becomes `#444`.
- `.tag.hl` becomes `background: #111; color: #fff`.
- `page-break-inside: avoid` on `.sec`, `.job`, `.skill-cat`, `.int-card`.

## 8.12 Astro + Vue + Workers wiring

Land the system into the production stack:

1. **Tokens.** Put `assets/tokens.css` in `src/styles/tokens.css` and import it once from `src/layouts/Base.astro`.
2. **Theme switch.** Set `data-theme` on `<html>` in the layout from `Astro.cookies.get('theme')`, falling back to `dark`. Persist it via the `/api/theme` endpoint (a Workers POST that sets a cookie).
3. **Fonts.** Preconnect to `fonts.googleapis.com` in the layout head, and load JetBrains Mono plus Inter via one `<link>`. Add Newsreader only when the user enables the editorial theme, lazy-injecting the `<link>` from a Vue island.
4. **Primitives.** Use the `.vue` single-file components from `assets/primitives/` directly in `src/components/bodnar/`. Prop names already match the React versions, so a React prototype migrates mechanically.
5. **Status bar.** Server-render it in `src/layouts/Base.astro` so the key-value pairs reflect real values such as `Astro.locals.runtime.cf?.colo` and the build date, rather than placeholder text.
6. **`prefers-reduced-motion`.** Handled in CSS, not JS. No Vue island is needed for the motion reset.

## 8.13 Don't

- Do not inflate the radius. Nothing in this system is `border-radius: 12px` or larger.
- Do not use gradient buttons. Solid accent on `bg`, end of story.
- Do not hand-draw Linux or terminal iconography in SVG. The mono characters (`▌ ● ▸ █ ░ ─ ╭ ╮ ╰ ╯`) are the icons.
- Do not use emoji. Ever.
- Do not mix more than two accent hues in a single section.
- Do not pad with stats sections. Three big numbers with icons is not in this system. Use the htop panel or a sparkline instead.
- Do not center-stack everything. The system has rhythm: a full-width status bar, a section frame at 56px padding, and grid splits such as `1.05fr 1fr`, `1.4fr 1fr`, `1.1fr 1fr`.
