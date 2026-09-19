"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import styles from "./switch.module.css";

export interface SwitchProps {
  /** Controlled state. Without it the switch keeps the state itself, starting at `defaultChecked`. */
  checked?: boolean | undefined;
  defaultChecked?: boolean | undefined;
  onCheckedChange?: ((v: boolean) => void) | undefined;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean | undefined;
  id?: string | undefined;
  className?: string | undefined;
  /** Required when there is no visible `label`. */
  "aria-label"?: string | undefined;
  "aria-describedby"?: string | undefined;
}

export function Switch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  label,
  description,
  disabled = false,
  id,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? `switch-${autoId}`;
  const descriptionId = description ? `${switchId}-description` : undefined;
  const [internal, setInternal] = useState(defaultChecked);
  const isOn = checked !== undefined ? checked : internal;
  const describedBy = [ariaDescribedBy, descriptionId].filter(Boolean).join(" ") || undefined;

  function toggle() {
    const next = !isOn;
    if (checked === undefined) setInternal(next);
    onCheckedChange?.(next);
  }

  return (
    <span className={cn(styles.root, disabled && styles.disabled, className)}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={toggle}
        className={cn(styles.track, isOn && styles.on)}
      >
        <span className={styles.thumb} aria-hidden="true" />
      </button>
      {(label || description) && (
        <span className={styles.text}>
          {label && (
            <label htmlFor={switchId} className={styles.label}>
              {label}
            </label>
          )}
          {description && (
            <span id={descriptionId} className={styles.description}>
              {description}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
