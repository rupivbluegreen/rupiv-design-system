"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./radio.module.css";

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  orientation?: "vertical" | "horizontal";
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

/** Group of native radios (arrow-key navigation is native) with a custom visual. */
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
  const [internal, setInternal] = useState(defaultValue);
  const current = value !== undefined ? value : internal;

  function select(next: string) {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  }

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ?? (id && !ariaLabel ? `${id}-label` : undefined)}
      aria-describedby={ariaDescribedBy}
      aria-orientation={orientation}
      className={cn(styles.root, styles[orientation], className)}
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
