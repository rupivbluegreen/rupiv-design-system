import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderIn } from "../../../test/harness";
import { AR_OVERLAY_LABELS, expectNoDefaultEnglish } from "../../../test/overlay-labels";
import { emulateDirectionInheritance, mockRects, rect, setViewport } from "../../../test/overlay-dom";
import { Combobox, type ComboboxOption } from "./combobox";

beforeEach(() => {
  emulateDirectionInheritance();
});

const OPTIONS: ComboboxOption[] = [
  { value: "north", label: "North zone", description: "Riyadh", meta: "N-1" },
  { value: "south", label: "South zone", meta: "S-1" },
  { value: "east", label: "East zone" },
];

const input = () => screen.getByRole("combobox");

describe.each(LOCALE_CASES)("Combobox ($locale)", ({ locale, dir }) => {
  describe("opening and choosing", () => {
    it("shows the selected option in the field and opens a listbox on click", async () => {
      const user = userEvent.setup();
      renderIn(locale, <Combobox aria-label="Zone" options={OPTIONS} value="south" />);
      const field = screen.getByRole<HTMLInputElement>("combobox", { name: "Zone" });
      expect(field.value).toBe("South zone");
      expect(field.getAttribute("aria-expanded")).toBe("false");

      await user.click(field);
      const list = screen.getByRole("listbox");
      expect(field.getAttribute("aria-expanded")).toBe("true");
      expect(field.getAttribute("aria-controls")).toBe(list.id);
      const options = within(list).getAllByRole("option");
      expect(options.map((o) => o.getAttribute("aria-selected"))).toEqual(["false", "true", "false"]);
      // the field is emptied for searching and shows the current choice as its placeholder
      expect(field.value).toBe("");
      expect(field.placeholder).toBe("South zone");
    });

    it("chooses with a click, reports the value, updates an uncontrolled field and closes", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderIn(locale, <Combobox aria-label="Zone" options={OPTIONS} onChange={onChange} />);
      await user.click(input());
      await user.click(screen.getByRole("option", { name: /East zone/ }));
      expect(onChange).toHaveBeenCalledExactlyOnceWith("east");
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(screen.getByRole<HTMLInputElement>("combobox").value).toBe("East zone");
    });

    it("stays on the controlled value until the parent changes it", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderIn(locale, <Combobox aria-label="Zone" options={OPTIONS} value="north" onChange={onChange} />);
      await user.click(input());
      await user.click(screen.getByRole("option", { name: /East zone/ }));
      expect(onChange).toHaveBeenCalledWith("east");
      expect(screen.getByRole<HTMLInputElement>("combobox").value).toBe("North zone");
    });

    it("filters as the person types, over label, description, meta and value", async () => {
      const user = userEvent.setup();
      renderIn(locale, <Combobox aria-label="Zone" options={OPTIONS} />);
      await user.type(input(), "riyadh");
      expect(screen.getAllByRole("option")).toHaveLength(1);
      await user.clear(input());
      await user.type(input(), "S-1");
      expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["South zoneS-1"]);
    });

    it("does not open when disabled", async () => {
      const user = userEvent.setup();
      renderIn(locale, <Combobox aria-label="Zone" options={OPTIONS} disabled />);
      await user.click(input());
      expect(screen.queryByRole("listbox")).toBeNull();
    });

    it("opens from the toggle button and closes from it again, keeping focus in the field", async () => {
      const user = userEvent.setup();
      renderIn(locale, <Combobox aria-label="Zone" options={OPTIONS} />);
      const toggle = screen.getByRole("button", { name: "Show options", hidden: true });
      await user.click(toggle);
      expect(screen.getByRole("listbox")).toBeTruthy();
      expect(document.activeElement).toBe(input());
      await user.click(screen.getByRole("button", { name: "Hide options", hidden: true }));
      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });

  describe("keyboard", () => {
    it("opens with ArrowDown, moves the active option with ArrowDown and ArrowUp, and stops at the ends", async () => {
      const user = userEvent.setup();
      renderIn(locale, <Combobox aria-label="Zone" options={OPTIONS} />);
      input().focus();
      await user.keyboard("{ArrowDown}");
      const list = screen.getByRole("listbox");
      const ids = within(list).getAllByRole("option").map((o) => o.id);
      expect(input().getAttribute("aria-activedescendant")).toBe(ids[0]);
      await user.keyboard("{ArrowDown}");
      expect(input().getAttribute("aria-activedescendant")).toBe(ids[1]);
      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(input().getAttribute("aria-activedescendant")).toBe(ids[2]); // does not wrap
      await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
      expect(input().getAttribute("aria-activedescendant")).toBe(ids[0]);
    });

    it("opens with ArrowUp too", async () => {
      const user = userEvent.setup();
      renderIn(locale, <Combobox aria-label="Zone" options={OPTIONS} />);
      input().focus();
      await user.keyboard("{ArrowUp}");
      expect(screen.getByRole("listbox")).toBeTruthy();
    });

    it("starts on the current choice when it opens", async () => {
      const user = userEvent.setup();
      renderIn(locale, <Combobox aria-label="Zone" options={OPTIONS} value="east" />);
      input().focus();
      await user.keyboard("{ArrowDown}");
      const active = input().getAttribute("aria-activedescendant");
      expect(screen.getByRole("option", { name: /East zone/ }).id).toBe(active);
    });

    it("chooses the active option with Enter", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderIn(locale, <Combobox aria-label="Zone" options={OPTIONS} onChange={onChange} />);
      input().focus();
      await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
      expect(onChange).toHaveBeenCalledExactlyOnceWith("south");
      expect(screen.queryByRole("listbox")).toBeNull();
    });

    it("closes with Escape without choosing, keeps focus in the field, and does not let Escape through", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const outer = vi.fn();
      renderIn(
        locale,
        <div onKeyDown={outer}>
          <Combobox aria-label="Zone" options={OPTIONS} onChange={onChange} />
        </div>,
      );
      input().focus();
      await user.keyboard("{ArrowDown}");
      outer.mockClear();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(input());
      expect(outer).not.toHaveBeenCalled();
      // closed: Escape is not the combobox's business any more, so it goes on to whatever is listening
      await user.keyboard("{Escape}");
      expect(outer).toHaveBeenCalledTimes(1);
    });

    it("closes with Tab and lets focus move on", async () => {
      const user = userEvent.setup();
      renderIn(
        locale,
        <>
          <Combobox aria-label="Zone" options={OPTIONS} />
          <button type="button">Next</button>
        </>,
      );
      input().focus();
      await user.keyboard("{ArrowDown}");
      await user.tab();
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Next" }));
    });

    it("closes when the pointer goes down outside", async () => {
      const user = userEvent.setup();
      renderIn(locale, <Combobox aria-label="Zone" options={OPTIONS} />);
      await user.click(input());
      expect(screen.getByRole("listbox")).toBeTruthy();
      await user.click(document.body);
      expect(screen.queryByRole("listbox")).toBeNull();
    });

    it("stays usable as a controlled field inside state", async () => {
      const user = userEvent.setup();
      function Host() {
        const [value, setValue] = useState("north");
        return <Combobox aria-label="Zone" options={OPTIONS} value={value} onChange={setValue} />;
      }
      renderIn(locale, <Host />);
      input().focus();
      await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
      expect(screen.getByRole<HTMLInputElement>("combobox").value).toBe("South zone");
    });
  });

  describe("labels", () => {
    it("uses the English defaults without labels from the application", async () => {
      const user = userEvent.setup();
      renderIn(locale, <Combobox aria-label="Zone" options={[]} />);
      expect(input().getAttribute("placeholder")).toBe("Select…");
      await user.click(input());
      expect(screen.getByText("No matches")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Hide options", hidden: true })).toBeTruthy();
    });

    it("lets placeholder and emptyText override the labels", async () => {
      const user = userEvent.setup();
      renderIn(locale, <Combobox aria-label="Zone" options={[]} placeholder="Pick a zone" emptyText="Nothing here" />);
      expect(input().getAttribute("placeholder")).toBe("Pick a zone");
      await user.click(input());
      expect(screen.getByText("Nothing here")).toBeTruthy();
    });

    it("renders and announces the application's labels, and no English default", async () => {
      const user = userEvent.setup();
      renderIn(locale, <Combobox aria-label="المنطقة" options={[]} />, { labels: AR_OVERLAY_LABELS });
      expect(input().getAttribute("placeholder")).toBe(AR_OVERLAY_LABELS["combobox.placeholder"]);
      expect(screen.getByRole("button", { name: AR_OVERLAY_LABELS["combobox.show"], hidden: true })).toBeTruthy();
      expectNoDefaultEnglish(document.body);

      await user.click(input());
      expect(screen.getByText(AR_OVERLAY_LABELS["combobox.empty"])).toBeTruthy();
      expect(screen.getByRole("button", { name: AR_OVERLAY_LABELS["combobox.hide"], hidden: true })).toBeTruthy();
      expectNoDefaultEnglish(document.body);
    });
  });

  describe("placement (rectangles are mocked; jsdom has no layout)", () => {
    // field 240 x 34 at (300, 200); page 1024 x 768
    async function open(fieldRect: DOMRect): Promise<HTMLElement> {
      setViewport(1024, 768);
      mockRects((el) => (el.firstElementChild?.getAttribute("role") === "combobox" ? fieldRect : undefined));
      renderIn(locale, <Combobox aria-label="Zone" options={OPTIONS} />);
      await userEvent.click(input());
      return screen.getByRole("listbox");
    }

    it("is as wide as the field and lines up with its inline start, in both directions", async () => {
      const list = await open(rect(300, 200, 240, 34));
      // equal widths: the inline start is the left edge in English and the right edge in Arabic, and both give the same box
      expect(list.style.left).toBe("300px");
      expect(list.style.inlineSize).toBe("240px");
      const inlineStartEdge = dir === "ltr" ? 300 : 300 + 240;
      const fieldInlineStartEdge = dir === "ltr" ? 300 : 540;
      expect(inlineStartEdge).toBe(fieldInlineStartEdge);
    });

    it("opens below the field with room, and limits its height to 320px", async () => {
      const list = await open(rect(300, 200, 240, 34));
      expect(list.style.top).toBe("238px");
      expect(list.style.bottom).toBe("");
      expect(list.style.maxBlockSize).toBe("320px");
    });

    it("opens above the field when there is little room below and more above", async () => {
      const list = await open(rect(300, 700, 240, 34));
      expect(list.style.top).toBe("");
      expect(list.style.bottom).toBe("72px"); // 768 - 700 + 4
    });
  });
});
