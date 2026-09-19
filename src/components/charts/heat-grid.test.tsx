import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AR_CHART_LABELS, expectNoChartEnglish } from "../../../test/chart-labels";
import { hasModuleClass } from "../../../test/css-modules";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { emulateDirectionInheritance, mockRects, rect } from "../../../test/overlay-dom";
import { HeatGrid, type HeatCell, type HeatGridProps } from "./heat-grid";

// jsdom has no layout, no scrolling and no sticky positioning. These tests prove the structure, the classes and
// intensities the CSS keys on, the names a screen reader gets, the keyboard, and where the tooltip is placed for given
// rectangles. They do not prove that the row names stay in view while the columns scroll, or how any of it looks in
// right-to-left: the row names being outside the scrolling box is what makes them stay, and the screenshots in the
// application are the evidence.

beforeEach(emulateDirectionInheritance);

const rows = ["RD-C", "RD-N", "RD-E"];
const columns = ["06:00", "08:00", "10:00", "12:00"];
const values = [
  [-2, -4, -6, -1],
  [1, -1, 0, 2],
  [0, 2, null, -5],
];

function grid(props: Partial<HeatGridProps> = {}) {
  return <HeatGrid rows={rows} columns={columns} values={values} kind="signed" {...props} />;
}

const cells = (container: Element) => Array.from(container.querySelectorAll<HTMLElement>("[role='gridcell']"));
const cellAt = (container: Element, r: number, c: number) => {
  const found = container.querySelector<HTMLElement>(`[data-row='${r}'][data-col='${c}']`);
  if (!found) throw new Error(`no cell ${r},${c}`);
  return found;
};
const tooltipLayer = (container: Element) => container.querySelector("[aria-hidden='true'][dir='ltr']");
const focusedCell = () => {
  const active = document.activeElement;
  return active instanceof HTMLElement ? [active.dataset.row, active.dataset.col] : [];
};

