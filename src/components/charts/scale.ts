/**
 * Shared chart math: nice ticks, compact number formatting and SVG path builders. No React here.
 * How wide a piece of text is comes from ./text-measure, never from a guess in this file.
 */
import { formatNumber } from "../../lib/format";
import { NO_VALUE } from "../../lib/locale";

/** Round to 2 decimals so SVG attribute strings stay short and stable. */
export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** How a compact number is written around its digits. The language's own words come from the labels. */
export interface CompactOptions {
  /** BCP 47 tag. Digits are Western and grouping is en-US in every language, see lib/format. */
  locale?: string | undefined;
  /** 12.6 gives "12.6K" in English. */
  thousand?: ((n: string) => string) | undefined;
  million?: ((n: string) => string) | undefined;
}

/** "950", "8.4K", "12.6M", "-3.2K"; "-" for a value that is not a number. No lakh or crore grouping. */
export function formatCompact(value: number, options: CompactOptions = {}): string {
  if (!Number.isFinite(value)) return NO_VALUE;
  const { locale, thousand = (n) => `${n}K`, million = (n) => `${n}M` } = options;
  const abs = Math.abs(value);
  // 999,950 would round to "1,000K" as thousands, so it moves up to millions instead.
  if (abs >= 1e6 || Math.round(abs / 100) / 10 >= 1000) {
    return million(formatNumber(value / 1e6, locale, { maximumFractionDigits: 1 }));
  }
  if (abs >= 1e3) return thousand(formatNumber(value / 1e3, locale, { maximumFractionDigits: 1 }));
  return formatNumber(value, locale, { maximumFractionDigits: 2 });
}

/**
 * A series color: what the screen gave, or `var(--chart-1..6)` in order. The shorthand "chart-1" to "chart-6" means
 * the token of that name, so `color: "chart-2"` and `color: "var(--chart-2)"` are the same.
 */
export function seriesColor(index: number, color?: string): string {
  if (color === undefined) return `var(--chart-${(index % 6) + 1})`;
  return /^chart-[1-6]$/.test(color) ? `var(--${color})` : color;
}

/** Make a React `useId()` value safe for SVG `id` / `url(#...)` references. */
export function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function finite(n: number | null | undefined): n is number {
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

/** Rounded axis domain + 3-6 evenly spaced ticks covering [dataMin, dataMax]. */
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
