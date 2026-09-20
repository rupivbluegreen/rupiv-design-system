import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AR_DATA_LABELS, expectNoDefaultEnglish } from "../../../test/data-labels";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { DesignSystemProvider } from "../../provider";
import { DataTable, type Column, type DataTableSort } from "./data-table";

// jsdom has no layout: these tests prove sorting, paging, selection, labels and the markup the CSS keys on
// (classes for the row-tone edge, the sticky columns and the end alignment). They do not prove how any of it looks
// in right-to-left; that is for the app's screenshots.

interface Row {
  id: string;
  name: string;
  qty: number;
}

const rows: Row[] = [
  { id: "a1", name: "Alpha", qty: 30 },
  { id: "b2", name: "بيتا", qty: 4 },
  { id: "c3", name: "Gamma", qty: 100 },
];
const columns: Column<Row>[] = [{ key: "name", header: "Name", cell: (row) => row.name }];

const sortable: Column<Row>[] = [
  { key: "name", header: "Name", cell: (row) => row.name, sortValue: (row) => row.name },
  { key: "qty", header: "Qty", cell: (row) => row.qty, sortValue: (row) => row.qty, align: "end" },
];

/** The text of the first cell of each body row, in order. */
function order(view: { getAllByRole: (role: string) => HTMLElement[] }): string[] {
  return view
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.querySelector("td:not([data-row-click])")?.textContent ?? "");
}

function many(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({ id: `r${i + 1}`, name: `Row ${String(i + 1).padStart(2, "0")}`, qty: i }));
}

describe("DataTable rowHref", () => {
  it.each(LOCALE_CASES)("calls the provider's navigate when a row is clicked ($locale)", async ({ locale }) => {
    const calls: string[] = [];
    const view = renderIn(
      locale,
      <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} rowHref={(row) => `/rows/${row.id}`} />,
      { navigate: (href) => calls.push(href) },
    );
    await userEvent.click(view.getByText("Alpha"));
    await userEvent.click(view.getByText("بيتا"));
    expect(calls).toEqual(["/rows/a1", "/rows/b2"]);
  });

  it.each(LOCALE_CASES)("calls navigate when Enter is pressed on a focused row ($locale)", async ({ locale }) => {
    const calls: string[] = [];
    const view = renderIn(
      locale,
      <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} rowHref={(row) => `/rows/${row.id}`} />,
      { navigate: (href) => calls.push(href) },
    );
    const row = view.getByText("Alpha").closest("tr");
    expect(row).not.toBeNull();
    row?.focus();
    await userEvent.keyboard("{Enter}");
    expect(calls).toEqual(["/rows/a1"]);
  });

  it("does not navigate for rows without an href", async () => {
    const calls: string[] = [];
    const views = renderBoth(<DataTable columns={columns} rows={rows} getRowId={(row) => row.id} />, {
      navigate: (href) => calls.push(href),
    });
    await userEvent.click(views.en.getByText("Alpha"));
    await userEvent.click(views.ar.getByText("بيتا"));
    expect(calls).toEqual([]);
    for (const view of [views.en, views.ar]) expect(view.getAllByRole("row")[1]?.hasAttribute("tabindex")).toBe(false);
  });

  it("opens a new tab for a modifier click and leaves links and buttons inside a row alone", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const withActions: Column<Row>[] = [
      { key: "name", header: "Name", cell: (row) => row.name },
      { key: "act", header: "Act", cell: (row) => <button type="button">{`Edit ${row.id}`}</button> },
    ];
    const view = renderIn(
      "en",
      <DataTable columns={withActions} rows={rows} getRowId={(row) => row.id} rowHref={(row) => `/rows/${row.id}`} />,
      { navigate: (href) => calls.push(href) },
    );
    await user.keyboard("{Control>}");
    await user.click(view.getByText("Alpha"));
    await user.keyboard("{/Control}");
    expect(open).toHaveBeenCalledWith("/rows/a1", "_blank", "noopener");
    expect(calls).toEqual([]);
    await user.click(view.getByRole("button", { name: "Edit b2" }));
    expect(calls).toEqual([]);
  });
});

