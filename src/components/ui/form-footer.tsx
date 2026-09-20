"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "../../lib/cn";
import { useLabels } from "../../provider";
import styles from "./form-footer.module.css";

export interface FormFooterProps {
  /** Text or a node at the inline start, next to the unsaved-changes text when `dirty` (for example a reason). */
  status?: ReactNode;
  /** True while the form has changes that are not saved: shows "Unsaved changes" and announces when it flips. */
  dirty?: boolean | undefined;
  /** The accessible name of the group. Default: the label `formFooter.label`. */
  label?: string | undefined;
  className?: string | undefined;
  /** The actions, at the inline end, in reading order: the primary action last (the inline end in both directions). */
  children?: ReactNode;
}

/**
 * A sticky action bar at the block end of a form: status at the inline start, actions at the inline end. It sticks
 * to the bottom of its scroll container, so put it as the last child of the form, and not inside an element that
 * clips its overflow. A group with a name, not a landmark: a `<footer>` inside a form has no role.
 */
export function FormFooter({ status, dirty = false, label: name, className, children }: FormFooterProps) {
  const label = useLabels();
  return (
    <div role="group" aria-label={name ?? label("formFooter.label")} className={cn(styles.footer, className)}>
      <div className={styles.start}>
        {/* Always in the page, so a change in it is announced. The clean text is for screen readers only. */}
        <span role="status" aria-live="polite" aria-atomic="true">
          {dirty ? (
            <span className={styles.unsaved}>
              <Info aria-hidden="true" />
              {label("formFooter.unsaved")}
            </span>
          ) : (
            <span className="sr-only">{label("formFooter.clean")}</span>
          )}
        </span>
        {status ? <span className={styles.status}>{status}</span> : null}
      </div>
      {children ? <div className={styles.actions}>{children}</div> : null}
    </div>
  );
}
