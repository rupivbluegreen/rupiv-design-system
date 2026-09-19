import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./description-list.module.css";

export interface DescriptionListItem {
  label: string;
  value: ReactNode;
  span?: 1 | 2 | 3 | 4;
}

export interface DescriptionListProps {
  items: DescriptionListItem[];
  columns?: 1 | 2 | 3 | 4;
  dense?: boolean;
  className?: string;
}

export function DescriptionList({ items, columns = 2, dense = false, className }: DescriptionListProps) {
  return (
    <dl className={cn(styles.list, styles[`cols${columns}`], dense && styles.dense, className)}>
      {items.map((item, i) => {
        const span = Math.min(item.span ?? 1, columns);
        const empty = item.value === null || item.value === undefined || item.value === "";
        return (
          <div key={`${item.label}-${i}`} className={cn(styles.item, span > 1 && styles[`span${span}`])}>
            <dt className={styles.label}>{item.label}</dt>
            <dd className={cn(styles.value, empty && styles.empty)}>{empty ? "—" : item.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export interface KeyValueProps {
  label: ReactNode;
  value: ReactNode;
  emphasis?: boolean;
  className?: string;
}

export function KeyValue({ label, value, emphasis = false, className }: KeyValueProps) {
  return (
    <div className={cn(styles.kv, emphasis && styles.emphasis, className)}>
      <span className={styles.kvLabel}>{label}</span>
      <span className={styles.kvValue}>{value}</span>
    </div>
  );
}