describe("DataTable sorting", () => {
  it.each(LOCALE_CASES)("sorts by a column, toggles the direction and announces it ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const view = renderIn(locale, <DataTable columns={sortable} rows={rows} getRowId={(row) => row.id} />);
    const qtyHeader = view.getByRole("columnheader", { name: "Qty" });
    const nameHeader = view.getByRole("columnheader", { name: "Name" });
    expect(qtyHeader.getAttribute("aria-sort")).toBe("none");
    await user.click(view.getByRole("button", { name: "Qty" }));
    expect(order(view)).toEqual(["بيتا", "Alpha", "Gamma"]); // 4, 30, 100: numbers are compared as numbers
    expect(qtyHeader.getAttribute("aria-sort")).toBe("ascending");
    expect(nameHeader.getAttribute("aria-sort")).toBe("none");
    await user.click(view.getByRole("button", { name: "Qty" }));
    expect(order(view)).toEqual(["Gamma", "Alpha", "بيتا"]);
    expect(qtyHeader.getAttribute("aria-sort")).toBe("descending");
  });

  it("makes only columns with a sortValue sortable, and starts from defaultSort", () => {
    const view = renderIn(
      "en",
      <DataTable
        columns={[...sortable, { key: "plain", header: "Plain", cell: () => "-" }]}
        rows={rows}
        getRowId={(row) => row.id}
        defaultSort={{ key: "qty", direction: "desc" }}
      />,
    );
    expect(view.getByRole("columnheader", { name: "Plain" }).hasAttribute("aria-sort")).toBe(false);
    expect(view.queryByRole("button", { name: "Plain" })).toBeNull();
    expect(order(view)).toEqual(["Gamma", "Alpha", "بيتا"]);
  });

  it("sorts text with numeric collation: item 2 comes before item 10", async () => {
    const user = userEvent.setup();
    const items = ["item 10", "item 2", "item 1"].map((name, i) => ({ id: `i${i}`, name, qty: i }));
    const view = renderIn("en", <DataTable columns={sortable} rows={items} getRowId={(row) => row.id} />);
    await user.click(view.getByRole("button", { name: "Name" }));
    expect(order(view)).toEqual(["item 1", "item 2", "item 10"]);
  });

  it("sorts text with the provider's locale, not a fixed one", async () => {
    const user = userEvent.setup();
    const words = ["Zebra", "Ärlig", "Apa"].map((name, i) => ({ id: `w${i}`, name, qty: i }));
    const table = <DataTable columns={sortable} rows={words} getRowId={(row) => row.id} />;
    // Swedish puts Ä after Z; English puts it next to A. Nothing here is Swedish-specific in the component.
    const swedish = render(<DesignSystemProvider locale="sv">{table}</DesignSystemProvider>);
    await user.click(swedish.getByRole("button", { name: "Name" }));
    expect(order(swedish)).toEqual(["Apa", "Zebra", "Ärlig"]);
    swedish.unmount();
    const english = render(<DesignSystemProvider locale="en">{table}</DesignSystemProvider>);
    await user.click(english.getByRole("button", { name: "Name" }));
    expect(order(english)).toEqual(["Apa", "Ärlig", "Zebra"]);
  });

  it("keeps the original order between equal values", async () => {
    const user = userEvent.setup();
    const same = ["x", "y", "z"].map((name) => ({ id: name, name, qty: 1 }));
    const view = renderIn("en", <DataTable columns={sortable} rows={same} getRowId={(row) => row.id} />);
    await user.click(view.getByRole("button", { name: "Qty" }));
    expect(order(view)).toEqual(["x", "y", "z"]);
    await user.click(view.getByRole("button", { name: "Qty" }));
    expect(order(view)).toEqual(["x", "y", "z"]);
  });

  it("sorts with the keyboard: Tab to the header button, Enter to sort", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <DataTable columns={sortable} rows={rows} getRowId={(row) => row.id} />);
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("button", { name: "Name" }));
    await user.keyboard("{Enter}");
    expect(order(view)).toEqual(["Alpha", "Gamma", "بيتا"]);
  });

  it("is controlled when `sort` is given: reports the change and waits for the parent", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn<(sort: DataTableSort) => void>();
    const sort: DataTableSort = { key: "qty", direction: "desc" };
    const table = (current: DataTableSort | null) => (
      <DataTable columns={sortable} rows={rows} getRowId={(row) => row.id} sort={current} onSortChange={onSortChange} />
    );
    const view = renderIn("en", table(sort));
    expect(order(view)).toEqual(["Gamma", "Alpha", "بيتا"]);
    await user.click(view.getByRole("button", { name: "Qty" }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: "qty", direction: "asc" });
    expect(order(view)).toEqual(["Gamma", "Alpha", "بيتا"]); // the parent has not changed the prop yet
    view.rerender(table({ key: "name", direction: "asc" }));
    expect(order(view)).toEqual(["Alpha", "Gamma", "بيتا"]);
    expect(view.getByRole("columnheader", { name: "Name" }).getAttribute("aria-sort")).toBe("ascending");
    view.rerender(table(null)); // null means "not sorted", still controlled
    expect(order(view)).toEqual(["Alpha", "بيتا", "Gamma"]);
    await user.click(view.getByRole("button", { name: "Name" }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: "name", direction: "asc" });
  });

  it("reports the change when it keeps the sort itself, too", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const view = renderIn("en", <DataTable columns={sortable} rows={rows} getRowId={(row) => row.id} onSortChange={onSortChange} />);
    await user.click(view.getByRole("button", { name: "Name" }));
    await user.click(view.getByRole("button", { name: "Name" }));
    expect(onSortChange.mock.calls).toEqual([[{ key: "name", direction: "asc" }], [{ key: "name", direction: "desc" }]]);
  });
});

