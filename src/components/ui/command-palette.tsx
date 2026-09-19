"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent as ReactFocusEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { Search } from "lucide-react";
import { cn } from "../../lib/cn";
import { useLabels, useLink, useNavigate } from "../../provider";
import { Kbd } from "./kbd";
import styles from "./command-palette.module.css";

export interface CommandPaletteItem {
  id: string;
  label: string;
  /** Secondary text after the label, for example the module and the console it belongs to. Searched too. */
  meta?: string;
  href: string;
  /** More text the search matches but the list does not show, for example the title in the other language. */
  keywords?: string;
}

export interface CommandPaletteProps {
  /** Everything that can be found. The palette filters this list; results keep its order. */
  items: readonly CommandPaletteItem[];
  /** Placeholder, and the accessible name of the input unless `aria-label` is given. Default: the "commandPalette.placeholder" label. */
  placeholder?: string | undefined;
  "aria-label"?: string | undefined;
  /** A single key that focuses the input from anywhere on the page, for example "/". Shown as a hint while the box is empty. */
  shortcut?: string | undefined;
  /** The most results shown. Default 8. */
  maxResults?: number;
  className?: string | undefined;
  id?: string | undefined;
}

const DEFAULT_MAX_RESULTS = 8;

/** Bidirectional marks that arrive with pasted text and are never typed. */
const BIDI_MARKS = /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g;
/** Arabic short vowels and other marks above and below the letters (U+0610 to U+061A, U+064B to U+065F, U+0670, U+06D6 to U+06ED) and the tatweel (U+0640). */
const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
/** Arabic-Indic (U+0660 to U+0669) and Persian (U+06F0 to U+06F9) digits. */
const EASTERN_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;
/** Alef with hamza or madda (U+0622, U+0623, U+0625) and alef wasla (U+0671): all become a plain alef (U+0627). */
const ALEF_FORMS = /[\u0622\u0623\u0625\u0671]/g;
/** Alef maqsura (U+0649) becomes yeh (U+064A). */
const ALEF_MAQSURA = /\u0649/g;
/** Teh marbuta (U+0629) becomes heh (U+0647). */
const TEH_MARBUTA = /\u0629/g;

/**
 * The form in which text is compared by the palette, so that a person finds what they mean however they typed it.
 *
 * - Unicode NFKC, so presentation forms of Arabic letters from pasted text become the plain letters.
 * - Bidirectional marks are removed.
 * - Arabic: short vowels and tatweel are removed; the alef forms with hamza or madda become a plain alef, alef maqsura
 *   becomes yeh and teh marbuta becomes heh, as in the Lucene Arabic normaliser.
 * - Arabic-Indic and Persian digits become 0 to 9.
 * - Lower case, and runs of white space become one space.
 *
 * Not done: stemming, hamza on waw and yeh, and any transliteration between Arabic and Latin.
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(BIDI_MARKS, "")
    .replace(ARABIC_MARKS, "")
    .replace(EASTERN_DIGITS, (digit) => String(digit.charCodeAt(0) & 0x0f))
    .replace(ALEF_FORMS, "\u0627")
    .replace(ALEF_MAQSURA, "\u064A")
    .replace(TEH_MARBUTA, "\u0647")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

interface IndexedItem {
  item: CommandPaletteItem;
  /** The normalised text of the label, meta and keywords, compared one by one. */
  fields: string[];
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

/**
 * A search box with a list of results under it (not a modal): type to filter `items`, arrows to choose, Enter to go.
 * The list is a listbox that hangs from the inline-start edge of the box, so it lines up with the box in Arabic too.
 * Enter goes through the provider's `navigate`; a click on a result is a normal link, through the provider's link
 * component. Filtering is described at `normalizeSearchText`.
 */
