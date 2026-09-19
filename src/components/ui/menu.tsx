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
import { cn } from "../../lib/cn";
import { useLink } from "../../provider";
import styles from "./menu.module.css";

export interface MenuItem {
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  shortcut?: string;
  disabled?: boolean;
}

export interface MenuProps {
  /** A button element. Receives aria-haspopup / aria-expanded; clicks toggle the menu. */
  trigger: ReactElement;
  items: (MenuItem | "separator")[];
  align?: "start" | "end";
  /** Accessible name for the menu. */
  label?: string;
  className?: string | undefined;
}

const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const GAP = 4;
const MARGIN = 8;

function placePanel(anchor: HTMLElement, panel: HTMLElement, align: "start" | "end") {
  const r = anchor.getBoundingClientRect();
  panel.style.minWidth = `${Math.max(r.width, 180)}px`;
  const { width, height } = panel.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = r.bottom + GAP;
  let side = "bottom";
  if (top + height > vh - MARGIN && r.top - GAP - height >= MARGIN) {
    top = r.top - GAP - height;
    side = "top";
  }
  let left = align === "end" ? r.right - width : r.left;
  left = Math.max(MARGIN, Math.min(left, vw - MARGIN - width));
  panel.style.top = `${Math.round(top)}px`;
  panel.style.left = `${Math.round(left)}px`;
  panel.dataset.side = side;
}

function menuItems(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'));
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

    placePanel(anchor, panel, align);
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

  const renderItem = (item: MenuItem, i: number) => {
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
    const className = cn(styles.item, item.danger && styles.danger);
    const onClick = (e: MouseEvent<HTMLElement>) => {
      if (item.disabled) {
        e.preventDefault();
        return;
      }
      focusTrigger();
      setOpen(false);
      item.onSelect?.();
    };
    const onMouseEnter = (e: MouseEvent<HTMLElement>) => {
      if (!item.disabled) e.currentTarget.focus({ preventScroll: true });
    };

    if (item.href && !item.disabled) {
      return (
        <Link
          key={i}
          href={item.href}
          role="menuitem"
          tabIndex={-1}
          className={className}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
        >
          {content}
        </Link>
      );
    }
    return (
      <button
        key={i}
        type="button"
        role="menuitem"
        tabIndex={-1}
        aria-disabled={item.disabled || undefined}
        className={className}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
      >
        {content}
      </button>
    );
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
              {items.map((item, i) =>
                item === "separator" ? (
                  <div key={i} role="separator" className={styles.separator} />
                ) : (
                  renderItem(item, i)
                ),
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
