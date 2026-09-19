import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AR_CHART_LABELS, expectNoChartEnglish } from "../../../test/chart-labels";
import { SIX_PER_CHARACTER, drawnTexts, svgOf } from "../../../test/chart-dom";
import { LOCALE_CASES, renderIn } from "../../../test/harness";
import { emulateDirectionInheritance } from "../../../test/overlay-dom";
import { BarChart, type BarChartProps } from "./bar-chart";

// jsdom has no layout: the chart is 600 px wide and its text is six px per character (the measureText prop). The
// tests prove the geometry logic (what is announced, the mirrored horizontal layout, label fitting, the tooltip) and
// that the plot stays left to right. They do not prove how the chart looks in right-to-left; that is for the
// screenshots in the application.

beforeEach(emulateDirectionInheritance);

const data = [
  { label: "RD-C", values: [40, 12] },
  { label: "RD-N", values: [32, 10] },
  { label: "RD-E", values: [28, 9] },
];
const series = [{ name: "Field" }, { name: "Remote" }];
const single = [{ label: "Riyadh", values: [48] }, { label: "Jeddah", values: [31] }, { label: "Dammam", values: [19] }];

function chart(props: Partial<BarChartProps> = {}) {
  return <BarChart data={data} series={series} measureText={SIX_PER_CHARACTER} {...props} />;
}

const tooltipLayer = (container: Element) => container.querySelector("[aria-hidden='true'][dir='ltr']");
const bars = (container: Element) => Array.from(svgOf(container).querySelectorAll<SVGPathElement>("g path"));
const hitAreas = (container: Element) => Array.from(svgOf(container).querySelectorAll("rect[fill='transparent']"));
const firstNumber = (d: string | null) => Number(/^M(-?[\d.]+)/.exec(d ?? "")?.[1]);

function zeroLineX(container: Element): number {
  const zero = svgOf(container).querySelector("line[stroke='var(--chart-axis)']");
  return Number(zero?.getAttribute("x1"));
}

describe("BarChart names itself from the provider's labels", () => {
  it("says what it shows, in English, for each kind of chart", () => {
    const name = (props: Partial<BarChartProps>) => svgOf(renderIn("en", chart(props)).container).getAttribute("aria-label");
    expect(name({})).toBe("Grouped bar chart of 3 categories and 2 series (Field, Remote), values from 0 to 40.");
    expect(name({ stacked: true })).toBe("Stacked bar chart of 3 categories and 2 series (Field, Remote), values from 0 to 52.");
    expect(name({ horizontal: true })).toBe("Grouped horizontal bar chart of 3 categories and 2 series (Field, Remote), values from 0 to 40.");
    expect(name({ stacked: true, horizontal: true })).toContain("Stacked horizontal bar chart");
    expect(name({ data: single, series: [{ name: "Cases" }] })).toBe("Grouped bar chart of 3 categories for Cases, values from 0 to 48.");
  });

  it("uses the singular for one category", () => {
    const view = renderIn("en", chart({ data: [{ label: "A", values: [1, 2] }] }));
    expect(svgOf(view.container).getAttribute("aria-label")).toContain("of 1 category and");
  });

  it("says it in Arabic when given Arabic labels, with no English left", () => {
    const view = renderIn("ar", chart({ stacked: true, horizontal: true, series: [{ name: "ميداني" }, { name: "عن بعد" }] }), {
      labels: AR_CHART_LABELS,
    });
    const name = svgOf(view.container).getAttribute("aria-label") ?? "";
    expect(name).toContain("مخطط أعمدة أفقي");
    expect(name).toContain("متراكم");
    expect(name).toContain("ميداني، عن بعد");
    expectNoChartEnglish(view.container);
  });

  it("puts the screen's own name in front of the summary", () => {
    const view = renderIn("en", chart({ label: "Cases by zone" }));
    expect(svgOf(view.container).getAttribute("aria-label")).toMatch(/^Cases by zone\. Grouped bar chart/);
  });

  it("writes the axis in the language's compact words", () => {
    const big = [{ label: "A", values: [14000] }];
    const en = renderIn("en", <BarChart data={big} series={[{ name: "S" }]} measureText={SIX_PER_CHARACTER} />);
    expect(drawnTexts(svgOf(en.container)).map((t) => t.text)).toContain("15K");
    const ar = renderIn("ar", <BarChart data={big} series={[{ name: "S" }]} measureText={SIX_PER_CHARACTER} />, { labels: AR_CHART_LABELS });
    expect(drawnTexts(svgOf(ar.container)).map((t) => t.text)).toContain("15 ألف");
  });
});

