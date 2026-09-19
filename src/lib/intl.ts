/**
 * Text comparison for the components, following the provider's locale (`useLocale()`), never a hard-coded one.
 * Numbers are written by `./format` (`useFormat()`); this file only holds what that one does not: sorting.
 * No React and no framework import.
 */

const collators = new Map<string, Intl.Collator>();

/** A tag Intl accepts, or English when it does not (Intl throws a RangeError for a malformed tag). */
function usableLocale(locale: string): string {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? "en";
  } catch {
    return "en";
  }
}

/**
 * A collator for `locale`: numeric aware ("item 2" before "item 10"), and case and accent insensitive.
 * Any BCP 47 tag works, not only the two languages the formatters know.
 */
export function textCollator(locale: string): Intl.Collator {
  const tag = usableLocale(locale);
  let collator = collators.get(tag);
  if (!collator) {
    collator = new Intl.Collator(tag, { numeric: true, sensitivity: "base" });
    collators.set(tag, collator);
  }
  return collator;
}
