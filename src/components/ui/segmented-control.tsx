"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "../../lib/cn";
import styles from "./segmented-control.module.css";

export interface SegmentedControlOption {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  size?: "sm" | "md";
  /** Accessible name. Optional when `aria-label` / `aria-labelledby` is given or the control sits in a `Field`. */
  ariaLabel?: string;
  /** Alias of `ariaLabel`; wins when both are set. */
  "aria-label"?: string;
  /** id of a visible label. Injected automatically by `Field`. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  /** id of the radiogroup element (injected by `Field`). */
  id?: string;
  className?: string | undefined;
}

export function SegmentedControl({
  options,
  value,
  defaultValue,
  onChange,
  size = "md",
  ariaLabel,
  "aria-label": ariaLabelAttr,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  id,
  className,
}: SegmentedControlProps) {
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value);
  const current = value !== undefined ? value : internal;
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const currentIndex = options.findIndex((option) => option.value === current);
  const focusableIndex = currentIndex === -1 ? 0 : currentIndex;

  function select(next: string) {
    if (value === undefined) setInternal(next);
    if (next !== current) onChange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % options.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      nextIndex = (index - 1 + options.length) % options.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const target = options[nextIndex];
    if (!target) return;
    select(target.value);
    buttonsRef.current[nextIndex]?.focus();
  }

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabelAttr ?? ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      className={cn(styles.root, styles[size], className)}
    >
      {options.map((option, index) => {
        const isSelected = option.value === current;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonsRef.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={index === focusableIndex ? 0 : -1}
            className={cn(styles.item, isSelected && styles.selected)}
            onClick={() => select(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.icon && (
              <span className={styles.icon} aria-hidden="true">
                {option.icon}
              </span>
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
