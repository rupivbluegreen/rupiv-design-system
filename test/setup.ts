// Test setup: unmount after every test and fill in the browser APIs jsdom does not have.
// These are plain functions, not vi.fn(), so restoreMocks in the Vitest config never resets them.
// Test files that opt into the node environment (`// @vitest-environment node`) skip all of it.
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly scrollMargin = "0px";
  readonly thresholds: readonly number[] = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof window !== "undefined") {
  afterEach(() => {
    cleanup();
    document.body.removeAttribute("style");
    document.body.replaceChildren();
  });

  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = ResizeObserverStub;
  }

  if (typeof globalThis.IntersectionObserver === "undefined") {
    globalThis.IntersectionObserver = IntersectionObserverStub;
  }

  // matchMedia: nothing matches, listeners are accepted and never called.
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  // jsdom implements neither scrolling nor pointer capture.
  if (typeof Element.prototype.scrollIntoView !== "function") {
    Element.prototype.scrollIntoView = () => {};
  }
  if (typeof Element.prototype.scrollTo !== "function") {
    Element.prototype.scrollTo = () => {};
  }
  window.scrollTo = () => {};

  if (typeof Element.prototype.setPointerCapture !== "function") {
    Element.prototype.setPointerCapture = () => {};
  }
  if (typeof Element.prototype.releasePointerCapture !== "function") {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (typeof Element.prototype.hasPointerCapture !== "function") {
    Element.prototype.hasPointerCapture = () => false;
  }
}
