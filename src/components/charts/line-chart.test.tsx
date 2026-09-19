import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AR_CHART_LABELS, expectNoChartEnglish } from "../../../test/chart-labels";
import { SIX_PER_CHARACTER, drawnTexts, pointerAt, svgOf } from "../../../test/chart-dom";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { emulateDirectionInheritance } from "../../../test/overlay-dom";
import { LineChart, type LineChartProps } from "./line-chart";

// jsdom has no layout: the chart is 600 px wide, its text is six px per character (the measureText prop), and the
// positions are read back from the SVG. These tests prove the geometry logic (band, markers, label fitting, what is
// announced, that the plot stays left to right and the tooltip is placed from the left edge). They do not prove how
// the chart looks in right-to-left; that is for the screenshots in the application.

beforeEach(emulateDirectionInheritance);

const labels = ["00", "03", "06", "09", "12"];
const expected = { name: "Expected", data: [12, 8, 30, 44, 38], color: "chart-1" };
const band = { low: [9, 5, 24, 36, 30], high: [16, 11, 37, 52, 46] };

function chart(props: Partial<LineChartProps> = {}) {
  return <LineChart labels={labels} series={[expected]} measureText={SIX_PER_CHARACTER} {...props} />;
}

function xOf(container: Element, text: string): number {
  const found = drawnTexts(svgOf(container)).find((t) => t.text === text);
  if (!found) throw new Error(`no label ${text}`);
  return found.x;
}

const tooltipLayer = (container: Element) => container.querySelector("[aria-hidden='true'][dir='ltr']");

describe("LineChart names itself from the provider's labels", () => {
  it("says what it shows, in English", () => {
    const view = renderIn("en", chart());
    expect(svgOf(view.container).getAttribute("aria-label")).toBe("Line chart of Expected across 5 points from 00 to 12, values from 8 to 44.");
  });

  it("says it in Arabic when given Arabic labels, with no English left", () => {
    const view = renderIn("ar", chart({ series: [{ ...expected, name: "المتوقع" }] }), { labels: AR_CHART_LABELS });
    const name = svgOf(view.container).getAttribute("aria-label") ?? "";
    expect(name).toContain("رسم خطي");
    expect(name).toContain("نقاط");
    expectNoChartEnglish(view.container);
  });

  it("uses the plural of the language for one point", () => {
    const en = renderIn("en", <LineChart labels={["x"]} series={[{ name: "A", data: [5] }]} measureText={SIX_PER_CHARACTER} />);
    expect(svgOf(en.container).getAttribute("aria-label")).toContain("across 1 point from");
    const ar = renderIn("ar", <LineChart labels={["x"]} series={[{ name: "A", data: [5] }]} measureText={SIX_PER_CHARACTER} />, {
      labels: AR_CHART_LABELS,
    });
    expect(svgOf(ar.container).getAttribute("aria-label")).toContain("نقطة واحدة");
  });

  it("puts the screen's own name in front of the summary", () => {
    const view = renderIn("en", chart({ label: "Demand by hour" }));
    expect(svgOf(view.container).getAttribute("aria-label")).toMatch(/^Demand by hour\. Line chart of Expected/);
  });

  it("joins the series names with the language's separator", () => {
    const series = [expected, { name: "Actual", data: [1, 2, 3, 4, 5] }];
    expect(svgOf(renderIn("en", chart({ series })).container).getAttribute("aria-label")).toContain("Expected, Actual");
    const ar = renderIn("ar", chart({ series }), { labels: AR_CHART_LABELS });
    expect(svgOf(ar.container).getAttribute("aria-label")).toContain("Expected، Actual");
  });

  it("writes the axis in the language's compact words", () => {
    const big = { name: "Cases", data: [1000, 8000, 14000], color: "chart-1" };
    const en = renderIn("en", <LineChart labels={["a", "b", "c"]} series={[big]} measureText={SIX_PER_CHARACTER} />);
    expect(drawnTexts(svgOf(en.container)).map((t) => t.text)).toContain("15K");
    const ar = renderIn("ar", <LineChart labels={["a", "b", "c"]} series={[big]} measureText={SIX_PER_CHARACTER} />, { labels: AR_CHART_LABELS });
    expect(drawnTexts(svgOf(ar.container)).map((t) => t.text)).toContain("15 ألف");
  });

  it("takes a screen's own format for the axis and the summary", () => {
    const view = renderIn("en", chart({ format: (n) => `${n}%` }));
    const texts = drawnTexts(svgOf(view.container)).map((t) => t.text);
    expect(texts).toContain("40%");
    expect(svgOf(view.container).getAttribute("aria-label")).toContain("values from 8% to 44%");
  });
});

