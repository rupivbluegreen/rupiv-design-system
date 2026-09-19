"use client";

import { cn } from "../../lib/cn";
import { useLabels } from "../../provider";
import styles from "./skeleton.module.css";

export interface SkeletonProps {
  /** Size along the reading direction (a number is pixels). Default: the full width of the container. */
  width?: number | string;
  /** Size across it (a number is pixels). */
  height?: number | string;
  radius?: "sm" | "md" | "lg" | "full";
  /**
   * Adds text only a screen reader gets ("Loading"). Set it on one skeleton per loading area, and put
   * `aria-busy="true"` on the area itself. The shape stays hidden from assistive technology.
   */
  announce?: boolean;
  className?: string | undefined;
}

function LoadingText() {
  const label = useLabels();
  return <span className="sr-only">{label("skeleton.loading")}</span>;
}

export function Skeleton({ width, height = 12, radius = "sm", announce = false, className }: SkeletonProps) {
  const shape = (
    <span
      aria-hidden="true"
      className={cn(styles.skeleton, styles[radius], className)}
      style={{ inlineSize: width ?? "100%", blockSize: height }}
    />
  );
  if (!announce) return shape;
  return (
    <>
      <LoadingText />
      {shape}
    </>
  );
}

export interface SkeletonTextProps {
  lines?: number;
  /** As on Skeleton: adds "Loading" for screen readers. */
  announce?: boolean;
  className?: string | undefined;
}

const WIDTHS = ["100%", "92%", "96%", "88%"];

export function SkeletonText({ lines = 3, announce = false, className }: SkeletonTextProps) {
  return (
    <>
      {announce ? <LoadingText /> : null}
      <span className={cn(styles.text, className)} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} height={10} width={i === lines - 1 && lines > 1 ? "60%" : (WIDTHS[i % WIDTHS.length] ?? "100%")} />
        ))}
      </span>
    </>
  );
}
