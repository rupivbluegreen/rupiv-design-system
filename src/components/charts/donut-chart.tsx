"use client";

import { useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { ChartLegend } from "./chart-legend";
import { ChartTooltip, TooltipRow, TooltipTitle } from "./chart-tooltip";
import { finite, formatCompact, round, seriesColor } from "./scale";
import styles from "./donut-chart.module.css";

export interface DonutChartProps {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: ReactNode;
  centerValue?: ReactNode;
  format?: (n: number) => string;
  showLegend?: boolean;
}

const GROW = 3;
const GAP_PX = 2;

function pt(cx: number, cy: number, r: number, a: number): string {
  return `${round(cx + r * Math.cos(a))} ${round(cy + r * Math.sin(a))}`;
}

function arcPath(cx: number, cy: number, outer: number, inner: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return (
    `M${pt(cx, cy, outer, a0)}A${round(outer)} ${round(outer)} 0 ${large} 1 ${pt(cx, cy, outer, a1)}` +
    `L${pt(cx, cy, inner, a1)}A${round(inner)} ${round(inner)} 0 ${large} 0 ${pt(cx, cy, inner, a0)}Z`
  );
}

function ringPath(cx: number, cy: number, outer: number, inner: number): string {
  const o = round(outer);
  const i = round(inner);
  return (
    `M${round(cx + o)} ${cy}A${o} ${o} 0 1 1 ${round(cx - o)} ${cy}A${o} ${o} 0 1 1 ${round(cx + o)} ${cy}Z` +
    `M${round(cx + i)} ${cy}A${i} ${i} 0 1 0 ${round(cx - i)} ${cy}A${i} ${i} 0 1 0 ${round(cx + i)} ${cy}Z`
  );
}

export function DonutChart({
  data,
  size = 160,
  thickness = 18,
  centerLabel,
  centerValue,
  format = formatCompact,
  showLegend = false,
}: DonutChartProps) {
  const [active, setActive] = useState<number | null>(null);

  const c = size / 2;
  const outer = Math.max(2, c - GROW);
  const inner = Math.max(1, outer - Math.min(thickness, outer - 1));
  const colors = data.map((d, i) => seriesColor(i, d.color));
  const values = data.map((d) => (finite(d.value) && d.value > 0 ? d.value : 0));
  const total = values.reduce((a, b) => a + b, 0);
  const nonZero = values.filter((v) => v > 0).length;
  const gap = nonZero > 1 ? GAP_PX / ((outer + inner) / 2) : 0;

  const segments: { i: number; d: string; mid: number }[] = [];
  if (total > 0) {
    let start = -Math.PI / 2;
    values.forEach((v, i) => {
      if (v <= 0) return;
      const sweep = (v / total) * Math.PI * 2;
      const isActive = active === i;
      const o = isActive ? outer + GROW : outer;
      if (nonZero === 1) {
        segments.push({ i, d: ringPath(c, c, o, inner), mid: -Math.PI / 2 });
      } else {
        const a0 = start + gap / 2;
        const a1 = Math.max(a0 + 0.002, start + sweep - gap / 2);
        segments.push({ i, d: arcPath(c, c, o, inner, a0, a1), mid: start + sweep / 2 });
      }
      start += sweep;
    });
  }

  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);
  const activeSeg = active !== null ? segments.find((s) => s.i === active) : undefined;
  const mid = (outer + inner) / 2;
  const anchor = activeSeg
    ? { x: c + mid * Math.cos(activeSeg.mid), y: c + mid * Math.sin(activeSeg.mid) }
    : { x: c, y: c };

  const summary =
    total > 0
      ? `Donut chart, total ${format(total)}: ${data
          .map((d, i) => `${d.label} ${format(values[i] ?? 0)} (${pct(values[i] ?? 0)}%)`)
          .join(", ")}.`
      : "Donut chart, no data.";

  return (
    <div className={styles.root}>
      <div className={styles.chart} style={{ width: size, height: size }}>
        <svg
          className={styles.svg}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={summary}
          onPointerLeave={() => setActive(null)}
        >
          {total > 0 ? (
            segments.map((s) => (
              <path
                key={s.i}
                d={s.d}
                fill={colors[s.i]}
                fillRule="evenodd"
                stroke="none"
                className={cn(styles.segment, active !== null && active !== s.i && styles.dim)}
                onPointerEnter={() => setActive(s.i)}
              />
            ))
          ) : (
            <path d={ringPath(c, c, outer, inner)} fill="var(--chart-grid)" fillRule="evenodd" stroke="none" />
          )}
        </svg>
        {centerLabel !== undefined || centerValue !== undefined ? (
          <div className={styles.center} style={{ padding: inner < outer ? outer - inner + 6 : 6 }}>
            {centerValue !== undefined ? <div className={styles.centerValue}>{centerValue}</div> : null}
            {centerLabel !== undefined ? <div className={styles.centerLabel}>{centerLabel}</div> : null}
          </div>
        ) : null}
        {activeSeg && active !== null ? (
          <ChartTooltip x={anchor.x} y={anchor.y} containerWidth={size} containerHeight={size}>
            <TooltipTitle>{data[active]?.label}</TooltipTitle>
            <TooltipRow color={colors[active]} label={`${pct(values[active] ?? 0)}%`} value={format(data[active]?.value ?? 0)} />
          </ChartTooltip>
        ) : null}
      </div>
      {showLegend && data.length > 0 ? (
        <div className={styles.legend}>
          <ChartLegend items={data.map((d, i) => ({ label: d.label, color: seriesColor(i, d.color), value: format(d.value) }))} />
        </div>
      ) : null}
    </div>
  );
}
