"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import styles from "./accordion.module.css";

export interface AccordionItem {
  /** Stable id: it is what `value`, `defaultValue` and `onValueChange` list. */
  id: string;
  title: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  /**
   * `single` (default): opening an item closes the others. `multiple`: any number can be open.
   * In both, an open item can always be closed again.
   */
  type?: "single" | "multiple";
  /** Ids of the items that start open, when the accordion keeps its own state. */
  defaultValue?: readonly string[];
  /** Ids of the open items, when the application owns the state. Pair it with `onValueChange`. */
  value?: readonly string[] | undefined;
  /** Called with the ids that are open after a change. */
  onValueChange?: (value: string[]) => void;
  className?: string | undefined;
}

/**
 * A stack of disclosure sections. Each title is a button with `aria-expanded`; Enter and Space open or close it, the
 * Up and Down arrows move to the previous or next title (wrapping), Home and End go to the first and the last. The
 * arrows are vertical, so they mean the same in right-to-left. Closed panels stay in the DOM, hidden.
 */
export function Accordion({
  items,
  type = "single",
  defaultValue = [],
  value,
  onValueChange,
  className,
}: AccordionProps) {
  const baseId = useId();
  const [inner, setInner] = useState<readonly string[]>(defaultValue);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const current = value ?? inner;
  // In single mode only the first listed id counts, so a `defaultValue` with several ids cannot open several items.
  const open = type === "single" ? current.slice(0, 1) : current;

  function toggle(id: string) {
    const next = open.includes(id) ? open.filter((entry) => entry !== id) : type === "multiple" ? [...open, id] : [id];
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const enabled = triggers.current.filter((el): el is HTMLButtonElement => el !== null && !el.disabled);
    const at = enabled.indexOf(event.currentTarget);
    if (at === -1 || enabled.length === 0) return;
    let target: HTMLButtonElement | undefined;
    if (event.key === "ArrowDown") target = enabled[(at + 1) % enabled.length];
    else if (event.key === "ArrowUp") target = enabled[(at - 1 + enabled.length) % enabled.length];
    else if (event.key === "Home") target = enabled[0];
    else if (event.key === "End") target = enabled[enabled.length - 1];
    else return;
    event.preventDefault();
    target?.focus();
  }

  return (
    <div className={cn(styles.accordion, className)}>
      {items.map((item, index) => {
        const isOpen = open.includes(item.id);
        const triggerId = `${baseId}-trigger-${index}`;
        const panelId = `${baseId}-panel-${index}`;
        return (
          <div key={item.id} className={styles.item}>
            <button
              type="button"
              id={triggerId}
              ref={(el) => {
                triggers.current[index] = el;
              }}
              className={styles.trigger}
              aria-expanded={isOpen}
              aria-controls={panelId}
              disabled={item.disabled}
              onClick={() => toggle(item.id)}
              onKeyDown={onKeyDown}
            >
              <span className={styles.label}>{item.title}</span>
              <ChevronDown className={styles.chevron} aria-hidden="true" />
            </button>
            <div id={panelId} role="region" aria-labelledby={triggerId} className={styles.panel} hidden={!isOpen}>
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
