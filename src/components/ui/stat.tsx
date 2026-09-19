"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatDelta } from "../../lib/format";
import { useLink } from "../../provider";
import styles from "./stat.module.css";

export interface StatProps {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: { value: number /* percent */; goodWhen?: "up" | "down"; label?: string };
  icon?: ReactNode;
  hint?: ReactNode;
  href?: string;
  footer?: ReactNode;
  className?: string | undefined;
}

export function Stat({ label, value, unit, delta, icon, hint, href, footer, className }: StatProps) {
  const Link = useLink();
  let deltaNode: ReactNode = null;
  if (delta) {
    const goodWhen = delta.goodWhen ?? "up";
    const direction = delta.value > 0 ? "up" : delta.value < 0 ? "down" : "flat";
    const tone = direction === "flat" ? styles.flat : direction === goodWhen ? styles.good : styles.bad;
    const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
    deltaNode = (
      <div className={styles.deltaRow}>
        <span className={cn(styles.delta, tone)}>
          <Icon aria-hidden="true" />
          {formatDelta(delta.value)}
        </span>
        {delta.label ? <span className={cn("t-caption", styles.deltaLabel)}>{delta.label}</span> : null}
      </div>
    );
  }

  const content = (
    <>
      <div className={styles.top}>
        <span className={cn("t-caption", "text-label", styles.label)}>{label}</span>
        {icon ? (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <div className={styles.valueRow}>
        <span className={cn("t-heading-l", styles.value)}>{value}</span>
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </div>
      {deltaNode}
      {hint ? <div className={cn("t-caption", styles.hint)}>{hint}</div> : null}
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn(styles.stat, styles.link, className)}>
        {content}
      </Link>
    );
  }
  return <div className={cn(styles.stat, className)}>{content}</div>;
}
