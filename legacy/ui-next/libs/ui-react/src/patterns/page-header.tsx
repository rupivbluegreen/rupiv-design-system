import type { HTMLAttributes, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/cn';
import './page-header.css';

export interface PageHeaderBreadcrumb {
  label: string;
  /** Omit for a crumb that is not a page. The last crumb is the current page and is never a link. */
  href?: string;
}

export interface PageHeaderProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'title'
> {
  title: string;
  /** One short line. */
  subtitle?: string;
  /** Detail pages only: the trail down to (and ending with) this page. */
  breadcrumbs?: PageHeaderBreadcrumb[];
  /**
   * Accessible name of the breadcrumb `<nav>`. There is no built-in text, so
   * pass a translated string (a page with an app shell has two navs to tell apart).
   */
  breadcrumbLabel?: string;
  /** Page-level actions, at most two visible. Wraps under the title on narrow screens. */
  actions?: ReactNode;
  /** Slot beside the title, for example a data-source badge. */
  meta?: ReactNode;
}

/** The title block of a page: the one `<h1>`, an optional subtitle, breadcrumbs, a meta slot and actions. */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  breadcrumbLabel,
  actions,
  meta,
  className,
  ...rest
}: PageHeaderProps) {
  return (
    <header className={cn('omni-page-header', className)} {...rest}>
      <div className="omni-page-header-main">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav
            className="omni-page-header-breadcrumbs"
            aria-label={breadcrumbLabel}
          >
            <ol className="omni-page-header-crumbs">
              {breadcrumbs.map((crumb, index) => {
                const isCurrent = index === breadcrumbs.length - 1;
                return (
                  <li
                    key={`${index}-${crumb.label}`}
                    className="omni-page-header-crumb"
                  >
                    {isCurrent || !crumb.href ? (
                      <span aria-current={isCurrent ? 'page' : undefined}>
                        {crumb.label}
                      </span>
                    ) : (
                      <a href={crumb.href}>{crumb.label}</a>
                    )}
                    {isCurrent ? null : (
                      <ChevronRight
                        className="omni-page-header-crumb-separator tx-directional-icon"
                        size={14}
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}

        <div className="omni-page-header-title-row">
          <h1 className="omni-page-header-title">{title}</h1>
          {meta ? <div className="omni-page-header-meta">{meta}</div> : null}
        </div>

        {subtitle ? (
          <p className="omni-page-header-subtitle">{subtitle}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="omni-page-header-actions">{actions}</div>
      ) : null}
    </header>
  );
}