describe("LineChart direction", () => {
  it.each(LOCALE_CASES)("keeps the plot left to right and the legend on the page direction ($locale, $dir)", ({ locale, dir }) => {
    const view = renderIn(locale, chart({ series: [expected, { name: "Actual", data: [1, 2, 3, 4, 5] }] }));
    const svg = svgOf(view.container);
    const plot = svg.parentElement;
    expect(plot?.getAttribute("dir")).toBe("ltr");
    // the legend is a sibling of the plot, not inside it, and the root does not force a direction
    const root = plot?.parentElement;
    expect(root?.getAttribute("dir")).toBeNull();
    expect(root?.querySelector("ul")).not.toBeNull();
    expect(plot?.contains(root?.querySelector("ul") ?? null)).toBe(false);
    expect(view.container.getAttribute("dir")).toBe(dir);
  });

  it("puts the same point at the same x in both languages", () => {
    const { en, ar } = renderBoth(chart());
    expect(xOf(ar.container, "06")).toBe(xOf(en.container, "06"));
    expect(xOf(ar.container, "00")).toBeLessThan(xOf(ar.container, "12"));
  });
});

describe("LineChart band", () => {
  it("shades between low and high with a legend entry named from the labels", () => {
    const { en } = renderBoth(chart({ band }));
    const shape = en.container.querySelector("[data-part='band']");
    expect(shape?.getAttribute("d")).toMatch(/^M.*Z$/);
    expect(shape?.getAttribute("fill")).toBe("var(--chart-1)");
    const entries = Array.from(en.container.querySelectorAll("li")).map((li) => li.textContent);
    expect(entries).toEqual(["Expected", "Likely range"]);

    const ar = renderIn("ar", chart({ band }), { labels: AR_CHART_LABELS });
    expect(Array.from(ar.container.querySelectorAll("li")).map((li) => li.textContent)).toEqual(["Expected", "النطاق المرجح"]);
  });

  it("takes its own name and color", () => {
    const view = renderIn("en", chart({ band: { ...band, name: "Range", color: "var(--chart-3)" } }));
    expect(view.container.querySelector("[data-part='band']")?.getAttribute("fill")).toBe("var(--chart-3)");
    expect(Array.from(view.container.querySelectorAll("li")).map((li) => li.textContent)).toContain("Range");
  });

  it("draws one closed shape with the high edge first and the low edge back", () => {
    const view = renderIn("en", chart({ band }));
    const d = view.container.querySelector("[data-part='band']")?.getAttribute("d") ?? "";
    expect(d.match(/M/g)).toHaveLength(1);
    expect(d.match(/L/g)).toHaveLength(9); // 4 more high points, 5 low points
    expect(d.endsWith("Z")).toBe(true);
  });

  it("breaks the shape where a point has no value", () => {
    const view = renderIn("en", chart({ band: { low: [9, 5, Number.NaN, 36, 30], high: band.high } }));
    const d = view.container.querySelector("[data-part='band']")?.getAttribute("d") ?? "";
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d.match(/Z/g)).toHaveLength(2);
  });

  it("has no shape for a single point that has both edges", () => {
    const view = renderIn("en", chart({ band: { low: [Number.NaN, Number.NaN, 24, Number.NaN, Number.NaN], high: band.high } }));
    expect(view.container.querySelector("[data-part='band']")).toBeNull();
  });

  it("makes room on the value axis for the high edge", () => {
    const tall = { low: band.low, high: [16, 11, 37, 88, 46] };
    const without = drawnTexts(svgOf(renderIn("en", chart()).container)).map((t) => t.text);
    const withBand = drawnTexts(svgOf(renderIn("en", chart({ band: tall })).container)).map((t) => t.text);
    expect(without).not.toContain("100");
    expect(withBand).toContain("100");
  });

  it("shows the range in the tooltip", () => {
    const view = renderIn("en", chart({ band }));
    pointerAt(svgOf(view.container), xOf(view.container, "09"));
    const tip = tooltipLayer(view.container);
    expect(tip?.textContent).toContain("Likely range");
    expect(tip?.textContent).toContain("36 to 52");
    const ar = renderIn("ar", chart({ band }), { labels: AR_CHART_LABELS });
    pointerAt(svgOf(ar.container), xOf(ar.container, "09"));
    expect(tooltipLayer(ar.container)?.textContent).toContain("من 36 إلى 52");
  });
});

