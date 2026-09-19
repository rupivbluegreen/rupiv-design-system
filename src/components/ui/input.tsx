import type { InputHTMLAttributes, ReactNode, Ref, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import styles from "./input.module.css";

function isAriaInvalid(value: unknown): boolean {
  return value === true || value === "true";
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  size?: "sm" | "md" | "lg" | undefined;
  /** Text adornment before the value, at the inline start, e.g. "$". */
  prefix?: ReactNode;
  /** Text adornment after the value, at the inline end, e.g. "m", "%". */
  suffix?: ReactNode;
  /** Icon at the inline start (the left in English, the right in Arabic). */
  startIcon?: ReactNode;
  invalid?: boolean | undefined;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Text input. `className` applies to the outer control box (use it for width);
 * all other props go to the native <input>.
 */
export function Input({
  size = "md",
  prefix,
  suffix,
  startIcon,
  invalid = false,
  className,
  ref,
  ...rest
}: InputProps) {
  const isInvalid = invalid || isAriaInvalid(rest["aria-invalid"]);
  return (
    <span
      className={cn(
        styles.control,
        styles[size],
        isInvalid && styles.invalid,
        rest.disabled && styles.disabled,
        rest.readOnly && styles.readOnly,
        className,
      )}
    >
      {startIcon && (
        <span className={styles.startIcon} aria-hidden="true">
          {startIcon}
        </span>
      )}
      {prefix != null && <span className={cn(styles.affix, styles.prefix)}>{prefix}</span>}
      <input {...rest} ref={ref} aria-invalid={isInvalid || undefined} className={styles.input} />
      {suffix != null && <span className={cn(styles.affix, styles.suffix)}>{suffix}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Textarea                                                            */
/* ------------------------------------------------------------------ */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean | undefined;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ invalid = false, className, rows = 3, ref, ...rest }: TextareaProps) {
  const isInvalid = invalid || isAriaInvalid(rest["aria-invalid"]);
  return (
    <textarea
      {...rest}
      ref={ref}
      rows={rows}
      aria-invalid={isInvalid || undefined}
      className={cn(styles.textarea, isInvalid && styles.invalid, className)}
    />
  );
}
