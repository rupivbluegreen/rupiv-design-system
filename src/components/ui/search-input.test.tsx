import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AR_DATA_LABELS, expectNoDefaultEnglish } from "../../../test/data-labels";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { SearchInput } from "./search-input";

// jsdom has no layout: these tests prove the labels, the value handling and the keyboard, not the look in right-to-left.

function Held({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <SearchInput
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("SearchInput", () => {
  it("renders a search box named by the provider's default placeholder", () => {
    const views = renderBoth(<SearchInput />);
    for (const view of [views.en, views.ar]) {
      const input = view.getByRole("searchbox", { name: "Search" });
      expect(input.getAttribute("placeholder")).toBe("Search");
      expect((input as HTMLInputElement).type).toBe("search");
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("takes the placeholder and the accessible name from the caller", () => {
    const view = renderIn("ar", <SearchInput placeholder="ابحث عن شخص" />);
    expect(view.getByRole("searchbox", { name: "ابحث عن شخص" })).toBeTruthy();
    view.unmount();
    const named = renderIn("en", <SearchInput placeholder="Find" aria-label="Find people" />);
    expect(named.getByRole("searchbox", { name: "Find people" }).getAttribute("placeholder")).toBe("Find");
  });

  it.each(LOCALE_CASES)("reports what is typed, keeps its own value when uncontrolled, and shows Clear ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn(locale, <SearchInput onChange={onChange} />);
    const input = view.getByRole("searchbox") as HTMLInputElement;
    expect(view.queryByRole("button", { name: "Clear search" })).toBeNull();
    await user.type(input, "ab");
    expect(input.value).toBe("ab");
    expect(onChange.mock.calls).toEqual([["a"], ["ab"]]);
    expect(view.getByRole("button", { name: "Clear search" })).toBeTruthy();
  });

  it("starts from defaultValue", () => {
    const view = renderIn("en", <SearchInput defaultValue="north" />);
    expect((view.getByRole("searchbox") as HTMLInputElement).value).toBe("north");
    expect(view.getByRole("button", { name: "Clear search" })).toBeTruthy();
  });

  it("is controlled when value is given", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn("en", <SearchInput value="fixed" onChange={onChange} />);
    const input = view.getByRole("searchbox") as HTMLInputElement;
    await user.type(input, "x");
    expect(onChange).toHaveBeenLastCalledWith("fixedx");
    expect(input.value).toBe("fixed"); // the parent did not update it
  });

  it("clears with the button and puts the focus back in the box", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn("en", <Held onChange={onChange} />);
    const input = view.getByRole("searchbox") as HTMLInputElement;
    await user.type(input, "abc");
    await user.click(view.getByRole("button", { name: "Clear search" }));
    expect(input.value).toBe("");
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(document.activeElement).toBe(input);
    expect(view.queryByRole("button", { name: "Clear search" })).toBeNull();
  });

  it("clears on Escape when there is text, and leaves the box when there is none", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <Held />);
    const input = view.getByRole("searchbox") as HTMLInputElement;
    await user.type(input, "abc");
    await user.keyboard("{Escape}");
    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
    await user.keyboard("{Escape}");
    expect(document.activeElement).not.toBe(input);
  });

  it("reaches the clear button by Tab and clears with Enter", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <Held />);
    await user.type(view.getByRole("searchbox"), "abc");
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("button", { name: "Clear search" }));
    await user.keyboard("{Enter}");
    expect((view.getByRole("searchbox") as HTMLInputElement).value).toBe("");
  });

  it("focuses from anywhere with its shortcut, unless the person is already typing elsewhere", async () => {
    const user = userEvent.setup();
    const view = renderIn(
      "en",
      <>
        <SearchInput shortcut="/" />
        <input aria-label="other" />
      </>,
    );
    const search = view.getByRole("searchbox");
    expect(search.getAttribute("aria-keyshortcuts")).toBe("/");
    expect(view.getByText("/")).toBeTruthy(); // the hint
    await user.keyboard("/");
    expect(document.activeElement).toBe(search);
    const other = view.getByRole("textbox", { name: "other" }) as HTMLInputElement;
    await user.click(other);
    await user.keyboard("/");
    expect(document.activeElement).toBe(other);
    expect(other.value).toBe("/");
  });

  it("is disabled: no typing, no Clear button, no shortcut", async () => {
    const user = userEvent.setup();
    const views = renderBoth(<SearchInput disabled defaultValue="text" shortcut="/" />);
    for (const view of [views.en, views.ar]) {
      const input = view.getByRole("searchbox") as HTMLInputElement;
      expect(input.disabled).toBe(true);
      expect(view.queryByRole("button")).toBeNull();
    }
    await user.keyboard("/");
    expect(document.activeElement).toBe(document.body);
  });

  it("renders no default English string when Arabic labels are given", async () => {
    const user = userEvent.setup();
    const view = renderIn("ar", <SearchInput />, { labels: AR_DATA_LABELS });
    const input = view.getByRole("searchbox", { name: "بحث" });
    await user.type(input, "س");
    expect(view.getByRole("button", { name: "مسح البحث" })).toBeTruthy();
    expectNoDefaultEnglish(view.container);
  });
});