describe("BarChart legend", () => {
  it.each(LOCALE_CASES)("lists the series when there are several, and the list follows the page ($locale, $dir)", ({ locale }) => {
    const view = renderIn(locale, chart());
    const list = view.container.querySelector("ul");
    expect(Array.from(list?.querySelectorAll("li") ?? []).map((li) => li.textContent)).toEqual(["Field", "Remote"]);
    expect(svgOf(view.container).parentElement?.contains(list ?? null)).toBe(false);
  });

  it("shows no legend for one series", () => {
    const view = renderIn("en", chart({ data: single, series: [{ name: "Cases" }] }));
    expect(view.container.querySelector("ul")).toBeNull();
  });
});

describe("BarChart direction", () => {
  it.each(LOCALE_CASES)("keeps the plot left to right ($locale, $dir)", ({ locale }) => {
    const view = renderIn(locale, chart());
    expect(svgOf(view.container).parentElement?.getAttribute("dir")).toBe("ltr");
  });

  it("does not mirror a vertical chart: categories run left to right in both languages", () => {
    const at = (locale: "en" | "ar") => {
      const view = renderIn(locale, chart());
      expect(svgOf(view.container).getAttribute("data-mirrored")).toBeNull();
      return drawnTexts(svgOf(view.container))
        .filter((t) => ["RD-C", "RD-N", "RD-E"].includes(t.text))
        .map((t) => [t.text, t.x] as const);
    };
    expect(at("ar")).toEqual(at("en"));
    const en = at("en");
    expect(en.map(([text]) => text)).toEqual(["RD-C", "RD-N", "RD-E"]);
    expect(en[0]?.[1]).toBeLessThan(en[2]?.[1] ?? 0);
  });

  describe("horizontal", () => {
    it("puts the names at the left and grows the bars to the right in a left-to-right page", () => {
      const view = renderIn("en", chart({ horizontal: true, data: single, series: [{ name: "Cases" }] }));
      expect(svgOf(view.container).getAttribute("data-mirrored")).toBeNull();
      const names = drawnTexts(svgOf(view.container)).filter((t) => t.title !== null);
      expect(names.map((t) => t.text)).toEqual(["Riyadh", "Jeddah", "Dammam"]);
      expect(names.every((t) => t.x === 2 && t.anchor === "start")).toBe(true);
      const zero = zeroLineX(view.container);
      expect(zero).toBeLessThan(300);
      for (const bar of bars(view.container)) expect(firstNumber(bar.getAttribute("d"))).toBe(zero);
    });

    it("mirrors in a right-to-left page: the names at the right, the bars growing to the left from a zero line at the right", () => {
      const view = renderIn("ar", chart({ horizontal: true, data: single, series: [{ name: "Cases" }] }));
      expect(svgOf(view.container).getAttribute("data-mirrored")).toBe("true");
      const names = drawnTexts(svgOf(view.container)).filter((t) => t.title !== null);
      expect(names.every((t) => t.x === 598 && t.anchor === "end")).toBe(true);
      const zero = zeroLineX(view.container);
      expect(zero).toBeGreaterThan(300);
      const paths = bars(view.container);
      expect(paths).toHaveLength(3);
      for (const bar of paths) expect(firstNumber(bar.getAttribute("d"))).toBe(zero);
      // the longest bar reaches furthest to the left
      const reach = paths.map((p) => Math.min(...(p.getAttribute("d") ?? "").match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 0)));
      expect(reach[0]).toBeLessThan(reach[2] ?? 0);
    });

    it("stays as in English when the screen turns mirroring off", () => {
      const view = renderIn("ar", chart({ horizontal: true, mirror: false, data: single, series: [{ name: "Cases" }] }));
      expect(svgOf(view.container).getAttribute("data-mirrored")).toBeNull();
      expect(zeroLineX(view.container)).toBeLessThan(300);
      const names = drawnTexts(svgOf(view.container)).filter((t) => t.title !== null);
      expect(names.every((t) => t.x === 2 && t.anchor === "start")).toBe(true);
    });

    it("draws the value axis labels left to right in both languages, mirrored or not", () => {
      const ticks = (locale: "en" | "ar", mirror: boolean) => {
        const view = renderIn(locale, chart({ horizontal: true, mirror, data: single, series: [{ name: "Cases" }] }));
        return drawnTexts(svgOf(view.container)).filter((t) => t.title === null && /^\d+$/.test(t.text));
      };
      const mirroredTicks = ticks("ar", true);
      expect(mirroredTicks.length).toBeGreaterThan(1);
      // zero is at the right in a mirrored chart, so its label is the right-most
      expect(mirroredTicks.find((t) => t.text === "0")?.x).toBe(Math.max(...mirroredTicks.map((t) => t.x)));
      const plainTicks = ticks("en", true);
      expect(plainTicks.find((t) => t.text === "0")?.x).toBe(Math.min(...plainTicks.map((t) => t.x)));
    });

    it("mirrors stacked bars too: the stack starts at the zero line at the right and the outer segment is rounded on its left", () => {
      const view = renderIn("ar", chart({ horizontal: true, stacked: true, data: single.map((d) => ({ ...d, values: [d.values[0] ?? 0, 5] })) }));
      // the first path of the first series' group and of the second series' group: the two segments of one stack
      const [inner, outer] = Array.from(svgOf(view.container).querySelectorAll("g")).map((g) => g.querySelector("path")?.getAttribute("d") ?? "");
      // the inner segment is a plain rectangle "M left y H right V y H left Z"; the outer one starts at its right edge
      const leftOfInner = firstNumber(inner ?? "");
      const rightOfInner = Number(/H(-?[\d.]+)V/.exec(inner ?? "")?.[1]);
      expect(rightOfInner).toBe(zeroLineX(view.container));
      expect(firstNumber(outer ?? "")).toBe(leftOfInner);
      expect(outer).toContain("Q");
      expect(inner).not.toContain("Q");
    });
  });
});

