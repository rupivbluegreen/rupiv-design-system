import { cn } from "@/lib/cn";
import styles from "./chart-legend.module.css";

export interface ChartLegendProps {
  items: { label: string; color: string; value?: string }[];
}

/**
 * Swatch + label legend. Items without values wrap inline; when any item has a
 * value the legend becomes a stacked list with values right-aligned.
 */
export function ChartLegend({ items }: ChartLegendProps) {
  if (items.length === 0) return null;
  const withValues = items.some((item) => item.value !== undefined);
  return (
    <ul role="list" className={cn(styles.legend, withValues && styles.list)}>
      {items.map((item, i) => (
        <li key={`${item.label}-${i}`} className={styles.item}>
          <span className={styles.swatch} style={{ background: item.color }} aria-hidden="true" />
          <span className={styles.label} title={item.label}>
            {item.label}
          </span>
          {item.value !== undefined ? <span className={styles.value}>{item.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}
