import type { Ref, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import styles from "./select.module.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options: SelectOption[];
  /** Adds an empty-value first option. Selectable (to clear) unless `required`. */
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

/** Native <select> styled as a control. `className` applies to the outer wrapper. */
export function Select({
  options,
  placeholder,
  size = "md",
  invalid = false,
  className,
  value,
  defaultValue,
  ref,
  ...rest
}: SelectProps) {
  const isInvalid = invalid || rest["aria-invalid"] === true || rest["aria-invalid"] === "true";
  const uncontrolledDefault =
    value === undefined && defaultValue === undefined && placeholder !== undefined ? "" : defaultValue;

  return (
    <span className={cn(styles.root, styles[size], className)}>
      <select
        {...rest}
        ref={ref}
        value={value}
        defaultValue={value === undefined ? uncontrolledDefault : undefined}
        aria-invalid={isInvalid || undefined}
        className={cn(styles.select, isInvalid && styles.invalid)}
      >
        {placeholder !== undefined && (
          <option value="" disabled={rest.required} className={styles.placeholderOption}>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className={styles.chevron} aria-hidden="true" />
    </span>
  );
}
