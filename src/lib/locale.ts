/**
 * What every formatter shares: which languages it knows, the placeholder for a missing value, and the
 * clean-up that keeps Unicode direction marks out of the text.
 *
 * This file has no React and no framework import, so `@rupiv/design-system/format` is safe in a Server Component.
 */

/** The languages the design system formats for. Any other tag falls back to English, see `resolveFormatLocale`. */
export type FormatLocale = "en" | "ar";

/**
 * Shown in place of a value that is missing or not a finite number: null, undefined, NaN, Infinity, an invalid date.
 * The reference kit uses a hyphen-minus here, so this does too; it is one constant so the choice is one line.
 */
export const NO_VALUE = "-";

/** Left-to-right mark, right-to-left mark and Arabic letter mark. ICU puts them into Arabic dates and negative numbers. */
const BIDI_MARKS = /[\u200E\u200F\u061C]/g;

/**
 * Removes U+200E, U+200F and U+061C. The text keeps its direction from the page (`dir`) and from `<bdi>` where a
 * run must stay left to right; the marks only make copied text and string comparisons differ between languages.
 */
export function stripBidiMarks(text: string): string {
  return text.replace(BIDI_MARKS, "");
}

/**
 * "ar", "ar-SA" and "AR_sa" are Arabic; everything else, including undefined, is English.
 * The provider hands over a plain BCP 47 string, so every formatter accepts a string and resolves it here.
 */
export function resolveFormatLocale(locale: string | null | undefined): FormatLocale {
  const language = locale?.split(/[-_]/)[0]?.toLowerCase();
  return language === "ar" ? "ar" : "en";
}
