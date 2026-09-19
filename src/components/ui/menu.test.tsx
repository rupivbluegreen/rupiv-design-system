import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomLink, LOCALE_CASES, renderIn } from "../../../test/harness";
import { emulateDirectionInheritance, mockRects, rect, setViewport } from "../../../test/overlay-dom";
import { Button } from "./button";
import { Menu, type MenuEntry } from "./menu";

beforeEach(() => {
  emulateDirectionInheritance();
});

const BASIC: MenuEntry[] = [
  { label: "Profile" },
  { label: "Billing", disabled: true },
  { label: "Sign out", danger: true },
];

describe.each(LOCALE_CASES)("Menu ($locale)", ({ locale, dir }) => {
  describe("links", () => {
    it("renders item links as plain <a href> by default", async () => {
      const view = renderIn(
        locale,
        <Menu
          label="Actions"
          trigger={<Button>Open</Button>}
          items={[{ label: "Profile", href: "/profile" }, "separator", { label: "Sign out", onSelect: () => {} }]}
        />,
      );
      await userEvent.click(view.getByRole("button", { name: "Open" }));
      const link = screen.getByRole("menuitem", { name: "Profile" });
      expect(link.tagName).toBe("A");
      expect(link.getAttribute("href")).toBe("/profile");
      expect(link.hasAttribute("data-custom-link")).toBe(false);
      expect(screen.getByRole("menuitem", { name: "Sign out" }).tagName).toBe("BUTTON");
      expect(screen.getByRole("menu").getAttribute("aria-label")).toBe("Actions");
    });

    it("uses the provider's link component for item links", async () => {
      const view = renderIn(
        locale,
        <Menu trigger={<Button>Open</Button>} items={[{ label: "Profile", href: "/profile" }]} />,
        { linkComponent: CustomLink },
      );
      await userEvent.click(view.getByRole("button", { name: "Open" }));
      const link = screen.getByRole("menuitem", { name: "Profile" });
      expect(link.getAttribute("data-custom-link")).toBe("true");
      expect(link.getAttribute("href")).toBe("/profile");
      expect(link.getAttribute("role")).toBe("menuitem");
    });

    it("renders a disabled item with an href as a button, not a link", async () => {
      const view = renderIn(
        locale,
        <Menu trigger={<Button>Open</Button>} items={[{ label: "Profile", href: "/profile", disabled: true }]} />,
        { linkComponent: CustomLink },
      );
      await userEvent.click(view.getByRole("button", { name: "Open" }));
      const item = screen.getByRole("menuitem", { name: "Profile" });
      expect(item.tagName).toBe("BUTTON");
      expect(item.getAttribute("aria-disabled")).toBe("true");
    });
  });

  describe("keyboard", () => {
    it("opens with ArrowDown or ArrowUp on the trigger and focuses the first item", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Menu trigger={<Button>Open</Button>} items={BASIC} />);
      const trigger = view.getByRole("button", { name: "Open" });
      trigger.focus();
      await user.keyboard("{ArrowDown}");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Profile" }));
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("menu")).toBeNull();
      await user.keyboard("{ArrowUp}");
      expect(screen.getByRole("menu")).toBeTruthy();
    });

    it("moves with ArrowDown and ArrowUp, wraps, skips disabled items, and jumps with Home and End", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Menu trigger={<Button>Open</Button>} items={BASIC} />);
      view.getByRole("button", { name: "Open" }).focus();
      await user.keyboard("{ArrowDown}");
      const profile = screen.getByRole("menuitem", { name: "Profile" });
      const signOut = screen.getByRole("menuitem", { name: "Sign out" });
      expect(document.activeElement).toBe(profile);
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(signOut); // Billing is disabled and skipped
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(profile); // wraps
      await user.keyboard("{ArrowUp}");
      expect(document.activeElement).toBe(signOut); // wraps backwards
      await user.keyboard("{Home}");
      expect(document.activeElement).toBe(profile);
      await user.keyboard("{End}");
      expect(document.activeElement).toBe(signOut);
    });

    it("does not use ArrowLeft or ArrowRight: the menu is vertical, so nothing depends on the direction", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Menu trigger={<Button>Open</Button>} items={BASIC} />);
      view.getByRole("button", { name: "Open" }).focus();
      await user.keyboard("{ArrowDown}");
      const profile = screen.getByRole("menuitem", { name: "Profile" });
      await user.keyboard("{ArrowRight}");
      await user.keyboard("{ArrowLeft}");
      expect(screen.getByRole("menu")).toBeTruthy();
      expect(document.activeElement).toBe(profile);
    });

    it("closes with Escape and gives focus back to the trigger", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Menu trigger={<Button>Open</Button>} items={BASIC} />);
      const trigger = view.getByRole("button", { name: "Open" });
      trigger.focus();
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("menu")).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    });

    it("closes with Tab and gives focus back to the trigger", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Menu trigger={<Button>Open</Button>} items={BASIC} />);
      const trigger = view.getByRole("button", { name: "Open" });
      trigger.focus();
      await user.keyboard("{ArrowDown}");
      await user.tab();
      expect(screen.queryByRole("menu")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it("selects with Enter, calls onSelect once, and closes", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const view = renderIn(
        locale,
        <Menu trigger={<Button>Open</Button>} items={[{ label: "Profile", onSelect }, { label: "Other" }]} />,
      );
      const trigger = view.getByRole("button", { name: "Open" });
      trigger.focus();
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("menu")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it("does not act on a disabled item and stays open", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const view = renderIn(
        locale,
        <Menu trigger={<Button>Open</Button>} items={[{ label: "Billing", disabled: true, onSelect }]} />,
      );
      await user.click(view.getByRole("button", { name: "Open" }));
      await user.click(screen.getByRole("menuitem", { name: "Billing" }));
      expect(onSelect).not.toHaveBeenCalled();
      expect(screen.getByRole("menu")).toBeTruthy();
    });

    it("closes when the pointer goes down outside the menu", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Menu trigger={<Button>Open</Button>} items={BASIC} />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(screen.getByRole("menu")).toBeTruthy();
      await user.click(document.body);
      expect(screen.queryByRole("menu")).toBeNull();
    });
  });

  describe("heading and radio items", () => {
    function StateMenu({ onChange, initial = "any" }: { onChange?: (value: string) => void; initial?: string }) {
      const [value, setValue] = useState<string | undefined>(initial);
      return (
        <Menu
          label="Filter"
          trigger={<Button>State</Button>}
          items={[
            {
              type: "radio-group",
              heading: "State",
              value,
              onValueChange: (next) => {
                setValue(next);
                onChange?.(next);
              },
              options: [
                { value: "any", label: "Any" },
                { value: "draft", label: "Draft" },
                { value: "retired", label: "Retired", disabled: true },
                { value: "active", label: "Active" },
              ],
            },
          ]}
        />
      );
    }

    it("renders menuitemradio items in a group named by its heading, with the chosen one checked", async () => {
      const view = renderIn(locale, <StateMenu />);
      await userEvent.click(view.getByRole("button", { name: "State" }));
      const group = screen.getByRole("group", { name: "State" });
      const radios = within(group).getAllByRole("menuitemradio");
      expect(radios.map((r) => r.textContent)).toEqual(["Any", "Draft", "Retired", "Active"]);
      expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["true", "false", "false", "false"]);
      expect(screen.getByRole("menu").getAttribute("aria-orientation")).toBe("vertical");
      // the visible heading is the group's name and is not an item
      expect(within(group).queryByRole("menuitem")).toBeNull();
    });

    it("checks nothing when the value matches no option", async () => {
      const view = renderIn(locale, <StateMenu initial="none" />);
      await userEvent.click(view.getByRole("button", { name: "State" }));
      const checked = screen.getAllByRole("menuitemradio").filter((r) => r.getAttribute("aria-checked") === "true");
      expect(checked).toEqual([]);
    });

    it("names a group by `label` when it has no visible heading", async () => {
      const view = renderIn(
        locale,
        <Menu
          trigger={<Button>Zone</Button>}
          items={[
            {
              type: "radio-group",
              label: "Zone",
              value: "a",
              onValueChange: () => {},
              options: [
                { value: "a", label: "North" },
                { value: "b", label: "South" },
              ],
            },
          ]}
        />,
      );
      await userEvent.click(view.getByRole("button", { name: "Zone" }));
      expect(screen.getByRole("group", { name: "Zone" })).toBeTruthy();
    });

    it("choosing an option calls onValueChange, closes the menu and returns focus to the trigger", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const view = renderIn(locale, <StateMenu onChange={onChange} />);
      const trigger = view.getByRole("button", { name: "State" });
      await user.click(trigger);
      await user.click(screen.getByRole("menuitemradio", { name: "Draft" }));
      expect(onChange).toHaveBeenCalledExactlyOnceWith("draft");
      expect(screen.queryByRole("menu")).toBeNull();
      expect(document.activeElement).toBe(trigger);

      await user.click(trigger);
      expect(screen.getByRole("menuitemradio", { name: "Draft" }).getAttribute("aria-checked")).toBe("true");
      expect(screen.getByRole("menuitemradio", { name: "Any" }).getAttribute("aria-checked")).toBe("false");
    });

    it("closes without calling onValueChange when the chosen option is already checked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const view = renderIn(locale, <StateMenu onChange={onChange} />);
      await user.click(view.getByRole("button", { name: "State" }));
      await user.click(screen.getByRole("menuitemradio", { name: "Any" }));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole("menu")).toBeNull();
    });

    it("skips a disabled option with the arrow keys and does not choose it", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const view = renderIn(locale, <StateMenu onChange={onChange} />);
      view.getByRole("button", { name: "State" }).focus();
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: "Any" }));
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: "Draft" }));
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: "Active" })); // Retired skipped
      const retired = screen.getByRole("menuitemradio", { name: "Retired" });
      expect(retired.getAttribute("aria-disabled")).toBe("true");
      await user.click(retired);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole("menu")).toBeTruthy();
    });

    it("chooses the focused radio option with Enter", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const view = renderIn(locale, <StateMenu onChange={onChange} />);
      view.getByRole("button", { name: "State" }).focus();
      await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
      expect(onChange).toHaveBeenCalledExactlyOnceWith("draft");
    });

    it("shows a standalone heading that is not an item and cannot be focused", async () => {
      const user = userEvent.setup();
      const view = renderIn(
        locale,
        <Menu
          trigger={<Button>Open</Button>}
          items={[{ type: "heading", label: "Actions" }, { label: "Profile" }, "separator", { type: "item", label: "Help" }]}
        />,
      );
      view.getByRole("button", { name: "Open" }).focus();
      await user.keyboard("{ArrowDown}");
      expect(screen.getByText("Actions")).toBeTruthy();
      expect(screen.getAllByRole("menuitem").map((el) => el.textContent)).toEqual(["Profile", "Help"]);
      expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Profile" }));
      await user.keyboard("{ArrowUp}");
      expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Help" }));
    });
  });

  describe("placement (rectangles are mocked; jsdom has no layout)", () => {
    // trigger 120 x 34 at (400, 100); menu 200 x 120; page 1024 x 768
    const TRIGGER = rect(400, 100, 120, 34);
    const LOW_TRIGGER = rect(400, 700, 120, 34);
    const MENU = rect(0, 0, 200, 120);

    async function open(triggerRect: DOMRect, align: "start" | "end"): Promise<HTMLElement> {
      setViewport(1024, 768);
      mockRects((el) => {
        if (el.getAttribute("role") === "menu") return MENU;
        if (el.tagName === "BUTTON" && el.textContent === "Open") return triggerRect;
        return undefined;
      });
      const view = renderIn(locale, <Menu align={align} trigger={<Button>Open</Button>} items={BASIC} />);
      await userEvent.click(view.getByRole("button", { name: "Open" }));
      return screen.getByRole("menu");
    }

    it("lines its inline start up with the trigger's inline start: left in English, right in Arabic", async () => {
      const menu = await open(TRIGGER, "start");
      expect(menu.style.left).toBe(dir === "ltr" ? "400px" : "320px"); // rtl: trigger right edge 520 minus width 200
      expect(menu.style.top).toBe("138px");
      expect(menu.dataset["side"]).toBe("bottom");
    });

    it("lines its inline end up with the trigger's inline end: right in English, left in Arabic", async () => {
      const menu = await open(TRIGGER, "end");
      expect(menu.style.left).toBe(dir === "ltr" ? "320px" : "400px");
    });

    it("is at least as wide as its trigger and never narrower than 180px", async () => {
      const menu = await open(TRIGGER, "start");
      expect(menu.style.minInlineSize).toBe("180px");
    });

    it("takes the trigger's width as its minimum when the trigger is wider than 180px", async () => {
      const menu = await open(rect(400, 100, 260, 34), "start");
      expect(menu.style.minInlineSize).toBe("260px");
    });

    it("opens above the trigger when there is no room below", async () => {
      const menu = await open(LOW_TRIGGER, "start");
      expect(menu.dataset["side"]).toBe("top");
      expect(menu.style.top).toBe("576px"); // 700 - 4 - 120
    });
  });
});

describe("Menu in a page whose direction differs from the provider's", () => {
  it("follows the direction of the trigger it is placed against", async () => {
    // an English page with a right-to-left island: the trigger's own direction decides
    setViewport(1024, 768);
    mockRects((el) => {
      if (el.getAttribute("role") === "menu") return rect(0, 0, 200, 120);
      if (el.tagName === "BUTTON" && el.textContent === "Open") return rect(400, 100, 120, 34);
      return undefined;
    });
    const view = renderIn("en", <Menu trigger={<Button dir="rtl">Open</Button>} items={BASIC} />);
    await userEvent.click(view.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("menu").style.left).toBe("320px");
  });
});
