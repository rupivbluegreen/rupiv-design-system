"use client";

import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./tooltip.module.css";

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  side?: "top" | "bottom" | "left" | "right";
}

const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const DELAY = 300;
const GAP = 6;
const MARGIN = 8;

function placeTip(anchor: HTMLElement, tip: HTMLElement, side: NonNullable<TooltipProps["side"]>) {
  const r = anchor.getBoundingClientRect();
  const { width, height } = tip.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let resolved = side;
  if (side === "top" && r.top - GAP - height < MARGIN) resolved = "bottom";
  else if (side === "bottom" && r.bottom + GAP + height > vh - MARGIN) resolved = "top";
  else if (side === "left" && r.left - GAP - width < MARGIN) resolved = "right";
  else if (side === "right" && r.right + GAP + width > vw - MARGIN) resolved = "left";

  let top: number;
  let left: number;
  switch (resolved) {
    case "bottom":
      top = r.bottom + GAP;
      left = r.left + r.width / 2 - width / 2;
      break;
    case "left":
      top = r.top + r.height / 2 - height / 2;
      left = r.left - GAP - width;
      break;
    case "right":
      top = r.top + r.height / 2 - height / 2;
      left = r.right + GAP;
      break;
    default:
      top = r.top - GAP - height;
      left = r.left + r.width / 2 - width / 2;
  }
  left = Math.max(MARGIN, Math.min(left, vw - MARGIN - width));
  top = Math.max(MARGIN, Math.min(top, vh - MARGIN - height));
  tip.style.top = `${Math.round(top)}px`;
  tip.style.left = `${Math.round(left)}px`;
  tip.dataset.side = resolved;
}

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
        onPointerDown={hide}
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
