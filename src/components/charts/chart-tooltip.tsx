"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import styles from "./chart-tooltip.module.css";

export interface ChartTooltipProps {
  /** Anchor point, px relative to the positioned chart container. */
  x: number;
  y: number;
  /** Container size used to keep the tooltip inside bounds. */
  containerWidth: number;
  containerHeight: number;
  children: ReactNode;
}

const OFFSET = 12;

/** Small floating tooltip, clamped inside its (position: relative) container. */
export function ChartTooltip({ x, y, containerWidth, containerHeight, children }: ChartTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = x + OFFSET;
    if (left + w > containerWidth) left = x - OFFSET - w;
    left = Math.max(0, Math.min(left, containerWidth - w));
    let top = y - h - OFFSET;
    if (top < 0) top = y + OFFSET;
    top = Math.max(0, Math.min(top, containerHeight - h));
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    el.style.visibility = "visible";
  });

  return (
    <div ref={ref} className={styles.tooltip} aria-hidden="true">
      {children}
    </div>
  );
}

export function TooltipTitle({ children }: { children: ReactNode }) {
  return <div className={styles.title}>{children}</div>;
}

export function TooltipRow({ color, label, value }: { color?: string | undefined; label: ReactNode; value: ReactNode }) {
  return (
    <div className={styles.row}>
      {color ? <span className={styles.swatch} style={{ background: color }} /> : null}
      <span className={styles.name}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
