"use client";

import { useId } from "react";
import type { Tone } from "../../lib/types";
import { finite, round, sanitizeId } from "./scale";
import styles from "./sparkline.module.css";

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  tone?: Tone | "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5" | "chart-6";
  area?: boolean;
  showEnd?: boolean;
}

const PAD = 3;

export function Sparkline({ data, width = 120, height = 32, tone = "chart-1", area = false, showEnd = true }: SparklineProps) {
  const gradientId = `spark-${sanitizeId(useId())}`;
  const color = tone.startsWith("chart-") ? `var(--${tone})` : `var(--${tone}-solid)`;
  const values = data.filter(finite);

  if (values.length === 0) {
    const mid = round(height / 2);
    return (
      <svg className={styles.svg} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="No data">
        <line x1={PAD} y1={mid} x2={width - PAD} y2={mid} fill="none" stroke="var(--chart-grid)" strokeWidth={1.5} />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const innerW = Math.max(1, width - PAD * 2);
  const innerH = Math.max(1, height - PAD * 2);
  const x = (i: number) => round(values.length === 1 ? PAD + innerW : PAD + (i / (values.length - 1)) * innerW);
  const y = (v: number) => round(span === 0 ? PAD + innerH / 2 : PAD + ((max - v) / span) * innerH);

  const only = values[0] ?? 0; // values is not empty here (see the early return)
  const points = values.length === 1 ? [[PAD, y(only)] as const, [x(0), y(only)] as const] : values.map((v, i) => [x(i), y(v)] as const);
  const line = points.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px} ${py}`).join("");
  // points is never empty (one value gives two points), so the fallbacks are never used.
  const first = points[0] ?? ([PAD, y(only)] as const);
  const last = points[points.length - 1] ?? first;
  const bottom = height - PAD / 2;
  const areaPath = `${line}L${last[0]} ${bottom}L${first[0]} ${bottom}Z`;
  const end = values[values.length - 1];

  return (
    <svg
      className={styles.svg}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Trend of ${values.length} points, low ${min}, high ${max}, latest ${end}`}
    >
      {area ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.24 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        </>
      ) : null}
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {showEnd ? <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} stroke="var(--bg-surface)" strokeWidth={1} /> : null}
    </svg>
  );
}
