"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { cn } from "../../lib/cn";
import styles from "./chart.module.css";

/**
 * Width of SVG text, measured, not guessed.
 *
 * Every text on a chart axis has to be fitted to the room it has: a label that does not fit is shortened with an
 * ellipsis, and a label that would touch its neighbour is left out. The width of a word depends on the font and the
 * script (Latin, Arabic and digits all differ), so `useTextMeasure` reads it from the browser: two hidden <text>
 * elements inside the chart's own <svg> (same font as the axis labels) are asked for `getComputedTextLength()`.
 *
 * Measuring needs the element on the page, so it happens after the first render: until a text has been measured its
 * width is an estimate, and the chart draws once more when the real widths are in (one extra render per new text).
 * Where the browser cannot measure (server render, jsdom, a hidden chart) the estimate stays. A screen that knows its
 * fonts can pass its own `measureText` and skip the DOM.
 */

/** The width in px of `text` at the axis label size. `strong` is the heavier weight used for names and marker labels. */
export type TextMeasure = (text: string, strong?: boolean) => number;

/** Horizontal ellipsis, U+2026. */
export const ELLIPSIS = "\u{2026}";

/**
 * Average width in px of one character at the axis label size. The estimate used only until a text is measured and
 * where the browser cannot measure. It is the one place in the charts that assumes a width.
 */
export const ESTIMATED_CHAR_WIDTH = 6.2;

const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

/** Whole characters (letters with their marks), so a cut never splits one. */
function graphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text);
}

/** The estimate: characters times the average width. */
export function estimateTextWidth(text: string): number {
  return graphemes(text).length * ESTIMATED_CHAR_WIDTH;
}

/**
 * `text`, or its start followed by an ellipsis so the result is at most `maxWidth` wide. Cuts at the logical end of
 * the text, which is the left end of Arabic; a cut never splits a letter from its marks. Never returns more than the
 * ellipsis when even that does not fit.
 */
export function fitText(text: string, maxWidth: number, measure: TextMeasure, strong = false): string {
  if (measure(text, strong) <= maxWidth) return text;
  const chars = graphemes(text);
  const shortened = (kept: number) => `${chars.slice(0, kept).join("").trimEnd()}${ELLIPSIS}`;
  let low = 0;
  let high = chars.length - 1;
  let best = 0;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (measure(shortened(middle), strong) <= maxWidth) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return shortened(best);
}

/** The widest of `texts`, 0 for none. */
export function widestText(texts: readonly string[], measure: TextMeasure, strong = false): number {
  return texts.reduce((widest, text) => Math.max(widest, measure(text, strong)), 0);
}

export interface PlacedLabel {
  /** Centre of the label, px. */
  x: number;
  text: string;
  /** The width it may take, at most `maxWidth`. */
  width: number;
}

/**
 * The labels that fit side by side: taken left to right, a label is drawn when it clears the previous drawn one by
 * `gap` px. Empty texts are skipped, so an application that only labels every fourth point passes '' for the rest.
 * Each label is at most `maxWidth` wide (longer texts are shortened by the caller with `fitText`).
 */
export function pickLabels(
  candidates: readonly { x: number; text: string }[],
  measure: TextMeasure,
  gap: number,
  maxWidth: number,
): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  let edge = Number.NEGATIVE_INFINITY;
  for (const { x, text } of candidates) {
    if (text === "") continue;
    const width = Math.min(measure(text), maxWidth);
    if (x - width / 2 < edge + gap) continue;
    placed.push({ x, text, width });
    edge = x + width / 2;
  }
  return placed;
}

export interface TextMeasurer {
  measure: TextMeasure;
  /** Render inside the chart's <svg>. It is empty when the application gave its own measurer. */
  probes: ReactElement | null;
}

/**
 * The measurer of one chart. Pass `injected` to replace the browser (tests, or a screen that knows its fonts).
 * The result changes identity when new widths have been read, so anything computed from it should be computed in render.
 */
export function useTextMeasure(injected?: TextMeasure): TextMeasurer {
  const normalRef = useRef<SVGTextElement>(null);
  const strongRef = useRef<SVGTextElement>(null);
  const wanted = useRef(new Map<string, { text: string; strong: boolean }>());
  const [known, setKnown] = useState<ReadonlyMap<string, number>>(() => new Map());

  const measure = useCallback<TextMeasure>(
    (text, strong = false) => {
      if (injected) return injected(text, strong);
      const key = `${strong ? "s" : "n"}|${text}`;
      const width = known.get(key);
      if (width !== undefined) return width;
      wanted.current.set(key, { text, strong });
      return estimateTextWidth(text);
    },
    [injected, known],
  );

  useLayoutEffect(() => {
    if (wanted.current.size === 0) return;
    const pending = [...wanted.current.entries()];
    wanted.current.clear();
    const learned = new Map<string, number>();
    for (const [key, { text, strong }] of pending) {
      const element = (strong ? strongRef : normalRef).current;
      if (!element || typeof element.getComputedTextLength !== "function") continue;
      element.textContent = text;
      const width = element.getComputedTextLength();
      if (width > 0) learned.set(key, width);
    }
    if (learned.size > 0) setKnown((before) => new Map([...before, ...learned]));
  });

  // A web font that arrives after the first measurement changes every width: measure again.
  useEffect(() => {
    if (injected || typeof document === "undefined" || !document.fonts) return;
    const remeasure = () => setKnown(new Map());
    document.fonts.addEventListener("loadingdone", remeasure);
    return () => document.fonts.removeEventListener("loadingdone", remeasure);
  }, [injected]);

  const probes = injected ? null : (
    <>
      <text ref={normalRef} className={cn(styles.axisLabel, styles.probe)} x={0} y={0} aria-hidden="true" />
      <text ref={strongRef} className={cn(styles.axisLabel, styles.axisStrong, styles.probe)} x={0} y={0} aria-hidden="true" />
    </>
  );

  return { measure, probes };
}
