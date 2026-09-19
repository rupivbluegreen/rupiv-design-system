import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { DataTable, type Column } from "./data-table";

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [
  { id: "a1", name: "Alpha" },
  { id: "b2", name: "بيتا" },
];
const columns: Column<Row>[] = [{ key: "name", header: "Name", cell: (row) => row.name }];

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
});
