"use client";

import { useId, useState, type PointerEvent } from "react";
import { cn } from "../../lib/cn";
import { NO_VALUE } from "../../lib/locale";
import { useLabels } from "../../provider";
import { ChartLegend } from "./chart-legend";
import { ChartTooltip, TooltipRow, TooltipTitle } from "./chart-tooltip";
import { clamp, finite, niceScale, round, sanitizeId, seriesColor } from "./scale";
import { fitText, pickLabels, useTextMeasure, widestText, type TextMeasure } from "./text-measure";
import { useChartDir } from "./use-chart-dir";
import { useCompactFormat, useListJoin } from "./use-chart-text";
import { useMeasure } from "./use-measure";
import styles from "./chart.module.css";

export interface LineSeries {
  name: string;
  data: number[];
  color?: string;
  area?: boolean;
  dashed?: boolean;
}

/** A shaded range between a low and a high value at every point, for example a likely range around a forecast. */
export interface LineBand {
  low: number[];
  high: number[];
  /** Legend name and tooltip label. Default: the provider's "lineChart.band". */
  name?: string;
  /** Default: the first series' color. */
  color?: string;
}

/** A labelled vertical line at a position on the x axis, for example "today" or an event. */
export interface LineMarker {
  /** Position in points: 0 is the first point, 2.5 is half way between the third and the fourth. */
  index: number;
  label?: string;
}

export interface LineChartProps {
  /** One label per point. '' leaves a point unlabelled (a screen can label only every fourth point). */
  labels: string[];
  /**
   * One full name per point for the tooltip title and the summary ("05:15"), for a chart whose axis labels are
   * sparse. Where it is empty or missing the axis label is used, then the point's number.
   */
  tooltipLabels?: string[];
  series: LineSeries[];
  height?: number;
  format?: (n: number) => string;
  band?: LineBand;
  markers?: LineMarker[];
  /** Force the bottom or the top of the value axis. Default: the data, always including 0. */
  min?: number;
  max?: number;
  /** The chart's name for assistive technology; the generated summary follows it. */
  label?: string;
  /** Replaces the browser's text measurement (tests, or a screen that knows its fonts). */
  measureText?: TextMeasure;
}

type Point = readonly [number, number];

/** Longest x axis label, px. Longer texts are cut with an ellipsis. */
const MAX_X_LABEL = 100;
/** Space kept between two x axis labels, px. */
const X_LABEL_GAP = 12;
/** Space between a marker line and its label, px. */
const MARKER_GAP = 4;
/** A marker label is left out when less room than this is left for it, px. */
const MIN_MARKER_LABEL = 16;

/** Closed shape between `high` and `low` for every run of points that have both. */
function bandPath(low: number[], high: number[], n: number, x: (i: number) => number, y: (v: number) => number): string {
  let path = "";
  let run: number[] = [];
  const flush = () => {
    if (run.length > 1) {
      const up = run.map((i, k) => `${k === 0 ? "M" : "L"}${round(x(i))} ${round(y(high[i] ?? 0))}`).join("");
      const down = [...run].reverse().map((i) => `L${round(x(i))} ${round(y(low[i] ?? 0))}`).join("");
      path += `${up}${down}Z`;
    }
    run = [];
  };
  for (let i = 0; i < n; i++) {
    if (finite(low[i]) && finite(high[i])) run.push(i);
    else flush();
  }
  flush();
  return path;
}

