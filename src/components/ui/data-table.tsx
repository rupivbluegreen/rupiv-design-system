"use client";

import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { textCollator } from "../../lib/intl";
import type { Tone } from "../../lib/types";
import { useLabels, useLocale, useNavigate } from "../../provider";
import { Checkbox } from "./checkbox";
import { EmptyState } from "./empty-state";
import { Pagination } from "./pagination";
import styles from "./data-table.module.css";

/** The column the rows are sorted by and the direction. */
export interface DataTableSort {
  key: string;
  direction: "asc" | "desc";
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Makes the column sortable. Text sorts by the provider's locale, numerically aware ("item 2" before "item 10"). */
  sortValue?: ((row: T) => string | number) | undefined;
  /** Where the content sits: "start" (default) and "end" follow the reading direction, so "end" is the right in English and the left in Arabic. Use "end" for numbers. */
  align?: "start" | "end" | "center" | undefined;
  width?: number | string | undefined;
  /** Hide on narrow screens: "md" < 768px, "lg" < 1024px. */
  hideBelow?: "md" | "lg" | undefined;
  /** Sticky on horizontal scroll (use on the first column). */
  sticky?: boolean | undefined;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /**
   * The name a screen reader hears for a row's checkbox ("Select row {name}"). Default: the row id. Give a person's name,
   * because an id is often a UUID, which is meaningless read aloud (and English in an Arabic page).
   */
  rowLabel?: ((row: T) => string) | undefined;
  /** Whole row navigates. Clicks on links, buttons, inputs and menus inside the row don't. */
  rowHref?: ((row: T) => string) | undefined;
  selectable?: boolean | undefined;
  bulkActions?: ((selectedIds: string[], clear: () => void) => ReactNode) | undefined;
  /** Default 10; 0 = no pagination. */
  pageSize?: number | undefined;
  dense?: boolean | undefined;
  /** The sort to start with when `sort` is not given. */
  defaultSort?: DataTableSort | undefined;
  /**
   * Controlled sort, for a sort kept in the address bar or in a store. `null` is "not sorted". Without this prop
   * the table keeps the sort itself. Either way `onSortChange` is called when a header is pressed.
   */
  sort?: DataTableSort | null | undefined;
  onSortChange?: ((sort: DataTableSort) => void) | undefined;
  /**
   * Controlled page, 1-based. Without this prop the table keeps the page itself. Either way `onPageChange` is
   * called when the person moves to another page, and with 1 when a new sort or page size sends them back to the start.
   */
  page?: number | undefined;
  onPageChange?: ((page: number) => void) | undefined;
  emptyState?: ReactNode;
  /**
   * Totals row content, rendered in <tfoot>. Pass either `<tr>` element(s), or `<td>` cells
   * (in a fragment) — cells are wrapped in a row and offset for the selection column.
   * Anything else spans the full width. Use `<td data-align="end">` for numeric cells.
   * Footer cells inherit the `hideBelow` of the column(s) they sit under (colSpan aware);
   * set `data-hide-below="md" | "lg"` on a cell to control it manually.
   */
  footer?: ReactNode;
  /** Screen-reader caption. */
  caption?: string | undefined;
  /** Header stays visible while the table body scrolls inside a height-capped container. */
  stickyHeader?: boolean | undefined;
  /** Subtle tone tint + a 2px edge at the inline start of the row (e.g. overdue → "danger"). Hover/selected still win. */
  rowTone?: ((row: T) => Tone | undefined) | undefined;
  className?: string | undefined;
}

type FooterCellProps = {
  className?: string | undefined;
  colSpan?: number | string;
  "data-hide-below"?: string;
  children?: ReactNode;
};

const ROW_TONE_CLASS: Record<Tone, string | undefined> = {
  neutral: styles.toneNeutral,
  accent: styles.toneAccent,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
  info: styles.toneInfo,
};

