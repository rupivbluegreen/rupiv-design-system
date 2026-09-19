"use client";

import { useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useLabels } from "../../provider";
import { ChartLegend } from "./chart-legend";
import { ChartTooltip, TooltipRow, TooltipTitle } from "./chart-tooltip";
import { barPath, finite, niceScale, round, seriesColor, type RoundedSide } from "./scale";
import { fitText, pickLabels, useTextMeasure, widestText, type TextMeasure } from "./text-measure";
import { useChartDir } from "./use-chart-dir";
import { useCompactFormat, useListJoin } from "./use-chart-text";
import { useMeasure } from "./use-measure";
import styles from "./chart.module.css";

export interface BarChartProps {
  data: { label: string; values: number[] }[];
  series: { name: string; color?: string }[];
  height?: number;
  format?: (n: number) => string;
  stacked?: boolean;
  horizontal?: boolean;
  /**
   * A horizontal chart in a right-to-left page puts the category names at the right and grows the bars from there
   * (the names follow the page, the way the reference mockups draw it). Set false to keep them at the left. Vertical
   * charts never mirror: their x axis is the category order, which reads left to right like time.
   */
  mirror?: boolean;
  /** Force the bottom or the top of the value axis. Default: the data, always including 0. */
  min?: number;
  max?: number;
  /** The chart's name for assistive technology; the generated summary follows it. */
  label?: string;
  /** Replaces the browser's text measurement (tests, or a screen that knows its fonts). */
  measureText?: TextMeasure;
}

const RADIUS = 3;
/** Vertical bars: category labels are only skipped when bands are narrower than this, px. */
const MIN_LABEL_BAND = 28;
/** Horizontal bars: category rows narrower than this only get every nth label, px. */
const MIN_ROW_BAND = 14;
/** Longest category label on a vertical chart, px. */
const MAX_CATEGORY_LABEL = 120;
/** Space kept between two value axis labels, px. */
const TICK_GAP = 12;

interface BarShape {
  key: string;
  d: string;
}

/** The corner to round on the other side of a bar in a mirrored chart. */
function mirrorSide(side: RoundedSide): RoundedSide {
  return side === "left" ? "right" : side === "right" ? "left" : side;
}