describe("BarChart labels on the category axis", () => {
  it("shortens a label wider than its band and keeps the full text as its title", () => {
    const long = "A very long category name";
    const view = renderIn("en", chart({ data: [{ label: long, values: [1, 2] }, { label: "B", values: [1, 2] }, { label: "C", values: [1, 2] }, { label: "D", values: [1, 2] }, { label: "E", values: [1, 2] }, { label: "F", values: [1, 2] }, { label: "G", values: [1, 2] }, { label: "H", values: [1, 2] }, { label: "I", values: [1, 2] }, { label: "J", values: [1, 2] }] }));
    const drawn = drawnTexts(svgOf(view.container)).find((t) => t.title === long);
    expect(drawn?.text.endsWith("…")).toBe(true);
    expect(SIX_PER_CHARACTER(drawn?.text ?? "")).toBeLessThanOrEqual(600 / 10);
  });

  it("only leaves labels out when the bands are very narrow", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ label: `c${i}`, values: [i, i] }));
    const view = renderIn("en", chart({ data: many }));
    const drawn = drawnTexts(svgOf(view.container)).filter((t) => t.title !== null);
    expect(drawn.length).toBeGreaterThan(5);
    expect(drawn.length).toBeLessThan(60);
    expect(renderIn("en", chart()).container.querySelectorAll("title")).toHaveLength(3);
  });

  it("shortens a horizontal category name to the room the names have", () => {
    const long = "Riyadh central district north";
    const view = renderIn("en", chart({ horizontal: true, data: [{ label: long, values: [10] }, { label: "Jeddah", values: [5] }], series: [{ name: "Cases" }] }));
    const name = drawnTexts(svgOf(view.container)).find((t) => t.title === long);
    expect(name?.text).toBe(long);
    const narrow = renderIn("en", <BarChart data={[{ label: long, values: [10] }]} series={[{ name: "S" }]} horizontal measureText={(text) => text.length * 60} />);
    const cut = drawnTexts(svgOf(narrow.container)).find((t) => t.title === long);
    expect(cut?.text.endsWith("…")).toBe(true);
  });

  it("leaves an empty label empty", () => {
    const view = renderIn("en", chart({ data: [{ label: "", values: [1, 2] }, { label: "B", values: [1, 2] }] }));
    expect(drawnTexts(svgOf(view.container)).filter((t) => t.title !== null).map((t) => t.text)).toEqual(["B"]);
  });
});

