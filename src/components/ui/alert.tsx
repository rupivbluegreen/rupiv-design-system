"use client";

import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/types";
import styles from "./alert.module.css";

export interface AlertProps {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const DEFAULT_ICONS: Record<Tone, ReactNode> = {
  neutral: <Info />,
  accent: <Info />,
  info: <Info />,
  success: <CircleCheck />,
  warning: <TriangleAlert />,
  danger: <CircleAlert />,
};

export function Alert({ tone = "info", title, children, icon, action, onDismiss, className }: AlertProps) {
  const urgent = tone === "danger" || tone === "warning";
  return (
    <div className={cn(styles.alert, styles[tone], className)} role={urgent ? "alert" : "status"}>
      <span className={styles.icon} aria-hidden="true">
        {icon ?? DEFAULT_ICONS[tone]}
      </span>
      <div className={styles.content}>
        {title ? <div className={styles.title}>{title}</div> : null}
        {children ? <div className={styles.body}>{children}</div> : null}
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
      {onDismiss ? (
        <button type="button" className={styles.close} onClick={onDismiss} aria-label="Dismiss" title="Dismiss">
          <X aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
