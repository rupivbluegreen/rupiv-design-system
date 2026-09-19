import { describe, expect, it } from "vitest";
import { AR_CHART_LABELS, expectNoChartEnglish } from "../../../test/chart-labels";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { Sparkline, type SparklineProps } from "./sparkline";

// jsdom has no layout: the tests prove what is announced, the drawing and the colors. That the svg is left to right
// is its stylesheet (`direction: ltr`), which charts.contract.test.ts reads; how it looks in right-to-left is for the
// screenshots in the application.

const values = [3, 5, 4, 8, 7, 9, 12, 10];

function spark(props: Partial<SparklineProps> = {}) {
  return <Sparkline data={values} {...props} />;
}

const svgOf = (container: Element) => container.querySelector("svg[role='img']") as SVGSVGElement;
const line = (container: Element) => Array.from(svgOf(container).querySelectorAll("path")).find((p) => p.getAttribute("fill") === "none");

describe("Sparkline names itself from the provider's labels", () => {
  it("says the length, the low, the high and the latest value, in English", () => {
    const view = renderIn("en", spark());
    expect(svgOf(view.container).getAttribute("aria-label")).toBe("Trend of 8 points, low 3, high 12, latest 10.");
  });

  it("uses the singular for one point", () => {
    expect(svgOf(renderIn("en", spark({ data: [5] })).container).getAttribute("aria-label")).toBe("Trend of 1 point, low 5, high 5, latest 5.");
  });

  it("says it in Arabic when given Arabic labels, with the plural of the language, and no English left", () => {
    const eight = renderIn("ar", spark(), { labels: AR_CHART_LABELS });
    expect(svgOf(eight.container).getAttribute("aria-label")).toBe("اتجاه من 8 نقاط، الأدنى 3، الأعلى 12، الأحدث 10.");
    const two = renderIn("ar", spark({ data: [1, 2] }), { labels: AR_CHART_LABELS });
    expect(svgOf(two.container).getAttribute("aria-label")).toContain("نقطتين");
    expectNoChartEnglish(eight.container);
    expectNoChartEnglish(two.container);
  });

  it("ignores values that are not numbers", () => {
    const view = renderIn("en", spark({ data: [1, Number.NaN, 5] }));
    expect(svgOf(view.container).getAttribute("aria-label")).toBe("Trend of 2 points, low 1, high 5, latest 5.");
  });

  it("puts the screen's own name in front, and takes its own number format", () => {
    const view = renderIn("en", spark({ label: "Cases", format: (n) => `${n}%` }));
    expect(svgOf(view.container).getAttribute("aria-label")).toBe("Cases. Trend of 8 points, low 3%, high 12%, latest 10%.");
  });

  it.each(LOCALE_CASES)("says there is no data instead of drawing a line ($locale)", ({ locale }) => {
    const view = renderIn(locale, spark({ data: [] }), locale === "ar" ? { labels: AR_CHART_LABELS } : {});
    expect(svgOf(view.container).getAttribute("aria-label")).toBe(locale === "ar" ? "لا توجد بيانات" : "No data");
    expect(view.container.querySelectorAll("path")).toHaveLength(0);
    expect(view.container.querySelectorAll("line")).toHaveLength(1);
  });
});

describe("Sparkline drawing", () => {
  it("draws the same line in both languages: a trend runs left to right", () => {
    const { en, ar } = renderBoth(spark());
    expect(line(ar.container)?.getAttribute("d")).toBe(line(en.container)?.getAttribute("d"));
    const d = line(en.container)?.getAttribute("d") ?? "";
    const xs = Array.from(d.matchAll(/[ML]([\d.]+) /g), (m) => Number(m[1]));
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("uses a chart color, or a tone's solid color", () => {
    expect(line(renderIn("en", spark({ tone: "chart-2" })).container)?.getAttribute("stroke")).toBe("var(--chart-2)");
    expect(line(renderIn("en", spark({ tone: "success" })).container)?.getAttribute("stroke")).toBe("var(--success-solid)");
    expect(line(renderIn("en", spark()).container)?.getAttribute("stroke")).toBe("var(--chart-1)");
  });

  it("marks the last point unless told not to, and shades under the line when asked", () => {
    expect(svgOf(renderIn("en", spark()).container).querySelectorAll("circle")).toHaveLength(1);
    expect(svgOf(renderIn("en", spark({ showEnd: false })).container).querySelectorAll("circle")).toHaveLength(0);
    expect(svgOf(renderIn("en", spark()).container).querySelectorAll("linearGradient")).toHaveLength(0);
    expect(svgOf(renderIn("en", spark({ area: true })).container).querySelectorAll("linearGradient")).toHaveLength(1);
  });

  it("takes its size", () => {
    const view = renderIn("en", spark({ width: 200, height: 40 }));
    expect(svgOf(view.container).getAttribute("width")).toBe("200");
    expect(svgOf(view.container).getAttribute("height")).toBe("40");
  });
});
