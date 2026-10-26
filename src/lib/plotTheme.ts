// Plot theme: every colour and face reads the Hallmark token block, so the
// charts and the UI can never drift apart. No literals past tokens.css.
export type PlotTheme = {
  ink: string;
  ink2: string;
  muted: string;
  rule: string;
  rule2: string;
  accent: string;
  error: string;
  fontBody: string;
  fontOutlier: string;
  fontDisplay: string;
};

const FALLBACK: PlotTheme = {
  ink: 'oklch(16% 0.020 245)',
  ink2: 'oklch(24% 0.018 245)',
  muted: 'oklch(38% 0.016 245)',
  rule: 'oklch(73% 0.013 240)',
  rule2: 'oklch(32% 0.018 240)',
  accent: 'oklch(45% 0.180 350)',
  error: 'oklch(52% 0.19 27)',
  fontBody: '"Newsreader", Georgia, serif',
  fontOutlier: '"IBM Plex Mono", ui-monospace, monospace',
  fontDisplay: '"Hanken Grotesk", ui-sans-serif, system-ui, sans-serif',
};

let cached: PlotTheme | null = null;

function readToken(style: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = (style.getPropertyValue(name) || '').trim();
  return value || fallback;
}

export function getPlotTheme(): PlotTheme {
  if (cached) return cached;
  if (typeof window === 'undefined' || typeof document === 'undefined') return FALLBACK;
  try {
    const style = getComputedStyle(document.documentElement);
    cached = {
      ink: readToken(style, '--color-ink', FALLBACK.ink),
      ink2: readToken(style, '--color-ink-2', FALLBACK.ink2),
      muted: readToken(style, '--color-muted', FALLBACK.muted),
      rule: readToken(style, '--color-rule', FALLBACK.rule),
      rule2: readToken(style, '--color-rule-2', FALLBACK.rule2),
      accent: readToken(style, '--color-accent', FALLBACK.accent),
      error: readToken(style, '--color-error', FALLBACK.error),
      fontBody: readToken(style, '--font-body', FALLBACK.fontBody),
      fontOutlier: readToken(style, '--font-outlier', FALLBACK.fontOutlier),
      fontDisplay: readToken(style, '--font-display', FALLBACK.fontDisplay),
    };
  } catch {
    cached = FALLBACK;
  }
  return cached;
}

export function plotAxisTheme() {
  const theme = getPlotTheme();
  return {
    gridcolor: theme.rule,
    zerolinecolor: theme.rule2,
    tickfont: { color: theme.muted, family: theme.fontOutlier, size: 11 },
    titlefont: { color: theme.ink2, family: theme.fontDisplay, size: 12 },
  };
}
