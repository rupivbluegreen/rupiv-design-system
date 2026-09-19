import type { ReactNode } from 'react';
import './status-badge.css';

export type StatusTone = 'brand' | 'blue' | 'orange' | 'red' | 'neutral';

export interface StatusBadgeProps {
  children: ReactNode;
  tone: StatusTone;
}

/** A coloured pill naming a state — colour is never the only signal, the label always carries it too. */
export function StatusBadge({ children, tone }: StatusBadgeProps) {
  return <span className={`omni-status-badge omni-status-badge--${tone}`}>{children}</span>;
}

export interface MetricDeltaProps {
  value: number;
  /** When false, a rising value reads as bad (e.g. a delay count) — the colour flips, the arrow doesn't. */
  upIsGood?: boolean;
  suffix?: string;
}

/** A directional change figure — sage when it's the reading you want, coral when it isn't, never colour without the arrow and sign. */
export function MetricDelta({ value, upIsGood = true, suffix = '%' }: MetricDeltaProps) {
  const isPositiveDirection = value >= 0;
  const isGood = isPositiveDirection === upIsGood;
  return (
    <span className={`omni-metric-delta ${isGood ? 'omni-metric-delta--good' : 'omni-metric-delta--bad'}`}>
      {isPositiveDirection ? '↑' : '↓'} {Math.abs(value).toLocaleString('en-US')}
      {suffix}
    </span>
  );
}
