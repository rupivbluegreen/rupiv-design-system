"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "../../lib/cn";
import type { Tone } from "../../lib/types";
import { useLabels } from "../../provider";
import styles from "./toast.module.css";

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  tone?: Tone;
  action?: ReactNode;
  /** Auto-dismiss after ms (default 4500). */
  duration?: number;
}

/**
 * `const toast = useToast(); toast({ title })` — or destructure: `const { toast, dismiss } = useToast()`.
 */
export interface ToastApi {
  (options: ToastOptions): string;
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

interface ToastRecord extends ToastOptions {
  id: string;
}

const MAX_VISIBLE = 5;
const DEFAULT_DURATION = 4500;

const ToastContext = createContext<ToastApi | null>(null);

const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

/** Toast ids are only minted from event handlers (never during render). */
let toastSeq = 0;
function nextToastId(): string {
  toastSeq += 1;
  return `toast-${toastSeq}`;
}

function createApi(setToasts: (update: (list: ToastRecord[]) => ToastRecord[]) => void): ToastApi {
  const dismiss = (id: string) => setToasts((list) => list.filter((t) => t.id !== id));
  const push = (options: ToastOptions) => {
    const id = nextToastId();
    setToasts((list) => [...list, { ...options, id }].slice(-MAX_VISIBLE));
    return id;
  };
  return Object.assign(push, { toast: push, dismiss });
}

const fallbackToast: ToastApi = Object.assign(
  (options: ToastOptions) => {
    // Always warns (no process.env in a framework-free package): a toast outside the provider is a mistake anywhere.
    console.warn("useToast() called outside <ToastProvider>; toast ignored:", options.title);
    return "";
  },
  {
    toast: () => "",
    dismiss: () => {},
  },
);

/** Space kept between the stack and the footer it clears, in px. */
const LIFT_GAP = 8;

/**
 * Keeps the stack above the footer of an open drawer or modal (never on top of its buttons): sets --rd-toast-lift on
 * the region, which its CSS adds to the bottom inset. Drawer and Modal mark their footer with `data-overlay-footer`;
 * a layer opening or closing is a change to the children of <body>, where they are portalled.
 */
function liftAboveFooters(region: HTMLElement): void {
  region.style.setProperty("--rd-toast-lift", "0px");
  const stack = region.getBoundingClientRect();
  let lift = 0;
  for (const footer of document.querySelectorAll<HTMLElement>("[data-overlay-footer]")) {
    const box = footer.getBoundingClientRect();
    const overlapsAcross = box.width > 0 && box.right > stack.left && box.left < stack.right;
    if (overlapsAcross && stack.bottom > box.top - LIFT_GAP) {
      lift = Math.max(lift, Math.ceil(stack.bottom - box.top + LIFT_GAP));
    }
  }
  region.style.setProperty("--rd-toast-lift", `${lift}px`);
}

function useToastLift(regionRef: RefObject<HTMLElement | null>, active: boolean): void {
  useLayoutEffect(() => {
    const region = regionRef.current;
    if (!region || !active) return;
    const update = () => liftAboveFooters(region);
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      region.style.removeProperty("--rd-toast-lift");
    };
  }, [regionRef, active]);
}

export interface ToastProviderProps {
  children?: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const label = useLabels();
  const isClient = useIsClient();
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const api = useMemo(() => createApi(setToasts), []);
  const regionRef = useRef<HTMLDivElement>(null);
  useToastLift(regionRef, isClient && toasts.length > 0);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {isClient
        ? createPortal(
            <div
              ref={regionRef}
              className={styles.region}
              aria-live="polite"
              aria-relevant="additions"
              role="region"
              aria-label={label("toast.region")}
            >
              {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} onDismiss={api.dismiss} />
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? fallbackToast;
}

const ICONS: Record<Tone, ReactNode> = {
  neutral: <Info />,
  accent: <Info />,
  info: <Info />,
  success: <CircleCheck />,
  warning: <TriangleAlert />,
  danger: <CircleAlert />,
};

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: string) => void }) {
  const label = useLabels();
  const [paused, setPaused] = useState(false);
  const tone = toast.tone ?? "neutral";
  const duration = toast.duration ?? DEFAULT_DURATION;

  useEffect(() => {
    if (paused || duration <= 0) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [paused, duration, onDismiss, toast.id]);

  return (
    <div
      className={cn(styles.toast, styles[tone])}
      role={tone === "danger" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className={styles.icon} aria-hidden="true">
        {ICONS[tone]}
      </span>
      <div className={styles.content}>
        <div className={styles.title}>{toast.title}</div>
        {toast.description ? <div className={styles.description}>{toast.description}</div> : null}
        {toast.action ? <div className={styles.action}>{toast.action}</div> : null}
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={() => onDismiss(toast.id)}
        aria-label={label("toast.dismiss")}
        title={label("toast.dismissTitle")}
      >
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