describe("BarChart axis and bars", () => {
  it("takes min and max for the ends of the value axis", () => {
    const view = renderIn("en", chart({ max: 100 }));
    expect(drawnTexts(svgOf(view.container)).map((t) => t.text)).toContain("100");
  });

  it("draws one bar per value that is not zero, stacked into one column per category", () => {
    expect(bars(renderIn("en", chart()).container)).toHaveLength(6);
    expect(bars(renderIn("en", chart({ stacked: true })).container)).toHaveLength(6);
    expect(bars(renderIn("en", chart({ data: [{ label: "A", values: [0, 5] }] })).container)).toHaveLength(1);
  });

  it("draws a negative value below the zero line", () => {
    const view = renderIn("en", chart({ data: [{ label: "A", values: [5, -3] }] }));
    const [up, down] = bars(view.container);
    const y = (d: string | null) => Number(/^M[\d.]+ ([\d.]+)/.exec(d ?? "")?.[1]);
    expect(up).toBeDefined();
    expect(down).toBeDefined();
    // the negative bar is drawn from the zero line down: its path starts at a larger y than the positive bar's top
    expect(y(down?.getAttribute("d") ?? "")).toBeGreaterThan(y(up?.getAttribute("d") ?? "") - 1);
  });
});

describe("BarChart tooltip", () => {
  it.each(LOCALE_CASES)("shows the category and each series while the pointer is over it, and hides it after ($locale)", ({ locale }) => {
    const view = renderIn(locale, chart());
    expect(tooltipLayer(view.container)).toBeNull();
    fireEvent.pointerEnter(hitAreas(view.container)[1] as Element);
    const tip = tooltipLayer(view.container);
    expect(tip?.textContent).toContain("RD-N");
    expect(tip?.textContent).toContain("Field");
    expect(tip?.textContent).toContain("32");
    expect(tip?.textContent).toContain("Remote");
    expect(tip?.textContent).toContain("10");
    expect(tip?.textContent).not.toContain("Total");
    fireEvent.pointerLeave(svgOf(view.container));
    expect(tooltipLayer(view.container)).toBeNull();
  });

  it("adds a total for a stacked chart, named from the labels", () => {
    const en = renderIn("en", chart({ stacked: true }));
    fireEvent.pointerEnter(hitAreas(en.container)[0] as Element);
    expect(tooltipLayer(en.container)?.textContent).toContain("Total52");
    const ar = renderIn("ar", chart({ stacked: true }), { labels: AR_CHART_LABELS });
    fireEvent.pointerEnter(hitAreas(ar.container)[0] as Element);
    expect(tooltipLayer(ar.container)?.textContent).toContain("الإجمالي52");
  });

  it("writes its words in the page direction from a layer that is always left to right, placed the same in both", () => {
    const at = (locale: "en" | "ar") => {
      const view = renderIn(locale, chart());
      fireEvent.pointerEnter(hitAreas(view.container)[1] as Element);
      const layer = tooltipLayer(view.container);
      expect(layer?.getAttribute("dir")).toBe("ltr");
      expect(layer?.querySelector(`[dir='${locale === "ar" ? "rtl" : "ltr"}']:not([aria-hidden])`)).not.toBeNull();
      return view.container.querySelector<HTMLElement>("[style*='translate']")?.style.transform;
    };
    expect(at("ar")).toBe(at("en"));
  });

  it("shows the tooltip of a horizontal chart", () => {
    const view = renderIn("ar", chart({ horizontal: true, data: single, series: [{ name: "Cases" }] }));
    fireEvent.pointerEnter(hitAreas(view.container)[0] as Element);
    expect(tooltipLayer(view.container)?.textContent).toContain("Riyadh");
    expect(tooltipLayer(view.container)?.textContent).toContain("48");
  });
});

describe("BarChart with no data", () => {
  it.each([
    { name: "no rows", props: { data: [], series } },
    { name: "no series", props: { data, series: [] } },
  ])("says so instead of drawing ($name)", ({ props }) => {
    const en = renderIn("en", <BarChart {...props} measureText={SIX_PER_CHARACTER} />);
    expect(en.getByText("No data")).toBeTruthy();
    expect(en.container.querySelector("svg")).toBeNull();
    const ar = renderIn("ar", <BarChart {...props} measureText={SIX_PER_CHARACTER} />, { labels: AR_CHART_LABELS });
    expect(ar.getByText("لا توجد بيانات")).toBeTruthy();
    expectNoChartEnglish(ar.container);
  });
});
