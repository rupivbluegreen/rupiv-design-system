"use client";

import {
  cloneElement,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { cn } from "../../lib/cn";
import { applyPlacement, computedDirection, measureFloating, placeBlock, viewportSize } from "../../lib/placement";
import { useLink } from "../../provider";
import styles from "./menu.module.css";

export interface MenuItem {
  /** Optional discriminant; an entry with no `type` is an ordinary item. */
  type?: "item";
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  shortcut?: string;
  disabled?: boolean;
}

/** A small title over the entries that follow it. Not focusable. */
export interface MenuHeading {
  type: "heading";
  label: ReactNode;
}

export interface MenuRadioOption {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

/**
 * One choice out of several. The options are `menuitemradio` items with a check mark on the chosen one, inside a
 * `group` named by `heading` (shown) or `label`. Choosing an option closes the menu and calls `onValueChange`
 * when the value changed.
 */
export interface MenuRadioGroup {
  type: "radio-group";
  options: MenuRadioOption[];
  /** The chosen value; none is checked when it matches no option. */
  value: string | undefined;
  onValueChange: (value: string) => void;
  /** Visible title of the group. It also names the group for assistive technology. */
  heading?: ReactNode;
  /** Accessible name of the group when there is no visible `heading`. */
  label?: string;
}

export type MenuEntry = MenuItem | MenuHeading | MenuRadioGroup | "separator";

export interface MenuProps {
  /** A button element. Receives aria-haspopup / aria-expanded; clicks toggle the menu. */
  trigger: ReactElement;
  items: MenuEntry[];
  /** Which edge of the trigger the menu lines up with: its inline start (left in English, right in Arabic) or inline end. */
  align?: "start" | "end";
  /** Accessible name for the menu. */
  label?: string;
  className?: string | undefined;
}

const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const GAP = 4;
const MIN_WIDTH = 180;

function placeMenu(anchor: HTMLElement, panel: HTMLElement, align: "start" | "end") {
  const anchorBox = anchor.getBoundingClientRect();
  panel.style.minInlineSize = `${Math.max(anchorBox.width, MIN_WIDTH)}px`;
  const size = measureFloating(panel);
  applyPlacement(
    panel,
    placeBlock(anchorBox, size, viewportSize(), { dir: computedDirection(anchor), align, side: "bottom", gap: GAP }),
  );
}

/** Items the arrow keys can reach: ordinary items and radio items that are not disabled. */
function menuItems(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])'));
}

