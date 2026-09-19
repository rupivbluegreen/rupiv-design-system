"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/types";
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
    if (process.env.NODE_ENV !== "production") {
      console.warn("useToast() called outside <ToastProvider>; toast ignored:", options.title);
    }
    return "";
  },
  {
    toast: () => "",
    dismiss: () => {},
  },
);

export interface ToastProviderProps {
  children?: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const isClient = useIsClient();
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const api = useMemo(() => createApi(setToasts), []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {isClient
        ? createPortal(
            <div className={styles.region} aria-live="polite" aria-relevant="additions" role="region" aria-label="Notifications">
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
        aria-label="Dismiss notification"
        title="Dismiss"
      >
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
