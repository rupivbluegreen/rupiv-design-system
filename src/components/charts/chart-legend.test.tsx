import { describe, expect, it } from "vitest";
import { AR_CHART_LABELS, expectNoChartEnglish } from "../../../test/chart-labels";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { ChartLegend } from "./chart-legend";

// jsdom has no layout: these tests prove the list, its name and the numbers kept together. They do not prove how the
// legend looks in right-to-left (it follows the page direction, so its swatch is at the right there).

const plain = [
  { label: "Field", color: "var(--chart-1)" },
  { label: "Remote", color: "var(--chart-2)" },
];
const withValues = [
  { label: "Field", color: "var(--chart-1)", value: "540" },
  { label: "Remote", color: "var(--chart-2)", value: "-230" },
];

describe("ChartLegend", () => {
  it("renders a named list with one item per entry, in both languages", () => {
    const { en, ar } = renderBoth(<ChartLegend items={plain} />);
    for (const view of [en, ar]) {
      const list = view.getByRole("list");
      expect(list.querySelectorAll("li")).toHaveLength(2);
      expect(view.getByText("Field")).toBeTruthy();
      expect(view.getByText("Remote")).toBeTruthy();
    }
  });

  it("names the list from the provider's label, English by default and Arabic when given", () => {
    const { en } = renderBoth(<ChartLegend items={plain} />);
    expect(en.getByRole("list").getAttribute("aria-label")).toBe("Legend");
    const ar = renderIn("ar", <ChartLegend items={plain} />, { labels: AR_CHART_LABELS });
    expect(ar.getByRole("list").getAttribute("aria-label")).toBe(AR_CHART_LABELS["chartLegend.label"]);
    expectNoChartEnglish(ar.container);
  });

  it("lets a screen name the list itself", () => {
    const view = renderIn("en", <ChartLegend items={plain} label="Series" />);
    expect(view.getByRole("list").getAttribute("aria-label")).toBe("Series");
  });

  it("hides the swatch from assistive technology and shows the full label as a title", () => {
    const view = renderIn("en", <ChartLegend items={plain} />);
    const item = view.getByRole("list").querySelector("li");
    expect(item?.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(item?.querySelector("[title='Field']")).not.toBeNull();
  });

  it.each(LOCALE_CASES)("keeps each value together in a bdi so a minus sign stays with its number ($locale)", ({ locale }) => {
    const view = renderIn(locale, <ChartLegend items={withValues} />);
    const values = Array.from(view.container.querySelectorAll("bdi")).map((bdi) => bdi.textContent);
    expect(values).toEqual(["540", "-230"]);
  });

  it("renders nothing for no items", () => {
    const view = renderIn("en", <ChartLegend items={[]} />);
    expect(view.container.querySelector("ul")).toBeNull();
  });
});
