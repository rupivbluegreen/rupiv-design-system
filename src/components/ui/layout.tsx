import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./layout.module.css";

export type LayoutGap = 0 | 2 | 4 | 6 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48;

const gapClass: Record<LayoutGap, string> = {
  0: styles.gap0,
  2: styles.gap2,
  4: styles.gap4,
  6: styles.gap6,
  8: styles.gap8,
  12: styles.gap12,
  16: styles.gap16,
  20: styles.gap20,
  24: styles.gap24,
  32: styles.gap32,
  40: styles.gap40,
  48: styles.gap48,
};

/* ------------------------------------------------------------------ */
/* Stack                                                               */
/* ------------------------------------------------------------------ */

export interface StackProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  gap?: LayoutGap;
  align?: "start" | "center" | "end" | "stretch";
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/** Vertical flex container. */
export function Stack({ gap = 12, align = "stretch", as: Component = "div", className, children, ...rest }: StackProps) {
  return (
    <Component {...rest} className={cn(styles.stack, gapClass[gap], styles[`align-${align}`], className)}>
      {children}
    </Component>
  );
}

/* ------------------------------------------------------------------ */
/* Inline                                                              */
/* ------------------------------------------------------------------ */

export interface InlineProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  gap?: LayoutGap;
  align?: "start" | "center" | "end" | "baseline" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/** Horizontal flex container. */
export function Inline({
  gap = 8,
  align = "center",
  justify = "start",
  wrap = false,
  as: Component = "div",
  className,
  children,
  ...rest
}: InlineProps) {
  return (
    <Component
      {...rest}
      className={cn(
        styles.inline,
        gapClass[gap],
        styles[`align-${align}`],
        styles[`justify-${justify}`],
        wrap && styles.wrap,
        className,
      )}
    >
      {children}
    </Component>
  );
}

/* ------------------------------------------------------------------ */
/* Grid                                                                */
/* ------------------------------------------------------------------ */

export interface GridProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  /** e.g. "240px" — switches to an auto-fill grid with this minimum item width. */
  minItemWidth?: string;
  gap?: LayoutGap;
  className?: string;
  children?: ReactNode;
}

/** CSS grid. Collapses to 1 column below 640px, and to 2 columns below 1024px when columns ≥ 3. */
export function Grid({ columns = 2, minItemWidth, gap = 16, className, style, children, ...rest }: GridProps) {
  const autoStyle: CSSProperties | undefined = minItemWidth
    ? { gridTemplateColumns: `repeat(auto-fill, minmax(min(${minItemWidth}, 100%), 1fr))`, ...style }
    : style;
  return (
    <div
      {...rest}
      style={autoStyle}
      className={cn(styles.grid, gapClass[gap], !minItemWidth && styles[`cols${columns}`], className)}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Divider                                                             */
/* ------------------------------------------------------------------ */

export interface DividerProps {
  label?: string;
  vertical?: boolean;
  spacing?: 0 | 8 | 12 | 16 | 24;
  className?: string;
}

export function Divider({ label, vertical = false, spacing = 0, className }: DividerProps) {
  const spacingClass = styles[`spacing${spacing}`];
  if (vertical) {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={cn(styles.vertical, spacingClass, className)}
      />
    );
  }
  if (label) {
    return (
      <div role="separator" aria-label={label} className={cn(styles.labelled, spacingClass, className)}>
        <span className={styles.labelText}>{label}</span>
      </div>
    );
  }
  return <hr className={cn(styles.horizontal, spacingClass, className)} />;
}
