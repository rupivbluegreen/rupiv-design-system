"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { computedDirection } from "../../lib/placement";
import { useActivePath, useLabels, useLink } from "../../provider";
import styles from "./tabs.module.css";

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export interface TabItem {
  value: string;
  label: ReactNode;
  count?: number;
  icon?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  variant?: "line" | "pill";
  ariaLabel?: string;
  /** Alias of `ariaLabel`; wins when both are set. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Prefix for tab element ids: tabs get `${id}-tab-${value}` so panels can use aria-labelledby. */
  id?: string;
  className?: string | undefined;
}

/** Tab list only — render the active panel yourself based on `value`. */
export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  variant = "line",
  ariaLabel,
  "aria-label": ariaLabelAttr,
  "aria-labelledby": ariaLabelledBy,
  id,
  className,
}: TabsProps) {
  const autoId = useId();
  const baseId = id ?? `tabs-${autoId}`;
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const current = value !== undefined ? value : internal;
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const currentIndex = items.findIndex((item) => item.value === current);
  const focusableIndex = currentIndex === -1 ? 0 : currentIndex;

  function select(next: string) {
    if (value === undefined) setInternal(next);
    if (next !== current) onChange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    // The tabs are laid out along the text direction: the key that points to the next tab on screen is
    // ArrowRight in English and ArrowLeft in Arabic.
    const rtl = computedDirection(event.currentTarget) === "rtl";
    const nextKey = rtl ? "ArrowLeft" : "ArrowRight";
    const previousKey = rtl ? "ArrowRight" : "ArrowLeft";
    let nextIndex: number | null = null;
    if (event.key === nextKey) nextIndex = (index + 1) % items.length;
    else if (event.key === previousKey) nextIndex = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const target = items[nextIndex];
    if (!target) return;
    select(target.value);
    tabsRef.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabelAttr ?? ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-orientation="horizontal"
      className={cn(styles.list, styles[variant], className)}
    >
      {items.map((item, index) => {
        const isSelected = item.value === current;
        return (
          <button
            key={item.value}
            ref={(el) => {
              tabsRef.current[index] = el;
            }}
            id={`${baseId}-tab-${item.value}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={index === focusableIndex ? 0 : -1}
            className={cn(styles.tab, isSelected && styles.active)}
            onClick={() => select(item.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {item.icon && (
              <span className={styles.icon} aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
            {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TabLinks                                                            */
/* ------------------------------------------------------------------ */

export interface TabLinkItem {
  href: string;
  label: ReactNode;
  count?: number;
}

export interface TabLinksProps {
  items: TabLinkItem[];
  /** Name of the navigation landmark. Default: the "tabs.sections" label. */
  ariaLabel?: string;
  /** Alias of `ariaLabel`; wins when both are set. */
  "aria-label"?: string;
  className?: string | undefined;
}

/** Route-backed tabs (line style). Active = exact match or the longest matching path prefix. */
export function TabLinks({ items, ariaLabel, "aria-label": ariaLabelAttr, className }: TabLinksProps) {
  const label = useLabels();
  const Link = useLink();
  const pathname = useActivePath();
  let activeHref: string | undefined;
  for (const item of items) {
    const href = item.href.split(/[?#]/)[0] ?? item.href; // split() always returns at least one element
    const isMatch = pathname === href || pathname.startsWith(`${href.replace(/\/$/, "")}/`);
    if (isMatch && (activeHref === undefined || href.length > activeHref.length)) activeHref = href;
  }

  return (
    <nav aria-label={ariaLabelAttr ?? ariaLabel ?? label("tabs.sections")} className={cn(styles.list, styles.line, className)}>
      {items.map((item) => {
        const isActive = item.href.split(/[?#]/)[0] === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(styles.tab, isActive && styles.active)}
          >
            <span>{item.label}</span>
            {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
