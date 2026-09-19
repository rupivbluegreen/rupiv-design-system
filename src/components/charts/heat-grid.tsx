"use client";

import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { cn } from "../../lib/cn";
import { useFormat } from "../../lib/use-format";
import { NO_VALUE } from "../../lib/locale";
import { useLabels } from "../../provider";
import { ChartTooltip, TooltipRow, TooltipTitle } from "./chart-tooltip";
import { clamp, finite } from "./scale";
import { useChartDir } from "./use-chart-dir";
import styles from "./heat-grid.module.css";

/**
 * How a value becomes a colour.
 * - "scale": one tone, darker as the value grows (`tone`).
 * - "signed": below 0 is a gap (red), above 0 a surplus (blue), 0 is balanced (grey); the size of the number sets the intensity.
 * - "gap" and "surplus": every value is that kind, only the intensity varies.
 */
export type HeatKind = "scale" | "signed" | "gap" | "surplus";

/** What a cell is. "scale" cells of a one-tone grid have no meaning beyond their value. */
export type HeatCellKind = "gap" | "surplus" | "ok" | "scale";

/** A cell with a value, as handed to `onCellSelect`. `row` and `column` are indexes into `rows` and `columns`. */
export interface HeatCell {
  row: number;
  column: number;
  value: number;
  kind: HeatCellKind;
}

export interface HeatGridProps {
  rows: string[];
  columns: string[];
  /** `values[row][column]`. null, undefined and NaN leave a cell empty. */
  values: (number | null | undefined)[][];
  format?: (n: number) => string;
  /** Default "scale", which uses `tone`. */
  kind?: HeatKind;
  /** The tone of a "scale" grid. */
  tone?: "accent" | "warning" | "danger";
  /** Narrowest a column may get, px. The grid scrolls sideways when the columns do not fit. Default 44. */
  minColWidth?: number;
  /**
   * Cells without text, for a grid with many narrow columns. The values stay in each cell's name and in the tooltip.
   * Column headers may then run past their column, so pass '' for the columns that should have none.
   */
  compact?: boolean;
  /** The grid's name for assistive technology; the generated summary follows it. */
  label?: string;
  /** Makes the cells with a value act as buttons: click, Enter and Space call it. */
  onCellSelect?: (cell: HeatCell) => void;
}

type HeatTone = NonNullable<HeatGridProps["tone"]>;
type CustomStyle = CSSProperties & { [name: `--${string}`]: string | number };

const MIN_MIX = 6;
/**
 * Strongest tint of a "scale" grid, per tone. Capped so `--text-title` keeps 4.5:1 on the strongest cell in both
 * themes (light: dark text on a mid tint; dark: light text on a mid tint). White / `--text-inverse` never reaches
 * 4.5:1 across the range, so strong cells use `--text-title`. Warning is capped lower because amber gets bright
 * quickly on the dark surface.
 */
const MAX_MIX: Record<HeatTone, number> = { accent: 72, danger: 72, warning: 58 };
/** From this tint on, cells of a "scale" grid switch from `--text-body` to the higher-contrast `--text-title`. */
const STRONG_AT = 40;
/** From this intensity (0 to 100) on, a signed cell switches to `--text-title` and a heavier weight, as in the reference mockups. */
const STRONG_INTENSITY = 55;
const LEVELS = 5;

interface EmptyCell {
  kind: "none";
  value: null;
}

interface FilledCell {
  kind: HeatCellKind;
  value: number;
  /** Size of the value against the largest, 0 to 100. */
  intensity: number;
  /** Intensity in five steps: 0 for none, 1 to 5. */
  level: number;
  strong: boolean;
  /** "scale" grids only: the share of the tone mixed into the surface, in percent. */
  mix: number;
}

type Computed = EmptyCell | FilledCell;

