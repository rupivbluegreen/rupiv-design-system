import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "../../lib/cn";
import styles from "./empty-state.module.css";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string | undefined;
}

export function EmptyState({ icon, title, description, action, compact = false, className }: EmptyStateProps) {
  return (
    <div className={cn(styles.empty, compact && styles.compact, className)}>
      <span className={styles.icon} aria-hidden="true">
        {icon ?? <Inbox />}
      </span>
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        {description ? <div className={styles.description}>{description}</div> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
