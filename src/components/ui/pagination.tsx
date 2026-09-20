"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { useFormat } from "../../lib/use-format";
import { useLabels } from "../../provider";
import { IconButton } from "./button";
import { Select } from "./select";
import styles from "./pagination.module.css";

export interface PaginationProps {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  total?: number | undefined;
  pageSize?: number | undefined;
  pageSizeOptions?: number[] | undefined;
  onPageSizeChange?: ((n: number) => void) | undefined;
  className?: string | undefined;
}

type PageToken = number | "gap-start" | "gap-end";

function pageTokens(page: number, count: number): PageToken[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  let start = Math.max(2, page - 1);
  let end = Math.min(count - 1, page + 1);
  if (page <= 3) {
    start = 2;
    end = 4;
  } else if (page >= count - 2) {
    start = count - 3;
    end = count - 1;
  }
  const tokens: PageToken[] = [1];
  if (start > 2) tokens.push("gap-start");
  for (let p = start; p <= end; p++) tokens.push(p);
  if (end < count - 1) tokens.push("gap-end");
  tokens.push(count);
  return tokens;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  total,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const label = useLabels();
  const { int: format } = useFormat();
  const count = Math.max(pageCount, 1);
  const current = Math.min(Math.max(page, 1), count);

  let summary: string;
  if (total !== undefined && pageSize !== undefined) {
    const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
    const to = Math.min(current * pageSize, total);
    summary = label("pagination.range", { from: format(from), to: format(to), total: format(total) });
  } else {
    summary = label("pagination.pageOf", { page: format(current), pages: format(count) });
  }

  const showPageSize = pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange;

  return (
    <nav aria-label={label("pagination.label")} className={cn(styles.root, className)}>
      <div className={styles.start}>
        <span className={styles.summary} aria-live="polite">
          {summary}
        </span>
        {showPageSize && (
          <label className={styles.pageSize}>
            <span className={styles.pageSizeLabel}>{label("pagination.pageSize")}</span>
            <Select
              size="sm"
              className={styles.pageSizeSelect}
              // The wrapping label's text is display:none below 640px (the compact summary replaces it); an implicit
              // <label> association does not survive that, so the name is repeated here, where it always applies.
              aria-label={label("pagination.pageSize")}
              value={String(pageSize ?? pageSizeOptions[0])}
              options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            />
          </label>
        )}
      </div>

      <div className={styles.end}>
        <IconButton
          icon={<ChevronLeft />}
          label={label("pagination.previous")}
          variant="secondary"
          size="sm"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
        />
        <ul role="list" className={styles.pages}>
          {pageTokens(current, count).map((token) =>
            typeof token === "number" ? (
              <li key={token}>
                <button
                  type="button"
                  className={cn(styles.page, token === current && styles.current)}
                  aria-current={token === current ? "page" : undefined}
                  aria-label={label("pagination.goToPage", { page: format(token) })}
                  onClick={() => {
                    if (token !== current) onPageChange(token);
                  }}
                >
                  {format(token)}
                </button>
              </li>
            ) : (
              <li key={token} className={styles.gap} aria-hidden="true">
                …
              </li>
            ),
          )}
        </ul>
        <span className={styles.compact} aria-hidden="true">
          {label("pagination.compact", { page: format(current), pages: format(count) })}
        </span>
        <IconButton
          icon={<ChevronRight />}
          label={label("pagination.next")}
          variant="secondary"
          size="sm"
          disabled={current >= count}
          onClick={() => onPageChange(current + 1)}
        />
      </div>
    </nav>
  );
}
