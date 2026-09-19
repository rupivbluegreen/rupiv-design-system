"use client";

import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  applyPlacement,
  computedDirection,
  measureFloating,
  placeBlock,
  placeInline,
  viewportSize,
} from "../../lib/placement";
import styles from "./tooltip.module.css";

/** Where the tooltip sits: above or below the trigger, or at its inline start or inline end (left or right in English, the reverse in Arabic). */
export type TooltipSide = "top" | "bottom" | "start" | "end";

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  /** Preferred side; the tooltip flips to the opposite one when it does not fit. `data-side` on the tooltip holds the side it took. */
  side?: TooltipSide;
}

const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

/** Hover and focus wait this long before the tooltip appears, in ms. */
const DELAY = 300;
/** A tooltip opened by tapping an aria-disabled control goes away after this long, in ms. */
const TAP_DURATION = 2600;
const GAP = 6;

function placeTip(anchor: HTMLElement, tip: HTMLElement, side: TooltipSide) {
  const anchorBox = anchor.getBoundingClientRect();
  const size = measureFloating(tip);
  const viewport = viewportSize();
  const dir = computedDirection(anchor);
  if (side === "top" || side === "bottom") {
    applyPlacement(tip, placeBlock(anchorBox, size, viewport, { dir, align: "center", side, gap: GAP }));
  } else {
    applyPlacement(tip, placeInline(anchorBox, size, viewport, { dir, side, gap: GAP }));
  }
}

/**
 * A short explanation on hover, keyboard focus and Escape-to-dismiss.
 *
 * An aria-disabled control keeps its focus and tooltip, and never acts: tapping or clicking it shows the tooltip at
 * once (a touch screen has no hover) for a few seconds, cancels the click's default action (a link does not
 * navigate) and stops the click where the application's React root receives it, before it reaches the control or
 * anything around it. That is how a screen says why an action is unavailable. A native `disabled` control gets no
 * pointer events at all, so use aria-disabled for a control that explains itself.
 */
export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const tipId = useId();

  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), DELAY);
  };
  const showNow = (hideAfter?: number) => {
    window.clearTimeout(timer.current);
    setOpen(true);
    if (hideAfter !== undefined) timer.current = window.setTimeout(() => setOpen(false), hideAfter);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useLayoutEffect(() => {
    if (!open || !isClient) return;
    const tip = tipRef.current;
    const anchor = anchorRef.current?.firstElementChild;
    if (!tip || !(anchor instanceof HTMLElement)) return;
    placeTip(anchor, tip, side);

    const close = () => setOpen(false);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, isClient, side]);

  if (content === null || content === undefined || content === "") return children;

  // The nearest aria-disabled element under the pointer, when it is (or is inside) the trigger.
  const disabledTarget = (target: EventTarget): boolean => {
    const anchor = anchorRef.current;
    if (!anchor || !(target instanceof Element)) return false;
    const found = target.closest('[aria-disabled="true"]');
    return found !== null && anchor.contains(found);
  };

  const onPointerDown = (e: PointerEvent<HTMLSpanElement>) => {
    // A press that will click something hides the tooltip; a press on a disabled control keeps it for the tap below.
    if (!disabledTarget(e.target)) hide();
  };

  const onClickCapture = (e: MouseEvent<HTMLSpanElement>) => {
    if (!disabledTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    showNow(TAP_DURATION);
  };

  const childProps = children.props as Record<string, unknown>;
  const describedBy = [childProps["aria-describedby"], open ? tipId : undefined].filter(Boolean).join(" ") || undefined;
  const child = cloneElement(children as ReactElement<Record<string, unknown>>, {
    "aria-describedby": describedBy,
  });

  return (
    <>
      <span
        ref={anchorRef}
        className={styles.anchor}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
      >
        {child}
      </span>
      {open && isClient
        ? createPortal(
            <div ref={tipRef} id={tipId} role="tooltip" className={styles.tooltip}>
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
