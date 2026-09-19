import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import './field.css';

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean;
    required: boolean;
  }) => ReactNode;
}

/** Label, hint and error, wired to the control by id — a render prop so the label/control association can't be broken by cloning. */
export function Field({ label, hint, error, required = false, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('omni-field', className)}>
      <label className="omni-field-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="omni-required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': Boolean(error),
        required,
      })}

      {error ? (
        <span className="omni-field-error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
      {hint && !error ? (
        <span className="omni-field-hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
