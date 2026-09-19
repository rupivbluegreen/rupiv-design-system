import { Children, cloneElement, isValidElement, useId } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "../../lib/cn";
import styles from "./field.module.css";

export interface FieldProps {
  label: string;
  /** id of the control. When omitted, an id is generated and injected into a single child element. */
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  /** Right-aligned slot on the label row, e.g. a "Use party default" link button. */
  labelAction?: ReactNode;
  className?: string | undefined;
  children: ReactNode;
}

/** Extra HTML attributes forwarded to Field's root `<div>` (e.g. `data-span`, `id`, `style`). */
export type FieldRootAttributes = Omit<HTMLAttributes<HTMLDivElement>, "children" | keyof FieldProps>;

type InjectableProps = {
  id?: string;
  role?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

/** Native elements a `<label htmlFor>` already names. */
const LABELABLE_TAGS = new Set(["input", "select", "textarea", "button", "meter", "output", "progress"]);

/**
 * Label + control + hint/error. When `children` is a single element, Field wires
 * `id`, `aria-describedby` (hint / error) and `aria-invalid` onto it.
 * For children that are not native form controls (e.g. SegmentedControl, RadioGroup)
 * `<label htmlFor>` doesn't name them, so Field also passes `aria-labelledby` pointing at its label —
 * unless the child already sets `aria-label` / `aria-labelledby`.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  optional = false,
  labelAction,
  className,
  children,
  ...rest
}: FieldProps & FieldRootAttributes) {
  const autoId = useId();
  const controlId = htmlFor ?? `field-${autoId}`;
  const labelId = `${controlId}-label`;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  let control: ReactNode = children;
  if (Children.count(children) === 1 && isValidElement(children)) {
    const child = children as ReactElement<InjectableProps>;
    const extra: InjectableProps = {};
    if (!child.props.id) extra.id = controlId;
    if (describedBy) {
      extra["aria-describedby"] = child.props["aria-describedby"]
        ? `${child.props["aria-describedby"]} ${describedBy}`
        : describedBy;
    }
    if (error) extra["aria-invalid"] = true;

    const isNativeTag = typeof child.type === "string";
    const isLabelable = isNativeTag && LABELABLE_TAGS.has(child.type as string);
    // Plain DOM elements only get a name when they carry a role (naming a generic <div> is prohibited).
    const canName = isNativeTag ? !isLabelable && Boolean(child.props.role) : true;
    const alreadyNamed = Boolean(child.props["aria-label"] || child.props["aria-labelledby"]);
    // Only when the control id is Field's own (the label points at it); an explicit htmlFor may target something else.
    const labelTargetsChild = !child.props.id || child.props.id === controlId;
    if (canName && !alreadyNamed && labelTargetsChild) extra["aria-labelledby"] = labelId;

    control = cloneElement(child, extra);
  }

  return (
    <div {...rest} className={cn(styles.root, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={controlId} id={labelId} className={styles.label}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          )}
          {optional && !required && <span className={styles.optional}>(optional)</span>}
        </label>
        {labelAction && <div className={styles.labelAction}>{labelAction}</div>}
      </div>
      {control}
      {error ? (
        <p id={errorId} className={styles.error}>
          <CircleAlert className={styles.errorIcon} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
