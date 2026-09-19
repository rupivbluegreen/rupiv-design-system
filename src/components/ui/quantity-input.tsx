"use client";

import { useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/cn";
import styles from "./quantity-input.module.css";

export interface QuantityInputProps {
  value?: number;
  defaultValue?: number;
  onChange?: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Unit suffix, e.g. "m", "kg", "rolls". */
  uom?: string;
  size?: "sm" | "md" | "lg";
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Error styling + `aria-invalid` (same as passing `aria-invalid`). */
  invalid?: boolean;
  className?: string | undefined;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

const displayFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
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
    const raw = event.target.value.replace(/,/g, "");
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
        aria-label="Decrease"
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
          value={draft ?? displayFormat.format(current)}
          aria-valuenow={current}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={uom ? `${displayFormat.format(current)} ${uom}` : undefined}
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
        aria-label="Increase"
        disabled={disabled || atMax}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => stepBy(1)}
      >
        <Plus aria-hidden="true" />
      </button>
    </span>
  );
}
