"use client";

import { useId, useState, type PointerEvent } from "react";
import { ChartLegend } from "./chart-legend";
import { ChartTooltip, TooltipRow, TooltipTitle } from "./chart-tooltip";
import {
  clamp,
  finite,
  formatCompact,
  labelEvery,
  niceScale,
  round,
  sanitizeId,
  seriesColor,
  textWidth,
  truncateLabel,
  widestLabel,
} from "./scale";
import { useMeasure } from "./use-measure";
import styles from "./chart.module.css";

export interface LineChartProps {
  labels: string[];
  series: { name: string; data: number[]; color?: string; area?: boolean; dashed?: boolean }[];
  height?: number;
  format?: (n: number) => string;
}

type Point = readonly [number, number];

export function LineChart({ labels, series, height = 240, format = formatCompact }: LineChartProps) {
  const uid = sanitizeId(useId());
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const colors = series.map((s, i) => seriesColor(i, s.color));
  const legend =
    series.length > 1 ? <ChartLegend items={series.map((s, i) => ({ label: s.name, color: seriesColor(i, s.color) }))} /> : null;

  const n = labels.length > 0 ? labels.length : series.reduce((m, s) => Math.max(m, s.data.length), 0);
  const allValues = series.flatMap((s) => s.data.slice(0, n).filter(finite));

  if (n === 0 || series.length === 0 || allValues.length === 0) {
    return (
      <div className={styles.root}>
        {legend}
        <div className={styles.empty} style={{ height }}>
          No data
        </div>
      </div>
    );
  }

  const labelAt = (i: number) => labels[i] ?? String(i + 1);
  const lo = Math.min(0, ...allValues);
  const hi = Math.max(0, ...allValues);
  const scale = niceScale(lo, hi);
  const span = scale.max - scale.min || 1;
  const tickLabels = scale.ticks.map(format);

  const top = 12;
  const bottom = 26;
  const firstHalf = Math.min(textWidth(labelAt(0)), 100) / 2;
  const lastHalf = Math.min(textWidth(labelAt(n - 1)), 100) / 2;
  const left = Math.ceil(Math.max(widestLabel(tickLabels) + 10, firstHalf + 2));
  const right = Math.ceil(Math.max(12, lastHalf + 2));
  const plotW = Math.max(1, width - left - right);
  const plotH = Math.max(1, height - top - bottom);
  const step = n > 1 ? plotW / (n - 1) : plotW;
  const x = (i: number) => (n === 1 ? left + plotW / 2 : left + i * step);
  const y = (v: number) => top + ((scale.max - v) / span) * plotH;
  const baseline = round(y(clamp(0, scale.min, scale.max)));

  const every = labelEvery(step, Math.min(widestLabel(labels), 100), 12);

  const drawn = series.map((s, si) => {
    const segments: Point[][] = [];
    let current: Point[] = [];
    let last: Point | null = null;
    for (let i = 0; i < n; i++) {
      const v = s.data[i];
      if (finite(v)) {
        const p: Point = [round(x(i)), round(y(v))];
        current.push(p);
        last = p;
      } else if (current.length) {
        segments.push(current);
        current = [];
      }
    }
    if (current.length) segments.push(current);
    const line = segments.map((seg) => seg.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px} ${py}`).join("")).join("");
    const area = s.area
      ? segments
          .filter((seg) => seg.length > 1)
          .map((seg) => {
            const first = seg[0];
            const last = seg[seg.length - 1];
            if (!first || !last) return ""; // never: segments of fewer than two points are filtered out above
            return (
              `M${first[0]} ${baseline}` + seg.map(([px, py]) => `L${px} ${py}`).join("") + `L${last[0]} ${baseline}Z`
            );
          })
          .join("")
      : "";
    return { line, area, last, color: colors[si], gradientId: `${uid}-area-${si}` };
  });

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - left;
    const i = n === 1 ? 0 : clamp(Math.round(px / step), 0, n - 1);
    if (i !== active) setActive(i);
  };

  const activeIndex = active !== null && active < n ? active : null;
  const activePoints =
    activeIndex === null
      ? []
      : series.map((s, si) => {
          const v = s.data[activeIndex];
          return finite(v) ? { si, v, cx: round(x(activeIndex)), cy: round(y(v)) } : null;
        });
  const anchorY = activePoints.reduce((m, p) => (p ? Math.min(m, p.cy) : m), top + plotH / 2);

  const summary = `Line chart of ${series.map((s) => s.name).join(", ")} across ${n} points from ${labelAt(0)} to ${labelAt(
    n - 1,
  )}, values from ${format(Math.min(...allValues))} to ${format(Math.max(...allValues))}.`;

  return (
    <div className={styles.root}>
      {legend}
      <div ref={ref} className={styles.plot} style={{ height }}>
        <svg
          className={styles.svg}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={summary}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
        >
          <defs>
            {drawn.map((d, si) =>
              series[si]?.area ? (
                <linearGradient key={d.gradientId} id={d.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: d.color, stopOpacity: 0.22 }} />
                  <stop offset="100%" style={{ stopColor: d.color, stopOpacity: 0 }} />
                </linearGradient>
              ) : null,
            )}
          </defs>

          {scale.ticks.map((t, i) => {
            const ty = round(y(t));
            return (
              <g key={`tick-${i}`}>
                <line
                  x1={left}
                  x2={left + plotW}
                  y1={ty}
                  y2={ty}
                  fill="none"
                  stroke={t === 0 && scale.min < 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text className={styles.axisLabel} x={left - 8} y={ty} textAnchor="end" dominantBaseline="middle">
                  {tickLabels[i]}
                </text>
              </g>
            );
          })}

          {Array.from({ length: n }, (_, i) =>
            i % every === 0 ? (
              <text key={`x-${i}`} className={styles.axisLabel} x={round(x(i))} y={height - 8} textAnchor="middle">
                <title>{labelAt(i)}</title>
                {truncateLabel(labelAt(i), step * every - 8)}
              </text>
            ) : null,
          )}

          {drawn.map((d, si) =>
            d.area ? <path key={`area-${si}`} d={d.area} fill={`url(#${d.gradientId})`} stroke="none" /> : null,
          )}

          {drawn.map((d, si) => (
            <path
              key={`line-${si}`}
              d={d.line}
              fill="none"
              stroke={d.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={series[si]?.dashed ? "5 4" : undefined}
            />
          ))}

          {activeIndex === null
            ? drawn.map((d, si) =>
                d.last ? (
                  <circle
                    key={`end-${si}`}
                    cx={d.last[0]}
                    cy={d.last[1]}
                    r={3.5}
                    fill={d.color}
                    stroke="var(--bg-surface)"
                    strokeWidth={2}
                  />
                ) : null,
              )
            : null}

          {activeIndex !== null ? (
            <g>
              <line
                x1={round(x(activeIndex))}
                x2={round(x(activeIndex))}
                y1={top}
                y2={top + plotH}
                fill="none"
                stroke="var(--chart-axis)"
                strokeWidth={1}
                strokeDasharray="3 3"
                shapeRendering="crispEdges"
              />
              {activePoints.map((p) =>
                p ? (
                  <circle
                    key={`pt-${p.si}`}
                    cx={p.cx}
                    cy={p.cy}
                    r={4}
                    fill={colors[p.si]}
                    stroke="var(--bg-surface)"
                    strokeWidth={2}
                  />
                ) : null,
              )}
            </g>
          ) : null}
        </svg>

        {activeIndex !== null ? (
          <ChartTooltip x={x(activeIndex)} y={anchorY} containerWidth={width} containerHeight={height}>
            <TooltipTitle>{labelAt(activeIndex)}</TooltipTitle>
            {series.map((s, si) => {
              const v = s.data[activeIndex];
              return (
                <TooltipRow key={`${s.name}-${si}`} color={colors[si]} label={s.name} value={finite(v) ? format(v) : "—"} />
              );
            })}
          </ChartTooltip>
        ) : null}
      </div>
    </div>
  );
}