function compute(
  values: HeatGridProps["values"],
  rows: number,
  columns: number,
  kind: HeatKind,
  tone: HeatTone,
): { cells: Computed[][]; lo: number; hi: number } {
  const all: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const v = values[r]?.[c];
      if (finite(v)) all.push(v);
    }
  }
  const lo = Math.min(0, ...all);
  const hi = all.length ? Math.max(...all) : 0;
  const span = hi - lo;
  const largest = Math.max(0, ...all.map(Math.abs));
  const maxMix = MAX_MIX[tone] ?? MAX_MIX.accent;

  const cells = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: columns }, (__, c): Computed => {
      const v = values[r]?.[c];
      if (!finite(v)) return { kind: "none", value: null };
      if (kind === "scale") {
        const share = span > 0 ? (v - lo) / span : v !== 0 ? 0.5 : 0;
        const mix = Math.round(MIN_MIX + share * (maxMix - MIN_MIX));
        const intensity = Math.round(share * 100);
        return {
          value: v,
          kind: "scale",
          intensity,
          level: intensity === 0 ? 0 : clamp(Math.ceil(intensity / (100 / LEVELS)), 1, LEVELS),
          strong: mix >= STRONG_AT,
          mix,
        };
      }
      const intensity = largest ? Math.round((Math.abs(v) / largest) * 100) : 0;
      const cellKind: HeatCellKind =
        kind === "gap" ? "gap" : kind === "surplus" ? "surplus" : v < 0 ? "gap" : v > 0 ? "surplus" : "ok";
      return {
        value: v,
        kind: cellKind,
        intensity,
        level: intensity === 0 ? 0 : clamp(Math.ceil(intensity / (100 / LEVELS)), 1, LEVELS),
        strong: intensity >= STRONG_INTENSITY,
        mix: 0,
      };
    }),
  );
  return { cells, lo, hi };
}

/** The colour of a cell as a CSS value; the tooltip's swatch uses it too. Signed cells mirror the reference mockups: the tone mixed in at 0.7% per point of intensity. */
function swatch(cell: FilledCell, tone: HeatTone): string {
  if (cell.kind === "gap") return `color-mix(in srgb, var(--danger-solid) ${cell.intensity * 0.7}%, var(--bg-surface))`;
  if (cell.kind === "surplus") return `color-mix(in srgb, var(--info-solid) ${cell.intensity * 0.7}%, var(--bg-surface))`;
  if (cell.kind === "scale") return `color-mix(in srgb, var(--${tone}-solid) ${cell.mix}%, var(--bg-surface))`;
  return "var(--bg-subtle)";
}

