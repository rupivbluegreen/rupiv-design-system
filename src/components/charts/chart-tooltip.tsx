"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useDir, type Direction } from "../../provider";
import styles from "./chart-tooltip.module.css";

export interface ChartTooltipProps {
  /** Anchor point, px from the LEFT edge of the positioned chart container, whatever the page direction. */
  x: number;
  y: number;
  /** Container size used to keep the tooltip inside bounds. */
  containerWidth: number;
  containerHeight: number;
  /** Direction of the text inside the tooltip. Default: the provider's. The position never depends on it. */
  dir?: Direction | undefined;
  children: ReactNode;
}

const OFFSET = 12;

/**
 * Small floating tooltip, clamped inside its (position: relative) container.
 *
 * It sits in its own left-to-right layer that fills the container, so `x` is always measured from the left edge and
 * the same arithmetic holds in a right-to-left page (a plot never flips, so an anchor's x is a physical position).
 * Only the words inside follow the page direction (`dir`): the swatch and name come first at the inline start. The
 * positioned box itself stays left to right so its inline start is its left edge.
 */
export function ChartTooltip({ x, y, containerWidth, containerHeight, dir, children }: ChartTooltipProps) {
  const providerDir = useDir();
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
    <div className={styles.layer} dir="ltr" aria-hidden="true">
      <div ref={ref} className={styles.tooltip}>
        <div className={styles.content} dir={dir ?? providerDir}>
          {children}
        </div>
      </div>
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
      <span className={styles.value}>
        <bdi>{value}</bdi>
      </span>
    </div>
  );
}