describe("LineChart markers", () => {
  const markers = [
    { index: 1, label: "Today" },
    { index: 3.5, label: "Event" },
  ];

  it("draws a labelled vertical line at each position, on the same x as the point label of that index", () => {
    const view = renderIn("en", chart({ markers }));
    const lines = Array.from(view.container.querySelectorAll("[data-part='marker'] line"));
    expect(lines).toHaveLength(2);
    expect(Number(lines[0]?.getAttribute("x1"))).toBe(xOf(view.container, "03"));
    // half way between the point labelled 09 and the point labelled 12
    expect(Number(lines[1]?.getAttribute("x1"))).toBeCloseTo((xOf(view.container, "09") + xOf(view.container, "12")) / 2, 1);
    const texts = drawnTexts(svgOf(view.container)).map((t) => t.text);
    expect(texts).toContain("Today");
    expect(texts).toContain("Event");
  });

  it("puts a marker label just after its line, starting there", () => {
    const view = renderIn("en", chart({ markers: [{ index: 1, label: "Today" }] }));
    const line = view.container.querySelector("[data-part='marker'] line");
    const label = drawnTexts(svgOf(view.container)).find((t) => t.text === "Today");
    expect(label?.anchor).toBe("start");
    expect(label?.x).toBe(Number(line?.getAttribute("x1")) + 4);
  });

  it("puts the label before the line, ending there, when there is no room after it", () => {
    const view = renderIn("en", chart({ markers: [{ index: 4, label: "The last point" }] }));
    const line = view.container.querySelector("[data-part='marker'] line");
    const label = drawnTexts(svgOf(view.container)).find((t) => t.text === "The last point");
    expect(label?.anchor).toBe("end");
    expect(label?.x).toBe(Number(line?.getAttribute("x1")) - 4);
  });

  it("keeps the line and leaves the label out when it would touch the previous label", () => {
    const view = renderIn("en", chart({ markers: [{ index: 1, label: "A long first label" }, { index: 1.2, label: "Second" }] }));
    expect(view.container.querySelectorAll("[data-part='marker'] line")).toHaveLength(2);
    const texts = drawnTexts(svgOf(view.container)).map((t) => t.text);
    expect(texts).toContain("A long first label");
    expect(texts).not.toContain("Second");
  });

  it("draws a line without a label for a marker with none, and skips markers outside the chart", () => {
    const view = renderIn("en", chart({ markers: [{ index: 2 }, { index: 99, label: "Far" }, { index: -1, label: "Before" }] }));
    expect(view.container.querySelectorAll("[data-part='marker'] line")).toHaveLength(1);
    const texts = drawnTexts(svgOf(view.container)).map((t) => t.text);
    expect(texts).not.toContain("Far");
    expect(texts).not.toContain("Before");
  });

  it("orders them by position whatever order they are given in", () => {
    const view = renderIn("en", chart({ markers: [{ index: 3, label: "Later" }, { index: 1, label: "Sooner" }] }));
    const xs = Array.from(view.container.querySelectorAll("[data-part='marker'] line")).map((l) => Number(l.getAttribute("x1")));
    expect(xs[0]).toBeLessThan(xs[1] ?? 0);
  });

  it("names the labelled markers in what is announced, in the language's words", () => {
    const en = renderIn("en", chart({ markers }));
    expect(svgOf(en.container).getAttribute("aria-label")).toContain("Markers: Today, Event.");
    const ar = renderIn("ar", chart({ markers: [{ index: 1, label: "الفجر" }, { index: 3, label: "الظهر" }] }), { labels: AR_CHART_LABELS });
    expect(svgOf(ar.container).getAttribute("aria-label")).toContain("العلامات: الفجر، الظهر.");
    expectNoChartEnglish(ar.container);
  });

  it("does not announce markers when there are none or none is labelled", () => {
    expect(svgOf(renderIn("en", chart()).container).getAttribute("aria-label")).not.toContain("Markers");
    expect(svgOf(renderIn("en", chart({ markers: [{ index: 2 }] })).container).getAttribute("aria-label")).not.toContain("Markers");
  });

  it.each(LOCALE_CASES)("puts the marker at the same place in both languages ($locale)", ({ locale }) => {
    const view = renderIn(locale, chart({ markers: [{ index: 2, label: "Today" }] }));
    expect(Number(view.container.querySelector("[data-part='marker'] line")?.getAttribute("x1"))).toBe(xOf(view.container, "06"));
  });
});

