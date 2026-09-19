"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import type { CategoryColor } from "../../lib/types";
import { useLabels } from "../../provider";
import styles from "./tag.module.css";

export interface TagProps {
  color?: CategoryColor;
  onRemove?: () => void;
  icon?: ReactNode;
  className?: string | undefined;
  children?: ReactNode;
}

export function Tag({ color = "slate", onRemove, icon, className, children }: TagProps) {
  const label = useLabels();
  return (
    <span className={cn(styles.tag, styles[color], className)}>
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
      {onRemove ? (
        <button
          type="button"
          className={styles.remove}
          onClick={onRemove}
          aria-label={typeof children === "string" ? label("tag.remove", { name: children }) : label("tag.removeGeneric")}
        >
          <X aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}