describe("HeatGrid structure and names", () => {
  it("is a grid of named rows, column headers and cells, and says what it shows, in English", () => {
    const view = renderIn("en", grid());
    const table = view.getByRole("grid");
    expect(table.getAttribute("aria-label")).toBe("Heat grid of 3 rows by 4 columns, values -6 to 2.");
    expect(table.getAttribute("aria-rowcount")).toBe("4");
    expect(table.getAttribute("aria-colcount")).toBe("4");
    const rowElements = view.getAllByRole("row");
    expect(rowElements).toHaveLength(4);
    expect(rowElements.map((r) => r.getAttribute("aria-label"))).toEqual([null, "RD-C", "RD-N", "RD-E"]);
    expect(rowElements.map((r) => r.getAttribute("aria-rowindex"))).toEqual(["1", "2", "3", "4"]);
    expect(view.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(columns);
    expect(cells(view.container)).toHaveLength(12);
    expect(cells(view.container).map((c) => c.getAttribute("aria-colindex")).slice(0, 4)).toEqual(["1", "2", "3", "4"]);
  });

  it("names every cell after its row, column and value, and the kind of a signed cell", () => {
    const view = renderIn("en", grid());
    expect(cellAt(view.container, 0, 0).getAttribute("aria-label")).toBe("RD-C, 06:00: -2, Gap");
    expect(cellAt(view.container, 1, 3).getAttribute("aria-label")).toBe("RD-N, 12:00: 2, Surplus");
    expect(cellAt(view.container, 1, 2).getAttribute("aria-label")).toBe("RD-N, 10:00: 0, Balanced");
    expect(cellAt(view.container, 2, 2).getAttribute("aria-label")).toBe("RD-E, 10:00: no value");
  });

  it("names every cell in Arabic when given Arabic labels, with no English left", () => {
    const view = renderIn("ar", grid(), { labels: AR_CHART_LABELS });
    expect(cellAt(view.container, 0, 0).getAttribute("aria-label")).toBe("RD-C، 06:00: -2، فجوة");
    expect(cellAt(view.container, 1, 3).getAttribute("aria-label")).toBe("RD-N، 12:00: 2، فائض");
    expect(cellAt(view.container, 1, 2).getAttribute("aria-label")).toBe("RD-N، 10:00: 0، متوازن");
    expect(cellAt(view.container, 2, 2).getAttribute("aria-label")).toBe("RD-E، 10:00: لا توجد قيمة");
    expect(view.getByRole("grid").getAttribute("aria-label")).toBe("خريطة حرارية من 3 صفوف و4 أعمدة، القيم -6 إلى 2.");
    expectNoChartEnglish(view.container);
  });

  it("names a one-tone cell without a kind", () => {
    const view = renderIn("en", grid({ kind: "scale" }));
    expect(cellAt(view.container, 0, 0).getAttribute("aria-label")).toBe("RD-C, 06:00: -2");
  });

  it("puts the screen's own name in front of the summary", () => {
    const view = renderIn("en", grid({ label: "Gap by zone" }));
    expect(view.getByRole("grid").getAttribute("aria-label")).toMatch(/^Gap by zone\. Heat grid of 3 rows/);
  });

  it("uses the singular for one row and one column", () => {
    const view = renderIn("en", <HeatGrid rows={["A"]} columns={["x"]} values={[[1]]} />);
    expect(view.getByRole("grid").getAttribute("aria-label")).toContain("1 row by 1 column");
  });
});

describe("HeatGrid direction and scrolling", () => {
  it.each(LOCALE_CASES)("keeps the columns in a left-to-right box and the row names outside it, on the page direction ($locale, $dir)", ({ locale, dir }) => {
    const view = renderIn(locale, grid());
    const table = view.getByRole("grid");
    const scroll = table.parentElement;
    expect(scroll?.getAttribute("dir")).toBe("ltr");
    const root = scroll?.parentElement;
    expect(root?.getAttribute("dir")).toBeNull();
    expect(view.container.getAttribute("dir")).toBe(dir);
    // the row names come first in the page's order (its start), in a column that does not scroll
    const names = root?.firstElementChild;
    expect(names).not.toBe(scroll);
    expect(names?.getAttribute("aria-hidden")).toBe("true");
    expect(Array.from(names?.children ?? []).map((n) => n.textContent)).toEqual(rows);
    expect(scroll?.contains(names ?? null)).toBe(false);
  });

  it("lists the columns in reading order in both languages: time never flips", () => {
    const { en, ar } = renderBoth(grid());
    for (const view of [en, ar]) expect(view.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(columns);
  });

  it("takes the narrowest column and the column count as inline custom properties for the CSS", () => {
    const view = renderIn("en", grid({ minColWidth: 56 }));
    const root = view.getByRole("grid").parentElement?.parentElement;
    expect(root?.getAttribute("style")).toContain("--heat-min: 56px");
    expect(root?.getAttribute("style")).toContain("--heat-cols: 4");
    expect(renderIn("en", grid()).container.innerHTML).toContain("--heat-min: 44px");
  });

  it("hides the tooltip when the grid scrolls", () => {
    const view = renderIn("en", grid());
    fireEvent.pointerOver(cellAt(view.container, 0, 1));
    expect(tooltipLayer(view.container)).not.toBeNull();
    fireEvent.scroll(view.getByRole("grid").parentElement as Element);
    expect(tooltipLayer(view.container)).toBeNull();
  });
});

describe("HeatGrid signed cells", () => {
  it("classes a negative value as a gap, a positive one as a surplus and zero as balanced", () => {
    const view = renderIn("en", grid());
    expect(hasModuleClass(cellAt(view.container, 0, 0), "gap")).toBe(true);
    expect(hasModuleClass(cellAt(view.container, 1, 0), "surplus")).toBe(true);
    expect(hasModuleClass(cellAt(view.container, 1, 2), "ok")).toBe(true);
    expect(cellAt(view.container, 0, 0).dataset.kind).toBe("gap");
    expect(cellAt(view.container, 1, 0).dataset.kind).toBe("surplus");
    expect(cellAt(view.container, 1, 2).dataset.kind).toBe("ok");
    expect(hasModuleClass(cellAt(view.container, 0, 0), "surplus")).toBe(false);
    expect(hasModuleClass(cellAt(view.container, 1, 0), "gap")).toBe(false);
  });

  it("sets the intensity as a share of the largest value, and five levels from it", () => {
    const view = renderIn("en", grid());
    const intensity = (r: number, c: number) => cellAt(view.container, r, c).style.getPropertyValue("--i");
    expect(intensity(0, 2)).toBe("100"); // -6, the largest
    expect(intensity(0, 1)).toBe("67"); // -4
    expect(intensity(0, 0)).toBe("33"); // -2
    expect(intensity(0, 3)).toBe("17"); // -1
    expect(intensity(1, 3)).toBe("33"); // +2
    expect(cellAt(view.container, 0, 2).dataset.level).toBe("5");
    expect(cellAt(view.container, 0, 1).dataset.level).toBe("4");
    expect(cellAt(view.container, 0, 0).dataset.level).toBe("2");
    expect(cellAt(view.container, 0, 3).dataset.level).toBe("1");
    expect(cellAt(view.container, 1, 2).dataset.level).toBe("0");
  });

  it("marks the strong cells, from a little over half the largest value", () => {
    const view = renderIn("en", grid());
    expect(hasModuleClass(cellAt(view.container, 0, 2), "strong")).toBe(true); // 100
    expect(hasModuleClass(cellAt(view.container, 2, 3), "strong")).toBe(true); // 83
    expect(hasModuleClass(cellAt(view.container, 0, 1), "strong")).toBe(true); // 67
    expect(hasModuleClass(cellAt(view.container, 0, 0), "strong")).toBe(false); // 33
    expect(hasModuleClass(cellAt(view.container, 1, 2), "strong")).toBe(false);
  });

  it("draws an empty cell as balanced, with a dash and no intensity", () => {
    const view = renderIn("en", grid());
    const empty = cellAt(view.container, 2, 2);
    expect(empty.textContent).toBe("-");
    expect(empty.dataset.kind).toBe("none");
    expect(hasModuleClass(empty, "ok")).toBe(true);
    expect(hasModuleClass(empty, "missing")).toBe(true);
    expect(empty.style.getPropertyValue("--i")).toBe("");
  });

  it("treats every value as a gap for kind gap, and as a surplus for kind surplus", () => {
    const gap = renderIn("en", grid({ kind: "gap", values: [[1, 2, 3, 4]], rows: ["A"] }));
    expect(cells(gap.container).every((c) => hasModuleClass(c, "gap"))).toBe(true);
    const surplus = renderIn("en", grid({ kind: "surplus", values: [[-1, -2, -3, -4]], rows: ["A"] }));
    expect(cells(surplus.container).every((c) => hasModuleClass(c, "surplus"))).toBe(true);
  });

  it("writes each value with the screen's format, or a plain number by default", () => {
    const signed = renderIn("en", grid({ format: (n) => (n > 0 ? `+${n}` : String(n)) }));
    expect(cellAt(signed.container, 1, 3).textContent).toBe("+2");
    const plain = renderIn("en", <HeatGrid rows={["A"]} columns={["x"]} values={[[1234.5]]} kind="signed" />);
    expect(plain.container.querySelector("[role='gridcell']")?.textContent).toBe("1,234.5");
  });

  it("gives every cell the same intensity in both languages", () => {
    const { en, ar } = renderBoth(grid());
    const read = (view: typeof en) => cells(view.container).map((c) => c.style.getPropertyValue("--i"));
    expect(read(ar)).toEqual(read(en));
  });
});

describe("HeatGrid one-tone cells", () => {
  it("mixes the tone into the surface, more for a bigger value, and has no gap or surplus", () => {
    const view = renderIn("en", grid({ kind: "scale", values: [[1, 5, 10, 0]], rows: ["A"] }));
    const mix = (c: number) => /(\d+)%/.exec(cellAt(view.container, 0, c).style.background)?.[1];
    expect(Number(mix(2))).toBeGreaterThan(Number(mix(1)));
    expect(Number(mix(1))).toBeGreaterThan(Number(mix(0)));
    expect(cellAt(view.container, 0, 2).style.background).toContain("var(--accent-solid)");
    expect(cellAt(view.container, 0, 2).dataset.kind).toBe("scale");
    expect(hasModuleClass(cellAt(view.container, 0, 2), "gap")).toBe(false);
    expect(cellAt(view.container, 0, 2).style.color).toBe("var(--text-title)");
    expect(cellAt(view.container, 0, 0).style.color).toBe("var(--text-body)");
  });

  it("is the default and takes the tone", () => {
    const view = renderIn("en", <HeatGrid rows={["A"]} columns={["x", "y"]} values={[[1, 9]]} tone="warning" />);
    expect(view.container.querySelectorAll<HTMLElement>("[role='gridcell']")[1]?.style.background).toContain("var(--warning-solid)");
  });
});

describe("HeatGrid compact", () => {
  it("draws cells without text and keeps every value in the cell's name", () => {
    const view = renderIn("en", grid({ compact: true }));
    expect(cells(view.container).every((c) => c.textContent === "")).toBe(true);
    expect(cellAt(view.container, 0, 0).getAttribute("aria-label")).toBe("RD-C, 06:00: -2, Gap");
    expect(hasModuleClass(view.getByRole("grid").parentElement?.parentElement as Element, "compact")).toBe(true);
  });

  it("keeps an empty column header empty (a screen labels only some columns)", () => {
    const view = renderIn("en", grid({ compact: true, columns: ["06", "", "", "09"], values: [[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4]] }));
    expect(view.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["06", "", "", "09"]);
  });
});

describe("HeatGrid keyboard", () => {
  it.each(LOCALE_CASES)("is one tab stop: only the first cell can be tabbed to ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const view = renderIn(locale, <><button type="button">before</button>{grid()}<button type="button">after</button></>);
    expect(cells(view.container).filter((c) => c.tabIndex === 0)).toHaveLength(1);
    expect(cellAt(view.container, 0, 0).tabIndex).toBe(0);
    await user.tab();
    await user.tab();
    expect(focusedCell()).toEqual(["0", "0"]);
    await user.tab();
    expect(document.activeElement?.textContent).toBe("after");
  });

  it.each(LOCALE_CASES)("moves with the arrow keys the way they point on screen: Right is the next column even in Arabic ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const view = renderIn(locale, grid());
    await user.click(cellAt(view.container, 0, 0));
    await user.keyboard("{ArrowRight}");
    expect(focusedCell()).toEqual(["0", "1"]);
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(focusedCell()).toEqual(["0", "3"]);
    await user.keyboard("{ArrowRight}");
    expect(focusedCell()).toEqual(["0", "3"]);
    await user.keyboard("{ArrowLeft}");
    expect(focusedCell()).toEqual(["0", "2"]);
    await user.keyboard("{ArrowDown}");
    expect(focusedCell()).toEqual(["1", "2"]);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(focusedCell()).toEqual(["2", "2"]);
    await user.keyboard("{ArrowUp}");
    expect(focusedCell()).toEqual(["1", "2"]);
  });

  it("goes to the ends of a row with Home and End, and of the grid with Control", async () => {
    const user = userEvent.setup();
    const view = renderIn("ar", grid());
    await user.click(cellAt(view.container, 1, 1));
    await user.keyboard("{End}");
    expect(focusedCell()).toEqual(["1", "3"]);
    await user.keyboard("{Home}");
    expect(focusedCell()).toEqual(["1", "0"]);
    await user.keyboard("{Control>}{End}{/Control}");
    expect(focusedCell()).toEqual(["2", "3"]);
    await user.keyboard("{Control>}{Home}{/Control}");
    expect(focusedCell()).toEqual(["0", "0"]);
  });

  it("moves the one tab stop with the focus", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", grid());
    await user.click(cellAt(view.container, 0, 0));
    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(cells(view.container).filter((c) => c.tabIndex === 0)).toEqual([cellAt(view.container, 1, 1)]);
  });

  it("keeps the focus on a cell that is still there when the grid gets smaller", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", grid());
    await user.click(cellAt(view.container, 2, 3));
    view.rerender(<HeatGrid rows={["RD-C"]} columns={["06:00", "08:00"]} values={[[1, 2]]} kind="signed" />);
    expect(cells(view.container).filter((c) => c.tabIndex === 0)).toEqual([cellAt(view.container, 0, 1)]);
  });
});

