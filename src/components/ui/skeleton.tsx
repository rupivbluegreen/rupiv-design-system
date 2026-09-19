import { cn } from "@/lib/cn";
import styles from "./skeleton.module.css";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: "sm" | "md" | "lg" | "full";
  className?: string;
}

export function Skeleton({ width, height = 12, radius = "sm", className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(styles.skeleton, styles[radius], className)}
      style={{ width: width ?? "100%", height }}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

const WIDTHS = ["100%", "92%", "96%", "88%"];

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <span className={cn(styles.text, className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={10} width={i === lines - 1 && lines > 1 ? "60%" : WIDTHS[i % WIDTHS.length]} />
      ))}
    </span>
  );
}
