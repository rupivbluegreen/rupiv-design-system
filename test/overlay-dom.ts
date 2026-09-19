// jsdom stand-ins for the two things floating layers read from the browser: the direction an element is laid out
// in, and the rectangles of an anchor and its layer. They let a test put a layer in a known place and check where
// the code puts it. They prove the placement logic; they do not prove that right-to-left looks right (that is for
// the screenshots in the application).
import { vi } from "vitest";

/**
 * jsdom does not inherit `direction` from a `dir` attribute the way a browser does. This makes
 * getComputedStyle(el).direction follow the nearest `dir` attribute (ltr when there is none). Call it in
 * beforeEach; the config restores mocks after every test.
 */
export function emulateDirectionInheritance(): void {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((element: Element, pseudo?: string | null) => {
    const style = real(element, pseudo);
    const holder = element.closest("[dir]");
    style.setProperty("direction", holder?.getAttribute("dir") === "rtl" ? "rtl" : "ltr");
    return style;
  });
}

/** A DOMRect from a corner and a size. */
export function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  };
}

const EMPTY = rect(0, 0, 0, 0);

/** Makes getBoundingClientRect answer with `pick(element)`, or an empty rectangle when it returns undefined. */
export function mockRects(pick: (element: Element) => DOMRect | undefined): void {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    return pick(this) ?? EMPTY;
  });
}

/** The visible page: `window.innerWidth` and `innerHeight`, which is what placement falls back to in jsdom. */
export function setViewport(width: number, height: number): void {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(height);
}

/**
 * Fake timers that Testing Library and user-event can live with. Testing Library only advances a fake clock for
 * Jest, so under Vitest every `await user.click()` waits on a timer that never fires. The `jest` stand-in below is
 * what its check looks for. Pair with restoreClock() in afterEach.
 */
export function useFakeClock(): void {
  vi.useFakeTimers();
  Object.assign(globalThis, { jest: { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) } });
}

export function restoreClock(): void {
  Reflect.deleteProperty(globalThis, "jest");
  vi.useRealTimers();
}

/**
 * jsdom has no layout, so getClientRects() is always empty and code that skips invisible elements (the focus
 * trap of Modal and Drawer) sees none. This gives every element one box, except those inside a `hidden` element.
 */
export function mockVisibleElements(): void {
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
    const boxes: DOMRect[] = this.closest("[hidden]") ? [] : [rect(0, 0, 10, 10)];
    return Object.assign(boxes, { item: (index: number): DOMRect | null => boxes[index] ?? null });
  });
}