describe("HeatGrid selecting a cell", () => {
  const payload = (row: number, column: number, value: number, kind: HeatCell["kind"]): HeatCell => ({ row, column, value, kind });

  it.each(LOCALE_CASES)("calls onCellSelect on click, Enter and Space with the cell ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const picked: HeatCell[] = [];
    const view = renderIn(locale, grid({ onCellSelect: (cell) => picked.push(cell) }));
    await user.click(cellAt(view.container, 0, 2));
    await user.keyboard("{ArrowDown}{Enter}");
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");
    expect(picked).toEqual([payload(0, 2, -6, "gap"), payload(1, 2, 0, "ok"), payload(1, 3, 2, "surplus")]);
  });

  it("does not select a cell with no value, and marks it as disabled", async () => {
    const user = userEvent.setup();
    const picked: HeatCell[] = [];
    const view = renderIn("en", grid({ onCellSelect: (cell) => picked.push(cell) }));
    const empty = cellAt(view.container, 2, 2);
    expect(empty.getAttribute("aria-disabled")).toBe("true");
    await user.click(empty);
    await user.keyboard("{Enter}");
    expect(picked).toEqual([]);
    expect(cellAt(view.container, 0, 0).getAttribute("aria-disabled")).toBeNull();
  });

  it("does nothing on Enter and looks like no button when there is no onCellSelect", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", grid());
    await user.click(cellAt(view.container, 0, 0));
    await user.keyboard("{Enter}");
    expect(hasModuleClass(cellAt(view.container, 0, 0), "interactive")).toBe(false);
    expect(hasModuleClass(renderIn("en", grid({ onCellSelect: () => {} })).container.querySelector("[role='gridcell']") as Element, "interactive")).toBe(true);
  });
});

