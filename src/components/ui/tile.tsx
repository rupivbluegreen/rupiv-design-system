import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import styles from "./tile.module.css";

/** The pastel tints. They mark a category, never a status: use Badge or StatusPill for status. */
export type TileColor = "mint" | "rose" | "sky" | "sand" | "lilac";

export interface TileProps {
  /** The icon (a lucide-react element, for example). */
  icon: ReactNode;
  color?: TileColor;
  /** `md` is 40px; `lg` is 60px with the icon in the accent colour. */
  size?: "md" | "lg";
  /** Round (default) or a rounded square. A `lg` tile always uses the larger radius. */
  shape?: "circle" | "square";
  /** Names the tile for assistive technology. Without it the tile is decorative and hidden from it. */
  label?: string;
  className?: string | undefined;
}

/** An icon on a pastel tint, placed beside a title. */
export function Tile({ icon, color = "mint", size = "md", shape = "circle", label, className }: TileProps) {
  return (
    <span
      className={cn(styles.tile, styles[color], shape === "square" && styles.square, size === "lg" && styles.lg, className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {icon}
    </span>
  );
}
