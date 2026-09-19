import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AR_CHART_LABELS, expectNoChartEnglish } from "../../../test/chart-labels";
import { svgOf } from "../../../test/chart-dom";
import { LOCALE_CASES, renderIn } from "../../../test/harness";
import { emulateDirectionInheritance } from "../../../test/overlay-dom";
import { DonutChart, type DonutChartProps } from "./donut-chart";

// jsdom has no layout: the tests prove the arithmetic (shares, summary, colours), the labels, that the ring stays
// left to right while the centre text and legend follow the page, and that the tooltip is placed from the left edge.
// They do not prove how the ring looks in right-to-left; that is for the screenshots in the application.

beforeEach(emulateDirectionInheritance);

const data = [
  { label: "Field", value: 540 },
  { label: "Remote", value: 230 },
  { label: "Inferred", value: 42, color: "chart-6" },
];

function donut(props: Partial<DonutChartProps> = {}) {
  return <DonutChart data={data} {...props} />;
}

const segments = (container: Element) => Array.from(svgOf(container).querySelectorAll("path"));
const tooltipLayer = (container: Element) => container.querySelector("[aria-hidden='true'][dir='ltr']");

describe("DonutChart names itself from the provider's labels", () => {
  it("says the total and each share, in English, with the ASCII percent sign", () => {
    const view = renderIn("en", donut());
    expect(svgOf(view.container).getAttribute("aria-label")).toBe(
      "Donut chart, total 812: Field 540 (66.5%), Remote 230 (28.3%), Inferred 42 (5.2%).",
    );
  });

  it("says it in Arabic when given Arabic labels: their words, their list separator, still the ASCII percent sign", () => {
    const view = renderIn(
      "ar",
      donut({ data: [{ label: "ميداني", value: 540 }, { label: "عن بعد", value: 230 }] }),
      { labels: AR_CHART_LABELS },
    );
    const name = svgOf(view.container).getAttribute("aria-label") ?? "";
    expect(name).toBe("رسم حلقي، الإجمالي 770: ميداني 540 (70.1%)، عن بعد 230 (29.9%).");
    expect(name).not.toContain("٪"); // the Arabic percent sign
    expectNoChartEnglish(view.container);
  });

  it("says there is no data when the values add up to nothing", () => {
    for (const values of [[], [0, 0], [-5, Number.NaN]]) {
      const en = renderIn("en", donut({ data: values.map((value, i) => ({ label: `x${i}`, value })) }));
      expect(svgOf(en.container).getAttribute("aria-label")).toBe("Donut chart, no data.");
      const ar = renderIn("ar", donut({ data: values.map((value, i) => ({ label: `x${i}`, value })) }), { labels: AR_CHART_LABELS });
      expect(svgOf(ar.container).getAttribute("aria-label")).toBe("رسم حلقي، لا توجد بيانات.");
    }
  });

  it("puts the screen's own name in front of the summary", () => {
    const view = renderIn("en", donut({ label: "Cases by kind" }));
    expect(svgOf(view.container).getAttribute("aria-label")).toMatch(/^Cases by kind\. Donut chart, total 812/);
  });

  it("takes a screen's own number format", () => {
    const view = renderIn("en", donut({ format: (n) => `${n} cases` }));
    expect(svgOf(view.container).getAttribute("aria-label")).toContain("total 812 cases: Field 540 cases (66.5%)");
  });
});

describe("DonutChart drawing", () => {
  it("draws one arc per value above zero, in the series colors", () => {
    const view = renderIn("en", donut());
    const paths = segments(view.container);
    expect(paths).toHaveLength(3);
    expect(paths.map((p) => p.getAttribute("fill"))).toEqual(["var(--chart-1)", "var(--chart-2)", "var(--chart-6)"]);
  });

  it("draws a whole ring for a single value, and a grey ring for none", () => {
    const one = renderIn("en", donut({ data: [{ label: "A", value: 5 }, { label: "B", value: 0 }] }));
    expect(segments(one.container)).toHaveLength(1);
    const none = renderIn("en", donut({ data: [{ label: "A", value: 0 }] }));
    expect(segments(none.container)).toHaveLength(1);
    expect(segments(none.container)[0]?.getAttribute("fill")).toBe("var(--chart-grid)");
  });

  it("draws the same ring in both languages: it starts at the top and runs clockwise", () => {
    const en = renderIn("en", donut());
    const ar = renderIn("ar", donut());
    expect(segments(ar.container).map((p) => p.getAttribute("d"))).toEqual(segments(en.container).map((p) => p.getAttribute("d")));
  });

  it("shows the centre value and label", () => {
    const view = renderIn("en", donut({ centerValue: "812", centerLabel: "Cases" }));
    expect(view.getByText("812")).toBeTruthy();
    expect(view.getByText("Cases")).toBeTruthy();
    expect(renderIn("en", donut()).container.querySelectorAll("div[dir]")).toHaveLength(1); // the ring's box only
  });
});