interface Hover {
  r: number;
  c: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The cell an event came from, as row and column indexes. */
function cellOf(target: EventTarget): { element: HTMLElement; r: number; c: number } | null {
  if (!(target instanceof Element)) return null;
  const element = target.closest<HTMLElement>("[data-row][data-col]");
  if (!element) return null;
  const r = Number(element.dataset.row);
  const c = Number(element.dataset.col);
  return Number.isInteger(r) && Number.isInteger(c) ? { element, r, c } : null;
}

/**
 * Rows by columns of coloured cells, for a value per zone and time slot and the like.
 *
 * Direction: the columns (usually time) always run left to right and the sideways scroll starts at the left, in
 * every language. The row names sit outside the scrolling box, at the inline start of the page (the right in
 * Arabic), so they stay in view while the columns scroll. The tooltip is placed from the left edge of the grid.
 *
 * Keyboard: the grid is one tab stop. Arrow keys move between cells in the direction they point on screen (the
 * columns never flip, so the Right arrow always goes to the next column), Home and End go to the first and last
 * column, Ctrl+Home and Ctrl+End to the first and last cell. Enter and Space select a cell when `onCellSelect` is set.
 *
 * Assistive technology: a grid of rows (named after the row) and cells (each named "row, column: value"). The
 * visible row names are hidden from it because every cell already carries its row.
 */
export function HeatGrid({
  rows,
  columns,
  values,
  format: formatProp,
  kind = "scale",
  tone = "accent",
  minColWidth = 44,
  compact = false,
  label,
  onCellSelect,
}: HeatGridProps) {
  const t = useLabels();
  const f = useFormat();
  const format = formatProp ?? f.num;
  const { ref: rootRef, dir } = useChartDir();
  const gridRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [focused, setFocused] = useState({ r: 0, c: 0 });

  const { cells, lo, hi } = useMemo(
    () => compute(values, rows.length, columns.length, kind, tone),
    [values, rows.length, columns.length, kind, tone],
  );

  const focusR = clamp(focused.r, 0, Math.max(0, rows.length - 1));
  const focusC = clamp(focused.c, 0, Math.max(0, columns.length - 1));
  const interactive = onCellSelect !== undefined;

  // The cells are rebuilt only when what they show changes, not on every hover: a day of quarter hours is ~2,000 cells.
  const body = useMemo(() => {
    const kindWord = (cellKind: HeatCellKind): string =>
      cellKind === "gap" ? t("heatGrid.kindGap") : cellKind === "surplus" ? t("heatGrid.kindSurplus") : t("heatGrid.kindOk");
    return rows.map((row, r) => (
        <div key={`${row}-${r}`} role="row" aria-rowindex={r + 2} aria-label={row} className={styles.row}>
          {columns.map((column, c) => {
            const cell = cells[r]?.[c];
            const common = {
              role: "gridcell",
              "aria-colindex": c + 1,
              "data-row": r,
              "data-col": c,
              tabIndex: r === focusR && c === focusC ? 0 : -1,
            } as const;
            if (!cell || cell.kind === "none") {
              return (
                <div
                  key={c}
                  {...common}
                  data-kind="none"
                  aria-disabled={interactive ? true : undefined}
                  className={cn(styles.cell, styles.ok, styles.missing)}
                  aria-label={t("heatGrid.cellNoValue", { row, column })}
                >
                  {compact ? null : NO_VALUE}
                </div>
              );
            }
            const text = format(cell.value);
            const name =
              cell.kind === "scale"
                ? t("heatGrid.cell", { row, column, value: text })
                : t("heatGrid.cellKind", { row, column, value: text, kind: kindWord(cell.kind) });
            const style: CustomStyle =
              cell.kind === "scale"
                ? {
                    background: swatch(cell, tone),
                    color: cell.strong ? "var(--text-title)" : "var(--text-body)",
                  }
                : { "--i": cell.intensity };
            return (
              <div
                key={c}
                {...common}
                data-kind={cell.kind}
                data-level={cell.level}
                className={cn(
                  styles.cell,
                  cell.kind === "gap" && styles.gap,
                  cell.kind === "surplus" && styles.surplus,
                  cell.kind === "ok" && styles.ok,
                  cell.strong && cell.kind !== "scale" && styles.strong,
                  interactive && styles.interactive,
                )}
                style={style}
                aria-label={name}
              >
                {compact ? null : text}
              </div>
            );
          })}
        </div>
    ));
  }, [rows, columns, cells, focusR, focusC, interactive, compact, format, t, tone]);

  if (rows.length === 0 || columns.length === 0) {
    return (
      <div ref={rootRef} className={styles.empty}>
        {t("chart.noData")}
      </div>
    );
  }

  const showTip = (target: HTMLElement, r: number, c: number) => {
    const root = rootRef.current;
    if (!root || cells[r]?.[c]?.kind === "none") return;
    // Measured against the (non-scrolling) root so the sideways scroll of the grid is accounted for.
    const rootRect = root.getBoundingClientRect();
    const cellRect = target.getBoundingClientRect();
    setHover({
      r,
      c,
      x: cellRect.left - rootRect.left + cellRect.width / 2,
      y: cellRect.top - rootRect.top,
      w: rootRect.width,
      h: rootRect.height,
    });
  };

  const select = (r: number, c: number) => {
    const cell = cells[r]?.[c];
    if (!onCellSelect || !cell || cell.kind === "none") return;
    onCellSelect({ row: r, column: c, value: cell.value, kind: cell.kind });
  };

  const onPointerOver = (e: PointerEvent<HTMLDivElement>) => {
    const hit = cellOf(e.target);
    if (!hit) return;
    if (hover && hover.r === hit.r && hover.c === hit.c) return;
    showTip(hit.element, hit.r, hit.c);
  };

  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const hit = cellOf(e.target);
    if (!hit) return;
    setFocused({ r: hit.r, c: hit.c });
    showTip(hit.element, hit.r, hit.c);
  };

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const hit = cellOf(e.target);
    if (hit) select(hit.r, hit.c);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const hit = cellOf(e.target);
    if (!hit) return;
    const lastR = rows.length - 1;
    const lastC = columns.length - 1;
    let { r, c } = hit;
    switch (e.key) {
      // The columns never flip, so Right is always the next column and Left the previous one.
      case "ArrowRight":
        c = Math.min(lastC, c + 1);
        break;
      case "ArrowLeft":
        c = Math.max(0, c - 1);
        break;
      case "ArrowDown":
        r = Math.min(lastR, r + 1);
        break;
      case "ArrowUp":
        r = Math.max(0, r - 1);
        break;
      case "Home":
        c = 0;
        if (e.ctrlKey) r = 0;
        break;
      case "End":
        c = lastC;
        if (e.ctrlKey) r = lastR;
        break;
      case "Enter":
      case " ":
        if (interactive) {
          e.preventDefault();
          select(r, c);
        }
        return;
      default:
        return;
    }
    e.preventDefault();
    gridRef.current?.querySelector<HTMLElement>(`[data-row="${r}"][data-col="${c}"]`)?.focus();
  };

  const hoverCell = hover ? cells[hover.r]?.[hover.c] : undefined;
  const summary = t("heatGrid.summary", { rows: rows.length, columns: columns.length, min: format(lo), max: format(hi) });
  const gridStyle: CustomStyle = { "--heat-cols": columns.length, "--heat-min": `${minColWidth}px` };

  return (
    <div ref={rootRef} className={cn(styles.root, compact && styles.compact)} style={gridStyle}>
      <div className={styles.rows} aria-hidden="true">
        {rows.map((row, r) => (
          <div key={`${row}-${r}`} className={styles.rowHead} title={row}>
            {row}
          </div>
        ))}
      </div>
      <div className={styles.scroll} dir="ltr" onScroll={() => setHover(null)}>
        <div
          ref={gridRef}
          role="grid"
          aria-label={label ? t("chart.titled", { title: label, summary }) : summary}
          aria-rowcount={rows.length + 1}
          aria-colcount={columns.length}
          className={styles.grid}
          onPointerOver={onPointerOver}
          onPointerLeave={() => setHover(null)}
          onFocus={onFocus}
          onBlur={() => setHover(null)}
          onClick={onClick}
          onKeyDown={onKeyDown}
        >
          <div role="row" aria-rowindex={1} className={cn(styles.row, styles.headRow)}>
            {columns.map((column, c) => (
              <div key={`${column}-${c}`} role="columnheader" aria-colindex={c + 1} className={styles.colHead} title={column}>
                {column}
              </div>
            ))}
          </div>
          {body}
        </div>
      </div>
      {hover && hoverCell && hoverCell.kind !== "none" ? (
        <ChartTooltip x={hover.x} y={hover.y} containerWidth={hover.w} containerHeight={hover.h} dir={dir}>
          <TooltipTitle>{rows[hover.r]}</TooltipTitle>
          <TooltipRow color={swatch(hoverCell, tone)} label={columns[hover.c]} value={format(hoverCell.value)} />
        </ChartTooltip>
      ) : null}
    </div>
  );
}
