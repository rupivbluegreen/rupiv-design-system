"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { useLink } from "../../provider";
import { Tile, type TileColor } from "./tile";
import styles from "./task-list.module.css";

export interface TaskListItem {
  id: string;
  title: ReactNode;
  /** A small chip next to the title, for example a StatusPill. */
  badge?: ReactNode;
  /** One short line under the title. */
  meta?: ReactNode;
  /** The icon inside the tile at the start of the row. No icon, no tile. */
  icon?: ReactNode;
  color?: TileColor;
  /** Makes the row a link (the provider's link component) with a chevron at the end. */
  href?: string;
  /** Dims the row. A row with an `href` stops being a link and is announced as a disabled link. */
  disabled?: boolean;
}

export interface TaskListProps {
  items: TaskListItem[];
  className?: string | undefined;
}

/** Rows of icon tile, title with chip, meta line and, for a link, a chevron that points to the inline end. */
export function TaskList({ items, className }: TaskListProps) {
  const Link = useLink();
  return (
    <ul className={cn(styles.list, className)} role="list">
      {items.map((item) => {
        const content = (
          <>
            {item.icon ? <Tile icon={item.icon} color={item.color ?? "mint"} /> : null}
            <span className={styles.text}>
              <span className={styles.titleRow}>
                <span className={styles.title}>{item.title}</span>
                {item.badge}
              </span>
              {item.meta ? <span className={styles.meta}>{item.meta}</span> : null}
            </span>
            {item.href ? (
              <span className={styles.chevron} aria-hidden="true">
                <ChevronRight />
              </span>
            ) : null}
          </>
        );
        let row: ReactNode;
        if (item.disabled) {
          row = (
            <span
              className={cn(styles.task, styles.disabled)}
              {...(item.href ? { role: "link", "aria-disabled": true } : {})}
            >
              {content}
            </span>
          );
        } else if (item.href) {
          row = (
            <Link href={item.href} className={cn(styles.task, styles.link)}>
              {content}
            </Link>
          );
        } else {
          row = <div className={styles.task}>{content}</div>;
        }
        return <li key={item.id}>{row}</li>;
      })}
    </ul>
  );
}