function cellSpan(props: FooterCellProps): number {
  const span = Math.floor(Number(props.colSpan));
  return Number.isFinite(span) && span > 1 ? span : 1;
}

const IGNORE_ROW_CLICK =
  'a, button, input, select, textarea, label, summary, [role="button"], [role="checkbox"], [role="switch"], [role="menuitem"], [role="option"], [contenteditable="true"], [data-row-click="ignore"]';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function compareValues(a: string | number, b: string | number, collator: Intl.Collator): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

function flattenNodes(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement(child) && child.type === Fragment
      ? flattenNodes((child.props as { children?: ReactNode }).children)
      : [child],
  );
}

function isTag(node: ReactNode, ...tags: string[]): boolean {
  return isValidElement(node) && typeof node.type === "string" && tags.includes(node.type);
}

function shouldIgnoreRowEvent(e: MouseEvent<HTMLTableRowElement>): boolean {
  const target = e.target as Element | null;
  if (!target || !(target instanceof Element)) return true;
  // Events bubbling through React portals (menus, modals) are not "inside" the row.
  if (!e.currentTarget.contains(target)) return true;
  const interactive = target.closest(IGNORE_ROW_CLICK);
  if (interactive && e.currentTarget.contains(interactive)) return true;
  const selection = typeof window !== "undefined" ? window.getSelection() : null;
  if (selection && selection.type === "Range" && selection.toString().length > 0) return true;
  return false;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  rowLabel,
  rowHref,
  selectable = false,
  bulkActions,
  pageSize: initialPageSize = 10,
  dense = false,
  defaultSort,
  sort: sortProp,
  onSortChange,
  page: pageProp,
  onPageChange,
  emptyState,
  footer,
  caption,
  stickyHeader = false,
  rowTone,
  className,
}: DataTableProps<T>) {
  const navigate = useNavigate();
  const label = useLabels();
  const collator = textCollator(useLocale());
  const [ownSort, setOwnSort] = useState<DataTableSort | null>(defaultSort ?? null);
  const [ownPage, setOwnPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());

  // A prop that is given (even null for the sort) means the parent holds that state.
  const sort = sortProp !== undefined ? sortProp : ownSort;
  const page = pageProp !== undefined ? pageProp : ownPage;

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    const getValue = column?.sortValue;
    if (!getValue) return rows;
    const dir = sort.direction === "asc" ? 1 : -1;
    return rows
      .map((row, index) => ({ row, index, value: getValue(row) }))
      .sort((a, b) => compareValues(a.value, b.value, collator) * dir || a.index - b.index)
      .map((entry) => entry.row);
  }, [rows, columns, sort, collator]);

  const paginated = pageSize > 0;
  const pageCount = paginated ? Math.max(1, Math.ceil(sortedRows.length / pageSize)) : 1;
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const visibleRows = paginated
    ? sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedRows;

  const allIds = rows.map(getRowId);
  const selectedIds = selectable ? allIds.filter((id) => selected.has(id)) : [];
  const visibleIds = visibleRows.map(getRowId);
  const visibleSelectedCount = visibleIds.filter((id) => selected.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  const hasStickyColumn = columns.some((c) => c.sticky);
  const colCount = columns.length + (selectable ? 1 : 0);
  const showPagination = paginated && sortedRows.length > Math.min(initialPageSize || pageSize, pageSize);
  const pageSizeOptions = Array.from(new Set([...PAGE_SIZE_OPTIONS, initialPageSize].filter((n) => n > 0))).sort(
    (a, b) => a - b,
  );

  const clearSelection = () => setSelected(new Set());

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  /** Moves to `next`. Reports it, and keeps it itself unless the parent holds the page. */
  const goToPage = (next: number) => {
    if (pageProp === undefined) setOwnPage(next);
    if (next !== currentPage) onPageChange?.(next);
  };

  const toggleSort = (key: string) => {
    const next: DataTableSort = {
      key,
      direction: sort?.key === key && sort.direction === "asc" ? "desc" : "asc",
    };
    if (sortProp === undefined) setOwnSort(next);
    onSortChange?.(next);
    goToPage(1);
  };

  const alignClass = (align: Column<T>["align"]) =>
    align === "end" ? styles.alignEnd : align === "center" ? styles.alignCenter : undefined;

  const cellClass = (column: Column<T>) =>
    cn(
      alignClass(column.align),
      column.hideBelow === "md" && styles.hideMd,
      column.hideBelow === "lg" && styles.hideLg,
      column.sticky && styles.stickyCol,
      column.sticky && selectable && styles.stickyAfterSelect,
    );

  /** Hide class for a footer cell spanning columns [start, start + span). Only when every spanned column hides. */
  const footerHideClass = (start: number, span: number) => {
    if (start < 0) return undefined; // overlaps the selection column
    const spanned = columns.slice(start, start + span);
    if (spanned.length < span || spanned.some((c) => !c.hideBelow)) return undefined;
    return spanned.every((c) => c.hideBelow === "lg") ? styles.hideLg : styles.hideMd;
  };

  /** Give footer cells the responsive hide class of the column(s) above them. */
  const alignFooterCells = (cells: ReactNode[], firstColumn: number) => {
    let index = firstColumn;
    return cells.map((cell) => {
      if (!isTag(cell, "td", "th")) return cell;
      const element = cell as ReactElement<FooterCellProps>;
      const span = cellSpan(element.props);
      const start = index;
      index += span;
      if (element.props["data-hide-below"] !== undefined) return cell;
      const hide = footerHideClass(start, span);
      return hide ? cloneElement(element, { className: cn(element.props.className, hide) }) : cell;
    });
  };

  const renderFooter = () => {
    if (footer === null || footer === undefined || footer === false) return null;
    const nodes = flattenNodes(footer);
    if (nodes.length > 0 && nodes.every((n) => isTag(n, "tr"))) {
      return nodes.map((node) => {
        const row = node as ReactElement<FooterCellProps>;
        const cells = flattenNodes(row.props.children);
        const total = cells.reduce<number>(
          (sum, c) => sum + (isTag(c, "td", "th") ? cellSpan((c as ReactElement<FooterCellProps>).props) : 0),
          0,
        );
        // A full-width row supplied by a selectable table includes its own selection-column cell.
        const firstColumn = selectable && total === colCount ? -1 : 0;
        return cloneElement(row, undefined, ...alignFooterCells(cells, firstColumn));
      });
    }
    if (nodes.length > 0 && nodes.every((n) => isTag(n, "td", "th"))) {
      return (
        <tr>
          {selectable ? <td className={cn(styles.selectCell, hasStickyColumn && styles.stickySelect)} /> : null}
          {alignFooterCells(nodes, 0)}
        </tr>
      );
    }
    return (
      <tr>
        <td colSpan={colCount}>{footer}</td>
      </tr>
    );
  };

  const bulkBarVisible = selectable && selectedIds.length > 0;
  const selectAllLabel = label(allVisibleSelected ? "dataTable.deselectAllRows" : "dataTable.selectAllRows");

  return (
    <div className={cn(styles.root, dense && styles.dense, className)}>
      {bulkBarVisible ? (
        <div className={styles.bulkBar} role="region" aria-label={label("dataTable.bulkActions")}>
          <span className={styles.bulkCheck}>
            <Checkbox
              aria-label={selectAllLabel}
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected}
              onChange={toggleVisible}
            />
          </span>
          <span className={styles.bulkCount} aria-live="polite">
            {label("dataTable.selectedCount", { n: selectedIds.length })}
          </span>
          {bulkActions ? <div className={styles.bulkActions}>{bulkActions(selectedIds, clearSelection)}</div> : null}
          <button type="button" className={styles.bulkClear} onClick={clearSelection}>
            {label("dataTable.clearSelection")}
          </button>
        </div>
      ) : null}

      <div className={cn(styles.scroll, stickyHeader && styles.stickyHeader)}>
        <table className={styles.table}>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              {selectable ? (
                <th scope="col" className={cn(styles.selectCell, hasStickyColumn && styles.stickySelect)}>
                  <Checkbox
                    aria-label={selectAllLabel}
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onChange={toggleVisible}
                    disabled={visibleIds.length === 0}
                    tabIndex={bulkBarVisible ? -1 : undefined}
                  />
                </th>
              ) : null}
              {columns.map((column) => {
                const sortable = !!column.sortValue;
                const active = sort?.key === column.key;
                const ariaSort = sortable
                  ? active
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                  : undefined;
                const style: CSSProperties | undefined =
                  column.width !== undefined ? { width: column.width, minWidth: column.width } : undefined;
                return (
                  <th key={column.key} scope="col" aria-sort={ariaSort} className={cellClass(column)} style={style}>
                    {sortable ? (
                      <button
                        type="button"
                        className={cn(styles.sortButton, active && styles.sortActive)}
                        onClick={() => toggleSort(column.key)}
                        tabIndex={bulkBarVisible ? -1 : undefined}
                      >
                        <span className={styles.headerText}>{column.header}</span>
                        <span className={styles.sortIcon} aria-hidden="true">
                          {active ? sort.direction === "asc" ? <ChevronUp /> : <ChevronDown /> : <ChevronsUpDown />}
                        </span>
                      </button>
                    ) : (
                      <span className={styles.headerText}>{column.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {visibleRows.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={colCount}>
                  {emptyState ?? (
                    <EmptyState
                      compact
                      title={label("dataTable.emptyTitle")}
                      description={label("dataTable.emptyDescription")}
                    />
                  )}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const id = getRowId(row);
                const href = rowHref?.(row);
                const isSelected = selectable && selected.has(id);
                const tone = rowTone?.(row);

                const onClick = href
                  ? (e: MouseEvent<HTMLTableRowElement>) => {
                      if (e.defaultPrevented || shouldIgnoreRowEvent(e)) return;
                      if (e.metaKey || e.ctrlKey || e.shiftKey) {
                        window.open(href, "_blank", "noopener");
                        return;
                      }
                      navigate(href);
                    }
                  : undefined;
                const onAuxClick = href
                  ? (e: MouseEvent<HTMLTableRowElement>) => {
                      if (e.button !== 1 || shouldIgnoreRowEvent(e)) return;
                      e.preventDefault();
                      window.open(href, "_blank", "noopener");
                    }
                  : undefined;
                const onKeyDown = href
                  ? (e: KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === "Enter" && e.target === e.currentTarget) {
                        e.preventDefault();
                        navigate(href);
                      }
                    }
                  : undefined;

                return (
                  <tr
                    key={id}
                    className={cn(styles.row, href && styles.clickable, tone && styles.toned, tone && ROW_TONE_CLASS[tone])}
                    data-tone={tone}
                    data-selected={isSelected || undefined}
                    aria-selected={selectable ? isSelected : undefined}
                    tabIndex={href ? 0 : undefined}
                    onClick={onClick}
                    onAuxClick={onAuxClick}
                    onKeyDown={onKeyDown}
                  >
                    {selectable ? (
                      <td
                        className={cn(styles.selectCell, hasStickyColumn && styles.stickySelect)}
                        data-row-click="ignore"
                      >
                        <Checkbox
                          aria-label={label("dataTable.selectRow", { id: rowLabel ? rowLabel(row) : id })}
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td key={column.key} className={cellClass(column)}>
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>

          {footer !== undefined && footer !== null && visibleRows.length > 0 ? (
            <tfoot className={styles.tfoot}>{renderFooter()}</tfoot>
          ) : null}
        </table>
      </div>

      {showPagination ? (
        <div className={styles.pagination}>
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={goToPage}
            total={sortedRows.length}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={(n) => {
              setPageSize(n);
              goToPage(1);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
