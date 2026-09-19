// Resolved design tokens, for code that cannot use CSS variables: a <canvas>, a map style.
// Everything else (CSS Modules, SVG) reads `var(--token)` directly and never needs this file.
//
// The values come from the browser (`getComputedStyle`), so they follow the theme and whatever
// tokens.css says. A canvas never holds a colour literal.
//
// Server rendering: importing this module is safe anywhere (it touches no global when loaded),
// but calling readToken() or readTokens() without a DOM THROWS. Returning empty values instead
// would paint the canvas with silent black. Call them in an effect or an event handler.
//
// What comes back is the token as tokens.css declares it, with `var()` chains resolved
// (`--bg-surface` gives `#ffffff`, not `var(--p-neutral-0)`). Values that are colour functions stay
// as written: `--bg-overlay` is `rgb(13 15 22 / 0.48)` and `--heat-1` to `--heat-5` are
// `color-mix(in srgb, ...)` strings. A canvas 2D context accepts both; a parser that only knows hex
// and comma-separated rgb (a map style engine) must normalise them first.

/**
 * The colour tokens canvas code needs: backgrounds, text, borders, icons, the six tones, the chart
 * palette and the heat ramp. Sizes, spacing, fonts and shadows are not colours and are not listed;
 * pass any other custom property name to `readToken`.
 */
export const TOKEN_NAMES = [
  // backgrounds
  "--bg-app",
  "--bg-surface",
  "--bg-surface-raised",
  "--bg-subtle",
  "--bg-muted",
  "--bg-hover",
  "--bg-pressed",
  "--bg-selected",
  "--bg-selected-strong",
  "--bg-inverse",
  "--bg-overlay",
  "--bg-table-header",
  "--bg-primary",
  "--bg-primary-hover",
  "--bg-primary-pressed",
  "--bg-accent",
  "--bg-accent-hover",
  "--bg-accent-subtle",
  // text
  "--text-title",
  "--text-body",
  "--text-label",
  "--text-muted",
  "--text-placeholder",
  "--text-disabled",
  "--text-on-primary",
  "--text-on-accent",
  "--text-inverse",
  "--text-accent",
  "--text-link",
  "--text-link-hover",
  // borders
  "--border-subtle",
  "--border-default",
  "--border-control",
  "--border-control-hover",
  "--border-strong",
  "--border-focus",
  "--border-selected",
  // icons
  "--icon-default",
  "--icon-strong",
  "--icon-muted",
  "--icon-accent",
  // tones: bg (low), border (mid), text (deep), solid (fill)
  "--neutral-bg",
  "--neutral-border",
  "--neutral-text",
  "--neutral-solid",
  "--accent-bg",
  "--accent-border",
  "--accent-text",
  "--accent-solid",
  "--success-bg",
  "--success-border",
  "--success-text",
  "--success-solid",
  "--warning-bg",
  "--warning-border",
  "--warning-text",
  "--warning-solid",
  "--danger-bg",
  "--danger-border",
  "--danger-text",
  "--danger-solid",
  "--info-bg",
  "--info-border",
  "--info-text",
  "--info-solid",
  // data visualisation
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--chart-6",
  "--chart-grid",
  "--chart-axis",
  "--chart-label",
  // heat ramp (colour-mix strings, see the note at the top)
  "--heat-1",
  "--heat-2",
  "--heat-3",
  "--heat-4",
  "--heat-5",
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];

const NO_DOM =
  "@rupiv/design-system/tokens: reading a token needs a browser DOM (getComputedStyle). " +
  "Call readToken() or readTokens() in an effect or an event handler, never while rendering on the server.";

/** The computed style of `root`, or of <html> when `root` is left out. Throws without a DOM. */
function computedStyleOf(root: Element | undefined): CSSStyleDeclaration {
  const element = root ?? (typeof document === "undefined" ? undefined : document.documentElement);
  const view = element?.ownerDocument.defaultView;
  if (element === undefined || view === null || view === undefined) {
    throw new Error(NO_DOM);
  }
  return view.getComputedStyle(element);
}

function assertCustomProperty(name: string): void {
  if (!name.startsWith("--")) {
    throw new TypeError(`Token names are custom property names that start with "--", got "${name}".`);
  }
}

/**
 * The resolved value of one token, trimmed. Reads from `root` (default: <html>), so a subtree that
 * redefines tokens gives its own values. Returns "" when the token is not defined there (for
 * example when tokens.css is not loaded). Throws without a DOM, and for a name without "--".
 */
export function readToken(name: string, root?: Element): string {
  assertCustomProperty(name);
  return computedStyleOf(root).getPropertyValue(name).trim();
}

/**
 * The resolved values of several tokens in one pass, as `{ "--chart-1": "#0b7b7d", ... }`. With no
 * names it returns every entry of TOKEN_NAMES. Every requested name is a key of the result; a token
 * that is not defined is "". Throws without a DOM, and for a name without "--".
 */
export function readTokens<K extends string = TokenName>(names?: readonly K[], root?: Element): Record<K, string> {
  const requested: readonly K[] = names ?? (TOKEN_NAMES as readonly string[] as readonly K[]);
  for (const name of requested) assertCustomProperty(name);
  const style = computedStyleOf(root);
  const values = {} as Record<K, string>;
  for (const name of requested) values[name] = style.getPropertyValue(name).trim();
  return values;
}