describe("HeatGrid tooltip", () => {
  // The root is 600 x 200 at the origin; a cell is 40 x 28 and sits 100 px from the left plus 50 px per column.
  function mockLayout() {
    mockRects((element) => {
      if (element instanceof HTMLElement && element.dataset.col !== undefined) {
        return rect(100 + Number(element.dataset.col) * 50, 50 + Number(element.dataset.row) * 30, 40, 28);
      }
      return rect(0, 0, 600, 200);
    });
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(60);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(40);
  }

  it.each(LOCALE_CASES)("shows the row, the column and the value while the pointer is over a cell ($locale)", ({ locale }) => {
    const view = renderIn(locale, grid());
    expect(tooltipLayer(view.container)).toBeNull();
    fireEvent.pointerOver(cellAt(view.container, 1, 3));
    const tip = tooltipLayer(view.container);
    expect(tip?.textContent).toContain("RD-N");
    expect(tip?.textContent).toContain("12:00");
    expect(tip?.textContent).toContain("2");
    fireEvent.pointerLeave(view.getByRole("grid"));
    expect(tooltipLayer(view.container)).toBeNull();
  });

  it("is placed from the left edge of the grid, above the cell, the same in both languages", () => {
    mockLayout();
    const at = (locale: "en" | "ar") => {
      const view = renderIn(locale, grid());
      fireEvent.pointerOver(cellAt(view.container, 1, 3));
      return view.container.querySelector<HTMLElement>("[style*='translate']")?.style.transform;
    };
    // the cell's centre is 250 + 20 = 270 from the left, so the box goes 12 px to its right; it is 80 px from the top: 80 - 40 - 12
    expect(at("en")).toBe("translate(282px, 28px)");
    expect(at("ar")).toBe("translate(282px, 28px)");
  });

  it("writes its words on the page direction from a layer that is always left to right", () => {
    for (const locale of ["en", "ar"] as const) {
      const view = renderIn(locale, grid());
      fireEvent.pointerOver(cellAt(view.container, 0, 0));
      const layer = tooltipLayer(view.container);
      expect(layer?.getAttribute("dir")).toBe("ltr");
      expect(layer?.querySelector(`[dir='${locale === "ar" ? "rtl" : "ltr"}']:not([aria-hidden])`)).not.toBeNull();
    }
  });

  it("shows for the cell that has the keyboard focus, and goes away when the focus leaves", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", grid());
    await user.click(cellAt(view.container, 0, 0));
    fireEvent.pointerLeave(view.getByRole("grid"));
    await user.keyboard("{ArrowRight}");
    expect(tooltipLayer(view.container)?.textContent).toContain("08:00");
    fireEvent.blur(cellAt(view.container, 0, 1));
    expect(tooltipLayer(view.container)).toBeNull();
  });

  it("shows nothing for a cell with no value", () => {
    const view = renderIn("en", grid());
    fireEvent.pointerOver(cellAt(view.container, 2, 2));
    expect(tooltipLayer(view.container)).toBeNull();
  });

  it("has no English left in Arabic", () => {
    const view = renderIn("ar", grid(), { labels: AR_CHART_LABELS });
    fireEvent.pointerOver(cellAt(view.container, 0, 0));
    expectNoChartEnglish(view.container);
  });
});

describe("HeatGrid with no data", () => {
  it.each([
    { name: "no rows", props: { rows: [], values: [] } },
    { name: "no columns", props: { columns: [], values: [[], [], []] } },
  ])("says so instead of drawing a grid ($name)", ({ props }) => {
    const en = renderIn("en", grid(props));
    expect(en.getByText("No data")).toBeTruthy();
    expect(en.queryByRole("grid")).toBeNull();
    const ar = renderIn("ar", grid(props), { labels: AR_CHART_LABELS });
    expect(ar.getByText("لا توجد بيانات")).toBeTruthy();
    expectNoChartEnglish(ar.container);
  });

  it("draws empty cells for a grid of only missing values", () => {
    const view = renderIn("en", <HeatGrid rows={["A"]} columns={["x", "y"]} values={[[null, Number.NaN]]} kind="signed" />);
    expect(cells(view.container).map((c) => c.dataset.kind)).toEqual(["none", "none"]);
  });
});
