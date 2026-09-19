import { describe, expect, it, vi } from "vitest";
import { emulateDirectionInheritance, rect } from "../../test/overlay-dom";
import {
  alignedLeft,
  applyPlacement,
  clamp,
  computedDirection,
  measureFloating,
  placeBlock,
  placeInline,
  viewportSize,
  type Box,
} from "./placement";
import type { Direction } from "../provider";

const DIRECTIONS: readonly Direction[] = ["ltr", "rtl"];

// An anchor 100 wide and 30 high with its corner at (400, 300), in a 1000 x 800 page.
const anchor: Box = rect(400, 300, 100, 30);
const viewport = { width: 1000, height: 800 };

describe("clamp", () => {
  it("keeps a value inside the range, and lets the minimum win when the range is empty", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(30, 0, 10)).toBe(10);
    expect(clamp(5, 8, 2)).toBe(8);
  });
});

describe("alignedLeft", () => {
  it.each([
    // dir, align, expected left of a 60 wide box
    ["ltr", "start", 400],
    ["ltr", "end", 440],
    ["ltr", "center", 420],
    ["rtl", "start", 440],
    ["rtl", "end", 400],
    ["rtl", "center", 420],
  ] as const)("%s, %s: left edge %d", (dir, align, expected) => {
    expect(alignedLeft(anchor, 60, align, dir)).toBe(expected);
  });
});

describe("placeBlock", () => {
  const size = { width: 180, height: 100 };

  it.each([
    ["ltr", "start", 400],
    ["ltr", "end", 320],
    ["rtl", "start", 320],
    ["rtl", "end", 400],
  ] as const)("below the anchor, %s, align %s: left %d", (dir, align, left) => {
    expect(placeBlock(anchor, size, viewport, { dir, align, side: "bottom", gap: 4 })).toEqual({
      left,
      top: 334,
      side: "bottom",
    });
  });

  it("goes above when there is no room below and there is above, in both directions", () => {
    const low = rect(400, 700, 100, 30);
    for (const dir of DIRECTIONS) {
      const placed = placeBlock(low, size, viewport, { dir, align: "start", side: "bottom", gap: 4 });
      expect(placed.side).toBe("top");
      expect(placed.top).toBe(596);
    }
  });

  it("goes below when a top layer has no room above", () => {
    const high = rect(400, 10, 100, 30);
    const placed = placeBlock(high, size, viewport, { dir: "ltr", align: "center", side: "top", gap: 6 });
    expect(placed.side).toBe("bottom");
    expect(placed.top).toBe(46);
  });

  it("stays on the preferred side and stays inside the page when neither side has room", () => {
    const tall = { width: 180, height: 790 };
    const placed = placeBlock(anchor, tall, viewport, { dir: "ltr", align: "start", side: "bottom", gap: 4 });
    expect(placed.side).toBe("bottom");
    // taller than the page allows: the top margin wins, the bottom is cut by the layer's own max height
    expect(placed.top).toBe(8);
  });

  it("keeps the layer 8px from the page edge on either side, whichever way the page runs", () => {
    const nearLeft = rect(2, 300, 100, 30);
    const nearRight = rect(900, 300, 98, 30);
    for (const dir of DIRECTIONS) {
      // start of a left-to-right anchor is its left edge, and of a right-to-left anchor its right edge
      expect(placeBlock(nearLeft, size, viewport, { dir, align: "end", side: "bottom", gap: 4 }).left).toBeGreaterThanOrEqual(8);
      expect(placeBlock(nearRight, size, viewport, { dir, align: "start", side: "bottom", gap: 4 }).left).toBeLessThanOrEqual(
        viewport.width - 8 - size.width,
      );
    }
  });
});

