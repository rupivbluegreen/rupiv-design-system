import userEvent from "@testing-library/user-event";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderIn } from "../../../test/harness";
import { mockRects, mockVisibleElements, rect, restoreClock, useFakeClock } from "../../../test/overlay-dom";
import { AR_OVERLAY_LABELS, expectNoDefaultEnglish } from "../../../test/overlay-labels";
import { Drawer } from "./drawer";
import { Modal } from "./modal";
import { ToastProvider, useToast, type ToastOptions } from "./toast";

/** A button that raises a toast with the given options each time it is pressed. */
function Raise({ options, label = "Show" }: { options: ToastOptions; label?: string }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast(options)}>
      {label}
    </button>
  );
}

const region = () => screen.getByRole("region");
const lift = () => region().style.getPropertyValue("--rd-toast-lift");

describe.each(LOCALE_CASES)("Toast ($locale)", ({ locale }) => {
  describe("showing and dismissing", () => {
    beforeEach(() => {
      useFakeClock();
    });
    afterEach(() => {
      restoreClock();
    });

    it("shows a toast in a live region: status for most tones, alert for danger", async () => {
      const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
      const view = renderIn(
        locale,
        <ToastProvider>
          <Raise label="Info" options={{ title: "Saved", description: "All changes are stored", tone: "success" }} />
          <Raise label="Fail" options={{ title: "Failed", tone: "danger" }} />
        </ToastProvider>,
      );
      expect(region().getAttribute("aria-live")).toBe("polite");
      await user.click(view.getByRole("button", { name: "Info" }));
      await user.click(view.getByRole("button", { name: "Fail" }));
      const status = within(region()).getByRole("status");
      expect(status.textContent).toContain("Saved");
      expect(status.textContent).toContain("All changes are stored");
      expect(within(region()).getByRole("alert").textContent).toContain("Failed");
    });

    it("dismisses with the button", async () => {
      const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
      const view = renderIn(
        locale,
        <ToastProvider>
          <Raise options={{ title: "Saved" }} />
        </ToastProvider>,
      );
      await user.click(view.getByRole("button", { name: "Show" }));
      await user.click(within(region()).getByRole("button", { name: "Dismiss notification" }));
      expect(within(region()).queryByRole("status")).toBeNull();
    });

    it("goes away by itself after 4.5 seconds, or after `duration`", async () => {
      const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
      const view = renderIn(
        locale,
        <ToastProvider>
          <Raise label="Default" options={{ title: "Default" }} />
          <Raise label="Short" options={{ title: "Short", duration: 1000 }} />
        </ToastProvider>,
      );
      await user.click(view.getByRole("button", { name: "Default" }));
      await user.click(view.getByRole("button", { name: "Short" }));
      act(() => vi.advanceTimersByTime(1000));
      expect(region().textContent).toContain("Default");
      expect(region().textContent).not.toContain("Short");
      act(() => vi.advanceTimersByTime(3500));
      expect(region().textContent).not.toContain("Default");
    });

    it("stays until dismissed when duration is 0", async () => {
      const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
      const view = renderIn(
        locale,
        <ToastProvider>
          <Raise options={{ title: "Sticky", duration: 0 }} />
        </ToastProvider>,
      );
      await user.click(view.getByRole("button", { name: "Show" }));
      act(() => vi.advanceTimersByTime(60_000));
      expect(region().textContent).toContain("Sticky");
    });

    it("waits while the pointer is over it and restarts the clock when it leaves", async () => {
      const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
      const view = renderIn(
        locale,
        <ToastProvider>
          <Raise options={{ title: "Hold on", duration: 1000 }} />
        </ToastProvider>,
      );
      await user.click(view.getByRole("button", { name: "Show" }));
      const toast = within(region()).getByRole("status");
      fireEvent.mouseEnter(toast);
      act(() => vi.advanceTimersByTime(5000));
      expect(region().textContent).toContain("Hold on");
      fireEvent.mouseLeave(toast);
      act(() => vi.advanceTimersByTime(999));
      expect(region().textContent).toContain("Hold on");
      act(() => vi.advanceTimersByTime(1));
      expect(region().textContent).not.toContain("Hold on");
    });

    it("keeps the five newest", async () => {
      const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
      function Many() {
        const toast = useToast();
        const [n, setN] = useState(0);
        return (
          <button
            type="button"
            onClick={() => {
              toast({ title: `Toast ${n}`, duration: 0 });
              setN(n + 1);
            }}
          >
            Add
          </button>
        );
      }
      const view = renderIn(
        locale,
        <ToastProvider>
          <Many />
        </ToastProvider>,
      );
      for (let i = 0; i < 7; i += 1) await user.click(view.getByRole("button", { name: "Add" }));
      const titles = within(region())
        .getAllByRole("status")
        .map((el) => el.textContent);
      expect(titles).toHaveLength(5);
      expect(titles[0]).toContain("Toast 2");
      expect(titles[4]).toContain("Toast 6");
    });

    it("renders an action and returns an id that dismiss() accepts", async () => {
      const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
      function WithId() {
        const { toast, dismiss } = useToast();
        const [id, setId] = useState("");
        return (
          <>
            <button type="button" onClick={() => setId(toast({ title: "Undo?", duration: 0, action: <button type="button">Undo</button> }))}>
              Show
            </button>
            <button type="button" onClick={() => dismiss(id)}>
              Hide
            </button>
          </>
        );
      }
      const view = renderIn(
        locale,
        <ToastProvider>
          <WithId />
        </ToastProvider>,
      );
      await user.click(view.getByRole("button", { name: "Show" }));
      expect(within(region()).getByRole("button", { name: "Undo" })).toBeTruthy();
      await user.click(view.getByRole("button", { name: "Hide" }));
      expect(within(region()).queryByRole("status")).toBeNull();
    });

    it("warns and ignores the call when there is no provider", async () => {
      const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const view = renderIn(locale, <Raise options={{ title: "Lost" }} />);
      await user.click(view.getByRole("button", { name: "Show" }));
      expect(warn).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("status")).toBeNull();
    });
  });

  describe("labels", () => {
    it("names the region and the dismiss button in English by default", async () => {
      const user = userEvent.setup();
      const view = renderIn(
        locale,
        <ToastProvider>
          <Raise options={{ title: "Saved", duration: 0 }} />
        </ToastProvider>,
      );
      expect(screen.getByRole("region", { name: "Notifications" })).toBeTruthy();
      await user.click(view.getByRole("button", { name: "Show" }));
      const dismiss = within(region()).getByRole("button", { name: "Dismiss notification" });
      expect(dismiss.getAttribute("title")).toBe("Dismiss");
    });

    it("names them with the application's labels, and shows no English default", async () => {
      const user = userEvent.setup();
      const view = renderIn(
        locale,
        <ToastProvider>
          <Raise options={{ title: "تم الحفظ", description: "حُفظت كل التغييرات", duration: 0 }} />
        </ToastProvider>,
        { labels: AR_OVERLAY_LABELS },
      );
      await user.click(view.getByRole("button", { name: "Show" }));
      expect(screen.getByRole("region", { name: AR_OVERLAY_LABELS["toast.region"] })).toBeTruthy();
      const dismiss = within(region()).getByRole("button", { name: AR_OVERLAY_LABELS["toast.dismiss"] });
      expect(dismiss.getAttribute("title")).toBe(AR_OVERLAY_LABELS["toast.dismissTitle"]);
      expectNoDefaultEnglish(region());
    });
  });

  describe("staying above the footer of a drawer or modal (rectangles are mocked; jsdom has no layout)", () => {
    // page 1024 x 768. The stack: 360 wide at the inline-end corner, its bottom 24px above the page bottom.
    const STACK = rect(640, 500, 360, 244);
    const DRAWER_FOOTER = rect(544, 700, 480, 68);
    const FAR_FOOTER = rect(0, 700, 400, 68);

    function Layered({ footer = "drawer", showLayer }: { footer?: "drawer" | "modal"; showLayer: boolean }) {
      return (
        <ToastProvider>
          <Raise options={{ title: "Saved", duration: 0 }} />
          {footer === "drawer" ? (
            <Drawer open={showLayer} onClose={() => {}} title="Details" footer={<button type="button">Save</button>}>
              <p>Body</p>
            </Drawer>
          ) : (
            <Modal open={showLayer} onClose={() => {}} title="Details" footer={<button type="button">Save</button>}>
              <p>Body</p>
            </Modal>
          )}
        </ToastProvider>
      );
    }

    beforeEach(() => {
      mockVisibleElements();
    });

    function mockPage(footerRect: DOMRect) {
      mockRects((el) => {
        if (el.getAttribute("role") === "region") return STACK;
        if (el.hasAttribute("data-overlay-footer")) return footerRect;
        return undefined;
      });
    }

    it("lifts the stack above a drawer footer that is already open when the toast appears", async () => {
      const user = userEvent.setup();
      mockPage(DRAWER_FOOTER);
      const view = renderIn(locale, <Layered showLayer />);
      await user.click(view.getByRole("button", { name: "Show" }));
      // 744 (bottom of the stack) - 700 (top of the footer) + 8
      expect(lift()).toBe("52px");
    });

    it("lifts the stack when a drawer opens after the toast is already showing, and drops it when the drawer closes", async () => {
      const user = userEvent.setup();
      mockPage(DRAWER_FOOTER);
      function OneProvider() {
        const [open, setOpen] = useState(false);
        return (
          <ToastProvider>
            <Raise options={{ title: "Saved", duration: 0 }} />
            <button type="button" onClick={() => setOpen((o) => !o)}>
              Layer
            </button>
            <Drawer open={open} onClose={() => setOpen(false)} title="Details" footer={<button type="button">Save</button>}>
              <p>Body</p>
            </Drawer>
          </ToastProvider>
        );
      }
      const view = renderIn(locale, <OneProvider />);
      await user.click(view.getByRole("button", { name: "Show" }));
      expect(lift()).toBe("0px");

      await user.click(view.getByRole("button", { name: "Layer" }));
      await waitFor(() => expect(lift()).toBe("52px"));

      await user.keyboard("{Escape}");
      await waitFor(() => expect(lift()).toBe("0px"));
    });

    it("does the same for a modal footer", async () => {
      const user = userEvent.setup();
      mockPage(DRAWER_FOOTER);
      const view = renderIn(locale, <Layered footer="modal" showLayer />);
      await user.click(view.getByRole("button", { name: "Show" }));
      expect(lift()).toBe("52px");
    });

    it("does not lift for a footer that is off to the side of the stack", async () => {
      const user = userEvent.setup();
      mockPage(FAR_FOOTER);
      const view = renderIn(locale, <Layered showLayer />);
      await user.click(view.getByRole("button", { name: "Show" }));
      expect(lift()).toBe("0px");
    });

    it("does not lift when nothing is open", async () => {
      const user = userEvent.setup();
      mockPage(DRAWER_FOOTER);
      const view = renderIn(locale, <Layered showLayer={false} />);
      await user.click(view.getByRole("button", { name: "Show" }));
      expect(lift()).toBe("0px");
    });

    it("removes the lift when the last toast goes away", async () => {
      const user = userEvent.setup();
      mockPage(DRAWER_FOOTER);
      const view = renderIn(locale, <Layered showLayer />);
      await user.click(view.getByRole("button", { name: "Show" }));
      expect(lift()).toBe("52px");
      await user.click(within(region()).getByRole("button", { name: "Dismiss notification" }));
      expect(lift()).toBe("");
    });
  });
});