describe("LineChart labels on the x axis", () => {
  it("shortens a label that is wider than the room it may take, and keeps the full text as its title", () => {
    const long = "A very long category name that will not fit";
    const view = renderIn("en", <LineChart labels={["a", long, "c"]} series={[{ name: "S", data: [1, 2, 3] }]} measureText={SIX_PER_CHARACTER} />);
    const drawn = drawnTexts(svgOf(view.container)).find((t) => t.title === long);
    expect(drawn?.text.endsWith("…")).toBe(true);
    expect(drawn?.text.length).toBeLessThan(long.length);
    expect(SIX_PER_CHARACTER(drawn?.text ?? "")).toBeLessThanOrEqual(100);
  });

  it("leaves out labels that would touch, and keeps the rest evenly", () => {
    const many = Array.from({ length: 30 }, (_, i) => String(i * 100));
    const view = renderIn("en", <LineChart labels={many} series={[{ name: "S", data: many.map((_, i) => i) }]} measureText={SIX_PER_CHARACTER} />);
    const drawn = drawnTexts(svgOf(view.container)).filter((t) => t.title !== null);
    expect(drawn.length).toBeGreaterThan(2);
    expect(drawn.length).toBeLessThan(30);
    for (let i = 1; i < drawn.length; i++) {
      const before = drawn[i - 1];
      const now = drawn[i];
      const gap = (now?.x ?? 0) - (before?.x ?? 0) - (SIX_PER_CHARACTER(before?.text ?? "") + SIX_PER_CHARACTER(now?.text ?? "")) / 2;
      expect(gap).toBeGreaterThanOrEqual(12);
    }
  });

  it("draws only the labels a screen gave and never a gap-filler for an empty one", () => {
    const sparse = Array.from({ length: 24 }, (_, i) => (i % 6 === 0 ? `${i}:00` : ""));
    const view = renderIn("en", <LineChart labels={sparse} series={[{ name: "S", data: sparse.map((_, i) => i) }]} measureText={SIX_PER_CHARACTER} />);
    const drawn = drawnTexts(svgOf(view.container)).filter((t) => t.title !== null).map((t) => t.text);
    expect(drawn).toEqual(["0:00", "6:00", "12:00", "18:00"]);
  });

  it("uses the browser's measurement when none is injected (a wider font draws fewer labels)", () => {
    const many = Array.from({ length: 12 }, (_, i) => `L${i}`);
    const props = { labels: many, series: [{ name: "S", data: many.map((_, i) => i) }] };
    const narrow = renderIn("en", <LineChart {...props} measureText={(text) => text.length * 4} />);
    Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
      configurable: true,
      value(this: SVGElement) {
        return (this.textContent ?? "").length * 30;
      },
    });
    try {
      const wide = renderIn("en", <LineChart {...props} />);
      const count = (container: Element) => drawnTexts(svgOf(container)).filter((t) => t.title !== null).length;
      expect(count(wide.container)).toBeLessThan(count(narrow.container));
    } finally {
      Reflect.deleteProperty(SVGElement.prototype, "getComputedTextLength");
    }
  });
});

describe("LineChart axis", () => {
  it("takes min and max for the ends of the value axis", () => {
    const view = renderIn("en", chart({ min: 0, max: 100 }));
    const texts = drawnTexts(svgOf(view.container)).map((t) => t.text);
    expect(texts).toContain("100");
  });

  it("draws the end dot of a solid line and none for a dashed one", () => {
    const solid = renderIn("en", chart());
    expect(svgOf(solid.container).querySelectorAll("circle")).toHaveLength(1);
    const dashed = renderIn("en", chart({ series: [{ ...expected, dashed: true }] }));
    expect(svgOf(dashed.container).querySelectorAll("circle")).toHaveLength(0);
    expect(svgOf(dashed.container).querySelector("path[stroke-dasharray]")).not.toBeNull();
  });

  it("breaks the line where a value is missing", () => {
    const view = renderIn("en", chart({ series: [{ ...expected, data: [12, 8, Number.NaN, 44, 38] }] }));
    const line = Array.from(svgOf(view.container).querySelectorAll("path")).find((p) => p.getAttribute("stroke") === "var(--chart-1)");
    expect(line?.getAttribute("d")?.match(/M/g)).toHaveLength(2);
  });
});