describe("DataTable paging", () => {
  it("shows the first page and moves with the pagination, keeping the page itself", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <DataTable columns={columns} rows={many(25)} getRowId={(row) => row.id} pageSize={10} />);
    expect(order(view)[0]).toBe("Row 01");
    expect(order(view)).toHaveLength(10);
    expect(view.getByText("1 to 10 of 25")).toBeTruthy();
    await user.click(view.getByRole("button", { name: "Next page" }));
    expect(order(view)[0]).toBe("Row 11");
    await user.click(view.getByRole("button", { name: "Page 3" }));
    expect(order(view)).toEqual(["Row 21", "Row 22", "Row 23", "Row 24", "Row 25"]);
  });

  it("shows no pagination when the rows fit on one page, or when pageSize is 0", () => {
    const fits = renderIn("en", <DataTable columns={columns} rows={many(10)} getRowId={(row) => row.id} pageSize={10} />);
    expect(fits.queryByRole("navigation")).toBeNull();
    const off = renderIn("en", <DataTable columns={columns} rows={many(40)} getRowId={(row) => row.id} pageSize={0} />);
    expect(off.getAllByRole("row")).toHaveLength(41);
  });

  it("goes back to the first page when the sort or the page size changes", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <DataTable columns={sortable} rows={many(25)} getRowId={(row) => row.id} pageSize={10} />);
    await user.click(view.getByRole("button", { name: "Next page" }));
    expect(order(view)[0]).toBe("Row 11");
    await user.click(view.getByRole("button", { name: "Qty" }));
    expect(order(view)[0]).toBe("Row 01");
    await user.click(view.getByRole("button", { name: "Next page" }));
    await user.selectOptions(view.getByRole("combobox", { name: "Rows per page" }), "25");
    expect(order(view)).toHaveLength(25);
    expect(view.getByRole("button", { name: "Next page" })).toHaveProperty("disabled", true); // one page now; the bar stays for the size choice
  });

  it("is controlled when `page` is given: reports the change and waits for the parent", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const table = (page: number) => (
      <DataTable columns={columns} rows={many(25)} getRowId={(row) => row.id} pageSize={10} page={page} onPageChange={onPageChange} />
    );
    const view = renderIn("en", table(2));
    expect(order(view)[0]).toBe("Row 11");
    await user.click(view.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    expect(order(view)[0]).toBe("Row 11"); // waits for the parent
    view.rerender(table(3));
    expect(order(view)[0]).toBe("Row 21");
    await user.click(view.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it("asks a controlled parent for page 1 when the sort changes, but only if it is not already on page 1", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onSortChange = vi.fn();
    const table = (page: number) => (
      <DataTable
        columns={sortable}
        rows={many(25)}
        getRowId={(row) => row.id}
        pageSize={10}
        page={page}
        onPageChange={onPageChange}
        onSortChange={onSortChange}
      />
    );
    const view = renderIn("en", table(2));
    await user.click(view.getByRole("button", { name: "Qty" }));
    expect(onSortChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    view.rerender(table(1));
    await user.click(view.getByRole("button", { name: "Name" }));
    expect(onSortChange).toHaveBeenCalledTimes(2);
    expect(onPageChange).toHaveBeenCalledTimes(1);
  });

  it("clamps a controlled page beyond the last page instead of showing nothing", () => {
    const view = renderIn("en", <DataTable columns={columns} rows={many(25)} getRowId={(row) => row.id} pageSize={10} page={9} />);
    expect(order(view)[0]).toBe("Row 21");
    expect(view.getByText("21 to 25 of 25")).toBeTruthy();
  });
});

describe("DataTable selection and bulk actions", () => {
  it.each(LOCALE_CASES)("selects rows, shows the bulk bar and clears ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const bulk = vi.fn((ids: string[], clear: () => void) => (
      <button type="button" onClick={clear}>
        {`Archive ${ids.join(",")}`}
      </button>
    ));
    const view = renderIn(locale, <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} selectable bulkActions={bulk} />);
    expect(view.queryByRole("region", { name: "Bulk actions" })).toBeNull();
    await user.click(view.getByRole("checkbox", { name: "Select row a1" }));
    await user.click(view.getByRole("checkbox", { name: "Select row c3" }));
    const bar = view.getByRole("region", { name: "Bulk actions" });
    expect(within(bar).getByText("2 selected")).toBeTruthy();
    expect(within(bar).getByRole("button", { name: "Archive a1,c3" })).toBeTruthy();
    expect(view.getAllByRole("row")[1]?.getAttribute("aria-selected")).toBe("true");
    expect(view.getAllByRole("row")[2]?.getAttribute("aria-selected")).toBe("false");
    await user.click(within(bar).getByRole("button", { name: "Clear" }));
    expect(view.queryByRole("region", { name: "Bulk actions" })).toBeNull();
    expect((view.getByRole("checkbox", { name: "Select row a1" }) as HTMLInputElement).checked).toBe(false);
  });

  it.each(LOCALE_CASES)("names each row's checkbox with rowLabel instead of the row id ($locale)", ({ locale }) => {
    const view = renderIn(
      locale,
      <DataTable columns={columns} rows={rows} getRowId={(row) => `id-${row.id}`} rowLabel={(row) => `Person ${row.id}`} selectable />,
    );
    expect(view.getByRole("checkbox", { name: "Select row Person a1" })).toBeTruthy();
    expect(view.queryByRole("checkbox", { name: "Select row id-a1" })).toBeNull();
  });

  it("clears through the callback given to bulkActions", async () => {
    const user = userEvent.setup();
    const view = renderIn(
      "en",
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        selectable
        bulkActions={(ids, clear) => (
          <button type="button" onClick={clear}>{`Done ${ids.length}`}</button>
        )}
      />,
    );
    await user.click(view.getByRole("checkbox", { name: "Select row b2" }));
    await user.click(view.getByRole("button", { name: "Done 1" }));
    expect(view.queryByRole("region", { name: "Bulk actions" })).toBeNull();
  });

  it("selects and deselects every row on the page from the header, with a mixed state in between", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} selectable />);
    const header = view.getByRole("checkbox", { name: "Select all rows on this page" }) as HTMLInputElement;
    await user.click(view.getByRole("checkbox", { name: "Select row a1" }));
    const bar = view.getByRole("region", { name: "Bulk actions" });
    const barBox = within(bar).getByRole("checkbox", { name: "Select all rows on this page" }) as HTMLInputElement;
    expect(barBox.indeterminate).toBe(true);
    expect(header.indeterminate).toBe(true);
    await user.click(barBox);
    expect(within(view.getByRole("region", { name: "Bulk actions" })).getByText("3 selected")).toBeTruthy();
    const allBox = within(view.getByRole("region", { name: "Bulk actions" })).getByRole("checkbox", {
      name: "Deselect all rows on this page",
    }) as HTMLInputElement;
    expect(allBox.checked).toBe(true);
    await user.click(allBox);
    expect(view.queryByRole("region", { name: "Bulk actions" })).toBeNull();
  });

  it("keeps a selection across pages and counts every selected row", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <DataTable columns={columns} rows={many(25)} getRowId={(row) => row.id} pageSize={10} selectable />);
    await user.click(view.getByRole("checkbox", { name: "Select row r1" }));
    await user.click(view.getByRole("button", { name: "Next page" }));
    await user.click(view.getByRole("checkbox", { name: "Select row r11" }));
    expect(within(view.getByRole("region", { name: "Bulk actions" })).getByText("2 selected")).toBeTruthy();
  });

  it("disables the header checkbox when there are no rows, and shows the empty state", () => {
    const view = renderIn("en", <DataTable columns={columns} rows={[]} getRowId={(row: Row) => row.id} selectable />);
    expect((view.getByRole("checkbox", { name: "Select all rows on this page" }) as HTMLInputElement).disabled).toBe(true);
    expect(view.getByText("No records found")).toBeTruthy();
    expect(view.getByText("Try adjusting your search or filters.")).toBeTruthy();
  });

  it("shows a custom empty state instead of the default", () => {
    const views = renderBoth(<DataTable columns={columns} rows={[]} getRowId={(row: Row) => row.id} emptyState={<p>لا شيء هنا</p>} />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByText("لا شيء هنا")).toBeTruthy();
      expect(view.queryByText("No records found")).toBeNull();
    }
  });
});

