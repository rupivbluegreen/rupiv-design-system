import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import type { Tone } from "../../lib/types";
import styles from "./badge.module.css";

export interface BadgeProps {
  tone?: Tone;
  variant?: "soft" | "solid" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
  icon?: ReactNode;
  className?: string | undefined;
  children?: ReactNode;
}

export function Badge({
  tone = "neutral",
  variant = "soft",
  size = "md",
  dot = false,
  icon,
  className,
  children,
}: BadgeProps) {
  return (
    <span className={cn(styles.badge, styles[tone], styles[variant], styles[size], className)}>
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
    </span>
  );
}

export interface CountBadgeProps {
  count: number;
  tone?: Tone;
  max?: number;
  className?: string | undefined;
}

export function CountBadge({ count, tone = "neutral", max = 99, className }: CountBadgeProps) {
  const text = count > max ? `${max}+` : String(count);
  return (
    <span className={cn(styles.count, styles[tone], tone === "neutral" ? styles.soft : styles.solid, className)}>
      {text}
    </span>
  );
}
