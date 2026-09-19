"use client";

import { useId, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useDir } from "../../provider";
import styles from "./radio.module.css";

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean | undefined;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  /** Controlled value. Without it the group keeps the value itself, starting at `defaultValue`. */
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: ((v: string) => void) | undefined;
  orientation?: "vertical" | "horizontal" | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  className?: string | undefined;
  "aria-label"?: string | undefined;
  "aria-labelledby"?: string | undefined;
  "aria-describedby"?: string | undefined;
}

/**
 * How far an arrow key moves the selection: +1 next, -1 previous, 0 not an arrow key. Up and down always mean
 * previous and next. Left and right follow the reading direction, so in right-to-left the right arrow goes to the
 * previous radio and the left arrow to the next one.
 */
function arrowStep(key: string, dir: "ltr" | "rtl"): -1 | 0 | 1 {
  if (key === "ArrowDown") return 1;
  if (key === "ArrowUp") return -1;
  if (key === "ArrowRight") return dir === "rtl" ? -1 : 1;
  if (key === "ArrowLeft") return dir === "rtl" ? 1 : -1;
  return 0;
}

/**
 * Group of native radios with a custom visual. Tab enters the group at the checked radio; the arrow keys move the
 * focus and the selection to the next enabled radio and wrap around. Left and right swap in right-to-left
 * (the browser's own handling differs between engines, so the group does it and cancels the native key).
 */
export function RadioGroup({
  name,
  options,
  value,
  defaultValue,
  onChange,
  orientation = "vertical",
  disabled = false,
  id,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
}: RadioGroupProps) {
  const autoId = useId();
  const baseId = id ?? `radio-${autoId}`;
  const dir = useDir();
  const [internal, setInternal] = useState(defaultValue);
  const current = value !== undefined ? value : internal;

  function select(next: string) {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = arrowStep(event.key, dir);
    // Alt, Ctrl and Meta with an arrow are browser and system shortcuts.
    if (step === 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "radio") return;
    const radios = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="radio"]')).filter(
      (radio) => !radio.disabled,
    );
    const index = radios.indexOf(target);
    if (index === -1) return;
    event.preventDefault();
    const next = radios[(index + step + radios.length) % radios.length];
    if (!next || next === target) return;
    next.focus();
    select(next.value);
  }

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ?? (id && !ariaLabel ? `${id}-label` : undefined)}
      aria-describedby={ariaDescribedBy}
      className={cn(styles.root, styles[orientation], className)}
      onKeyDown={handleKeyDown}
    >
      {options.map((option, index) => {
        const optionId = `${baseId}-${index}`;
        const descriptionId = option.description ? `${optionId}-description` : undefined;
        const isDisabled = disabled || option.disabled;
        return (
          <div key={option.value} className={cn(styles.item, isDisabled && styles.disabled)}>
            <span className={styles.control}>
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={current === option.value}
                disabled={isDisabled}
                onChange={() => select(option.value)}
                aria-describedby={descriptionId}
                className={styles.input}
              />
              <span className={styles.circle} aria-hidden="true" />
            </span>
            <span className={styles.text}>
              <label htmlFor={optionId} className={styles.label}>
                {option.label}
              </label>
              {option.description && (
                <span id={descriptionId} className={styles.description}>
                  {option.description}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
