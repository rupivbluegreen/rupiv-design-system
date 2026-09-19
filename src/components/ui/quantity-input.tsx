"use client";

import { useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/cn";
import { useFormat } from "../../lib/use-format";
import { useLabels } from "../../provider";
import styles from "./quantity-input.module.css";

export interface QuantityInputProps {
  /** Controlled value. Without it the input keeps the value itself, starting at `defaultValue`, then `min`, then 0. */
  value?: number | undefined;
  defaultValue?: number | undefined;
  onChange?: ((n: number) => void) | undefined;
  step?: number | undefined;
  min?: number | undefined;
  max?: number | undefined;
  /** Unit suffix, e.g. "m", "kg", "rolls". */
  uom?: string | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  id?: string | undefined;
  name?: string | undefined;
  disabled?: boolean | undefined;
  /** Error styling + `aria-invalid` (same as passing `aria-invalid`). */
  invalid?: boolean | undefined;
  className?: string | undefined;
  "aria-label"?: string | undefined;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: boolean | "true" | "false" | undefined;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;
const ARABIC_DECIMAL_SEPARATOR = "\u066B";
const ARABIC_THOUSANDS_SEPARATOR = "\u066C";

/**
 * What a person typed, as plain ASCII: Arabic-Indic digits (U+0660 to U+0669) and Persian digits (U+06F0 to U+06F9) become
 * 0-9, the Arabic decimal separator (U+066B) becomes ".", and thousands separators (, and U+066C) are dropped.
 * An Arabic keyboard often types those digits, and the input would otherwise reject them silently.
 */
function normalizeTyped(text: string): string {
  return Array.from(text, (char) => {
    const code = char.codePointAt(0) ?? 0;
    if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) return String(code - ARABIC_INDIC_ZERO);
    if (code >= EXTENDED_ARABIC_INDIC_ZERO && code <= EXTENDED_ARABIC_INDIC_ZERO + 9) {
      return String(code - EXTENDED_ARABIC_INDIC_ZERO);
    }
    if (char === ARABIC_DECIMAL_SEPARATOR) return ".";
    if (char === ARABIC_THOUSANDS_SEPARATOR || char === ",") return "";
    return char;
  }).join("");
}

export function QuantityInput({
  value,
  defaultValue,
  onChange,
  step = 1,
  min,
  max,
  uom,
  size = "md",
  id,
  name,
  disabled = false,
  invalid = false,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: QuantityInputProps) {
  const label = useLabels();
  const { formatNumber } = useFormat();
  const display = (n: number) => formatNumber(n, { maximumFractionDigits: 3 });
  const [internal, setInternal] = useState<number>(defaultValue ?? min ?? 0);
  const current = value !== undefined ? value : internal;
  /** Raw text while the user is editing; null shows the formatted value. */
  const [draft, setDraft] = useState<string | null>(null);
  const isInvalid = invalid || ariaInvalid === true || ariaInvalid === "true";

  function clamp(n: number): number {
    let next = round3(n);
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    return next;
  }

  function commit(n: number): number {
    const next = clamp(n);
    if (value === undefined) setInternal(next);
    if (next !== current) onChange?.(next);
    return next;
  }

  function parsedDraft(): number {
    if (draft === null) return current;
    const n = Number.parseFloat(draft);
    return Number.isFinite(n) ? n : current;
  }

  function stepBy(direction: 1 | -1) {
    const next = commit(parsedDraft() + direction * step);
    if (draft !== null) setDraft(String(next));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = normalizeTyped(event.target.value);
    if (/^-?\d*\.?\d*$/.test(raw)) setDraft(raw);
  }

  function handleBlur() {
    if (draft !== null && draft.trim() !== "" && draft !== "-" && draft !== ".") {
      commit(parsedDraft());
    }
    setDraft(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      stepBy(1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      stepBy(-1);
    } else if (event.key === "Enter" && draft !== null) {
      const next = commit(parsedDraft());
      setDraft(String(next));
    } else if (event.key === "Escape" && draft !== null) {
      setDraft(String(current));
    }
  }

  const atMin = min !== undefined && current <= min;
  const atMax = max !== undefined && current >= max;

  return (
    <span
      className={cn(
        styles.root,
        styles[size],
        isInvalid && styles.invalid,
        disabled && styles.disabled,
        className,
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        className={styles.stepper}
        aria-label={label("quantityInput.decrease")}
        disabled={disabled || atMin}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => stepBy(-1)}
      >
        <Minus aria-hidden="true" />
      </button>
      <span className={styles.field}>
        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          role="spinbutton"
          autoComplete="off"
          className={styles.input}
          disabled={disabled}
          value={draft ?? display(current)}
          aria-valuenow={current}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={uom ? `${display(current)} ${uom}` : undefined}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={isInvalid || undefined}
          onFocus={(event) => {
            setDraft(String(current));
            const input = event.currentTarget;
            requestAnimationFrame(() => input.select());
          }}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        {uom && (
          <span className={styles.uom} aria-hidden="true">
            {uom}
          </span>
        )}
      </span>
      <button
        type="button"
        tabIndex={-1}
        className={styles.stepper}
        aria-label={label("quantityInput.increase")}
        disabled={disabled || atMax}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => stepBy(1)}
      >
        <Plus aria-hidden="true" />
      </button>
    </span>
  );
}
