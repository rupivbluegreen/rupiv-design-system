import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import type { Tone } from "../../lib/types";
import styles from "./progress.module.css";

export interface ProgressProps {
  value: number;
  max?: number;
  tone?: Tone;
  size?: "sm" | "md";
  label?: ReactNode;
  showValue?: boolean;
  /** Replaces the default "62%" text when `showValue` is on. */
  valueLabel?: string;
  className?: string | undefined;
}

export function Progress({
  value,
  max = 100,
  tone = "accent",
  size = "md",
  label,
  showValue = false,
  valueLabel,
  className,
}: ProgressProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const text = valueLabel ?? `${Math.round(pct)}%`;
  return (
    <div className={cn(styles.progress, className)}>
      {label || showValue ? (
        <div className={styles.header}>
          {label ? <span className={styles.label}>{label}</span> : <span />}
          {showValue ? <span className={styles.value}>{text}</span> : null}
        </div>
      ) : null}
      <div
        className={cn(styles.track, styles[size])}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={text}
        aria-label={typeof label === "string" ? label : undefined}
      >
        <div className={cn(styles.fill, styles[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export interface SegmentBarSegment {
  value: number;
  tone?: Tone;
  /** Any CSS color, e.g. "var(--chart-2)" or a shade hex. Wins over `tone`. */
  color?: string;
  label: string;
}

export interface SegmentBarProps {
  segments: SegmentBarSegment[];
  height?: number;
  showLegend?: boolean;
  className?: string | undefined;
}

const CHART_SEQUENCE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

function segmentColor(seg: SegmentBarSegment, index: number): string {
  if (seg.color) return seg.color;
  if (seg.tone) return `var(--${seg.tone}-solid)`;
  return CHART_SEQUENCE[index % CHART_SEQUENCE.length] ?? "var(--chart-1)";
}

export function SegmentBar({ segments, height = 8, showLegend = false, className }: SegmentBarProps) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const pctOf = (v: number) => (total > 0 ? (Math.max(0, v) / total) * 100 : 0);
  const summary = segments.map((s) => `${s.label} ${Math.round(pctOf(s.value))}%`).join(", ");

  return (
    <div className={cn(styles.segmentWrap, className)}>
      <div className={styles.segments} style={{ height }} role="img" aria-label={summary}>
        {total === 0 ? <div className={styles.segmentEmpty} /> : null}
        {segments.map((s, i) =>
          s.value > 0 ? (
            <div
              key={`${s.label}-${i}`}
              className={styles.segment}
              style={{ flexGrow: s.value, background: segmentColor(s, i) }}
              title={`${s.label}: ${Math.round(pctOf(s.value))}%`}
            />
          ) : null,
        )}
      </div>
      {showLegend ? (
        <ul className={styles.legend} role="list">
          {segments.map((s, i) => (
            <li key={`${s.label}-${i}`} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: segmentColor(s, i) }} aria-hidden="true" />
              <span className={styles.legendLabel}>{s.label}</span>
              <span className={styles.legendValue}>{Math.round(pctOf(s.value))}%</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
