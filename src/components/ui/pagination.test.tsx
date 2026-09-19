import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AR_DATA_LABELS, expectNoDefaultEnglish } from "../../../test/data-labels";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { Pagination } from "./pagination";

// jsdom has no layout: these tests prove the labels, numbers, page tokens and clicks, not how the mirrored
// previous/next arrows look in right-to-left (the CSS rule `.end > button:dir(rtl) svg` and the app's screenshots do).

describe("Pagination", () => {
  it("renders the summary, the current page and previous/next in English and Arabic", () => {
    const views = renderBoth(<Pagination page={2} pageCount={5} onPageChange={() => {}} total={41} pageSize={10} />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("navigation", { name: "Pagination" })).toBeTruthy();
      expect(view.getByText("11 to 20 of 41")).toBeTruthy();
      expect(view.getByRole("button", { name: "Previous page" })).toHaveProperty("disabled", false);
      expect(view.getByRole("button", { name: "Next page" })).toHaveProperty("disabled", false);
      expect(view.getByRole("button", { name: "Page 2" }).getAttribute("aria-current")).toBe("page");
      expect(view.getByRole("button", { name: "Page 3" }).hasAttribute("aria-current")).toBe(false);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("says Page n of m when there is no total", () => {
    const views = renderBoth(<Pagination page={2} pageCount={9} onPageChange={() => {}} />);
    for (const view of [views.en, views.ar]) expect(view.getByText("Page 2 of 9")).toBeTruthy();
  });

  it("shows 0 to 0 of 0 for no rows, and one page for a page count of 0", () => {
    const view = renderIn(
      "en",
      <Pagination page={1} pageCount={0} onPageChange={() => {}} total={0} pageSize={10} />,
    );
    expect(view.getByText("0 to 0 of 0")).toBeTruthy();
    expect(view.getByRole("button", { name: "Next page" })).toHaveProperty("disabled", true);
    expect(view.getByRole("button", { name: "Previous page" })).toHaveProperty("disabled", true);
  });

  it("writes numbers with Western digits and grouping in both languages", () => {
    const views = renderBoth(<Pagination page={1} pageCount={124} onPageChange={() => {}} total={1234} pageSize={10} />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByText("1 to 10 of 1,234")).toBeTruthy();
      expect(view.getByRole("button", { name: "Page 124" }).textContent).toBe("124");
      expect(view.container.textContent).not.toMatch(/[٠-٩]/);
    }
  });

  it("clamps a page outside the range", () => {
    const view = renderIn("en", <Pagination page={99} pageCount={5} onPageChange={() => {}} />);
    expect(view.getByText("Page 5 of 5")).toBeTruthy();
    expect(view.getByRole("button", { name: "Page 5" }).getAttribute("aria-current")).toBe("page");
    expect(view.getByRole("button", { name: "Next page" })).toHaveProperty("disabled", true);
  });

  it("collapses long ranges with gaps, keeping the first, last and neighbouring pages", () => {
    const middle = renderIn("en", <Pagination page={10} pageCount={20} onPageChange={() => {}} />);
    const pages = middle.getAllByRole("button", { name: /^Page \d+$/ }).map((b) => b.textContent);
    expect(pages).toEqual(["1", "9", "10", "11", "20"]);
    expect(middle.container.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(2);
  });

  it("shows every page when there are seven or fewer, and one gap near an end", () => {
    const short = renderIn("en", <Pagination page={1} pageCount={7} onPageChange={() => {}} />);
    expect(short.getAllByRole("button", { name: /^Page \d+$/ })).toHaveLength(7);
    expect(short.container.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(0);
    const start = renderIn("ar", <Pagination page={2} pageCount={20} onPageChange={() => {}} />);
    expect(start.getAllByRole("button", { name: /^Page \d+$/ }).map((b) => b.textContent)).toEqual(["1", "2", "3", "4", "20"]);
    expect(start.container.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(1);
  });

  it.each(LOCALE_CASES)("reports previous, next and page clicks ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const view = renderIn(locale, <Pagination page={3} pageCount={9} onPageChange={onPageChange} />);
    await user.click(view.getByRole("button", { name: "Next page" }));
    await user.click(view.getByRole("button", { name: "Previous page" }));
    await user.click(view.getByRole("button", { name: "Page 9" }));
    await user.click(view.getByRole("button", { name: "Page 3" })); // the current page: no call
    expect(onPageChange.mock.calls).toEqual([[4], [2], [9]]);
  });

  it("disables previous on the first page and next on the last, and does not call back", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const first = renderIn("en", <Pagination page={1} pageCount={3} onPageChange={onPageChange} />);
    await user.click(first.getByRole("button", { name: "Previous page" }));
    expect(first.getByRole("button", { name: "Previous page" })).toHaveProperty("disabled", true);
    const last = renderIn("ar", <Pagination page={3} pageCount={3} onPageChange={onPageChange} />);
    await user.click(last.getByRole("button", { name: "Next page" }));
    expect(last.getByRole("button", { name: "Next page" })).toHaveProperty("disabled", true);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("moves with the keyboard: Tab reaches a page button and Enter or Space activates it", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const view = renderIn("en", <Pagination page={1} pageCount={3} onPageChange={onPageChange} />);
    await user.tab(); // previous is disabled, so the first stop is page 1
    expect(document.activeElement).toBe(view.getByRole("button", { name: "Page 1" }));
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("button", { name: "Page 2" }));
    await user.keyboard("{Enter}");
    await user.tab();
    await user.keyboard(" ");
    expect(onPageChange.mock.calls).toEqual([[2], [3]]);
  });

  it("offers a rows-per-page choice only when options and a handler are given", async () => {
    const user = userEvent.setup();
    const onPageSizeChange = vi.fn();
    const without = renderIn("en", <Pagination page={1} pageCount={3} onPageChange={() => {}} pageSize={10} />);
    expect(without.queryByRole("combobox")).toBeNull();
    without.unmount();
    const view = renderIn(
      "en",
      <Pagination
        page={1}
        pageCount={3}
        onPageChange={() => {}}
        total={30}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    const select = view.getByRole("combobox", { name: "Rows per page" });
    expect((select as HTMLSelectElement).value).toBe("10");
    await user.selectOptions(select, "25");
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it("uses a label function for the summary (plural rules belong to the application)", () => {
    const view = renderIn("ar", <Pagination page={1} pageCount={2} onPageChange={() => {}} total={12} pageSize={10} />, {
      labels: { "pagination.range": ({ from, to, total }) => `${from}-${to}/${total}` },
    });
    expect(view.getByText("1-10/12")).toBeTruthy();
  });

  it("renders no default English string when Arabic labels are given", () => {
    const view = renderIn(
      "ar",
      <Pagination
        page={2}
        pageCount={20}
        onPageChange={() => {}}
        total={200}
        pageSize={10}
        pageSizeOptions={[10, 25]}
        onPageSizeChange={() => {}}
      />,
      { labels: AR_DATA_LABELS },
    );
    expect(view.getByRole("navigation", { name: "ترقيم الصفحات" })).toBeTruthy();
    expect(view.getByText("11 إلى 20 من 200")).toBeTruthy();
    expect(view.getByRole("button", { name: "الصفحة السابقة" })).toBeTruthy();
    expect(view.getByRole("button", { name: "الصفحة التالية" })).toBeTruthy();
    expect(view.getByRole("button", { name: "الانتقال إلى الصفحة 2" }).getAttribute("aria-current")).toBe("page");
    expect(view.getByRole("combobox", { name: "عدد الصفوف في الصفحة" })).toBeTruthy();
    expect(view.getByText("2 / 20")).toBeTruthy();
    expectNoDefaultEnglish(view.container);
  });

  it("marks the previous and next buttons as direct children of the block the mirroring rule targets", () => {
    const views = renderBoth(<Pagination page={2} pageCount={5} onPageChange={() => {}} />);
    for (const view of [views.en, views.ar]) {
      const previous = view.getByRole("button", { name: "Previous page" });
      const next = view.getByRole("button", { name: "Next page" });
      expect(previous.parentElement).toBe(next.parentElement);
      expect(previous.querySelector("svg")).not.toBeNull();
      expect(next.querySelector("svg")).not.toBeNull();
      // the page buttons sit deeper, inside the list, so the rule leaves their digits alone
      expect(view.getByRole("button", { name: "Page 2" }).parentElement).not.toBe(previous.parentElement);
    }
  });
});
