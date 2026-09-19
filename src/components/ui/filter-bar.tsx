"use client";

import type { ReactNode } from "react";
import { ChevronDown, CirclePlus, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { useLabels } from "../../provider";
import { Menu, type MenuEntry } from "./menu";
import { SearchInput } from "./search-input";
import styles from "./filter-bar.module.css";

export interface FilterBarProps {
  /** The search box. `placeholder` defaults to the provider's "searchInput.placeholder". */
  search?: { value?: string | undefined; onChange?: ((v: string) => void) | undefined; placeholder?: string | undefined };
  filters?: ReactNode;
  actions?: ReactNode;
  activeFilters?: { label: string; onRemove: () => void }[] | undefined;
  onClearAll?: (() => void) | undefined;
  className?: string | undefined;
}

export function FilterBar({ search, filters, actions, activeFilters, onClearAll, className }: FilterBarProps) {
  const label = useLabels();
  const hasActive = !!activeFilters && activeFilters.length > 0;
  return (
    <div className={cn(styles.bar, className)}>
      <div className={styles.row}>
        {search ? (
          <SearchInput
            value={search.value}
            onChange={search.onChange}
            placeholder={search.placeholder}
            size="sm"
            className={styles.search}
          />
        ) : null}
        {filters ? <div className={styles.filters}>{filters}</div> : null}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {hasActive ? (
        <div className={styles.activeRow}>
          <span className={styles.activeLabel}>{label("filterBar.filteredBy")}</span>
          <ul className={styles.chips} role="list">
            {activeFilters.map((f, i) => (
              <li key={`${f.label}-${i}`} className={styles.chip}>
                <span className={styles.chipLabel}>{f.label}</span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  onClick={f.onRemove}
                  aria-label={label("filterBar.removeFilter", { label: f.label })}
                >
                  <X aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {onClearAll ? (
            <button type="button" className={styles.clearAll} onClick={onClearAll}>
              {label("filterBar.clearAll")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export interface FilterChipProps {
  label: string;
  value?: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string | undefined) => void;
  className?: string | undefined;
}

export function FilterChip({ label, value, options, onChange, className }: FilterChipProps) {
  const text = useLabels();
  const selected = value !== undefined ? options.find((o) => o.value === value) : undefined;
  const isSet = value !== undefined && value !== "";

  // The options are radio items of the menu (one is chosen, the menu marks it); "Clear" is an ordinary item below them.
  const items: MenuEntry[] = [
    {
      type: "radio-group",
      options: options.map((o) => ({ value: o.value, label: o.label })),
      value: isSet ? value : undefined,
      onValueChange: (next) => onChange(next),
      label,
    },
  ];
  if (isSet) {
    items.push("separator", { label: text("filterBar.clearFilter"), icon: <X />, onSelect: () => onChange(undefined) });
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
