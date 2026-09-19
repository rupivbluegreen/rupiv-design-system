"use client";

import { useMemo } from "react";
import { useLabels, useLocale } from "../../provider";
import { formatCompact } from "./scale";

/** The default number format of a chart axis: 950, 8.4K, 12.6M in the provider's language and words. */
export function useCompactFormat(): (value: number) => string {
  const locale = useLocale();
  const label = useLabels();
  return useMemo(
    () => (value: number) =>
      formatCompact(value, {
        locale,
        thousand: (n) => label("chart.compactThousand", { n }),
        million: (n) => label("chart.compactMillion", { n }),
      }),
    [locale, label],
  );
}

/** A list inside a sentence, joined with the language's separator: "A, B, C" in English, with the Arabic comma in Arabic. */
export function useListJoin(): (items: readonly string[]) => string {
  const label = useLabels();
  return useMemo(() => {
    const separator = label("chart.listSeparator");
    return (items) => items.join(separator);
  }, [label]);
}
