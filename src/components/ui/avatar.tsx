"use client";

import { cn } from "../../lib/cn";
import { initials } from "../../lib/format";
import type { CategoryColor } from "../../lib/types";
import { useFormat } from "../../lib/use-format";
import { useLabels } from "../../provider";
import styles from "./avatar.module.css";

const COLORS: CategoryColor[] = ["indigo", "madder", "turmeric", "neem", "lac", "kattha", "slate"];

/** Deterministic color for a name (same name → same color on server and client). */
function colorFor(name: string): CategoryColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length] ?? "slate";
}

export interface AvatarProps {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  color?: CategoryColor;
  className?: string | undefined;
}

export function Avatar({ name, size = "md", color, className }: AvatarProps) {
  const tone = color ?? colorFor(name);
  const text = size === "xs" ? initials(name).slice(0, 1) || "?" : initials(name) || "?";
  return (
    <span role="img" aria-label={name} title={name} className={cn(styles.avatar, styles[size], styles[tone], className)}>
      <span aria-hidden="true">{text}</span>
    </span>
  );
}

export interface AvatarGroupProps {
  names: string[];
  max?: number;
  size?: "xs" | "sm" | "md";
  className?: string | undefined;
}

export function AvatarGroup({ names, max = 4, size = "sm", className }: AvatarGroupProps) {
  const { locale, int } = useFormat();
  const label = useLabels();
  const visible = names.length > max ? names.slice(0, Math.max(max - 1, 1)) : names;
  const hidden = names.slice(visible.length);
  // Names are joined the way the language joins a list ("a, b, c" in English, "a وb وc" in Arabic).
  const join = (list: string[]) => new Intl.ListFormat(locale, { style: "narrow", type: "conjunction" }).format(list);
  return (
    <span className={cn(styles.group, styles[`group-${size}`], className)} role="group" aria-label={join(names)}>
      {visible.map((name, i) => (
        <Avatar key={`${name}-${i}`} name={name} size={size} className={styles.stacked} />
      ))}
      {hidden.length > 0 ? (
        <span
          className={cn(styles.avatar, styles[size], styles.more, styles.stacked)}
          title={join(hidden)}
          aria-label={label("avatar.more", { n: hidden.length })}
          role="img"
        >
          <span aria-hidden="true">+{int(hidden.length)}</span>
        </span>
      ) : null}
    </span>
  );
}
