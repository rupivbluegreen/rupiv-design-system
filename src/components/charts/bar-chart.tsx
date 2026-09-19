"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ChartLegend } from "./chart-legend";
import { ChartTooltip, TooltipRow, TooltipTitle } from "./chart-tooltip";
import {
  barPath,
  finite,
  formatCompact,
  labelEvery,
  niceScale,
  round,
  seriesColor,
  textWidth,
  truncateLabel,
  widestLabel,
  type RoundedSide,
} from "./scale";
import { useMeasure } from "./use-measure";
import styles from "./chart.module.css";

export interface BarChartProps {
  data: { label: string; values: number[] }[];
  series: { name: string; color?: string }[];
  height?: number;
  format?: (n: number) => string;
  stacked?: boolean;
  horizontal?: boolean;
}

const RADIUS = 3;
/** Vertical bars: category labels are only skipped when bands are narrower than this. */
const MIN_LABEL_BAND = 28;
/** Approximate glyph width of an 11px axis label, used to fit labels to their band. */
const LABEL_CHAR_WIDTH = 6.2;

function fitLabel(text: string, maxWidth: number): string {
  const maxChars = Math.max(1, Math.floor(maxWidth / LABEL_CHAR_WIDTH));
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars - 1))}…`;
}

interface BarShape {
  key: string;
  d: string;
}

export function BarChart({
  data,
  series,
  height = 240,
  format = formatCompact,
  stacked = false,
  horizontal = false,
}: BarChartProps) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const colors = series.map((s, i) => seriesColor(i, s.color));
  const legend =
    series.length > 1 ? <ChartLegend items={series.map((s, i) => ({ label: s.name, color: colors[i] }))} /> : null;

  if (data.length === 0 || series.length === 0) {
    return (
      <div className={styles.root}>
        {legend}
        <div className={styles.empty} style={{ height }}>
          No data
        </div>
      </div>
    );
  }

  const S = series.length;
  const n = data.length;
  const value = (row: number, s: number) => {
    const v = data[row].values[s];
    return finite(v) ? v : 0;
  };

  // Domain (always includes 0)
  let lo = 0;
  let hi = 0;
  for (let r = 0; r < n; r++) {
    if (stacked) {
      let pos = 0;
      let neg = 0;
      for (let s = 0; s < S; s++) {
        const v = value(r, s);
        if (v > 0) pos += v;
        else neg += v;
      }
      hi = Math.max(hi, pos);
      lo = Math.min(lo, neg);
    } else {
      for (let s = 0; s < S; s++) {
        hi = Math.max(hi, value(r, s));
        lo = Math.min(lo, value(r, s));
      }
    }
  }
  const scale = niceScale(lo, hi);
  const span = scale.max - scale.min || 1;
  const tickLabels = scale.ticks.map(format);

  const bars: BarShape[][] = series.map(() => []);
  const gridLines: ReactNode[] = [];
  const axisLabels: ReactNode[] = [];
  const hitAreas: ReactNode[] = [];
  let highlight: ReactNode = null;
  let anchor = { x: 0, y: 0 };

  /** Lay out one category's bars along the value axis. `toPx` maps value → px on that axis. */
  const layoutCategory = (
    r: number,
    bandStart: number,
    bandSize: number,
    toPx: (v: number) => number,
    place: (s: number, offset: number, thickness: number, from: number, to: number, side: RoundedSide) => void,
  ) => {
    const slots = stacked ? 1 : S;
    const gap = slots > 1 ? 2 : 0;
    const groupSize = Math.min(bandSize * 0.72, slots * 40 + gap * (slots - 1));
    const thickness = Math.max(1, (groupSize - gap * (slots - 1)) / slots);
    const groupStart = bandStart + (bandSize - groupSize) / 2;
    const zero = toPx(0);

    if (stacked) {
      let lastPos = -1;
      let lastNeg = -1;
      for (let s = 0; s < S; s++) {
        if (value(r, s) > 0) lastPos = s;
        if (value(r, s) < 0) lastNeg = s;
      }
      let pos = 0;
      let neg = 0;
      for (let s = 0; s < S; s++) {
        const v = value(r, s);
        if (v === 0) continue;
        const base = v > 0 ? pos : neg;
        const next = base + v;
        if (v > 0) pos = next;
        else neg = next;
        const outer = v > 0 ? s === lastPos : s === lastNeg;
        const side: RoundedSide = !outer ? "none" : horizontal ? (v > 0 ? "right" : "left") : v > 0 ? "top" : "bottom";
        place(s, groupStart, thickness, toPx(base), toPx(next), side);
      }
    } else {
      for (let s = 0; s < S; s++) {
        const v = value(r, s);
        if (v === 0) continue;
        const side: RoundedSide = horizontal ? (v > 0 ? "right" : "left") : v > 0 ? "top" : "bottom";
        place(s, groupStart + s * (thickness + gap), thickness, zero, toPx(v), side);
      }
    }
  };

  if (!horizontal) {
    const top = 10;
    const bottom = 26;
    const right = 8;
    const left = Math.ceil(widestLabel(tickLabels)) + 10;
    const plotW = Math.max(1, width - left - right);
    const plotH = Math.max(1, height - top - bottom);
    const y = (v: number) => top + ((scale.max - v) / span) * plotH;
    const band = plotW / n;

    scale.ticks.forEach((t, i) => {
      const ty = round(y(t));
      gridLines.push(
        <line
          key={`g${i}`}
          x1={left}
          x2={left + plotW}
          y1={ty}
          y2={ty}
          fill="none"
          stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
          strokeWidth={1}
          shapeRendering="crispEdges"
        />,
      );
      axisLabels.push(
        <text key={`t${i}`} className={styles.axisLabel} x={left - 8} y={ty} textAnchor="end" dominantBaseline="middle">
          {tickLabels[i]}
        </text>,
      );
    });

    // Fit every label to its band (ellipsis) first; only skip labels when bands get very narrow.
    const every = band >= MIN_LABEL_BAND ? 1 : Math.ceil(MIN_LABEL_BAND / band);
    data.forEach((d, r) => {
      const bandStart = left + r * band;
      if (r % every === 0) {
        axisLabels.push(
          <text key={`x${r}`} className={styles.axisLabel} x={round(bandStart + band / 2)} y={height - 8} textAnchor="middle">
            <title>{d.label}</title>
            {fitLabel(d.label, Math.min(band * every, 120) - 6)}
          </text>,
        );
      }
      let minY = y(0);
      layoutCategory(r, bandStart, band, y, (s, offset, thickness, from, to, side) => {
        const y0 = Math.min(from, to);
        const h = Math.max(1, Math.abs(to - from));
        minY = Math.min(minY, y0);
        bars[s].push({ key: `${r}`, d: barPath(offset, y0, thickness, h, RADIUS, side) });
      });
      hitAreas.push(
        <rect
          key={`h${r}`}
          x={round(bandStart)}
          y={top}
          width={round(band)}
          height={plotH}
          fill="transparent"
          stroke="none"
          onPointerEnter={() => setActive(r)}
        />,
      );
      if (active === r) {
        highlight = (
          <rect x={round(bandStart)} y={top} width={round(band)} height={plotH} fill="var(--bg-hover)" stroke="none" />
        );
        anchor = { x: bandStart + band / 2, y: minY };
      }
    });
  } else {
    const top = 4;
    const bottom = 22;
    const catLabelW = Math.min(widestLabel(data.map((d) => d.label)), width * 0.35);
    const left = Math.ceil(Math.max(catLabelW + 12, textWidth(tickLabels[0]) / 2 + 2));
    const right = Math.ceil(Math.max(8, textWidth(tickLabels[tickLabels.length - 1]) / 2 + 2));
    const plotW = Math.max(1, width - left - right);
    const plotH = Math.max(1, height - top - bottom);
    const x = (v: number) => left + ((v - scale.min) / span) * plotW;
    const band = plotH / n;

    const tickEvery = labelEvery(plotW / Math.max(1, scale.ticks.length - 1), widestLabel(tickLabels), 12);
    scale.ticks.forEach((t, i) => {
      const tx = round(x(t));
      gridLines.push(
        <line
          key={`g${i}`}
          x1={tx}
          x2={tx}
          y1={top}
          y2={top + plotH}
          fill="none"
          stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
          strokeWidth={1}
          shapeRendering="crispEdges"
        />,
      );
      if (i % tickEvery === 0) {
        axisLabels.push(
          <text key={`t${i}`} className={styles.axisLabel} x={tx} y={height - 6} textAnchor="middle">
            {tickLabels[i]}
          </text>,
        );
      }
    });

    const every = labelEvery(band, 12, 2);
    data.forEach((d, r) => {
      const bandStart = top + r * band;
      if (r % every === 0) {
        axisLabels.push(
          <text
            key={`y${r}`}
            className={styles.axisLabel}
            x={left - 10}
            y={round(bandStart + band / 2)}
            textAnchor="end"
            dominantBaseline="middle"
          >
            <title>{d.label}</title>
            {truncateLabel(d.label, catLabelW)}
          </text>,
        );
      }
      let maxX = x(0);
      layoutCategory(r, bandStart, band, x, (s, offset, thickness, from, to, side) => {
        const x0 = Math.min(from, to);
        const w = Math.max(1, Math.abs(to - from));
        maxX = Math.max(maxX, x0 + w);
        bars[s].push({ key: `${r}`, d: barPath(x0, offset, w, thickness, RADIUS, side) });
      });
      hitAreas.push(
        <rect
          key={`h${r}`}
          x={left}
          y={round(bandStart)}
          width={plotW}
          height={round(band)}
          fill="transparent"
          stroke="none"
          onPointerEnter={() => setActive(r)}
        />,
      );
      if (active === r) {
        highlight = (
          <rect x={left} y={round(bandStart)} width={plotW} height={round(band)} fill="var(--bg-hover)" stroke="none" />
        );
        anchor = { x: maxX, y: bandStart + band / 2 };
      }
    });
  }

  const svgLabel = `${stacked ? "Stacked" : "Grouped"} ${horizontal ? "horizontal " : ""}bar chart of ${n} categories${
    S > 1 ? ` and ${S} series (${series.map((s) => s.name).join(", ")})` : ` for ${series[0].name}`
  }, values from ${format(lo)} to ${format(hi)}.`;

  const activeIndex = active !== null && active < n ? active : null;
  const activeRow = activeIndex !== null ? data[activeIndex] : null;

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
          aria-label={svgLabel}
          onPointerLeave={() => setActive(null)}
        >
          {highlight}
          {gridLines}
          {bars.map((shapes, s) => (
            <g key={s} className={cn(styles.bar)}>
              {shapes.map((b) =>
                b.d ? (
                  <path
                    key={b.key}
                    d={b.d}
                    fill={colors[s]}
                    stroke="none"
                    className={cn(active !== null && b.key !== String(active) && styles.dim)}
                  />
                ) : null,
              )}
            </g>
          ))}
          {axisLabels}
          {hitAreas}
        </svg>
        {activeRow && activeIndex !== null ? (
          <ChartTooltip x={anchor.x} y={anchor.y} containerWidth={width} containerHeight={height}>
            <TooltipTitle>{activeRow.label}</TooltipTitle>
            {series.map((s, i) => (
              <TooltipRow key={`${s.name}-${i}`} color={colors[i]} label={s.name} value={format(value(activeIndex, i))} />
            ))}
            {stacked && S > 1 ? (
              <TooltipRow
                label="Total"
                value={format(series.reduce((sum, _s, i) => sum + value(activeIndex, i), 0))}
              />
            ) : null}
          </ChartTooltip>
        ) : null}
      </div>
    </div>
  );
}