describe("LineChart tooltip", () => {
  it.each(LOCALE_CASES)("shows the point's label and every series while the pointer is over it, and hides it after ($locale)", ({ locale }) => {
    const view = renderIn(locale, chart({ series: [expected, { name: "Actual", data: [1, 2, 3, 4, 5] }] }));
    expect(tooltipLayer(view.container)).toBeNull();
    pointerAt(svgOf(view.container), xOf(view.container, "06"));
    const tip = tooltipLayer(view.container);
    expect(tip?.textContent).toContain("06");
    expect(tip?.textContent).toContain("Expected");
    expect(tip?.textContent).toContain("30");
    expect(tip?.textContent).toContain("Actual");
    fireEvent.pointerLeave(svgOf(view.container));
    expect(tooltipLayer(view.container)).toBeNull();
  });

  it("writes its words in the page direction from a layer that is always left to right", () => {
    const en = renderIn("en", chart());
    pointerAt(svgOf(en.container), xOf(en.container, "06"));
    const ar = renderIn("ar", chart());
    pointerAt(svgOf(ar.container), xOf(ar.container, "06"));
    const layer = (container: Element) => tooltipLayer(container);
    expect(layer(en.container)?.getAttribute("dir")).toBe("ltr");
    expect(layer(ar.container)?.getAttribute("dir")).toBe("ltr");
    expect(layer(en.container)?.querySelector("[dir='ltr']:not([aria-hidden])")).not.toBeNull();
    expect(layer(ar.container)?.querySelector("[dir='rtl']")).not.toBeNull();
  });

  it("places the tooltip from the left edge in both languages", () => {
    const at = (locale: "en" | "ar") => {
      const view = renderIn(locale, chart());
      pointerAt(svgOf(view.container), xOf(view.container, "06"));
      return view.container.querySelector<HTMLElement>("[style*='translate']")?.style.transform;
    };
    expect(at("ar")).toBe(at("en"));
    expect(at("en")).toMatch(/^translate\(\d+px, \d+px\)$/);
  });

  it("titles the tooltip with the point's full name when the axis labels are sparse, else the axis label, else the number", () => {
    const sparse = ["0:00", "", "", "", ""];
    const full = ["0:00", "0:15", "0:30", "0:45", "1:00"];
    const named = renderIn("en", chart({ labels: sparse, tooltipLabels: full }));
    pointerAt(svgOf(named.container), 22 + 2 * 141.5);
    expect(tooltipLayer(named.container)?.textContent).toContain("0:30");
    const axisOnly = renderIn("en", chart({ labels: sparse }));
    pointerAt(svgOf(axisOnly.container), 22 + 2 * 141.5);
    expect(tooltipLayer(axisOnly.container)?.textContent).toMatch(/^3/); // the point's number
    expect(svgOf(named.container).getAttribute("aria-label")).toContain("from 0:00 to 1:00");
  });

  it("shows a dash for a series with no value at the point", () => {
    const view = renderIn("en", chart({ series: [{ ...expected, data: [12, 8, Number.NaN, 44, 38] }] }));
    pointerAt(svgOf(view.container), xOf(view.container, "06"));
    expect(tooltipLayer(view.container)?.textContent).toContain("Expected-");
  });
});

describe("LineChart with no data", () => {
  it.each([
    { name: "no labels and no series", props: { labels: [], series: [] } },
    { name: "a series of no values", props: { labels, series: [{ name: "S", data: [] }] } },
    { name: "only missing values", props: { labels, series: [{ name: "S", data: [Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN] }] } },
  ])("says so instead of drawing ($name)", ({ props }) => {
    const en = renderIn("en", <LineChart {...props} measureText={SIX_PER_CHARACTER} />);
    expect(en.getByText("No data")).toBeTruthy();
    expect(en.container.querySelector("svg")).toBeNull();
    const ar = renderIn("ar", <LineChart {...props} measureText={SIX_PER_CHARACTER} />, { labels: AR_CHART_LABELS });
    expect(ar.getByText("لا توجد بيانات")).toBeTruthy();
    expectNoChartEnglish(ar.container);
  });
});

afterEach(() => {
  Reflect.deleteProperty(SVGElement.prototype, "getComputedTextLength");
});
