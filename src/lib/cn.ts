import { clsx, type ClassValue } from "clsx";

/** Join class names conditionally. `cn(styles.btn, isActive && styles.active)` */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
