import { CHART_LABELS } from "./label-sets/charts";
import { DATA_LABELS } from "./label-sets/data";
import { DATE_LABELS } from "./label-sets/dates";
import { DISPLAY_LABELS } from "./label-sets/display";
import { OVERLAY_LABELS } from "./label-sets/overlays";
import { SHELL_LABELS } from "./label-sets/shell";

/**
 * Built-in strings of the design system.
 *
 * A label is a string with {name} placeholders, or a function for text that needs plural rules or other logic
 * (an application builds these on its own i18n library so Arabic plurals work). The English defaults live in
 * DEFAULT_LABELS. The application passes its own map to <DesignSystemProvider labels>; keys it leaves out fall
 * back to English, and a key that exists nowhere resolves to the key itself so the gap is visible on screen.
 *
 * DEFAULT_LABELS is composed from one file per area in ./label-sets/, so agents and components add their keys
 * without editing the same file. When the sets are complete, LabelKey becomes `keyof typeof DEFAULT_LABELS`
 * so a component can only ask for a key that exists.
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
export const DEFAULT_LABELS: LabelMap = {
  ...OVERLAY_LABELS,
  ...DATA_LABELS,
  ...DISPLAY_LABELS,
  ...CHART_LABELS,
  ...SHELL_LABELS,
  ...DATE_LABELS,
};

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
