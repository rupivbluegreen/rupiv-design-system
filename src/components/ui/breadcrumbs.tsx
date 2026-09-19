"use client";

import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { useLabels, useLink } from "../../provider";
import styles from "./breadcrumbs.module.css";

export interface BreadcrumbItem {
  label: string;
  href?: string | undefined;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string | undefined;
}

/** The last item is always rendered as the current page. The separator chevron mirrors in right-to-left (CSS `:dir(rtl)`). */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const Link = useLink();
  const label = useLabels();
  if (items.length === 0) return null;
  return (
    <nav aria-label={label("breadcrumbs.label")} className={cn(styles.root, className)}>
      <ol role="list" className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className={styles.item}>
                {isLast ? (
                  <span aria-current="page" className={styles.current} title={item.label}>
                    {item.label}
                  </span>
                ) : item.href ? (
                  <Link href={item.href} className={styles.link} title={item.label}>
                    {item.label}
                  </Link>
                ) : (
                  <span className={styles.text} title={item.label}>
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li role="presentation" aria-hidden="true" className={styles.separator}>
                  <ChevronRight />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
