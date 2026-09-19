import { Check } from "lucide-react";
import { cn } from "../../lib/cn";
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

export function Stepper({ steps, current, orientation = "horizontal", className }: StepperProps) {
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
                {state === "completed" ? <span className="sr-only"> (completed)</span> : null}
              </span>
              {step.description ? <span className={styles.description}>{step.description}</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