describe("DonutChart direction", () => {
  it.each(LOCALE_CASES)("keeps the ring's box left to right and the centre text on the page direction ($locale, $dir)", ({ locale, dir }) => {
    const view = renderIn(locale, donut({ centerValue: "812", centerLabel: "Cases" }));
    const ring = svgOf(view.container).parentElement;
    expect(ring?.getAttribute("dir")).toBe("ltr");
    const centre = view.getByText("812").parentElement;
    expect(centre?.getAttribute("dir")).toBe(dir);
  });

  it("lays the legend out with the page: after the ring, on the page's inline end", () => {
    const view = renderIn("ar", donut({ showLegend: true }));
    const root = svgOf(view.container).parentElement?.parentElement;
    expect(root?.getAttribute("dir")).toBeNull();
    expect(root?.children[0]?.contains(svgOf(view.container))).toBe(true);
    expect(root?.children[1]?.querySelector("ul")).not.toBeNull();
  });
});

describe("DonutChart legend", () => {
  it("is off by default and lists every value with its number when asked", () => {
    expect(renderIn("en", donut()).container.querySelector("ul")).toBeNull();
    const view = renderIn("en", donut({ showLegend: true }));
    const items = Array.from(view.container.querySelectorAll("li")).map((li) => li.textContent);
    expect(items).toEqual(["Field540", "Remote230", "Inferred42"]);
    expect(view.container.querySelector("ul")?.getAttribute("aria-label")).toBe("Legend");
  });

  it("is named and formatted from the provider's Arabic labels", () => {
    const view = renderIn("ar", donut({ showLegend: true, data: [{ label: "ميداني", value: 14000 }] }), { labels: AR_CHART_LABELS });
    expect(view.container.querySelector("ul")?.getAttribute("aria-label")).toBe("مفتاح الرسم");
    expect(view.container.querySelector("li")?.textContent).toBe("ميداني14 ألف");
  });
});

describe("DonutChart tooltip", () => {
  it.each(LOCALE_CASES)("shows the label, the share and the value while the pointer is over an arc ($locale)", ({ locale }) => {
    const view = renderIn(locale, donut());
    expect(tooltipLayer(view.container)).toBeNull();
    fireEvent.pointerEnter(segments(view.container)[0] as Element);
    const tip = tooltipLayer(view.container);
    expect(tip?.textContent).toContain("Field");
    expect(tip?.textContent).toContain("66.5%");
    expect(tip?.textContent).toContain("540");
    fireEvent.pointerLeave(svgOf(view.container));
    expect(tooltipLayer(view.container)).toBeNull();
  });

  it("uses the ASCII percent sign in Arabic too, writes its words on the page direction, and is placed the same", () => {
    const at = (locale: "en" | "ar") => {
      const view = renderIn(locale, donut());
      fireEvent.pointerEnter(segments(view.container)[1] as Element);
      const layer = tooltipLayer(view.container);
      expect(layer?.textContent).toContain("28.3%");
      expect(layer?.textContent).not.toContain("٪");
      expect(layer?.querySelector(`[dir='${locale === "ar" ? "rtl" : "ltr"}']:not([aria-hidden])`)).not.toBeNull();
      return view.container.querySelector<HTMLElement>("[style*='translate']")?.style.transform;
    };
    expect(at("ar")).toBe(at("en"));
  });

  it("makes the other arcs fainter while one is active", () => {
    const view = renderIn("en", donut());
    fireEvent.pointerEnter(segments(view.container)[0] as Element);
    const [first, second] = segments(view.container);
    expect(first?.getAttribute("class")).not.toBe(second?.getAttribute("class"));
  });
});