export function BarChart({
  data,
  series,
  height = 240,
  format: formatProp,
  stacked = false,
  horizontal = false,
  mirror = true,
  min,
  max,
  label,
  measureText,
}: BarChartProps) {
  const t = useLabels();
  const compact = useCompactFormat();
  const join = useListJoin();
  const format = formatProp ?? compact;
  const [ref, width] = useMeasure<HTMLDivElement>();
  const { ref: rootRef, dir } = useChartDir();
  const { measure, probes } = useTextMeasure(measureText);
  const [active, setActive] = useState<number | null>(null);

  const colors = series.map((s, i) => seriesColor(i, s.color));
  const legend =
    series.length > 1 ? <ChartLegend items={series.map((s, i) => ({ label: s.name, color: colors[i] ?? seriesColor(i) }))} /> : null;

  if (data.length === 0 || series.length === 0) {
    return (
      <div ref={rootRef} className={styles.root}>
        {legend}
        <div className={styles.empty} style={{ height }}>
          {t("chart.noData")}
        </div>
      </div>
    );
  }

  const S = series.length;
  const n = data.length;
  const mirrored = horizontal && mirror && dir === "rtl";
  const value = (row: number, s: number) => {
    const v = data[row]?.values[s];
    return finite(v) ? v : 0;
  };

  // Domain (always includes 0 unless the screen forces the ends)
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
  const scale = niceScale(min ?? lo, max ?? hi);
  const span = scale.max - scale.min || 1;
  const tickLabels = scale.ticks.map(format);

  const bars: BarShape[][] = series.map(() => []);
  const gridLines: ReactNode[] = [];
  const axisLabels: ReactNode[] = [];
  const hitAreas: ReactNode[] = [];
  let highlight: ReactNode = null;
  let anchor = { x: 0, y: 0 };

  /** Lay out one category's bars along the value axis. `toPx` maps value -> px on that axis. */
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
        place(s, groupStart, thickness, toPx(base), toPx(next), mirrored ? mirrorSide(side) : side);
      }
    } else {
      for (let s = 0; s < S; s++) {
        const v = value(r, s);
        if (v === 0) continue;
        const side: RoundedSide = horizontal ? (v > 0 ? "right" : "left") : v > 0 ? "top" : "bottom";
        place(s, groupStart + s * (thickness + gap), thickness, zero, toPx(v), mirrored ? mirrorSide(side) : side);
      }
    }
  };

  if (!horizontal) {
    const top = 10;
    const bottom = 26;
    const right = 8;
    const left = Math.ceil(widestText(tickLabels, measure)) + 10;
    const plotW = Math.max(1, width - left - right);
    const plotH = Math.max(1, height - top - bottom);
    const y = (v: number) => top + ((scale.max - v) / span) * plotH;
    const band = plotW / n;

    scale.ticks.forEach((tick, i) => {
      const ty = round(y(tick));
      gridLines.push(
        <line
          key={`g${i}`}
          x1={left}
          x2={left + plotW}
          y1={ty}
          y2={ty}
          fill="none"
          stroke={tick === 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
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
      if (r % every === 0 && d.label !== "") {
        axisLabels.push(
          <text key={`x${r}`} className={styles.axisLabel} x={round(bandStart + band / 2)} y={height - 8} textAnchor="middle">
            <title>{d.label}</title>
            {fitText(d.label, Math.min(band * every, MAX_CATEGORY_LABEL) - 6, measure)}
          </text>,
        );
      }
      let minY = y(0);
      layoutCategory(r, bandStart, band, y, (s, offset, thickness, from, to, side) => {
        const y0 = Math.min(from, to);
        const h = Math.max(1, Math.abs(to - from));
        minY = Math.min(minY, y0);
        bars[s]?.push({ key: `${r}`, d: barPath(offset, y0, thickness, h, RADIUS, side) });
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
    const categoryRoom = Math.min(widestText(data.map((d) => d.label), measure, true), width * 0.35);
    const namesSide = Math.ceil(categoryRoom + 12);
    const firstHalf = measure(tickLabels[0] ?? "") / 2 + 2;
    const lastHalf = measure(tickLabels[tickLabels.length - 1] ?? "") / 2 + 2;
    // The names sit at the inline start of the chart: the left edge, or the right edge when the chart is mirrored.
    const left = Math.ceil(mirrored ? Math.max(8, lastHalf) : Math.max(namesSide, firstHalf));
    const right = Math.ceil(mirrored ? Math.max(namesSide, firstHalf) : Math.max(8, lastHalf));
    const plotW = Math.max(1, width - left - right);
    const plotH = Math.max(1, height - top - bottom);
    const x = (v: number) => (mirrored ? left + plotW - ((v - scale.min) / span) * plotW : left + ((v - scale.min) / span) * plotW);
    const band = plotH / n;

    scale.ticks.forEach((tick) => {
      const tx = round(x(tick));
      gridLines.push(
        <line
          key={`g${tick}`}
          x1={tx}
          x2={tx}
          y1={top}
          y2={top + plotH}
          fill="none"
          stroke={tick === 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
          strokeWidth={1}
          shapeRendering="crispEdges"
        />,
      );
    });
    const tickCandidates = scale.ticks
      .map((tick, i) => ({ x: x(tick), text: tickLabels[i] ?? "" }))
      .sort((a, b) => a.x - b.x);
    for (const tick of pickLabels(tickCandidates, measure, TICK_GAP, width)) {
      axisLabels.push(
        <text key={`t${round(tick.x)}`} className={styles.axisLabel} x={round(tick.x)} y={height - 6} textAnchor="middle">
          {tick.text}
        </text>,
      );
    }

    const every = band >= MIN_ROW_BAND ? 1 : Math.ceil(MIN_ROW_BAND / band);
    data.forEach((d, r) => {
      const bandStart = top + r * band;
      if (r % every === 0 && d.label !== "") {
        axisLabels.push(
          <text
            key={`y${r}`}
            className={cn(styles.axisLabel, styles.axisStrong)}
            x={mirrored ? width - 2 : 2}
            y={round(bandStart + band / 2)}
            textAnchor={mirrored ? "end" : "start"}
            dominantBaseline="middle"
          >
            <title>{d.label}</title>
            {fitText(d.label, categoryRoom, measure, true)}
          </text>,
        );
      }
      let reach = x(0);
      layoutCategory(r, bandStart, band, x, (s, offset, thickness, from, to, side) => {
        const x0 = Math.min(from, to);
        const w = Math.max(1, Math.abs(to - from));
        reach = mirrored ? Math.min(reach, x0) : Math.max(reach, x0 + w);
        bars[s]?.push({ key: `${r}`, d: barPath(x0, offset, w, thickness, RADIUS, side) });
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
        anchor = { x: reach, y: bandStart + band / 2 };
      }
    });
  }

  const summary = t("barChart.summary", {
    stacked: stacked ? 1 : 0,
    horizontal: horizontal ? 1 : 0,
    categories: n,
    seriesCount: S,
    names: join(series.map((s) => s.name)),
    min: format(lo),
    max: format(hi),
  });
  const accessibleName = label ? t("chart.titled", { title: label, summary }) : summary;

  const activeIndex = active !== null && active < n ? active : null;
  const activeRow = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div ref={rootRef} className={styles.root}>
      {legend}
      <div ref={ref} className={styles.plot} dir="ltr" style={{ height }}>
        <svg
          className={styles.svg}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={accessibleName}
          data-mirrored={mirrored ? "true" : undefined}
          onPointerLeave={() => setActive(null)}
        >
          {probes}
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
          <ChartTooltip x={anchor.x} y={anchor.y} containerWidth={width} containerHeight={height} dir={dir}>
            <TooltipTitle>{activeRow.label}</TooltipTitle>
            {series.map((s, i) => (
              <TooltipRow key={`${s.name}-${i}`} color={colors[i]} label={s.name} value={format(value(activeIndex, i))} />
            ))}
            {stacked && S > 1 ? (
              <TooltipRow
                label={t("barChart.total")}
                value={format(series.reduce((sum, _s, i) => sum + value(activeIndex, i), 0))}
              />
            ) : null}
          </ChartTooltip>
        ) : null}
      </div>
    </div>
  );
}
