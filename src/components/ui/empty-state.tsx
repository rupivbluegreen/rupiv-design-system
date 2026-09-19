import type { ReactNode } from "react";
import { Inbox, TriangleAlert } from "lucide-react";
import { cn } from "../../lib/cn";
import styles from "./empty-state.module.css";

/** `default` is a quiet empty or no-access state; `warning` and `danger` colour the icon (an error state is `danger`). */
export type EmptyStateTone = "default" | "danger" | "warning";

export interface EmptyStateProps {
  /** Replaces the icon that goes with the tone (an inbox, or a warning triangle for `danger` and `warning`). */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  tone?: EmptyStateTone;
  className?: string | undefined;
}

const TONE_ICON: Record<EmptyStateTone, ReactNode> = {
  default: <Inbox />,
  danger: <TriangleAlert />,
  warning: <TriangleAlert />,
};

/**
 * Empty, error and no-access states. The `danger` tone is announced to screen readers (role="alert") because it
 * replaces the content the person came for; the other tones are plain content.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  tone = "default",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(styles.empty, compact && styles.compact, className)}
      role={tone === "danger" ? "alert" : undefined}
    >
      <span
        className={cn(styles.icon, tone === "danger" && styles.iconDanger, tone === "warning" && styles.iconWarning)}
        aria-hidden="true"
      >
        {icon ?? TONE_ICON[tone]}
      </span>
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        {description ? <div className={styles.description}>{description}</div> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
