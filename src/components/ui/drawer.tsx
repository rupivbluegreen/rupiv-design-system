"use client";

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { useLabels } from "../../provider";
import styles from "./drawer.module.css";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Panel width in px (default: the `--drawer-w` token, 480). Capped to the viewport. */
  width?: number;
  /**
   * The edge the panel slides in from: `"end"` (default) is the inline end, the right edge in English and the left in
   * Arabic; `"start"` is the inline start, for a navigation drawer.
   */
  side?: "start" | "end";
  footer?: ReactNode;
  className?: string | undefined;
  children?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

function focusables(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0 || el === document.activeElement,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width,
  side = "end",
  footer,
  className,
  children,
}: DrawerProps) {
  const label = useLabels();
  const isClient = useIsClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    if (!open || !isClient) return;
    const panel = panelRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingInlineEnd;
    // The page scrollbar is at the inline end in both directions (right in English, left in Arabic), and it
    // disappears with the scroll, so its width is kept as padding on that side.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingInlineEnd = `${scrollbar}px`;

    if (panel) {
      const auto = panel.querySelector<HTMLElement>("[autofocus], [data-autofocus]");
      const first = focusables(panel).find((el) => !el.hasAttribute("data-dialog-close"));
      (auto ?? first ?? panel).focus({ preventScroll: true });
    }

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingInlineEnd = prevPadding;
      if (previous && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, isClient]);

  if (!open || !isClient) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const els = focusables(panel);
    const active = document.activeElement;
    const first = els[0];
    const last = els[els.length - 1];
    if (!first || !last) {
      e.preventDefault();
      panel.focus();
      return;
    }
    if (!panel.contains(active)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onOverlayMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className={styles.root} onKeyDown={onKeyDown}>
      <div className={styles.overlay} aria-hidden="true" onMouseDown={onOverlayMouseDown} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        data-side={side}
        className={cn(styles.panel, className)}
        style={width !== undefined ? { inlineSize: width } : undefined}
      >
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2 id={titleId} className={cn("t-heading-s", styles.title)}>
              {title}
            </h2>
            {subtitle ? (
              <p id={subtitleId} className={cn("t-body-s", styles.subtitle)}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={label("drawer.close")}
            title={label("drawer.close")}
            data-dialog-close=""
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer ? (
          <div className={styles.footer} data-overlay-footer="">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
