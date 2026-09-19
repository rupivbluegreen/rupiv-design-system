import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';
import './empty-state.css';

export type EmptyStateTone = 'neutral' | 'red';

export interface EmptyStateProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  /** Decorative: it is hidden from assistive technology, the title carries the meaning. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Usually a Button, for "add the first one" or "try again". */
  action?: ReactNode;
  /** `red` is the error state: pair it with a retry action. It is announced as an alert. */
  tone?: EmptyStateTone;
}

/**
 * The empty and error state of a page or a card. It has no text of its own:
 * every string comes from the caller, so it translates like the rest of the screen.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'neutral',
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={cn('omni-empty-state', `omni-empty-state--${tone}`, className)}
      role={tone === 'red' ? 'alert' : undefined}
      {...rest}
    >
      {icon ? (
        <span className="omni-empty-state-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className="omni-empty-state-title">{title}</p>
      {description ? (
        <p className="omni-empty-state-description">{description}</p>
      ) : null}
      {action ? <div className="omni-empty-state-action">{action}</div> : null}
    </div>
  );
}
