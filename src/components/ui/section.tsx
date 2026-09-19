import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import styles from "./section.module.css";

export interface SectionProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string | undefined;
  children?: ReactNode;
}

export function Section({ title, description, actions, className, children }: SectionProps) {
  return (
    <section className={cn(styles.section, className)}>
      <header className={styles.header}>
        <div className={styles.text}>
          <h2 className={cn("t-heading-s", styles.title)}>{title}</h2>
          {description ? <p className={cn("t-body-s", styles.description)}>{description}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
