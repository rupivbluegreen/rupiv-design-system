"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "../../lib/cn";
import { useLabels } from "../../provider";
import { Breadcrumbs } from "./breadcrumbs";
import type { BreadcrumbItem } from "./breadcrumbs";
import { IconButton } from "./button";
import styles from "./page-header.module.css";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: BreadcrumbItem[] | undefined;
  /** Inline, after the title (at its inline end): a StatusPill, a data-source badge. */
  meta?: ReactNode;
  /** Buttons at the inline end of the header. */
  actions?: ReactNode;
  /** Rendered below the header with a bottom border — pass <Tabs /> or <TabLinks />. */
  tabs?: ReactNode;
  /** Shows a back link before the title. The arrow points at the inline start: it mirrors in right-to-left. */
  backHref?: string | undefined;
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
  const label = useLabels();
  return (
    <header className={cn(styles.root, className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} className={styles.breadcrumbs} />}
      <div className={styles.row}>
        <div className={styles.main}>
          {backHref && (
            <IconButton
              href={backHref}
              icon={<ArrowLeft />}
              label={label("pageHeader.back")}
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
