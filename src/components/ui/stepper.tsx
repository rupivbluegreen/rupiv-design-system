"use client";

import { Check } from "lucide-react";
import { cn } from "../../lib/cn";
import { useLabels } from "../../provider";
import styles from "./stepper.module.css";

export interface StepperStep {
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepperStep[];
  /** Index of the active step. Steps before it are completed. */
  current: number;
  orientation?: "horizontal" | "vertical";
  className?: string | undefined;
}

/**
 * The steps of a wizard, as a list: it shows where the person is and is not itself a control (the buttons that move
 * between steps belong to the page). In a horizontal stepper the first step starts at the inline start, and the
 * connectors run toward the inline end, so the row reads right to left in Arabic.
 */
export function Stepper({ steps, current, orientation = "horizontal", className }: StepperProps) {
  const label = useLabels();
  return (
    <ol className={cn(styles.stepper, styles[orientation], className)} role="list">
      {steps.map((step, i) => {
        const state = i < current ? "completed" : i === current ? "current" : "upcoming";
        return (
          <li
            key={`${step.label}-${i}`}
            className={cn(styles.step, styles[state])}
            aria-current={state === "current" ? "step" : undefined}
          >
            <div className={styles.marker}>
              <span className={styles.circle}>
                {state === "completed" ? <Check aria-hidden="true" strokeWidth={2.5} /> : i + 1}
              </span>
              {i < steps.length - 1 ? <span className={styles.connector} aria-hidden="true" /> : null}
            </div>
            <div className={styles.text}>
              <span className={styles.label}>
                {step.label}
                {state === "completed" ? <span className="sr-only"> {label("stepper.completed")}</span> : null}
              </span>
              {step.description ? <span className={styles.description}>{step.description}</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
