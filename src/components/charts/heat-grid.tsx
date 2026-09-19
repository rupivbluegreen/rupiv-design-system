"use client";

import { useRef, useState, type PointerEvent } from "react";
import { ChartTooltip, TooltipRow, TooltipTitle } from "./chart-tooltip";
import { finite, formatCompact } from "./scale";
import styles from "./heat-grid.module.css";

export interface HeatGridProps {
  rows: string[];
  columns: string[];
  values: number[][];
  format?: (n: number) => string;
  tone?: "accent" | "warning" | "danger";
}

type HeatTone = NonNullable<HeatGridProps["tone"]>;

const MIN_MIX = 6;
/**
 * Strongest tint per tone. Capped so `--text-title` keeps ≥ 4.5:1 on the strongest cell in
 * both themes (light: dark text on a mid tint; dark: light text on a mid tint). White /
 * `--text-inverse` never reaches 4.5:1 across the range, so strong cells use `--text-title`.
 * Warning is capped lower because amber gets bright quickly on the dark surface.
 */
const MAX_MIX: Record<HeatTone, number> = { accent: 72, danger: 72, warning: 58 };
/** From this tint on, cells switch from `--text-body` to the higher-contrast `--text-title`. */
const STRONG_AT = 40;

interface Hover {
  r: number;
  c: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function HeatGrid({ rows, columns, values, format = formatCompact, tone = "accent" }: HeatGridProps) {
  const [hover, setHover] = useState<Hover | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  if (rows.length === 0 || columns.length === 0) {
    return <div className={styles.empty}>No data</div>;
  }

  const all = rows.flatMap((_, r) => columns.map((__, c) => values[r]?.[c]).filter(finite));
  const lo = Math.min(0, ...all);
  const hi = all.length ? Math.max(...all) : 0;
  const span = hi - lo;
  const maxMix = MAX_MIX[tone] ?? MAX_MIX.accent;

  const mixFor = (v: number) => {
    const t = span > 0 ? (v - lo) / span : v !== 0 ? 0.5 : 0;
    return Math.round(MIN_MIX + t * (maxMix - MIN_MIX));
  };

  const onEnter = (r: number, c: number) => (e: PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;
    // Measure against the (non-scrolling) wrapper so horizontal scroll of the grid is accounted for.
    const rootRect = root.getBoundingClientRect();
    const cellRect = e.currentTarget.getBoundingClientRect();
    setHover({
      r,
      c,
      x: cellRect.left - rootRect.left + cellRect.width / 2,
      y: cellRect.top - rootRect.top,
      w: rootRect.width,
      h: rootRect.height,
    });
  };

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.scroll} onScroll={() => setHover(null)}>
        <div
          role="table"
          aria-label={`Heat grid of ${rows.length} rows by ${columns.length} columns, values ${format(lo)} to ${format(hi)}`}
          className={styles.grid}
          style={{ gridTemplateColumns: `max-content repeat(${columns.length}, minmax(44px, 1fr))` }}
          onPointerLeave={() => setHover(null)}
        >
          <div role="row" className={styles.row}>
            <div role="columnheader" className={styles.corner} />
            {columns.map((col, c) => (
              <div key={`${col}-${c}`} role="columnheader" className={styles.colHeader} title={col}>
                {col}
              </div>
            ))}
          </div>
          {rows.map((row, r) => (
            <div key={`${row}-${r}`} role="row" className={styles.row}>
              <div role="rowheader" className={styles.rowHeader} title={row}>
                {row}
              </div>
              {columns.map((col, c) => {
                const v = values[r]?.[c];
                if (!finite(v)) {
                  return (
                    <div key={c} role="cell" className={`${styles.cell} ${styles.missing}`} aria-label={`${row}, ${col}: no value`}>
                      —
                    </div>
                  );
                }
                const mix = mixFor(v);
                const strong = mix >= STRONG_AT;
                return (
                  <div
                    key={c}
                    role="cell"
                    className={styles.cell}
                    aria-label={`${row}, ${col}: ${format(v)}`}
                    onPointerEnter={onEnter(r, c)}
                    style={{
                      background: `color-mix(in srgb, var(--${tone}-solid) ${mix}%, var(--bg-surface))`,
                      color: strong ? "var(--text-title)" : "var(--text-body)",
                    }}
                  >
                    {format(v)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {hover && finite(values[hover.r]?.[hover.c]) ? (
        <ChartTooltip x={hover.x} y={hover.y} containerWidth={hover.w} containerHeight={hover.h}>
          <TooltipTitle>{rows[hover.r]}</TooltipTitle>
          <TooltipRow
            color={`color-mix(in srgb, var(--${tone}-solid) ${mixFor(values[hover.r][hover.c])}%, var(--bg-surface))`}
            label={columns[hover.c]}
            value={format(values[hover.r][hover.c])}
          />
        </ChartTooltip>
      ) : null}
    </div>
  );
}
