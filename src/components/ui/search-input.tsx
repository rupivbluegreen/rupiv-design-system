"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, Ref, RefObject } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { useLabels } from "../../provider";
import { Kbd } from "./kbd";
import styles from "./search-input.module.css";

export interface SearchInputProps {
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  /** Default: the provider's "searchInput.placeholder". Also the accessible name unless `aria-label` is given. */
  placeholder?: string | undefined;
  /** Single key (e.g. "/") that focuses the input from anywhere on the page. Shown as a Kbd hint. */
  shortcut?: string | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  /** Disabled styling; also hides the clear button and ignores the shortcut. */
  disabled?: boolean | undefined;
  className?: string | undefined;
  id?: string | undefined;
  name?: string | undefined;
  "aria-label"?: string | undefined;
  ref?: Ref<HTMLInputElement>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

export function SearchInput({
  value,
  defaultValue = "",
  onChange,
  placeholder,
  shortcut,
  size = "md",
  disabled = false,
  className,
  id,
  name,
  "aria-label": ariaLabel,
  ref,
}: SearchInputProps) {
  const label = useLabels();
  const placeholderText = placeholder ?? label("searchInput.placeholder");
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const localRef = useRef<HTMLInputElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as RefObject<HTMLInputElement | null>).current = node;
    },
    [ref],
  );

  useEffect(() => {
    if (!shortcut || disabled) return;
    const key = shortcut.toLowerCase();
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== key) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      localRef.current?.focus();
      localRef.current?.select();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shortcut, disabled]);

  function update(next: string) {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    update(event.target.value);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (current) {
        event.preventDefault();
        update("");
      } else {
        event.currentTarget.blur();
      }
    }
  }

  return (
    <span className={cn(styles.root, styles[size], disabled && styles.disabled, className)}>
      <Search className={styles.icon} aria-hidden="true" />
      <input
        ref={setRefs}
        id={id}
        name={name}
        type="search"
        role="searchbox"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        className={styles.input}
        placeholder={placeholderText}
        aria-label={ariaLabel ?? placeholderText}
        aria-keyshortcuts={shortcut}
        value={current}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {current && !disabled ? (
        <button
          type="button"
          className={styles.clear}
          aria-label={label("searchInput.clear")}
          onClick={() => {
            update("");
            localRef.current?.focus();
          }}
        >
          <X aria-hidden="true" />
        </button>
      ) : shortcut ? (
        <Kbd className={styles.kbd} aria-hidden="true">
          {shortcut}
        </Kbd>
      ) : null}
    </span>
  );
}
