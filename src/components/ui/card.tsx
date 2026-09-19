import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import styles from "./card.module.css";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Padding of the card itself. Ignored (0) when the card contains CardHeader/CardBody/CardFooter. */
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  tone?: "default" | "subtle";
  as?: ElementType;
  /** Passed through when `as` is a link component. */
  href?: string;
  className?: string | undefined;
  children?: ReactNode;
}

const PAD = { none: styles.padNone, sm: styles.padSm, md: styles.padMd, lg: styles.padLg } as const;

export function Card({
  padding = "md",
  interactive = false,
  tone = "default",
  as: Component = "div",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Component
      className={cn(
        styles.card,
        PAD[padding],
        tone === "subtle" && styles.subtle,
        interactive && styles.interactive,
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  bordered?: boolean;
  className?: string | undefined;
}

export function CardHeader({ title, subtitle, icon, actions, bordered = false, className }: CardHeaderProps) {
  return (
    <div className={cn(styles.section, styles.header, bordered && styles.bordered, className)}>
      {icon ? (
        <span className={styles.headerIcon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className={styles.headerText}>
        <h3 className={cn("t-heading-xs", styles.title)}>{title}</h3>
        {subtitle ? <p className={cn("t-caption", styles.subtitle)}>{subtitle}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

export interface CardBodyProps {
  className?: string | undefined;
  children?: ReactNode;
}

export function CardBody({ className, children }: CardBodyProps) {
  return <div className={cn(styles.section, styles.body, className)}>{children}</div>;
}

export interface CardFooterProps {
  className?: string | undefined;
  children?: ReactNode;
  align?: "start" | "end" | "between";
}

export function CardFooter({ className, children, align = "end" }: CardFooterProps) {
  return (
    <div
      className={cn(
        styles.section,
        styles.footer,
        align === "start" && styles.alignStart,
        align === "between" && styles.alignBetween,
        className,
      )}
    >
      {children}
    </div>
  );
}
