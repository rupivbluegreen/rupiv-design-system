"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import type { InputHTMLAttributes, ReactNode, Ref, RefObject } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./checkbox.module.css";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Checkbox with a custom box. Without `label`, pass `aria-label` (e.g. table row selection).
 * `className` applies to the outer wrapper; other props go to the native input.
 */
export function Checkbox({
  label,
  description,
  indeterminate = false,
  className,
  id,
  ref,
  ...rest
}: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? `checkbox-${autoId}`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const localRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (localRef.current) localRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as RefObject<HTMLInputElement | null>).current = node;
    },
    [ref],
  );

  const describedBy = [rest["aria-describedby"], descriptionId].filter(Boolean).join(" ") || undefined;

  const control = (
    <span className={styles.control}>
      <input
        {...rest}
        ref={setRefs}
        id={inputId}
        type="checkbox"
        className={styles.input}
        aria-checked={indeterminate ? "mixed" : undefined}
        aria-describedby={describedBy}
      />
      <span className={styles.box} aria-hidden="true">
        <Check className={styles.checkIcon} strokeWidth={3} />
        <Minus className={styles.minusIcon} strokeWidth={3} />
      </span>
    </span>
  );

  if (!label && !description) {
    return <span className={cn(styles.root, styles.bare, className)}>{control}</span>;
  }

  return (
    <span className={cn(styles.root, rest.disabled && styles.disabled, className)}>
      {control}
      <span className={styles.text}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        {description && (
          <span id={descriptionId} className={styles.description}>
            {description}
          </span>
        )}
      </span>
    </span>
  );
}