export function CommandPalette({
  items,
  placeholder,
  "aria-label": ariaLabel,
  shortcut,
  maxResults = DEFAULT_MAX_RESULTS,
  className,
  id,
}: CommandPaletteProps) {
  const label = useLabels();
  const Link = useLink();
  const navigate = useNavigate();
  const baseId = useId();
  const listboxId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const indexed = useMemo<IndexedItem[]>(
    () =>
      items.map((item) => ({
        item,
        fields: [item.label, item.meta, item.keywords]
          .filter((text): text is string => text !== undefined)
          .map(normalizeSearchText)
          .filter((text) => text !== ""),
      })),
    [items],
  );

  const needle = normalizeSearchText(query);
  const cap = Math.max(1, Math.floor(maxResults));
  const results = useMemo(
    () =>
      needle === ""
        ? []
        : indexed
            .filter((entry) => entry.fields.some((field) => field.includes(needle)))
            .slice(0, cap)
            .map((entry) => entry.item),
    [indexed, needle, cap],
  );

  const shown = open && needle !== "";
  const expanded = shown && results.length > 0;
  const activeIndex = Math.min(active, results.length - 1);
  const placeholderText = placeholder ?? label("commandPalette.placeholder");
  const announcement = needle === "" ? "" : results.length > 0 ? label("commandPalette.count", { count: results.length }) : label("commandPalette.empty");

  // A key that focuses the input from anywhere, unless the person is typing somewhere else.
  useEffect(() => {
    if (!shortcut) return;
    const key = shortcut.toLowerCase();
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== key) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shortcut]);

  // Keep the highlighted result in view when the list scrolls.
  useEffect(() => {
    if (!expanded) return;
    document.getElementById(`${baseId}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [expanded, activeIndex, baseId]);

  function reset() {
    setQuery("");
    setOpen(false);
    setActive(0);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setOpen(true);
    setActive(0);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (needle === "") return;
        event.preventDefault();
        if (!shown) {
          setOpen(true);
        } else if (results.length > 0) {
          const step = event.key === "ArrowDown" ? 1 : -1;
          setActive((activeIndex + step + results.length) % results.length);
        }
        return;
      }
      case "Enter": {
        const result = expanded ? results[activeIndex] : undefined;
        if (!result) return;
        event.preventDefault();
        navigate(result.href);
        reset();
        return;
      }
      case "Escape": {
        // One layer at a time: the list, then the text.
        if (shown) {
          setOpen(false);
          event.stopPropagation();
        } else if (query !== "") {
          setQuery("");
          event.stopPropagation();
        }
        return;
      }
    }
  }

  function onBlur(event: ReactFocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }

  // Pressing on the list must not take the focus from the input, or the list would close before the click lands.
  function keepFocus(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  return (
    <div role="search" className={cn(styles.root, className)} data-shell="search" onBlur={onBlur}>
      <div className={styles.field}>
        <Search className={styles.icon} aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="search"
          role="combobox"
          className={styles.input}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholderText}
          aria-label={ariaLabel ?? placeholderText}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-activedescendant={expanded ? optionId(activeIndex) : undefined}
          aria-keyshortcuts={shortcut}
          value={query}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
        />
        {shortcut && query === "" ? (
          <Kbd className={styles.kbd} aria-hidden="true">
            {shortcut}
          </Kbd>
        ) : null}
      </div>

      <div className={styles.popup} hidden={!shown} data-shell="search-popup">
        <div
          id={listboxId}
          role="listbox"
          aria-label={label("commandPalette.results")}
          className={styles.list}
          hidden={!expanded}
          onMouseDown={keepFocus}
        >
          {results.map((result, index) => (
            <Link
              key={result.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              tabIndex={-1}
              href={result.href}
              className={styles.option}
              data-active={index === activeIndex ? "true" : "false"}
              onMouseMove={() => setActive(index)}
              onClick={reset}
            >
              <span className={styles.optionLabel}>{result.label}</span>
              {result.meta ? <span className={styles.meta}>{result.meta}</span> : null}
            </Link>
          ))}
        </div>
        {shown && results.length === 0 ? (
          <div className={styles.empty} aria-hidden="true" data-shell="search-empty">
            {label("commandPalette.empty")}
          </div>
        ) : null}
      </div>

      <div role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
