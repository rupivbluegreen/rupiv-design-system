"use client";

import { cn } from "../../lib/cn";
import { useLabels } from "../../provider";
import styles from "./chart-legend.module.css";

export interface ChartLegendProps {
  items: { label: string; color: string; value?: string }[];
  /** Accessible name of the list. Default: the provider's "chartLegend.label". */
  label?: string;
}

/**
 * Swatch + label legend. Items without values wrap inline; when any item has a value the legend becomes a stacked
 * list with the values at the inline end. It follows the page direction: the swatch is at the inline start.
 */
export function ChartLegend({ items, label }: ChartLegendProps) {
  const t = useLabels();
  if (items.length === 0) return null;
  const withValues = items.some((item) => item.value !== undefined);
  return (
    <ul role="list" aria-label={label ?? t("chartLegend.label")} className={cn(styles.legend, withValues && styles.list)}>
      {items.map((item, i) => (
        <li key={`${item.label}-${i}`} className={styles.item}>
          <span className={styles.swatch} style={{ background: item.color }} aria-hidden="true" />
          <span className={styles.label} title={item.label}>
            {item.label}
          </span>
          {item.value !== undefined ? (
            <span className={styles.value}>
              <bdi>{item.value}</bdi>
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
