import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AR_DATA_LABELS, expectNoDefaultEnglish } from "../../../test/data-labels";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { FilterBar, FilterChip } from "./filter-bar";

// jsdom has no layout: these tests prove the labels, the callbacks and the keyboard, not how the bar wraps or mirrors.

const active = (onRemove: () => void) => [
  { label: "Region: North", onRemove },
  { label: "Status: Open", onRemove },
];

describe("FilterBar", () => {
  it("renders only what it is given: nothing extra for an empty bar", () => {
    const views = renderBoth(<FilterBar />);
    for (const view of [views.en, views.ar]) {
      expect(view.queryByRole("searchbox")).toBeNull();
      expect(view.queryByRole("list")).toBeNull();
      expect(view.container.textContent).toBe("");
    }
  });

  it("renders the search box with the provider's default placeholder, the filters and the actions", () => {
    const views = renderBoth(
      <FilterBar search={{ value: "", onChange: () => {} }} filters={<span>filters slot</span>} actions={<span>actions slot</span>} />,
    );
    for (const view of [views.en, views.ar]) {
      const search = view.getByRole("searchbox", { name: "Search" });
      expect(search.getAttribute("placeholder")).toBe("Search");
      expect(view.getByText("filters slot")).toBeTruthy();
      expect(view.getByText("actions slot")).toBeTruthy();
    }
  });

  it("takes a placeholder from the caller", () => {
    const view = renderIn("ar", <FilterBar search={{ placeholder: "ابحث بالاسم" }} />);
    expect(view.getByRole("searchbox", { name: "ابحث بالاسم" })).toBeTruthy();
  });

  it.each(LOCALE_CASES)("reports typing in the search box ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn(locale, <FilterBar search={{ value: "", onChange }} />);
    await user.type(view.getByRole("searchbox"), "ab");
    expect(onChange.mock.calls).toEqual([["a"], ["b"]]); // controlled with value "": each key is reported on its own
  });

  it("shows the applied filters, removes one, and clears all", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onClearAll = vi.fn();
    const views = renderBoth(<FilterBar activeFilters={active(onRemove)} onClearAll={onClearAll} />);
    const view = views.en;
    expect(view.getByText("Filtered by")).toBeTruthy();
    expect(view.getAllByRole("listitem")).toHaveLength(2);
    await user.click(view.getByRole("button", { name: "Remove filter Region: North" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    await user.click(view.getByRole("button", { name: "Clear all" }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
    expect(views.ar.getAllByRole("listitem")).toHaveLength(2);
  });

  it("offers Clear all only when a handler is given, and no chips row without applied filters", () => {
    const withoutHandler = renderIn("en", <FilterBar activeFilters={active(() => {})} />);
    expect(withoutHandler.queryByRole("button", { name: "Clear all" })).toBeNull();
    withoutHandler.unmount();
    const none = renderIn("en", <FilterBar activeFilters={[]} onClearAll={() => {}} />);
    expect(none.queryByText("Filtered by")).toBeNull();
    expect(none.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  it("removes a chip from the keyboard", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const view = renderIn("en", <FilterBar activeFilters={[{ label: "Region: North", onRemove }]} onClearAll={() => {}} />);
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("button", { name: "Remove filter Region: North" }));
    await user.keyboard("{Enter}");
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("renders no default English string when Arabic labels are given", () => {
    const view = renderIn(
      "ar",
      <FilterBar search={{ value: "", onChange: () => {} }} activeFilters={[{ label: "المنطقة: الشمال", onRemove: () => {} }]} onClearAll={() => {}} />,
      { labels: AR_DATA_LABELS },
    );
    expect(view.getByRole("searchbox", { name: "بحث" })).toBeTruthy();
    expect(view.getByText("التصفية حسب")).toBeTruthy();
    expect(view.getByRole("button", { name: "إزالة عامل التصفية المنطقة: الشمال" })).toBeTruthy();
    expect(view.getByRole("button", { name: "مسح الكل" })).toBeTruthy();
    expectNoDefaultEnglish(view.container);
  });
});

describe("FilterChip", () => {
  const options = [
    { value: "open", label: "Open" },
    { value: "done", label: "Done" },
  ];

  it.each(LOCALE_CASES)("opens its menu, picks an option and reports it ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn(locale, <FilterChip label="Status" options={options} onChange={onChange} />);
    const chip = view.getByRole("button", { name: "Status" });
    expect(chip.getAttribute("aria-expanded")).toBe("false");
    await user.click(chip);
    expect(chip.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.getAllByRole("menuitemradio").map((item) => item.getAttribute("aria-checked"))).toEqual(["false", "false"]);
    expect(screen.queryByText("Clear")).toBeNull(); // nothing to clear yet
    await user.click(screen.getByText("Done"));
    expect(onChange).toHaveBeenCalledWith("done");
  });

  it("shows the chosen option on the chip and a Clear item that reports undefined", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn("en", <FilterChip label="Status" value="open" options={options} onChange={onChange} />);
    expect(view.getByText("Open")).toBeTruthy();
    await user.click(view.getByRole("button", { name: /Status/ }));
    expect(screen.getByRole("menuitemradio", { name: "Open" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("menuitemradio", { name: "Done" }).getAttribute("aria-checked")).toBe("false");
    await user.click(screen.getByText("Clear"));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("falls back to the raw value when no option has it", () => {
    const view = renderIn("en", <FilterChip label="Status" value="gone" options={options} onChange={() => {}} />);
    expect(view.getByText("gone")).toBeTruthy();
  });

  it("opens from the keyboard", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <FilterChip label="Status" options={options} onChange={() => {}} />);
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("button", { name: "Status" }));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("uses the Arabic Clear label from the provider", async () => {
    const user = userEvent.setup();
    const view = renderIn("ar", <FilterChip label="الحالة" value="open" options={[{ value: "open", label: "مفتوح" }]} onChange={() => {}} />, {
      labels: AR_DATA_LABELS,
    });
    await user.click(view.getByRole("button", { name: /الحالة/ }));
    expect(screen.getByText("إزالة التصفية")).toBeTruthy();
    expectNoDefaultEnglish(document.body);
  });
});
