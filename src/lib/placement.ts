/**
 * Where a floating layer (menu, popover, tooltip, combobox list) goes.
 *
 * The layers are `position: fixed` and portalled to <body>, so a script gives them viewport coordinates.
 * Those coordinates are physical (`left`, `top`), but the choices are logical: "start" and "end" mean the
 * inline start and inline end of the ANCHOR, read from its computed `direction` when the layer opens, so an
 * anchor in a right-to-left page (or a right-to-left island in a left-to-right page) is placed correctly
 * whatever the provider says. Time axes and other things that never flip are not placed with this file.
 *
 * The maths is in pure functions over plain boxes so tests can feed them rectangles in both directions;
 * jsdom has no layout, so a test mocks getBoundingClientRect and reads the result.
 */
import type { Direction } from "../provider/provider";

/** Space kept between a layer and the edge of the viewport, in px. */
export const VIEWPORT_MARGIN = 8;

export type InlineAlign = "start" | "end" | "center";
export type BlockSide = "top" | "bottom";
export type InlineSide = "start" | "end";

/** The part of a DOMRect that placement reads. */
export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/** The direction the browser lays `element` out in (`ltr` or `rtl`), inherited from `dir` and CSS. */
export function computedDirection(element: Element): Direction {
  return getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
}

/** The area a fixed layer can use: the page without its vertical scrollbar. */
export function viewportSize(): Viewport {
  return {
    width: document.documentElement.clientWidth || window.innerWidth,
    height: window.innerHeight,
  };
}

/** Keeps `value` between `min` and `max`; when there is not enough room (`max` below `min`), `min` wins. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Left edge of a box `width` wide, aligned to the inline start, the inline end or the centre of the anchor.
 * Start is the left edge in left-to-right and the right edge in right-to-left.
 */
export function alignedLeft(anchor: Box, width: number, align: InlineAlign, dir: Direction): number {
  if (align === "center") return anchor.left + anchor.width / 2 - width / 2;
  const alignLeftEdge = (align === "start") === (dir === "ltr");
  return alignLeftEdge ? anchor.left : anchor.right - width;
}

export interface BlockOptions {
  dir: Direction;
  /** Which edge of the anchor the layer lines up with. */
  align: InlineAlign;
  /** Preferred side. The layer flips to the other one when it does not fit and the other does. */
  side: BlockSide;
  /** Space between the anchor and the layer, in px. */
  gap: number;
  margin?: number;
}

export interface BlockPlacement {
  left: number;
  top: number;
  /** The side it ended up on, after flipping. */
  side: BlockSide;
}

/** Below or above the anchor (menu, popover, and the top and bottom tooltip). */
export function placeBlock(anchor: Box, size: Size, viewport: Viewport, options: BlockOptions): BlockPlacement {
  const margin = options.margin ?? VIEWPORT_MARGIN;
  const above = anchor.top - options.gap - size.height;
  const below = anchor.bottom + options.gap;
  const fitsAbove = above >= margin;
  const fitsBelow = below + size.height <= viewport.height - margin;

  let side = options.side;
  if (side === "bottom" && !fitsBelow && fitsAbove) side = "top";
  else if (side === "top" && !fitsAbove && fitsBelow) side = "bottom";

  return {
    left: clamp(alignedLeft(anchor, size.width, options.align, options.dir), margin, viewport.width - margin - size.width),
    top: clamp(side === "top" ? above : below, margin, viewport.height - margin - size.height),
    side,
  };
}

export interface InlineOptions {
  dir: Direction;
  /** Preferred side: the inline start or inline end of the anchor. Flips when it does not fit and the other does. */
  side: InlineSide;
  gap: number;
  margin?: number;
}

export interface InlinePlacement {
  left: number;
  top: number;
  /** The side it ended up on, after flipping. */
  side: InlineSide;
}

/** Beside the anchor, centred on it vertically (the start and end tooltip). */
export function placeInline(anchor: Box, size: Size, viewport: Viewport, options: InlineOptions): InlinePlacement {
  const { dir } = options;
  const margin = options.margin ?? VIEWPORT_MARGIN;
  const leftOfAnchor = anchor.left - options.gap - size.width;
  const rightOfAnchor = anchor.right + options.gap;
  const fitsLeft = leftOfAnchor >= margin;
  const fitsRight = rightOfAnchor + size.width <= viewport.width - margin;

  // The start of the anchor is on its left in left-to-right and on its right in right-to-left.
  const preferLeft = (options.side === "start") === (dir === "ltr");
  let useLeft = preferLeft;
  if (preferLeft && !fitsLeft && fitsRight) useLeft = false;
  else if (!preferLeft && !fitsRight && fitsLeft) useLeft = true;

  return {
    left: clamp(useLeft ? leftOfAnchor : rightOfAnchor, margin, viewport.width - margin - size.width),
    top: clamp(anchor.top + anchor.height / 2 - size.height / 2, margin, viewport.height - margin - size.height),
    side: useLeft === (dir === "ltr") ? "start" : "end",
  };
}

/**
 * Size of a fixed layer as it will be laid out. It is first moved to the viewport origin so an earlier placement
 * (or the static position, which is the right edge in right-to-left) cannot squeeze it.
 */
export function measureFloating(element: HTMLElement): Size {
  element.style.left = "0px";
  element.style.top = "0px";
  const { width, height } = element.getBoundingClientRect();
  return { width, height };
}

/** Writes a placement to the element: viewport coordinates, and `data-side` for the enter animation. */
export function applyPlacement(element: HTMLElement, placement: { left: number; top: number; side: string }): void {
  element.style.left = `${Math.round(placement.left)}px`;
  element.style.top = `${Math.round(placement.top)}px`;
  element.dataset["side"] = placement.side;
}
