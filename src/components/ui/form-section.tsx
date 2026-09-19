import { useId } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import styles from "./form-section.module.css";

/* ------------------------------------------------------------------ */
/* FormSection                                                         */
/* ------------------------------------------------------------------ */

export interface FormSectionProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string | undefined;
  children: ReactNode;
}

/** Label column (1/3) + content (2/3); stacks below 768px. Adjacent sections get a divider. */
export function FormSection({ title, description, actions, className, children }: FormSectionProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={cn(styles.section, className)}>
      <div className={styles.aside}>
        <h2 id={titleId} className={cn("t-heading-xs", styles.title)}>
          {title}
        </h2>
        {description && <p className={styles.description}>{description}</p>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      <div className={styles.content}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FormGrid                                                            */
/* ------------------------------------------------------------------ */

export interface FormGridProps {
  columns?: 1 | 2 | 3 | 4 | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/**
 * Responsive grid for Fields. A direct child with `data-span="full"` spans all columns.
 * 3–4 columns → 2 below 1024px; everything → 1 below 640px.
 */
export function FormGrid({ columns = 2, className, children }: FormGridProps) {
  return <div className={cn(styles.grid, styles[`cols${columns}`], className)}>{children}</div>;
}
