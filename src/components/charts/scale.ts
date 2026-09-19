/**
 * Shared chart math: nice ticks, compact number formatting, text measurement
 * estimates and SVG path builders. No React here.
 */

/** Rough average glyph width for 11px UI text, used to size margins. */
export const CHAR_WIDTH = 6.5;

const compact = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** Round to 2 decimals so SVG attribute strings stay short and stable. */
export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Compact Indian notation without currency: 950, 8.4 K, 12.6 L, 3.25 Cr. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1e7) return `${sign}${trimZeros((abs / 1e7).toFixed(2))} Cr`;
  if (abs >= 1e5) return `${sign}${trimZeros((abs / 1e5).toFixed(1))} L`;
  if (abs >= 1e3) return `${sign}${trimZeros((abs / 1e3).toFixed(1))} K`;
  return `${sign}${compact.format(abs)}`;
}

function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/** Default series color: `var(--chart-1..6)` in order. */
export function seriesColor(index: number, color?: string): string {
  return color ?? `var(--chart-${(index % 6) + 1})`;
}

/** Estimated rendered width of 11px label text. */
export function textWidth(text: string): number {
  return text.length * CHAR_WIDTH;
}

/** Truncate a label with an ellipsis so it fits roughly within `maxWidth` px. */
export function truncateLabel(text: string, maxWidth: number): string {
  const maxChars = Math.max(1, Math.floor(maxWidth / CHAR_WIDTH));
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars - 1))}…`;
}

/** Make a React `useId()` value safe for SVG `id` / `url(#…)` references. */
export function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function finite(n: number | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function niceStep(raw: number): number {
  const exp = Math.floor(Math.log10(raw));
  const base = 10 ** exp;
  const f = raw / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * base;
}

export interface NiceScale {
  min: number;
  max: number;
  ticks: number[];
}

/** Rounded axis domain + 3–6 evenly spaced ticks covering [dataMin, dataMax]. */
export function niceScale(dataMin: number, dataMax: number, target = 4): NiceScale {
  let lo = Number.isFinite(dataMin) ? dataMin : 0;
  let hi = Number.isFinite(dataMax) ? dataMax : 0;
  if (lo > hi) [lo, hi] = [hi, lo];
  if (lo === hi) {
    if (lo === 0) {
      hi = 1;
    } else {
      const d = Math.abs(lo) * 0.5;
      lo -= d;
      hi += d;
    }
  }
  const step = niceStep((hi - lo) / target);
  const start = Math.floor(lo / step + 1e-9) * step;
  const end = Math.ceil(hi / step - 1e-9) * step;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  const count = Math.max(1, Math.round((end - start) / step));
  const ticks: number[] = [];
  for (let i = 0; i <= count; i++) {
    const t = Number((start + i * step).toFixed(decimals));
    ticks.push(Object.is(t, -0) ? 0 : t);
  }
  // `ticks` always holds at least two entries (count >= 1), so the fallbacks are never used.
  return { min: ticks[0] ?? start, max: ticks[ticks.length - 1] ?? end, ticks };
}

/** Width of the widest formatted tick label. */
export function widestLabel(labels: string[]): number {
  return labels.reduce((w, l) => Math.max(w, textWidth(l)), 0);
}

export type RoundedSide = "top" | "bottom" | "left" | "right" | "none";

/** Rectangle path with radius `r` applied only to the two corners on `side`. */
export function barPath(x: number, y: number, w: number, h: number, r: number, side: RoundedSide): string {
  if (!(w > 0) || !(h > 0)) return "";
  const f = round;
  const x1 = f(x);
  const y1 = f(y);
  const x2 = f(x + w);
  const y2 = f(y + h);
  if (side === "none" || r <= 0) {
    return `M${x1} ${y1}H${x2}V${y2}H${x1}Z`;
  }
  if (side === "top" || side === "bottom") {
    const rr = f(Math.min(r, w / 2, h));
    if (side === "top") {
      return `M${x1} ${y2}V${f(y1 + rr)}Q${x1} ${y1} ${f(x1 + rr)} ${y1}H${f(x2 - rr)}Q${x2} ${y1} ${x2} ${f(y1 + rr)}V${y2}Z`;
    }
    return `M${x1} ${y1}H${x2}V${f(y2 - rr)}Q${x2} ${y2} ${f(x2 - rr)} ${y2}H${f(x1 + rr)}Q${x1} ${y2} ${x1} ${f(y2 - rr)}Z`;
  }
  const rr = f(Math.min(r, h / 2, w));
  if (side === "right") {
    return `M${x1} ${y1}H${f(x2 - rr)}Q${x2} ${y1} ${x2} ${f(y1 + rr)}V${f(y2 - rr)}Q${x2} ${y2} ${f(x2 - rr)} ${y2}H${x1}Z`;
  }
  return `M${x2} ${y1}V${y2}H${f(x1 + rr)}Q${x1} ${y2} ${x1} ${f(y2 - rr)}V${f(y1 + rr)}Q${x1} ${y1} ${f(x1 + rr)} ${y1}Z`;
}

/** Show every nth label so labels of `labelWidth` px don't collide at `spacing` px apart. */
export function labelEvery(spacing: number, labelWidth: number, gap = 10): number {
  if (!(spacing > 0)) return 1;
  return Math.max(1, Math.ceil((labelWidth + gap) / spacing));
}
