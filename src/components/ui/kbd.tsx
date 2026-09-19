import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import styles from "./kbd.module.css";

export interface KbdProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children: ReactNode;
}

/** Keyboard key hint, e.g. <Kbd>/</Kbd> or <Kbd>⌘K</Kbd>. */
export function Kbd({ children, className, ...rest }: KbdProps) {
  return (
    <kbd {...rest} className={cn(styles.root, className)}>
      {children}
    </kbd>
  );
}
