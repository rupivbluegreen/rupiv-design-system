"use client";

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "../../lib/cn";
import { useLink } from "../../provider";
import styles from "./button.module.css";

type Size = "sm" | "md" | "lg";

/** Button props are spread onto the link when there is an href; the href itself is always the explicit one. */
type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "accent" | "danger" | "link";
  size?: Size;
  /** Icon before the label, on the inline-start side: left in English, right in Arabic. */
  startIcon?: ReactNode;
  /** Icon after the label, on the inline-end side. Hidden while `loading`. */
  endIcon?: ReactNode;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  fullWidth?: boolean;
  /** Renders the provider's link component (a plain <a> by default) styled identically. */
  href?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = "secondary",
  size = "md",
  startIcon,
  endIcon,
  loading = false,
  fullWidth = false,
  href,
  className,
  children,
  disabled,
  type = "button",
  ref,
  ...rest
}: ButtonProps) {
  const Link = useLink();
  const isDisabled = Boolean(disabled || loading);
  const classes = cn(
    styles.root,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    className,
  );

  const content = (
    <>
      {loading ? (
        <span className={styles.icon} aria-hidden="true">
          <LoaderCircle className={styles.spinner} />
        </span>
      ) : startIcon ? (
        <span className={styles.icon} aria-hidden="true">
          {startIcon}
        </span>
      ) : null}
      {children != null && children !== false && <span className={styles.label}>{children}</span>}
      {endIcon && !loading && (
        <span className={styles.icon} aria-hidden="true">
          {endIcon}
        </span>
      )}
    </>
  );

  if (href && !isDisabled) {
    return (
      <Link href={href} className={classes} {...(rest as AnchorProps)}>
        {content}
      </Link>
    );
  }

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
    >
      {content}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* IconButton                                                          */
/* ------------------------------------------------------------------ */

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  /** Used as aria-label and title. */
  label: string;
  variant?: "ghost" | "secondary" | "primary";
  size?: Size;
  href?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  href,
  className,
  disabled,
  type = "button",
  ref,
  ...rest
}: IconButtonProps) {
  const Link = useLink();
  const classes = cn(styles.root, styles.iconOnly, styles[variant], styles[size], className);
  const glyph = (
    <span className={styles.icon} aria-hidden="true">
      {icon}
    </span>
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={classes}
        aria-label={label}
        title={label}
        {...(rest as AnchorProps)}
      >
        {glyph}
      </Link>
    );
  }

  return (
    <button
      title={label}
      {...rest}
      ref={ref}
      type={type}
      aria-label={label}
      className={classes}
      disabled={disabled}
    >
      {glyph}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* ButtonGroup                                                         */
/* ------------------------------------------------------------------ */

export interface ButtonGroupProps {
  /** Joins buttons into one segmented control (shared borders, inner radii removed). */
  attached?: boolean;
  className?: string | undefined;
  children: ReactNode;
}

export function ButtonGroup({ attached = false, className, children }: ButtonGroupProps) {
  return (
    <div role="group" className={cn(styles.group, attached && styles.attached, className)}>
      {children}
    </div>
  );
}
