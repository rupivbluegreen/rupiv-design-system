import type { Tone } from "./types";

/**
 * Generic helpers for turning an application's own statuses into tones. The design system knows no status names:
 * an application keeps its map (its statuses, its words) and gives it to `createToneResolver`, then passes the result to
 * `<StatusPill tone>`, `<Badge tone>` and the like.
 *
 * Rule for choosing a tone: it says what the person must do, not which module the record came from.
 *  - neutral: nothing to do yet, or archived
 *  - info:    moving, in someone else's hands
 *  - accent:  confirmed, committed
 *  - warning: needs attention soon
 *  - success: done, good
 *  - danger:  blocked, failed, overdue
 */

// A Record over Tone, so adding a tone to the type without adding it here does not compile.
const TONE_KEYS: Readonly<Record<Tone, true>> = {
  neutral: true,
  accent: true,
  success: true,
  warning: true,
  danger: true,
  info: true,
};

/** Every tone. */
export const TONES: readonly Tone[] = Object.keys(TONE_KEYS).filter(isTone);

/** True when `value` is one of the tones (useful for a value read from settings or a data file). */
export function isTone(value: unknown): value is Tone {
  return typeof value === "string" && Object.hasOwn(TONE_KEYS, value);
}

/**
 * A function from a status to its tone, built from the application's map. A status that is not in the map gets
 * `fallback` (default "neutral"); names that exist on every object ("constructor", "toString") count as not in the map.
 */
export function createToneResolver(
  map: Readonly<Record<string, Tone>>,
  fallback: Tone = "neutral",
): (status: string) => Tone {
  return (status) => (Object.hasOwn(map, status) ? (map[status] ?? fallback) : fallback);
}
