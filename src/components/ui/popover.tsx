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
import { cn } from "../../lib/cn";
import { applyPlacement, computedDirection, measureFloating, placeBlock, viewportSize } from "../../lib/placement";
import styles from "./popover.module.css";

export interface PopoverProps {
  trigger: ReactElement;
  children?: ReactNode;
  /** Which edge of the trigger the panel lines up with: its inline start (left in English, right in Arabic) or inline end. */
  align?: "start" | "end";
  /** Panel width in px. Defaults to content width (min 240px). */
  width?: number;
  /** Accessible name of the panel. */
  label?: string;
  /** Controlled open state. Omit for uncontrolled. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string | undefined;
}

const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const GAP = 6;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function placePopover(anchor: HTMLElement, panel: HTMLElement, align: "start" | "end") {
  const size = measureFloating(panel);
  applyPlacement(
    panel,
    placeBlock(anchor.getBoundingClientRect(), size, viewportSize(), {
      dir: computedDirection(anchor),
      align,
      side: "bottom",
      gap: GAP,
    }),
  );
}

export function Popover({
  trigger,
  children,
  align = "start",
  width,
  label,
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

  const focusTrigger = () => {
    const el = anchorRef.current?.firstElementChild;
    if (el instanceof HTMLElement) el.focus({ preventScroll: true });
  };

  // Position + dismissal listeners
  useLayoutEffect(() => {
    if (!open || !isClient) return;
    const panel = panelRef.current;
    const anchorWrap = anchorRef.current;
    const anchor = anchorWrap?.firstElementChild;
    if (!panel || !anchorWrap || !(anchor instanceof HTMLElement)) return;

    const place = () => placePopover(anchor, panel, align);
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

  // Escape closes it whether focus is in the panel or still on the trigger (a mouse click leaves it there).
  const onEscape = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Escape" || !open) return;
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    focusTrigger();
  };

  const triggerEl = cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    "aria-haspopup": "dialog",
    "aria-expanded": open,
    "aria-controls": open ? panelId : undefined,
  });

  return (
    <>
      <span ref={anchorRef} className={styles.anchor} onClick={onAnchorClick} onKeyDown={onEscape}>
        {triggerEl}
      </span>
      {open && isClient
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label={label}
              tabIndex={-1}
              className={cn(styles.popover, className)}
              style={width ? { inlineSize: width } : undefined}
              onKeyDown={onEscape}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