export function LineChart({
  labels,
  tooltipLabels,
  series,
  height = 240,
  format: formatProp,
  band,
  markers,
  min,
  max,
  label,
  measureText,
}: LineChartProps) {
  const uid = sanitizeId(useId());
  const t = useLabels();
  const compact = useCompactFormat();
  const join = useListJoin();
  const format = formatProp ?? compact;
  const [ref, width] = useMeasure<HTMLDivElement>();
  const { ref: rootRef, dir } = useChartDir();
  const { measure, probes } = useTextMeasure(measureText);
  const [active, setActive] = useState<number | null>(null);

  const colors = series.map((s, i) => seriesColor(i, s.color));
  const bandColor = band ? seriesColor(0, band.color ?? colors[0]) : "";
  const bandName = band ? (band.name ?? t("lineChart.band")) : "";
  const legendItems = [
    ...series.map((s, i) => ({ label: s.name, color: colors[i] ?? seriesColor(i) })),
    ...(band ? [{ label: bandName, color: bandColor }] : []),
  ];
  const legend = legendItems.length > 1 ? <ChartLegend items={legendItems} /> : null;

  const n = labels.length > 0 ? labels.length : series.reduce((m, s) => Math.max(m, s.data.length), 0);
  const allValues = [
    ...series.flatMap((s) => s.data.slice(0, n).filter(finite)),
    ...(band ? [...band.low.slice(0, n), ...band.high.slice(0, n)].filter(finite) : []),
  ];

  if (n === 0 || series.length === 0 || allValues.length === 0) {
    return (
      <div ref={rootRef} className={styles.root}>
        {legend}
        <div className={styles.empty} style={{ height }}>
          {t("chart.noData")}
        </div>
      </div>
    );
  }

  const labelAt = (i: number) => labels[i] ?? String(i + 1);
  const lo = min ?? Math.min(0, ...allValues);
  const hi = max ?? Math.max(0, ...allValues);
  const scale = niceScale(lo, hi);
  const span = scale.max - scale.min || 1;
  const tickLabels = scale.ticks.map(format);

  const top = 14;
  const bottom = 26;
  const firstHalf = Math.min(measure(labelAt(0)), MAX_X_LABEL) / 2;
  const lastHalf = Math.min(measure(labelAt(n - 1)), MAX_X_LABEL) / 2;
  const left = Math.ceil(Math.max(widestText(tickLabels, measure) + 10, firstHalf + 2));
  const right = Math.ceil(Math.max(12, lastHalf + 2));
  const plotW = Math.max(1, width - left - right);
  const plotH = Math.max(1, height - top - bottom);
  const step = n > 1 ? plotW / (n - 1) : plotW;
  const x = (i: number) => (n === 1 ? left + plotW / 2 : left + i * step);
  const y = (v: number) => top + ((scale.max - v) / span) * plotH;
  const baseline = round(y(clamp(0, scale.min, scale.max)));

  const xLabels = pickLabels(
    Array.from({ length: n }, (_, i) => ({ x: x(i), text: labelAt(i) })),
    measure,
    X_LABEL_GAP,
    MAX_X_LABEL,
  );

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
            const end = seg[seg.length - 1];
            if (!first || !end) return ""; // never: segments of fewer than two points are filtered out above
            return `M${first[0]} ${baseline}` + seg.map(([px, py]) => `L${px} ${py}`).join("") + `L${end[0]} ${baseline}Z`;
          })
          .join("")
      : "";
    return { line, area, last, color: colors[si], gradientId: `${uid}-area-${si}` };
  });

  const bandD = band ? bandPath(band.low, band.high, n, x, y) : "";

  // Marker lines, and their labels where there is room: left to right, a label that would touch the last one is left out.
  const placedMarkers = (markers ?? [])
    .filter((m) => finite(m.index) && m.index >= 0 && m.index <= n - 1)
    .map((m) => ({ ...m, mx: round(x(m.index)) }))
    .sort((a, b) => a.mx - b.mx);
  let markerEdge = Number.NEGATIVE_INFINITY;
  const markerShapes = placedMarkers.map((m) => {
    if (!m.label) return { ...m, text: "", tx: 0, anchor: "start" as const };
    const wanted = measure(m.label, true);
    const roomAfter = width - 2 - (m.mx + MARKER_GAP);
    const roomBefore = m.mx - MARKER_GAP - 2;
    const after = wanted <= roomAfter || roomAfter >= roomBefore;
    const room = after ? roomAfter : roomBefore;
    const text = fitText(m.label, room, measure, true);
    const w = Math.min(wanted, room);
    const from = after ? m.mx + MARKER_GAP : m.mx - MARKER_GAP - w;
    if (room < MIN_MARKER_LABEL || from < markerEdge + MARKER_GAP) return { ...m, text: "", tx: 0, anchor: "start" as const };
    markerEdge = from + w;
    return { ...m, text, tx: after ? m.mx + MARKER_GAP : m.mx - MARKER_GAP, anchor: after ? ("start" as const) : ("end" as const) };
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
  const activeLow = band && activeIndex !== null ? band.low[activeIndex] : undefined;
  const activeHigh = band && activeIndex !== null ? band.high[activeIndex] : undefined;

  const pointName = (i: number) => tooltipLabels?.[i] || labels[i] || String(i + 1);
  const named = Array.from({ length: n }, (_, i) => tooltipLabels?.[i] || labels[i] || "").filter((l) => l !== "");
  const firstName = named[0] ?? pointName(0);
  const lastName = named[named.length - 1] ?? pointName(n - 1);
  const markerNames = placedMarkers.flatMap((m) => (m.label ? [m.label] : []));
  const summary = [
    t("lineChart.summary", {
      series: join(series.map((s) => s.name)),
      count: n,
      first: firstName,
      last: lastName,
      min: format(Math.min(...allValues)),
      max: format(Math.max(...allValues)),
    }),
    markerNames.length > 0 ? t("lineChart.markers", { markers: join(markerNames) }) : "",
  ]
    .filter(Boolean)
    .join(" ");
  const accessibleName = label ? t("chart.titled", { title: label, summary }) : summary;

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
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
        >
          {probes}
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

          {scale.ticks.map((tick, i) => {
            const ty = round(y(tick));
            return (
              <g key={`tick-${i}`}>
                <line
                  x1={left}
                  x2={left + plotW}
                  y1={ty}
                  y2={ty}
                  fill="none"
                  stroke={tick === 0 && scale.min < 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text className={styles.axisLabel} x={left - 8} y={ty} textAnchor="end" dominantBaseline="middle">
                  {tickLabels[i]}
                </text>
              </g>
            );
          })}

          {xLabels.map((l) => (
            <text key={`x-${round(l.x)}`} className={styles.axisLabel} x={round(l.x)} y={height - 8} textAnchor="middle">
              <title>{l.text}</title>
              {fitText(l.text, l.width, measure)}
            </text>
          ))}

          {bandD ? <path className={styles.band} d={bandD} fill={bandColor} data-part="band" /> : null}

          {markerShapes.map((m, i) => (
            <g key={`marker-${i}`} data-part="marker">
              <line className={styles.marker} x1={m.mx} x2={m.mx} y1={top} y2={top + plotH} fill="none" />
              {m.text ? (
                <text className={cn(styles.axisLabel, styles.axisStrong)} x={m.tx} y={top + 10} textAnchor={m.anchor}>
                  {m.text}
                </text>
              ) : null}
            </g>
          ))}

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
                d.last && !series[si]?.dashed ? (
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
          <ChartTooltip x={x(activeIndex)} y={anchorY} containerWidth={width} containerHeight={height} dir={dir}>
            <TooltipTitle>{pointName(activeIndex)}</TooltipTitle>
            {series.map((s, si) => {
              const v = s.data[activeIndex];
              return (
                <TooltipRow key={`${s.name}-${si}`} color={colors[si]} label={s.name} value={finite(v) ? format(v) : NO_VALUE} />
              );
            })}
            {band && finite(activeLow) && finite(activeHigh) ? (
              <TooltipRow
                color={bandColor}
                label={bandName}
                value={t("lineChart.bandValue", { low: format(activeLow), high: format(activeHigh) })}
              />
            ) : null}
          </ChartTooltip>
        ) : null}
      </div>
    </div>
  );
}
