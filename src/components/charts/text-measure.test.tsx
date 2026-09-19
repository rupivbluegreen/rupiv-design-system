import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ELLIPSIS, ESTIMATED_CHAR_WIDTH, estimateTextWidth, fitText, pickLabels, useTextMeasure, widestText } from "./text-measure";

// jsdom has no SVG text layout: `getComputedTextLength` does not exist there. These tests inject a measurer for the
// pure functions and give the SVG element a stand-in for the hook. They prove the fitting logic, not that the real
// browser's widths are right (that is for the screenshots in the application).

const TEN_PER_CHARACTER = (text: string) => Array.from(text).length * 10;

describe("fitText", () => {
  it("returns the text when it fits", () => {
    expect(fitText("Riyadh", 60, TEN_PER_CHARACTER)).toBe("Riyadh");
    expect(fitText("Riyadh", 100, TEN_PER_CHARACTER)).toBe("Riyadh");
  });

  it("cuts at the end and adds an ellipsis so the result fits", () => {
    const fitted = fitText("Riyadh central", 80, TEN_PER_CHARACTER);
    expect(fitted).toBe(`Riyadh${ELLIPSIS}`);
    expect(TEN_PER_CHARACTER(fitted)).toBeLessThanOrEqual(80);
    expect(fitted.endsWith(ELLIPSIS)).toBe(true);
  });

  it("does not leave a space in front of the ellipsis", () => {
    expect(fitText("ab cdef", 40, TEN_PER_CHARACTER)).toBe(`ab${ELLIPSIS}`);
  });

  it("cuts the logical end of Arabic text and never splits a letter from its marks", () => {
    const arabic = "مرحبا بالعالم";
    const fitted = fitText(arabic, 70, TEN_PER_CHARACTER);
    expect(arabic.startsWith(fitted.slice(0, -1).trimEnd())).toBe(true);
    expect(TEN_PER_CHARACTER(fitted)).toBeLessThanOrEqual(70);

    const acute = String.fromCodePoint(0x301);
    const marked = `e${acute}e${acute}e${acute}e${acute}`;
    const cut = fitText(marked, 30, (text) => Array.from(text.replaceAll(acute, "")).length * 10);
    expect(cut).toBe(`e${acute}e${acute}${ELLIPSIS}`);
  });

  it("gives the ellipsis alone when nothing else fits", () => {
    expect(fitText("Riyadh", 5, TEN_PER_CHARACTER)).toBe(ELLIPSIS);
  });

  it("asks for the heavier weight when told the text is strong", () => {
    const seen: (boolean | undefined)[] = [];
    fitText("abcdef", 30, (text, strong) => {
      seen.push(strong);
      return text.length * 10;
    }, true);
    expect(seen.every((strong) => strong === true)).toBe(true);
  });
});

describe("widestText and estimateTextWidth", () => {
  it("finds the widest text, 0 for none", () => {
    expect(widestText(["a", "abcd", "ab"], TEN_PER_CHARACTER)).toBe(40);
    expect(widestText([], TEN_PER_CHARACTER)).toBe(0);
  });

  it("estimates by characters when nothing has been measured", () => {
    expect(estimateTextWidth("abcd")).toBeCloseTo(4 * ESTIMATED_CHAR_WIDTH);
    expect(estimateTextWidth("")).toBe(0);
  });
});

describe("pickLabels", () => {
  it("skips empty texts and keeps labels that clear each other by the gap", () => {
    const candidates = [
      { x: 20, text: "aa" },
      { x: 40, text: "" },
      { x: 60, text: "bb" },
      { x: 80, text: "cc" },
      { x: 100, text: "dd" },
    ];
    // each label is 20 wide: 20 spans 10 to 30, 60 spans 50 to 70, 80 spans 70 to 90 (touching, which a gap of 0 allows)
    expect(pickLabels(candidates, TEN_PER_CHARACTER, 0, 100).map((label) => label.text)).toEqual(["aa", "bb", "cc", "dd"]);
    expect(pickLabels(candidates, TEN_PER_CHARACTER, 10, 100).map((label) => label.text)).toEqual(["aa", "bb", "dd"]);
  });

  it("caps the width a label may take", () => {
    const [only] = pickLabels([{ x: 50, text: "a very long label" }], TEN_PER_CHARACTER, 0, 60);
    expect(only?.width).toBe(60);
  });
});

/** Shows what the hook measures, and how often it drew. */
function Probe({ texts, injected }: { texts: string[]; injected?: (text: string, strong?: boolean) => number }) {
  const { measure, probes } = useTextMeasure(injected);
  return (
    <svg>
      {probes}
      <desc data-testid="widths">{texts.map((text) => measure(text)).join(",")}</desc>
      <desc data-testid="strong">{texts.map((text) => measure(text, true)).join(",")}</desc>
    </svg>
  );
}

function defineTextLength(perCharacter: (strong: boolean) => number) {
  Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
    configurable: true,
    value(this: SVGElement) {
      const strong = this.getAttribute("class")?.includes("axisStrong") ?? false;
      return (this.textContent ?? "").length * perCharacter(strong);
    },
  });
}

afterEach(() => {
  Reflect.deleteProperty(SVGElement.prototype, "getComputedTextLength");
});

describe("useTextMeasure", () => {
  it("uses the injected measurer and renders no probe elements", () => {
    const view = render(<Probe texts={["abc"]} injected={(text) => text.length * 7} />);
    expect(view.getByTestId("widths").textContent).toBe("21");
    expect(view.container.querySelectorAll("text")).toHaveLength(0);
  });

  it("estimates where the browser cannot measure (jsdom has no getComputedTextLength) and does not loop", () => {
    const view = render(<Probe texts={["abc"]} />);
    expect(Number(view.getByTestId("widths").textContent)).toBeCloseTo(3 * ESTIMATED_CHAR_WIDTH);
    expect(view.container.querySelectorAll("text")).toHaveLength(2);
  });

  it("reads the real width from the hidden text elements and draws again with it", () => {
    defineTextLength((strong) => (strong ? 9 : 7));
    const view = render(<Probe texts={["abc", "de"]} />);
    expect(view.getByTestId("widths").textContent).toBe("21,14");
    expect(view.getByTestId("strong").textContent).toBe("27,18");
  });

  it("keeps the estimate for a text the browser reports as 0 wide (hidden chart) instead of caching a wrong 0", () => {
    defineTextLength(() => 0);
    const view = render(<Probe texts={["abc"]} />);
    expect(Number(view.getByTestId("widths").textContent)).toBeCloseTo(3 * ESTIMATED_CHAR_WIDTH);
  });

  it("measures again when a web font finishes loading", () => {
    const listeners = new Set<() => void>();
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: {
        addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
      },
    });
    try {
      let perCharacter = 7;
      Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
        configurable: true,
        value(this: SVGElement) {
          return (this.textContent ?? "").length * perCharacter;
        },
      });
      const view = render(<Probe texts={["abc"]} />);
      expect(view.getByTestId("widths").textContent).toBe("21");
      perCharacter = 11;
      act(() => {
        for (const listener of listeners) listener();
      });
      expect(view.getByTestId("widths").textContent).toBe("33");
      view.unmount();
      expect(listeners.size).toBe(0);
    } finally {
      Reflect.deleteProperty(document, "fonts");
    }
  });
});
