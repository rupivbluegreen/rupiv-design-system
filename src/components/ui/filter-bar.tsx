"use client";

import type { ReactNode } from "react";
import { Check, ChevronDown, CirclePlus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Menu, type MenuItem } from "./menu";
import { SearchInput } from "./search-input";
import styles from "./filter-bar.module.css";

export interface FilterBarProps {
  search?: { value?: string; onChange?: (v: string) => void; placeholder?: string };
  filters?: ReactNode;
  actions?: ReactNode;
  activeFilters?: { label: string; onRemove: () => void }[];
  onClearAll?: () => void;
  className?: string;
}

export function FilterBar({ search, filters, actions, activeFilters, onClearAll, className }: FilterBarProps) {
  const hasActive = !!activeFilters && activeFilters.length > 0;
  return (
    <div className={cn(styles.bar, className)}>
      <div className={styles.row}>
        {search ? (
          <SearchInput
            value={search.value}
            onChange={search.onChange}
            placeholder={search.placeholder ?? "Search"}
            size="sm"
            className={styles.search}
          />
        ) : null}
        {filters ? <div className={styles.filters}>{filters}</div> : null}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {hasActive ? (
        <div className={styles.activeRow}>
          <span className={styles.activeLabel}>Filtered by</span>
          <ul className={styles.chips} role="list">
            {activeFilters.map((f, i) => (
              <li key={`${f.label}-${i}`} className={styles.chip}>
                <span className={styles.chipLabel}>{f.label}</span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  onClick={f.onRemove}
                  aria-label={`Remove filter ${f.label}`}
                >
                  <X aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {onClearAll ? (
            <button type="button" className={styles.clearAll} onClick={onClearAll}>
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export interface FilterChipProps {
  label: string;
  value?: string;
  options: { value: string; label: string }[];
  onChange: (v: string | undefined) => void;
  className?: string;
}

export function FilterChip({ label, value, options, onChange, className }: FilterChipProps) {
  const selected = value !== undefined ? options.find((o) => o.value === value) : undefined;
  const isSet = value !== undefined && value !== "";

  const items: (MenuItem | "separator")[] = options.map((o) => ({
    label: o.label,
    icon: o.value === value ? <Check /> : <span className={styles.checkSpacer} />,
    onSelect: () => onChange(o.value),
  }));
  if (isSet) {
    items.push("separator", { label: "Clear", icon: <X />, onSelect: () => onChange(undefined) });
  }

  return (
    <Menu
      label={label}
      items={items}
      trigger={
        <button type="button" className={cn(styles.filterChip, isSet && styles.filterChipSet, className)}>
          {isSet ? null : <CirclePlus aria-hidden="true" className={styles.filterIcon} />}
          <span className={styles.filterName}>{label}</span>
          {isSet ? (
            <>
              <span className={styles.filterSep} aria-hidden="true">
                :
              </span>
              <span className={styles.filterValue}>{selected?.label ?? value}</span>
              <ChevronDown aria-hidden="true" className={styles.filterIcon} />
            </>
          ) : null}
        </button>
      }
    />
  );
}
