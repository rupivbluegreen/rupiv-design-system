import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderIn } from "../../../test/harness";
import { emulateDirectionInheritance, mockRects, rect, setViewport } from "../../../test/overlay-dom";
import { Button } from "./button";
import { Popover } from "./popover";

beforeEach(() => {
  emulateDirectionInheritance();
});

describe.each(LOCALE_CASES)("Popover ($locale)", ({ locale, dir }) => {
  describe("opening and closing", () => {
    it("opens on click as a dialog and sets the trigger's aria attributes", async () => {
      const user = userEvent.setup();
      const view = renderIn(
        locale,
        <Popover label="Filters" trigger={<Button>Open</Button>}>
          <p>Body</p>
        </Popover>,
      );
      const trigger = view.getByRole("button", { name: "Open" });
      expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryByRole("dialog")).toBeNull();

      await user.click(trigger);
      const dialog = screen.getByRole("dialog", { name: "Filters" });
      expect(dialog.textContent).toBe("Body");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);

      await user.click(trigger);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("closes when the pointer goes down outside it, but not inside it", async () => {
      const user = userEvent.setup();
      const view = renderIn(
        locale,
        <Popover trigger={<Button>Open</Button>}>
          <button type="button">Inside</button>
        </Popover>,
      );
      await user.click(view.getByRole("button", { name: "Open" }));
      await user.click(screen.getByRole("button", { name: "Inside" }));
      expect(screen.getByRole("dialog")).toBeTruthy();
      await user.click(document.body);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("can be controlled, and reports every request to open or close", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      function Controlled() {
        const [open, setOpen] = useState(false);
        return (
          <Popover
            open={open}
            onOpenChange={(next) => {
              onOpenChange(next);
              setOpen(next);
            }}
            trigger={<Button>Open</Button>}
          >
            <p>Body</p>
          </Popover>
        );
      }
      const view = renderIn(locale, <Controlled />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      expect(screen.getByRole("dialog")).toBeTruthy();
      await user.click(document.body);
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("stays closed while a controlled `open` is false, whatever the trigger does", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const view = renderIn(
        locale,
        <Popover open={false} onOpenChange={onOpenChange} trigger={<Button>Open</Button>}>
          <p>Body</p>
        </Popover>,
      );
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("sizes the panel from `width` on the inline axis", async () => {
      const user = userEvent.setup();
      const view = renderIn(
        locale,
        <Popover width={320} trigger={<Button>Open</Button>}>
          <p>Body</p>
        </Popover>,
      );
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(screen.getByRole("dialog").style.inlineSize).toBe("320px");
    });
  });

  describe("keyboard and focus", () => {
    it("opened from the keyboard, moves focus to the first focusable element in the panel", async () => {
      const user = userEvent.setup();
      const view = renderIn(
        locale,
        <Popover trigger={<Button>Open</Button>}>
          <input aria-label="Name" />
          <button type="button">Apply</button>
        </Popover>,
      );
      view.getByRole("button", { name: "Open" }).focus();
      await user.keyboard("{Enter}");
      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" }));
    });

    it("opened by a mouse click, leaves focus where it was (on the trigger)", async () => {
      const user = userEvent.setup();
      const view = renderIn(
        locale,
        <Popover trigger={<Button>Open</Button>}>
          <input aria-label="Name" />
        </Popover>,
      );
      const trigger = view.getByRole("button", { name: "Open" });
      await user.click(trigger);
      expect(document.activeElement).toBe(trigger);
    });

    it("focuses the panel itself when it holds nothing focusable", async () => {
      const user = userEvent.setup();
      const view = renderIn(
        locale,
        <Popover trigger={<Button>Open</Button>}>
          <p>Just text</p>
        </Popover>,
      );
      view.getByRole("button", { name: "Open" }).focus();
      await user.keyboard("{Enter}");
      expect(document.activeElement).toBe(screen.getByRole("dialog"));
    });

    it("closes with Escape from inside the panel and returns focus to the trigger", async () => {
      const user = userEvent.setup();
      const view = renderIn(
        locale,
        <Popover trigger={<Button>Open</Button>}>
          <input aria-label="Name" />
        </Popover>,
      );
      const trigger = view.getByRole("button", { name: "Open" });
      trigger.focus();
      await user.keyboard("{Enter}");
      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" }));
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it("closes with Escape while focus is still on the trigger (opened with the mouse)", async () => {
      const user = userEvent.setup();
      const view = renderIn(
        locale,
        <Popover trigger={<Button>Open</Button>}>
          <p>Body</p>
        </Popover>,
      );
      const trigger = view.getByRole("button", { name: "Open" });
      await user.click(trigger);
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it("does nothing on Escape when it is closed", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const view = renderIn(
        locale,
        <Popover onOpenChange={onOpenChange} trigger={<Button>Open</Button>}>
          <p>Body</p>
        </Popover>,
      );
      view.getByRole("button", { name: "Open" }).focus();
      await user.keyboard("{Escape}");
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("placement (rectangles are mocked; jsdom has no layout)", () => {
    // trigger 100 x 34 at (400, 100); panel 300 x 200; page 1024 x 768
    const PANEL = rect(0, 0, 300, 200);

    async function open(triggerRect: DOMRect, align: "start" | "end"): Promise<HTMLElement> {
      setViewport(1024, 768);
      mockRects((el) => {
        if (el.getAttribute("role") === "dialog") return PANEL;
        if (el.tagName === "BUTTON" && el.textContent === "Open") return triggerRect;
        return undefined;
      });
      const view = renderIn(
        locale,
        <Popover align={align} trigger={<Button>Open</Button>}>
          <p>Body</p>
        </Popover>,
      );
      await userEvent.click(view.getByRole("button", { name: "Open" }));
      return screen.getByRole("dialog");
    }

    it("lines its inline start up with the trigger's inline start: left in English, right in Arabic", async () => {
      const panel = await open(rect(400, 100, 100, 34), "start");
      expect(panel.style.left).toBe(dir === "ltr" ? "400px" : "200px"); // rtl: right edge 500 minus width 300
      expect(panel.style.top).toBe("140px"); // 134 + 6
      expect(panel.dataset["side"]).toBe("bottom");
    });

    it("lines its inline end up with the trigger's inline end: right in English, left in Arabic", async () => {
      const panel = await open(rect(400, 100, 100, 34), "end");
      expect(panel.style.left).toBe(dir === "ltr" ? "200px" : "400px");
    });

    it("stays 8px inside the page edge that the trigger is against", async () => {
      // a trigger at the far inline end of the page: the panel is pulled back in, whichever way the page runs
      const atRight = await open(rect(920, 100, 100, 34), "start");
      expect(Number.parseInt(atRight.style.left, 10)).toBeLessThanOrEqual(1024 - 8 - 300);
    });

    it("opens above the trigger when there is no room below", async () => {
      const panel = await open(rect(400, 700, 100, 34), "start");
      expect(panel.dataset["side"]).toBe("top");
      expect(panel.style.top).toBe("494px"); // 700 - 6 - 200
    });
  });
});
