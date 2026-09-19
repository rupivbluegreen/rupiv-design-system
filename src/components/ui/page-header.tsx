import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "../../lib/cn";
import { Breadcrumbs } from "./breadcrumbs";
import type { BreadcrumbItem } from "./breadcrumbs";
import { IconButton } from "./button";
import styles from "./page-header.module.css";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  /** Inline, right of the title — e.g. a StatusPill. */
  meta?: ReactNode;
  /** Right-aligned buttons. */
  actions?: ReactNode;
  /** Rendered below the header with a bottom border — pass <Tabs /> or <TabLinks />. */
  tabs?: ReactNode;
  backHref?: string;
  className?: string | undefined;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  meta,
  actions,
  tabs,
  backHref,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn(styles.root, tabs != null && styles.withTabs, className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} className={styles.breadcrumbs} />}
      <div className={styles.row}>
        <div className={styles.main}>
          {backHref && (
            <IconButton
              href={backHref}
              icon={<ArrowLeft />}
              label="Back"
              variant="ghost"
              size="sm"
              className={styles.back}
            />
          )}
          <div className={styles.heading}>
            <div className={styles.titleRow}>
              <h1 className={cn("t-heading-l", styles.title)}>{title}</h1>
              {meta && <div className={styles.meta}>{meta}</div>}
            </div>
            {description && <p className={styles.description}>{description}</p>}
          </div>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {tabs != null && <div className={styles.tabs}>{tabs}</div>}
    </header>
  );
}