export function Menu({ trigger, items, align = "start", label, className }: MenuProps) {
  const Link = useLink();
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openedByKeyboard = useRef(false);
  const menuId = useId();

  const focusTrigger = () => {
    const el = anchorRef.current?.firstElementChild;
    if (el instanceof HTMLElement) el.focus({ preventScroll: true });
  };

  useLayoutEffect(() => {
    if (!open || !isClient) return;
    const panel = panelRef.current;
    const anchorWrap = anchorRef.current;
    const anchor = anchorWrap?.firstElementChild;
    if (!panel || !anchorWrap || !(anchor instanceof HTMLElement)) return;

    placeMenu(anchor, panel, align);
    if (openedByKeyboard.current) {
      menuItems(panel)[0]?.focus({ preventScroll: true });
    } else {
      panel.focus({ preventScroll: true });
    }

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panel.contains(target) || anchorWrap.contains(target)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (e.target instanceof Node && panel.contains(e.target)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);

    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, isClient, align]);

  const onAnchorClick = (e: MouseEvent<HTMLSpanElement>) => {
    if (e.defaultPrevented) return;
    openedByKeyboard.current = e.detail === 0;
    setOpen((o) => !o);
  };

  const onAnchorKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open) {
      e.preventDefault();
      openedByKeyboard.current = true;
      setOpen(true);
    }
  };

  // The menu is vertical and has no submenus, so no arrow key depends on the text direction: Up and Down move,
  // Left and Right do nothing in either direction. Direction matters here only for where the panel is placed.
  const onPanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    const els = menuItems(panel);
    const index = els.indexOf(document.activeElement as HTMLElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        els[(index + 1) % els.length]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        els[index <= 0 ? els.length - 1 : index - 1]?.focus();
        break;
      case "Home":
        e.preventDefault();
        els[0]?.focus();
        break;
      case "End":
        e.preventDefault();
        els[els.length - 1]?.focus();
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        focusTrigger();
        break;
      case "Tab":
        e.preventDefault();
        setOpen(false);
        focusTrigger();
        break;
    }
  };

  const onMouseEnter = (e: MouseEvent<HTMLElement>) => {
    if (e.currentTarget.getAttribute("aria-disabled") !== "true") e.currentTarget.focus({ preventScroll: true });
  };

  const renderItem = (item: MenuItem, key: string) => {
    const content = (
      <>
        {item.icon ? (
          <span className={styles.icon} aria-hidden="true">
            {item.icon}
          </span>
        ) : null}
        <span className={styles.label}>{item.label}</span>
        {item.shortcut ? <span className={styles.shortcut}>{item.shortcut}</span> : null}
      </>
    );
    const itemClass = cn(styles.item, item.danger && styles.danger);
    const onClick = (e: MouseEvent<HTMLElement>) => {
      if (item.disabled) {
        e.preventDefault();
        return;
      }
      focusTrigger();
      setOpen(false);
      item.onSelect?.();
    };

    if (item.href && !item.disabled) {
      return (
        <Link
          key={key}
          href={item.href}
          role="menuitem"
          tabIndex={-1}
          className={itemClass}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
        >
          {content}
        </Link>
      );
    }
    return (
      <button
        key={key}
        type="button"
        role="menuitem"
        tabIndex={-1}
        aria-disabled={item.disabled || undefined}
        className={itemClass}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
      >
        {content}
      </button>
    );
  };

  const renderRadioGroup = (group: MenuRadioGroup, key: string) => {
    const headingId = `${menuId}-${key}`;
    return (
      <div
        key={key}
        role="group"
        className={styles.group}
        aria-labelledby={group.heading ? headingId : undefined}
        aria-label={group.heading ? undefined : group.label}
      >
        {group.heading ? (
          <div id={headingId} className={styles.heading}>
            {group.heading}
          </div>
        ) : null}
        {group.options.map((option) => {
          const checked = option.value === group.value;
          return (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={checked}
              aria-disabled={option.disabled || undefined}
              tabIndex={-1}
              className={styles.item}
              onMouseEnter={onMouseEnter}
              onClick={(e) => {
                if (option.disabled) {
                  e.preventDefault();
                  return;
                }
                focusTrigger();
                setOpen(false);
                if (!checked) group.onValueChange(option.value);
              }}
            >
              <span className={styles.check} aria-hidden="true">
                <Check />
              </span>
              {option.icon ? (
                <span className={styles.icon} aria-hidden="true">
                  {option.icon}
                </span>
              ) : null}
              <span className={styles.label}>{option.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderEntry = (entry: MenuEntry, i: number) => {
    const key = `entry-${i}`;
    if (entry === "separator") return <div key={key} role="separator" className={styles.separator} />;
    if (entry.type === "heading") {
      return (
        <div key={key} role="presentation" className={styles.heading}>
          {entry.label}
        </div>
      );
    }
    if (entry.type === "radio-group") return renderRadioGroup(entry, key);
    return renderItem(entry, key);
  };

  const triggerEl = cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
  });

  return (
    <>
      <span ref={anchorRef} className={styles.anchor} onClick={onAnchorClick} onKeyDown={onAnchorKeyDown}>
        {triggerEl}
      </span>
      {open && isClient
        ? createPortal(
            <div
              ref={panelRef}
              id={menuId}
              role="menu"
              aria-label={label}
              aria-orientation="vertical"
              tabIndex={-1}
              className={cn(styles.menu, className)}
              onKeyDown={onPanelKeyDown}
            >
              {items.map(renderEntry)}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
