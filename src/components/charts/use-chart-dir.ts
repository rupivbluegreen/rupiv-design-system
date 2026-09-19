"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useDir, type Direction } from "../../provider";

/**
 * The direction the page lays a chart out in, for the parts that follow it (legend, row labels, tooltip text) while
 * the plot itself stays left to right.
 *
 * It is read from the browser (the computed `direction` of the chart's own root element, so a right-to-left island
 * inside a left-to-right page is right too) and falls back to the provider's `dir` where the browser has none to give
 * (server render, jsdom). Put the returned ref on the chart root, the element that is NOT forced to `ltr`.
 */
export function useChartDir<T extends HTMLElement = HTMLDivElement>(): { ref: RefObject<T | null>; dir: Direction } {
  const providerDir = useDir();
  const ref = useRef<T>(null);
  const [dir, setDir] = useState<Direction>(providerDir);

  useLayoutEffect(() => {
    const computed = ref.current ? getComputedStyle(ref.current).direction : "";
    setDir(computed === "rtl" ? "rtl" : computed === "ltr" ? "ltr" : providerDir);
  }, [providerDir]);

  return { ref, dir };
}
