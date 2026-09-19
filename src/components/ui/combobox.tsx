"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { alignedLeft, computedDirection } from "../../lib/placement";
import { useLabels } from "../../provider";
import styles from "./combobox.module.css";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  /** Right-aligned secondary text, e.g. a code or balance. */
  meta?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  /** Text of the empty field. Default: the "combobox.placeholder" label. */
  placeholder?: string;
  /** Text when the search matches nothing. Default: the "combobox.empty" label. */
  emptyText?: string;
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
  id?: string;
  disabled?: boolean;
  className?: string | undefined;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

interface ListPosition {
  /** Viewport coordinates of the list; its width is the width of the field. */
  left: number;
  width: number;
  top?: number | undefined;
  bottom?: number | undefined;
  maxHeight: number;
}

const GAP = 4;

function measureAnchor(el: HTMLElement): ListPosition {
  const rect = el.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - GAP * 3;
  const spaceAbove = rect.top - GAP * 3;
  const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
  const available = placeAbove ? spaceAbove : spaceBelow;
  return {
    // The list is as wide as the field and lines up with its inline start, which is the right edge in right-to-left.
    left: alignedLeft(rect, rect.width, "start", computedDirection(el)),
    width: rect.width,
    top: placeAbove ? undefined : rect.bottom + GAP,
    bottom: placeAbove ? window.innerHeight - rect.top + GAP : undefined,
    maxHeight: Math.max(140, Math.min(320, available)),
  };
}

function matches(option: ComboboxOption, query: string): boolean {
  return [option.label, option.description, option.meta, option.value].some(
    (text) => text !== undefined && text.toLowerCase().includes(query),
  );
}

/** Searchable single-select. Listbox is portalled to document.body. */
export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  emptyText,
  size = "md",
  invalid = false,
  id,
  disabled = false,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: ComboboxProps) {
  const label = useLabels();
  const autoId = useId();
  const inputId = id ?? `combobox-${autoId}`;
  const listId = `${inputId}-listbox`;

  const [internal, setInternal] = useState<string | undefined>(undefined);
  const selectedValue = value !== undefined ? value : internal;
  const selected = options.find((option) => option.value === selectedValue);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<ListPosition | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const normalized = query.trim().toLowerCase();
  const filtered = normalized ? options.filter((option) => matches(option, normalized)) : options;
  const activeOption = open ? filtered[activeIndex] : undefined;
  const isInvalid = invalid || ariaInvalid === true || ariaInvalid === "true";

  function openList() {
    if (disabled || open) return;
    if (rootRef.current) setPosition(measureAnchor(rootRef.current));
    const selectedIndex = options.findIndex((option) => option.value === selectedValue);
    setActiveIndex(Math.max(0, selectedIndex));
    setQuery("");
    setOpen(true);
  }

  function closeList() {
    setOpen(false);
    setQuery("");
  }

  function choose(option: ComboboxOption) {
    if (value === undefined) setInternal(option.value);
    onChange?.(option.value);
    closeList();
  }

  // Outside click + reposition on scroll/resize while open.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;

    function onDocumentPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }
    function onReposition() {
      if (rootRef.current) setPosition(measureAnchor(rootRef.current));
    }
    // Keep focus in the input and stop overlay "outside click" handlers (e.g. Modal) from firing.
    function onListPress(event: Event) {
      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener("pointerdown", onDocumentPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    list?.addEventListener("pointerdown", onListPress);
    list?.addEventListener("mousedown", onListPress);
    return () => {
      document.removeEventListener("pointerdown", onDocumentPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      list?.removeEventListener("pointerdown", onListPress);
      list?.removeEventListener("mousedown", onListPress);
    };
  }, [open]);

  // Keep the active option visible.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!open && rootRef.current) setPosition(measureAnchor(rootRef.current));
    setOpen(true);
    setQuery(event.target.value);
    setActiveIndex(0);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openList();
        else setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openList();
        else setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        if (open) {
          event.preventDefault();
          if (activeOption) choose(activeOption);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          closeList();
        }
        break;
      case "Tab":
        if (open) closeList();
        break;
    }
  }

  const listStyle: CSSProperties | undefined = position
    ? {
        left: position.left,
        inlineSize: position.width,
        top: position.top,
        bottom: position.bottom,
        maxBlockSize: position.maxHeight,
      }
    : undefined;

  return (
    <div
      ref={rootRef}
      className={cn(
        styles.root,
        styles[size],
        open && styles.open,
        isInvalid && styles.invalid,
        disabled && styles.disabled,
        className,
      )}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        className={styles.input}
        disabled={disabled}
        placeholder={open && selected ? selected.label : (placeholder ?? label("combobox.placeholder"))}
        value={open ? query : (selected?.label ?? "")}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-activedescendant={activeOption ? `${listId}-option-${activeIndex}` : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={isInvalid || undefined}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={openList}
        onFocus={(event) => event.currentTarget.select()}
      />
      <button
        type="button"
        tabIndex={-1}
        className={styles.toggle}
        disabled={disabled}
        aria-label={open ? label("combobox.hide") : label("combobox.show")}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) closeList();
          else openList();
          inputRef.current?.focus();
        }}
      >
        <ChevronDown className={styles.chevron} aria-hidden="true" />
      </button>

      {open &&
        position &&
        createPortal(
          <ul ref={listRef} id={listId} role="listbox" className={styles.list} style={listStyle}>
            {filtered.length === 0 ? (
              <li role="presentation" className={styles.empty}>
                {emptyText ?? label("combobox.empty")}
              </li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === selectedValue;
                return (
                  <li
                    key={option.value}
                    id={`${listId}-option-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      styles.option,
                      index === activeIndex && styles.active,
                      isSelected && styles.selected,
                    )}
                    onMouseMove={() => {
                      if (index !== activeIndex) setActiveIndex(index);
                    }}
                    onClick={() => choose(option)}
                  >
                    <span className={styles.check} aria-hidden="true">
                      {isSelected && <Check />}
                    </span>
                    <span className={styles.text}>
                      <span className={styles.label}>{option.label}</span>
                      {option.description && <span className={styles.description}>{option.description}</span>}
                    </span>
                    {option.meta && <span className={styles.meta}>{option.meta}</span>}
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}
