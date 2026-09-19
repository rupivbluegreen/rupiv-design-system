import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import './input.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Right-aligned and tabular in both directions. */
  numeric?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { numeric = false, className, dir, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn('omni-input', className)}
      data-numeric={numeric || undefined}
      // Identifiers, codes and amounts read left-to-right even on an Arabic page.
      dir={dir ?? (numeric ? 'ltr' : undefined)}
      {...props}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 3, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn('omni-textarea', className)} {...props} />;
  },
);