describe("DataTable markup the CSS relies on", () => {
  it("marks a toned row with the tone class and data-tone, for the inline-start edge", () => {
    const views = renderBoth(
      <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} rowTone={(row) => (row.id === "b2" ? "danger" : undefined)} />,
    );
    for (const view of [views.en, views.ar]) {
      const [plain, toned] = [view.getAllByRole("row")[1], view.getAllByRole("row")[2]];
      expect(plain?.hasAttribute("data-tone")).toBe(false);
      expect(plain?.className).not.toContain("toned");
      expect(toned?.getAttribute("data-tone")).toBe("danger");
      expect(toned?.className).toContain("toned");
      expect(toned?.className).toContain("toneDanger");
    }
  });

  it("puts the end-alignment class on header and body cells, and the center class on center columns", () => {
    const view = renderIn(
      "ar",
      <DataTable
        columns={[
          { key: "a", header: "A", cell: () => "1", align: "end" },
          { key: "b", header: "B", cell: () => "2", align: "center" },
          { key: "c", header: "C", cell: () => "3" },
        ]}
        rows={[rows[0] as Row]}
        getRowId={(row) => row.id}
      />,
    );
    const headers = view.getAllByRole("columnheader");
    const cells = view.getAllByRole("cell");
    expect(headers[0]?.className).toContain("alignEnd");
    expect(cells[0]?.className).toContain("alignEnd");
    expect(headers[1]?.className).toContain("alignCenter");
    expect(cells[1]?.className).toContain("alignCenter");
    expect(headers[2]?.className).toBe("");
    expect(view.container.innerHTML).not.toContain("alignRight");
  });

  it("keeps the selection cell and the sticky first column aligned: select is sticky, the column sits after it", () => {
    const view = renderIn(
      "en",
      <DataTable
        columns={[{ key: "name", header: "Name", cell: (row: Row) => row.name, sticky: true }, ...sortable.slice(1)]}
        rows={rows}
        getRowId={(row) => row.id}
        selectable
        rowTone={() => "warning"}
      />,
    );
    const headerCells = view.getAllByRole("columnheader");
    expect(headerCells[0]?.className).toContain("stickySelect");
    expect(headerCells[1]?.className).toContain("stickyCol");
    expect(headerCells[1]?.className).toContain("stickyAfterSelect");
    expect(headerCells[2]?.className).not.toContain("sticky");
    const bodyRow = view.getAllByRole("row")[1] as HTMLElement;
    expect(bodyRow.className).toContain("toneWarning");
    expect(bodyRow.querySelector("td")?.className).toContain("stickySelect");
  });

  it("does not make a sticky column stick after a selection column that is not there", () => {
    const view = renderIn(
      "en",
      <DataTable columns={[{ key: "name", header: "Name", cell: (row: Row) => row.name, sticky: true }]} rows={rows} getRowId={(row) => row.id} />,
    );
    const header = view.getByRole("columnheader", { name: "Name" });
    expect(header.className).toContain("stickyCol");
    expect(header.className).not.toContain("stickyAfterSelect");
  });

  it("hides columns and footer cells below the breakpoint the column names", () => {
    const view = renderIn(
      "en",
      <DataTable
        columns={[
          { key: "name", header: "Name", cell: (row: Row) => row.name },
          { key: "qty", header: "Qty", cell: (row: Row) => row.qty, hideBelow: "md", align: "end" },
        ]}
        rows={rows}
        getRowId={(row) => row.id}
        footer={
          <>
            <td>Total</td>
            <td data-align="end">134</td>
          </>
        }
      />,
    );
    expect(view.getByRole("columnheader", { name: "Qty" }).className).toContain("hideMd");
    expect(view.getByText("134").className).toContain("hideMd");
    expect(view.getByText("Total").className).not.toContain("hide");
  });

  it("passes a screen-reader caption and the sticky-header class through", () => {
    const view = renderIn("en", <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} caption="Orders" stickyHeader dense />);
    expect(view.getByRole("table", { name: "Orders" })).toBeTruthy();
    expect(view.container.innerHTML).toContain("stickyHeader");
    expect(view.container.innerHTML).toContain("dense");
  });
});

