"use client";

import { useCallback, useState } from "react";

/**
 * Measure an element's content width with ResizeObserver (updates on shrink and grow).
 * Returns a callback ref and the current width. Renders `defaultWidth` on the
 * server / first client render so markup hydrates without mismatch.
 *
 * The observed element must be sized by its container, not by what you render from
 * `width` (e.g. `width: 100%; min-width: 0` with the SVG absolutely positioned inside —
 * see `.plot` / `.svg` in chart.module.css). Otherwise it can never get narrower.
 */
export function useMeasure<T extends Element = HTMLDivElement>(defaultWidth = 600) {
  const [width, setWidth] = useState(defaultWidth);

  const ref = useCallback((node: T | null) => {
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next !== undefined && next > 0) setWidth(Math.floor(next));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
