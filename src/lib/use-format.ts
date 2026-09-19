"use client";

import { useMemo } from "react";
import { useLabels, useLocale } from "../provider";
import {
  date,
  dateBoth,
  duration,
  formatDelta,
  formatNumber,
  formatPercent,
  int,
  num,
  pct,
  time,
  type DateOptions,
  type DateValue,
  type DurationMode,
} from "./format";

/** The formatters of `@rupiv/design-system/format` with the provider's language already applied. */
export interface Formatters {
  /** The provider's BCP 47 tag. */
  readonly locale: string;
  num: (value: number | null | undefined, digits?: number) => string;
  int: (value: number | null | undefined) => string;
  /** A value already in percent: 91 gives "91%". */
  pct: (value: number | null | undefined, digits?: number) => string;
  /** A ratio: 0.91 gives "91%". */
  ratio: (value: number | null | undefined, digits?: number) => string;
  formatNumber: (value: number | null | undefined, options?: Intl.NumberFormatOptions) => string;
  delta: (value: number | null | undefined, decimals?: 0 | 1 | 2) => string;
  time: (value: number | DateValue) => string;
  date: (value: DateValue, options?: Omit<DateOptions, "locale">) => string;
  dateBoth: (value: DateValue, options?: Omit<DateOptions, "locale" | "calendar">) => string;
  /** The unit for "min" mode comes from the label "duration.minuteShort". */
  duration: (seconds: number | null | undefined, mode?: DurationMode) => string;
}

/**
 * Formatters for the language in `<DesignSystemProvider locale>`. Outside a provider that is English.
 * The result is stable while the language and the minute label do not change, so it is safe in a dependency array.
 */
export function useFormat(): Formatters {
  const locale = useLocale();
  const label = useLabels();
  const minuteLabel = label("duration.minuteShort");
  return useMemo<Formatters>(
    () => ({
      locale,
      num: (value, digits) => num(value, digits, locale),
      int: (value) => int(value, locale),
      pct: (value, digits) => pct(value, digits, locale),
      ratio: (value, digits) => formatPercent(value, locale, digits),
      formatNumber: (value, options) => formatNumber(value, locale, options),
      delta: (value, decimals) => formatDelta(value, decimals, locale),
      time: (value) => time(value),
      date: (value, options) => date(value, { ...options, locale }),
      dateBoth: (value, options) => dateBoth(value, { ...options, locale }),
      duration: (seconds, mode) => duration(seconds, mode, minuteLabel),
    }),
    [locale, minuteLabel],
  );
}
