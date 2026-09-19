"use client";

import {
  cloneElement,
  useEffect,
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
import { cn } from "@/lib/cn";
import styles from "./popover.module.css";

export interface PopoverProps {
  trigger: ReactElement;
  children?: ReactNode;
  align?: "start" | "end";
  /** Panel width in px. Defaults to content width (min 240px). */
  width?: number;
  /** Controlled open state. Omit for uncontrolled. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const GAP = 6;
const MARGIN = 8;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function placePanel(anchor: HTMLElement, panel: HTMLElement, align: "start" | "end") {
  const r = anchor.getBoundingClientRect();
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

export function Popover({
  trigger,
  children,
  align = "start",
  width,
  open: openProp,
  onOpenChange,
  className,
}: PopoverProps) {
  const isClient = useIsClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : internalOpen;
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openedByKeyboard = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  const panelId = useId();

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const setOpen = (next: boolean) => {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  // Position + dismissal listeners
  useLayoutEffect(() => {
    if (!open || !isClient) return;
    const panel = panelRef.current;
    const anchorWrap = anchorRef.current;
    const anchor = anchorWrap?.firstElementChild;
    if (!panel || !anchorWrap || !(anchor instanceof HTMLElement)) return;

    const place = () => placePanel(anchor, panel, align);
    place();
    if (openedByKeyboard.current) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus({ preventScroll: true });
    }

    const requestClose = () => {
      if (!controlled) setInternalOpen(false);
      onOpenChangeRef.current?.(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panel.contains(target) || anchorWrap.contains(target)) return;
      requestClose();
    };
    const onScroll = (e: Event) => {
      if (e.target instanceof Node && panel.contains(e.target)) return;
      place();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open, isClient, align, controlled]);

  const onAnchorClick = (e: MouseEvent<HTMLSpanElement>) => {
    if (e.defaultPrevented) return;
    openedByKeyboard.current = e.detail === 0;
    setOpen(!open);
  };

  const onPanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      const el = anchorRef.current?.firstElementChild;
      if (el instanceof HTMLElement) el.focus({ preventScroll: true });
    }
  };

  const triggerEl = cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    "aria-haspopup": "dialog",
    "aria-expanded": open,
    "aria-controls": open ? panelId : undefined,
  });

  return (
    <>
      <span ref={anchorRef} className={styles.anchor} onClick={onAnchorClick}>
        {triggerEl}
      </span>
      {open && isClient
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              tabIndex={-1}
              className={cn(styles.popover, className)}
              style={width ? { width } : undefined}
              onKeyDown={onPanelKeyDown}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
