import type { InputHTMLAttributes, ReactNode, Ref, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import styles from "./input.module.css";

function isAriaInvalid(value: unknown): boolean {
  return value === true || value === "true";
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  size?: "sm" | "md" | "lg";
  /** Leading text adornment, e.g. "₹". */
  prefix?: ReactNode;
  /** Trailing text adornment, e.g. "m", "%". */
  suffix?: ReactNode;
  leftIcon?: ReactNode;
  invalid?: boolean;
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
  leftIcon,
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
      {leftIcon && (
        <span className={styles.leftIcon} aria-hidden="true">
          {leftIcon}
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
  invalid?: boolean;
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
