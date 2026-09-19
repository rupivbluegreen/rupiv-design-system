"use client";

import { useId, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes, Ref } from "react";
import { cn } from "../../lib/cn";
import { date } from "../../lib/date";
import { NO_VALUE } from "../../lib/locale";
import { useLabels, useLocale } from "../../provider";
import styles from "./date-input.module.css";

export interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  size?: "sm" | "md" | "lg";
  /** Marks the field invalid. A value outside `min` and `max` is marked invalid without this. */
  invalid?: boolean;
  /**
   * Shows the Hijri (Umm al-Qura) date of the chosen day under the field, for example "Hijri: 24 Rab. I 1448 AH".
   * The value stays Gregorian, and the caption text comes from the provider label "dateInput.hijriCaption".
   * The caption follows the value through `value` or `onChange`; a value set only through a ref is not seen.
   */
  showHijri?: boolean;
  ref?: Ref<HTMLInputElement>;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** True when `value` is a day before `min` or after `max`. Days in YYYY-MM-DD compare correctly as text. */
function isOutOfRange(value: string, min: string | number | undefined, max: string | number | undefined): boolean {
  if (!ISO_DAY.test(value)) return false;
  if (typeof min === "string" && ISO_DAY.test(min) && value < min) return true;
  return typeof max === "string" && ISO_DAY.test(max) && value > max;
}

/**
 * Native date input. The value is always Gregorian "YYYY-MM-DD"; the browser draws the picker.
 * Optionally shows the Hijri date under the field (`showHijri`).
 */
export function DateInput({
  size = "md",
  invalid = false,
  showHijri = false,
  className,
  ref,
  onChange,
  "aria-describedby": describedBy,
  ...rest
}: DateInputProps) {
  const locale = useLocale();
  const label = useLabels();
  const captionId = useId();
  const [typed, setTyped] = useState(typeof rest.defaultValue === "string" ? rest.defaultValue : "");

  const current = rest.value !== undefined ? String(rest.value) : typed;
  const isInvalid =
    invalid ||
    rest["aria-invalid"] === true ||
    rest["aria-invalid"] === "true" ||
    isOutOfRange(current, rest.min, rest.max);

  const hijri = showHijri && current !== "" ? date(current, { locale, calendar: "hijri" }) : NO_VALUE;
  const caption = hijri === NO_VALUE ? null : label("dateInput.hijriCaption", { date: hijri });
  const describedByIds = [describedBy, caption === null ? undefined : captionId].filter(Boolean).join(" ");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setTyped(event.target.value);
    onChange?.(event);
  }

  const input = (
    <input
      {...rest}
      ref={ref}
      type="date"
      onChange={handleChange}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedByIds || undefined}
      className={cn(styles.root, styles[size], isInvalid && styles.invalid, className)}
    />
  );

  if (!showHijri) return input;

  // The caption line is always there, so the layout does not move when a day is chosen.
  return (
    <div className={styles.wrap}>
      {input}
      <span id={captionId} className={styles.caption}>
        {caption}
      </span>
    </div>
  );
}