describe("placeInline", () => {
  const size = { width: 120, height: 24 };

  it("puts the start side on the left in left-to-right and on the right in right-to-left", () => {
    expect(placeInline(anchor, size, viewport, { dir: "ltr", side: "start", gap: 6 })).toEqual({
      left: 274,
      top: 303,
      side: "start",
    });
    expect(placeInline(anchor, size, viewport, { dir: "rtl", side: "start", gap: 6 })).toEqual({
      left: 506,
      top: 303,
      side: "start",
    });
  });

  it("puts the end side on the right in left-to-right and on the left in right-to-left", () => {
    expect(placeInline(anchor, size, viewport, { dir: "ltr", side: "end", gap: 6 })).toEqual({
      left: 506,
      top: 303,
      side: "end",
    });
    expect(placeInline(anchor, size, viewport, { dir: "rtl", side: "end", gap: 6 })).toEqual({
      left: 274,
      top: 303,
      side: "end",
    });
  });

  it("flips to the other side when the preferred one has no room, and reports the side it took", () => {
    const atLeftEdge = rect(10, 300, 40, 30);
    // no room on the left of an anchor at the left edge: the start side flips to the end in left-to-right,
    // and the end side flips to the start in right-to-left
    expect(placeInline(atLeftEdge, size, viewport, { dir: "ltr", side: "start", gap: 6 }).side).toBe("end");
    expect(placeInline(atLeftEdge, size, viewport, { dir: "rtl", side: "end", gap: 6 }).side).toBe("start");
    expect(placeInline(atLeftEdge, size, viewport, { dir: "ltr", side: "start", gap: 6 }).left).toBe(56);

    const atRightEdge = rect(950, 300, 40, 30);
    expect(placeInline(atRightEdge, size, viewport, { dir: "ltr", side: "end", gap: 6 }).side).toBe("start");
    expect(placeInline(atRightEdge, size, viewport, { dir: "rtl", side: "start", gap: 6 }).side).toBe("end");
  });

  it("keeps the layer inside the page vertically", () => {
    const atTop = rect(400, 0, 100, 10);
    expect(placeInline(atTop, size, viewport, { dir: "ltr", side: "end", gap: 6 }).top).toBe(8);
  });
});

describe("computedDirection", () => {
  it("reads the direction of the element itself", () => {
    const rtlBox = document.body.appendChild(document.createElement("div"));
    rtlBox.dir = "rtl";
    const plain = document.body.appendChild(document.createElement("div"));
    expect(computedDirection(rtlBox)).toBe("rtl");
    expect(computedDirection(plain)).toBe("ltr");
  });

  it("inherits from an ancestor, as in a browser (jsdom's inheritance is emulated)", () => {
    emulateDirectionInheritance();
    const island = document.body.appendChild(document.createElement("div"));
    island.dir = "rtl";
    const button = island.appendChild(document.createElement("button"));
    expect(computedDirection(button)).toBe("rtl");
    const nested = button.appendChild(document.createElement("span"));
    nested.dir = "ltr";
    expect(computedDirection(nested)).toBe("ltr");
  });
});

describe("viewportSize", () => {
  it("uses the width without the scrollbar when the browser reports it, and the window width otherwise", () => {
    expect(viewportSize().width).toBe(window.innerWidth);
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(985);
    expect(viewportSize()).toEqual({ width: 985, height: window.innerHeight });
  });
});

describe("measureFloating and applyPlacement", () => {
  it("moves the layer to the origin before measuring, then writes rounded coordinates and data-side", () => {
    const layer = document.body.appendChild(document.createElement("div"));
    layer.style.left = "900px";
    layer.style.top = "500px";
    vi.spyOn(layer, "getBoundingClientRect").mockImplementation(() => {
      // what the browser would measure: the layer has been moved to the origin by now
      expect([layer.style.left, layer.style.top]).toEqual(["0px", "0px"]);
      return rect(0, 0, 180, 96);
    });
    expect(measureFloating(layer)).toEqual({ width: 180, height: 96 });

    applyPlacement(layer, { left: 12.6, top: 40.4, side: "start" });
    expect(layer.style.left).toBe("13px");
    expect(layer.style.top).toBe("40px");
    expect(layer.dataset["side"]).toBe("start");
  });
});
