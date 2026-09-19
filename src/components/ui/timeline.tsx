import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/types";
import { Avatar } from "./avatar";
import styles from "./timeline.module.css";

export interface TimelineItem {
  id?: string;
  title: ReactNode;
  time?: string;
  description?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  actor?: string;
}

export interface TimelineProps {
  items: TimelineItem[];
  dense?: boolean;
  className?: string;
}

export function Timeline({ items, dense = false, className }: TimelineProps) {
  return (
    <ol className={cn(styles.timeline, dense && styles.dense, className)} role="list">
      {items.map((item, i) => {
        const tone = item.tone ?? "neutral";
        return (
          <li key={item.id ?? i} className={cn(styles.item, styles[tone])}>
            <div className={styles.rail} aria-hidden="true">
              {item.icon ? (
                <span className={styles.iconNode}>{item.icon}</span>
              ) : (
                <span className={styles.dotNode}>
                  <span className={styles.dot} />
                </span>
              )}
            </div>
            <div className={styles.content}>
              <div className={styles.head}>
                <div className={styles.title}>{item.title}</div>
                {item.time ? <time className={styles.time}>{item.time}</time> : null}
              </div>
              {item.description ? <div className={styles.description}>{item.description}</div> : null}
              {item.actor ? (
                <div className={styles.actor}>
                  <Avatar name={item.actor} size="xs" />
                  <span>{item.actor}</span>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
