import { describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderIn } from "../../../test/harness";
import { ChartTooltip, TooltipRow, TooltipTitle } from "./chart-tooltip";

// jsdom has no layout. The tests give the tooltip a size (60 by 40) and check the arithmetic that places it. They
// prove the position does not depend on the page direction; they do not prove how it looks in right-to-left.

function withSize(width: number, height: number) {
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(height);
}

function transformOf(container: HTMLElement): string {
  return container.querySelector<HTMLElement>("[style*='translate']")?.style.transform ?? "";
}

function tooltip(x: number, y: number, dir?: "ltr" | "rtl") {
  return (
    <div style={{ position: "relative" }}>
      <ChartTooltip x={x} y={y} containerWidth={300} containerHeight={200} dir={dir}>
        <TooltipTitle>Title</TooltipTitle>
        <TooltipRow color="red" label="Name" value="-12" />
      </ChartTooltip>
    </div>
  );
}

describe("ChartTooltip position", () => {
  it.each(LOCALE_CASES)("goes to the right of and above the anchor, measured from the left edge ($locale)", ({ locale }) => {
    withSize(60, 40);
    const view = renderIn(locale, tooltip(100, 80));
    expect(transformOf(view.container)).toBe("translate(112px, 28px)");
  });

  it.each(LOCALE_CASES)("flips to the left of the anchor when there is no room on the right ($locale)", ({ locale }) => {
    withSize(60, 40);
    const view = renderIn(locale, tooltip(280, 80));
    expect(transformOf(view.container)).toBe("translate(208px, 28px)");
  });

  it.each(LOCALE_CASES)("goes below the anchor when there is no room above ($locale)", ({ locale }) => {
    withSize(60, 40);
    const view = renderIn(locale, tooltip(100, 10));
    expect(transformOf(view.container)).toBe("translate(112px, 22px)");
  });

  it.each(LOCALE_CASES)("is kept inside the container ($locale)", ({ locale }) => {
    withSize(60, 40);
    expect(transformOf(renderIn(locale, tooltip(-50, 500)).container)).toBe("translate(0px, 160px)");
  });

  it("puts the same box at the same place in both languages", () => {
    withSize(60, 40);
    const en = transformOf(renderIn("en", tooltip(150, 90)).container);
    const ar = transformOf(renderIn("ar", tooltip(150, 90)).container);
    expect(ar).toBe(en);
  });

  it.each(LOCALE_CASES)("is shown once placed ($locale)", ({ locale }) => {
    withSize(60, 40);
    const view = renderIn(locale, tooltip(100, 80));
    expect(view.container.querySelector<HTMLElement>("[style*='translate']")?.style.visibility).toBe("visible");
  });
});

describe("ChartTooltip direction", () => {
  it.each(LOCALE_CASES)("sits in a left-to-right layer and writes its words in the page direction ($locale, $dir)", ({ locale, dir }) => {
    const view = renderIn(locale, tooltip(100, 80));
    const layer = view.container.querySelector("[dir='ltr']");
    expect(layer).not.toBeNull();
    expect(layer?.getAttribute("aria-hidden")).toBe("true");
    const content = view.container.querySelector("[dir]:not([aria-hidden])[dir='" + dir + "']");
    expect(content?.textContent).toContain("Title");
    // the positioned box is inside the layer, and the words are inside the box
    expect(layer?.contains(content ?? null)).toBe(true);
    expect(content?.parentElement?.style.transform).toMatch(/^translate\(/);
    expect(content?.parentElement?.getAttribute("dir")).toBeNull();
  });

  it("takes the direction of the words from the dir prop before the provider's", () => {
    const view = renderIn("en", tooltip(100, 80, "rtl"));
    expect(view.container.querySelector("[dir='rtl']")?.textContent).toContain("Title");
  });
});

describe("TooltipRow", () => {
  it("shows a swatch only when given a color, and keeps the value together in a bdi", () => {
    const view = renderIn(
      "ar",
      <div>
        <TooltipRow color="red" label="Name" value="-12" />
        <TooltipRow label="Plain" value="3" />
      </div>,
    );
    const rows = Array.from(view.container.firstElementChild?.children ?? []);
    expect(rows[0]?.querySelectorAll("span")).toHaveLength(3);
    expect(rows[1]?.querySelectorAll("span")).toHaveLength(2);
    expect(rows[0]?.querySelector("bdi")?.textContent).toBe("-12");
  });
});
