/* bodnar.sh core primitives — React reference implementation.
 *
 * These are the prototype versions. For the Astro + Vue + Workers
 * production target, use the matching single-file components in this
 * same directory (FlexRule.vue, SectionFrame.vue, Bar.vue,
 * Sparkline.vue, Caret.vue). Prop names are identical across both,
 * so a React prototype migrates to Vue mechanically.
 *
 * Requires the `v3blink` keyframe from assets/tokens.css.
 */

import type { CSSProperties, ReactNode } from 'react';

/* Horizontal mono rule that fills available flex space. */
export const FlexRule = ({
  ch = '─',
  color,
  style,
}: {
  ch?: string;
  color?: string;
  style?: CSSProperties;
}) => (
  <span
    aria-hidden="true"
    style={{
      flex: 1,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      color,
      userSelect: 'none',
      lineHeight: 1,
      ...style,
    }}
  >
    {ch.repeat(400)}
  </span>
);

/* Section frame — top kicker + body + bottom rule. The signature
 * surface of the system. */
export function SectionFrame({
  kicker,
  right,
  accent,
  children,
  padTop = 24,
  padBottom = 28,
}: {
  kicker: string;
  right?: string;
  accent?: string;
  children?: ReactNode;
  padTop?: number;
  padBottom?: number;
}) {
  return (
    <section style={{ padding: '32px 56px 0', fontFamily: 'var(--ff-mono)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          fontSize: 12,
          color: accent,
          lineHeight: 1,
        }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>╭─ {kicker} ─</span>
        <FlexRule color={accent} />
        {right && (
          <>
            <span
              style={{
                color: 'var(--fg-faint)',
                padding: '0 10px',
                whiteSpace: 'nowrap',
              }}
            >
              {right}
            </span>
            <FlexRule color={accent} />
          </>
        )}
        <span>╮</span>
      </div>
      <div style={{ padding: `${padTop}px 0 ${padBottom}px` }}>{children}</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 12,
          color: accent,
          lineHeight: 1,
        }}
      >
        <span>╰</span>
        <FlexRule color={accent} />
        <span>╯</span>
      </div>
    </section>
  );
}

/* Block-fill bar — htop-style. */
export function Bar({
  pct,
  color,
  width = 24,
}: {
  pct: number;
  color?: string;
  width?: number;
}) {
  const filled = Math.round((pct / 100) * width);
  return (
    <span style={{ letterSpacing: 0 }}>
      <span style={{ color: 'var(--fg-faint)' }}>[</span>
      <span style={{ color }}>{'█'.repeat(filled)}</span>
      <span style={{ color: 'var(--fg-ghost, rgba(0,0,0,0.16))' }}>
        {'░'.repeat(width - filled)}
      </span>
      <span style={{ color: 'var(--fg-faint)' }}>]</span>
    </span>
  );
}

/* Unicode-block sparkline. */
export function Sparkline({
  data,
  color,
}: {
  data: number[];
  color?: string;
}) {
  const blocks = '▁▂▃▄▅▆▇█';
  const max = Math.max(...data, 1);
  return (
    <span style={{ color, letterSpacing: 0 }}>
      {data
        .map((v) => blocks[Math.min(7, Math.round((v / max) * 7))])
        .join('')}
    </span>
  );
}

/* Blinking caret — use at the end of any "live" line. */
export const Caret = () => (
  <span style={{ animation: 'v3blink 1.1s steps(2) infinite' }}>▌</span>
);
