import type { ReactNode } from "react";
import { Inbox, TriangleAlert } from "lucide-react";
import { cn } from "../../lib/cn";
import styles from "./empty-state.module.css";

/** `default` is a quiet empty or no-access state; `warning` and `danger` colour the icon (an error state is `danger`). */
export type EmptyStateTone = "default" | "danger" | "warning";

/** The heading levels an application can give the title: h1 to h6. */
export type EmptyStateHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface EmptyStateProps {
  /** Replaces the icon that goes with the tone (an inbox, or a warning triangle for `danger` and `warning`). */
  icon?: ReactNode;
  title: string;
  /**
   * Makes the title a heading of this level. Without it the title is a paragraph, so an empty state inside a page does
   * not add a heading to the outline. Set `1` when the state IS the page (a no-access or not-found page has no other
   * heading), or the level that fits under the page's own headings.
   */
  headingLevel?: EmptyStateHeadingLevel;
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
  headingLevel,
  description,
  action,
  compact = false,
  tone = "default",
  className,
}: EmptyStateProps) {
  const Title = headingLevel === undefined ? "p" : (`h${headingLevel}` as const);
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
        <Title className={styles.title}>{title}</Title>
        {description ? <div className={styles.description}>{description}</div> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