describe("DataTable labels", () => {
  it("renders no default English string when Arabic labels are given", async () => {
    const user = userEvent.setup();
    const arabicRows: Row[] = many(25).map((row, i) => ({ ...row, name: `صف ${i + 1}` }));
    const arabicColumns: Column<Row>[] = [{ key: "name", header: "الاسم", cell: (row) => row.name, sortValue: (row) => row.name }];
    const view = renderIn(
      "ar",
      <DataTable
        columns={arabicColumns}
        rows={arabicRows}
        getRowId={(row) => row.id}
        selectable
        pageSize={10}
        bulkActions={(_ids, clear) => <button type="button" onClick={clear}>تنفيذ</button>}
      />,
      { labels: AR_DATA_LABELS },
    );
    expectNoDefaultEnglish(view.container);
    await user.click(view.getByRole("checkbox", { name: "تحديد الصف r1" }));
    const bar = view.getByRole("region", { name: "إجراءات جماعية" });
    expect(within(bar).getByText("تم تحديد صف واحد")).toBeTruthy(); // a plural function from the application
    expect(within(bar).getByRole("button", { name: "مسح التحديد" })).toBeTruthy();
    expect(within(bar).getByRole("checkbox", { name: "تحديد كل الصفوف في هذه الصفحة" })).toBeTruthy();
    await user.click(view.getByRole("checkbox", { name: "تحديد الصف r2" }));
    expect(within(view.getByRole("region", { name: "إجراءات جماعية" })).getByText("تم تحديد صفان")).toBeTruthy();
    expect(view.getByRole("button", { name: "الصفحة التالية" })).toBeTruthy();
    expectNoDefaultEnglish(view.container);
  });

  it("shows the Arabic empty state with Arabic labels", () => {
    const view = renderIn("ar", <DataTable columns={columns} rows={[]} getRowId={(row: Row) => row.id} />, { labels: AR_DATA_LABELS });
    expect(view.getByText("لا توجد سجلات")).toBeTruthy();
    expect(view.getByText("جرّب تعديل البحث أو عوامل التصفية.")).toBeTruthy();
    expectNoDefaultEnglish(view.container);
  });
});
