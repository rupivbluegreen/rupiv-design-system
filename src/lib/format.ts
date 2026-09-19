/**
 * Numbers, percentages and small text helpers, plus every date function (re-exported from ./date).
 * Import from `@rupiv/design-system/format`. No React and no framework import: safe in a Server Component.
 *
 * - Digits: Western (0 to 9) in English and Arabic, with en-US style grouping (1,234.5) in both, as in the HTML
 *   reference kit. Arabic-Indic digits and the Arabic percent sign never appear.
 * - Missing input (null, undefined, NaN, Infinity) gives `NO_VALUE`, never "NaN" or "∞".
 * - A negative number is written with a hyphen-minus, and one that rounds to zero has no sign ("0", never "-0").
 *   In right-to-left text a leading minus can jump to the wrong end of the number: wrap a number that must stay
 *   left to right in `<bdi>`.
 * - Nothing here reads the current time or the machine's locale.
 *
 * `num`, `int` and `pct` follow the reference kit's `RD.fmt`; `formatNumber` and `formatPercent` keep the signatures of
 * the temporary helper the first application milestone used (the "A0 helper"). The language is the last argument;
 * in React, `useFormat()` binds the provider's language.
 */
import { NO_VALUE, resolveFormatLocale, stripBidiMarks, type FormatLocale } from "./locale";

export * from "./date";
export * from "./locale";

/**
 * How each language writes numbers. Both use Western digits and en-US separators today (the reference kit does the
 * same). The table is the one place a numeral-system setting would make Arabic differ.
 */
const NUMBER_TAGS = {
  en: "en-US-u-nu-latn",
  ar: "en-US-u-nu-latn",
} as const satisfies Record<FormatLocale, string>;

const numberFormats = new Map<string, Intl.NumberFormat>();

function write(locale: string | undefined, options: Intl.NumberFormatOptions, value: number): string {
  const tag = NUMBER_TAGS[resolveFormatLocale(locale)];
  // "negative" keeps the minus on negative numbers only: a value that rounds to zero (or is -0) shows "0".
  const merged: Intl.NumberFormatOptions = { signDisplay: "negative", ...options };
  const key = `${tag}|${JSON.stringify(merged)}`;
  let format = numberFormats.get(key);
  if (format === undefined) {
    format = new Intl.NumberFormat(tag, merged);
    numberFormats.set(key, format);
  }
  return stripBidiMarks(format.format(value));
}

const isPresent = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value);

/** A whole number of fraction digits between 0 and 20; anything else (NaN, undefined) is "not given". */
function fractionDigits(digits: number | undefined): number | undefined {
  return digits === undefined || !Number.isFinite(digits) ? undefined : Math.min(20, Math.max(0, Math.trunc(digits)));
}

/* ------------------------------------------------------------------ */
/* The reference kit's RD.fmt: num, int, pct                          */
/* ------------------------------------------------------------------ */

/**
 * "1,234.5". Without `digits` at most one decimal is shown; with `digits` exactly that many ("1,234.50").
 * Rounds half away from zero on the decimal value (2.25 gives "2.3", -2.25 gives "-2.3").
 */
export function num(value: number | null | undefined, digits?: number, locale?: string): string {
  if (!isPresent(value)) return NO_VALUE;
  const places = fractionDigits(digits);
  return write(
    locale,
    places === undefined ? { maximumFractionDigits: 1 } : { minimumFractionDigits: places, maximumFractionDigits: places },
    value,
  );
}

/** A whole number with grouping: "1,235". */
export function int(value: number | null | undefined, locale?: string): string {
  return num(value, 0, locale);
}

/**
 * A percentage that is already in percent: `pct(91)` is "91%", `pct(12.34, 1)` is "12.3%". The sign is the ASCII
 * percent sign, never the Arabic one, in both languages. For a ratio (0.91) use `formatPercent`.
 */
export function pct(value: number | null | undefined, digits = 0, locale?: string): string {
  const text = num(value, digits, locale);
  return text === NO_VALUE ? NO_VALUE : `${text}%`;
}

/* ------------------------------------------------------------------ */
/* The A0 helper: same names, same results                            */
/* ------------------------------------------------------------------ */

/** A number in the language's style. `options` are `Intl.NumberFormat` options (default: at most 3 decimals). */
export function formatNumber(
  value: number | null | undefined,
  locale?: string,
  options?: Intl.NumberFormatOptions,
): string {
  if (!isPresent(value)) return NO_VALUE;
  return write(locale, options ?? {}, value);
}

/** A ratio in [0, 1] as a percentage: `formatPercent(0.91)` is "91%". ASCII percent sign in both languages. */
export function formatPercent(ratio: number | null | undefined, locale?: string, digits = 0): string {
  if (!isPresent(ratio)) return NO_VALUE;
  const places = fractionDigits(digits) ?? 0;
  return write(locale, { style: "percent", minimumFractionDigits: places, maximumFractionDigits: places }, ratio);
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Signed delta for KPI chips: "+12.4%" or "-3.1%" written with a true minus sign (U+2212), not a hyphen. `value` is in
 * percent, and at most `decimals` decimals are shown. The sign follows the value, so 0.04 with no decimals is "+0%", as before.
 */
export function formatDelta(value: number | null | undefined, decimals: 0 | 1 | 2 = 1, locale?: string): string {
  if (!isPresent(value)) return NO_VALUE;
  const sign = value > 0 ? "+" : value < 0 ? "\u2212" : "";
  return `${sign}${write(locale, { maximumFractionDigits: decimals }, Math.abs(value))}%`;
}

/** "Ravi Shah" gives "RS". Takes the first letter of the first two words; works on whole characters, not UTF-16 halves. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => (Array.from(word)[0] ?? "").toUpperCase())
    .join("");
}
