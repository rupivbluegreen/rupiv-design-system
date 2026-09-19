import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/cn";
import styles from "./date-input.module.css";

export interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/** Native date input (value "YYYY-MM-DD") styled as a control. */
export function DateInput({ size = "md", invalid = false, className, ref, ...rest }: DateInputProps) {
  const isInvalid = invalid || rest["aria-invalid"] === true || rest["aria-invalid"] === "true";
  return (
    <input
      {...rest}
      ref={ref}
      type="date"
      aria-invalid={isInvalid || undefined}
      className={cn(styles.root, styles[size], isInvalid && styles.invalid, className)}
    />
  );
}
