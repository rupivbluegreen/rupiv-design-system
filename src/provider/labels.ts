/**
 * Built-in strings of the design system.
 *
 * A label is a string with {name} placeholders, or a function for text that needs plural rules or other logic
 * (an application builds these on its own i18n library so Arabic plurals work). The English defaults live in
 * DEFAULT_LABELS. The application passes its own map to <DesignSystemProvider labels>; keys it leaves out fall
 * back to English, and a key that exists nowhere resolves to the key itself so the gap is visible on screen.
 *
 * DEFAULT_LABELS is empty until the labels work fills it in; when it does, LabelKey becomes
 * `keyof typeof DEFAULT_LABELS` so a component can only ask for a key that exists.
 */

/** Values for the {name} placeholders. */
export type LabelParams = Readonly<Record<string, string | number>>;

/** A string with {name} placeholders, or a function that builds the text from the parameters. */
export type LabelValue = string | ((params: LabelParams) => string);

/** A complete or partial set of labels, by key. */
export type LabelMap = Readonly<Record<string, LabelValue>>;

/** The key of a built-in string, for example "pagination.next". */
export type LabelKey = string;

/** Resolves a key to text: `label("pagination.pageOf", { page: 2, pages: 9 })`. */
export type LabelFn = (key: LabelKey, params?: LabelParams) => string;

/** English defaults for every built-in string. */
export const DEFAULT_LABELS: LabelMap = {};

/** Replaces {name} with the matching parameter. A placeholder with no parameter is left as it is. */
export function interpolate(template: string, params?: LabelParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  );
}

/** Looks a key up in `map`, then in the English defaults, then falls back to the key itself. */
export function resolveLabel(map: LabelMap, key: LabelKey, params?: LabelParams): string {
  const value = map[key] ?? DEFAULT_LABELS[key];
  if (value === undefined) return key;
  return typeof value === "function" ? value(params ?? {}) : interpolate(value, params);
}

/** A resolver bound to `map`. */
export function createLabelFn(map: LabelMap): LabelFn {
  return (key, params) => resolveLabel(map, key, params);
}
