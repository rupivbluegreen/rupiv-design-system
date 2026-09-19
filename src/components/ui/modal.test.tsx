import userEvent from "@testing-library/user-event";
import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderIn } from "../../../test/harness";
import { mockVisibleElements, setViewport } from "../../../test/overlay-dom";
import { AR_OVERLAY_LABELS, expectNoDefaultEnglish } from "../../../test/overlay-labels";
import { Combobox } from "./combobox";
import { Modal } from "./modal";

beforeEach(() => {
  mockVisibleElements();
});

function Host({ onClose, withCombobox = false }: { onClose?: () => void; withCombobox?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Modal
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
        title="Approve change"
        description="Check the details first"
        footer={
          <>
            <button type="button">Cancel</button>
            <button type="button">Save</button>
          </>
        }
      >
        <input aria-label="Reason" />
        {withCombobox ? <Combobox aria-label="Zone" options={[{ value: "a", label: "North zone" }]} /> : null}
      </Modal>
    </>
  );
}

describe.each(LOCALE_CASES)("Modal ($locale)", ({ locale }) => {
  it("renders nothing while closed and a labelled, described modal dialog when open", async () => {
    const user = userEvent.setup();
    const view = renderIn(locale, <Host />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(view.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog", { name: "Approve change" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-describedby")).toBe(screen.getByText("Check the details first").id);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Approve change");
  });

  describe("focus", () => {
    it("moves focus into the dialog on open, to the first control that is not the close button", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Reason" }));
    });

    it("prefers an element marked data-autofocus", async () => {
      const user = userEvent.setup();
      function Marked() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Open
            </button>
            <Modal open={open} onClose={() => setOpen(false)} title="T">
              <input aria-label="First" />
              <input aria-label="Second" data-autofocus="" />
            </Modal>
          </>
        );
      }
      const view = renderIn(locale, <Marked />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Second" }));
    });

    it("focuses the dialog itself when only the close button could take focus", async () => {
      const user = userEvent.setup();
      function Bare() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Open
            </button>
            <Modal open={open} onClose={() => setOpen(false)} title="T">
              <p>Text only</p>
            </Modal>
          </>
        );
      }
      const view = renderIn(locale, <Bare />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(document.activeElement).toBe(screen.getByRole("dialog"));
    });

    it("keeps Tab inside: from the last control to the first, and Shift+Tab from the first to the last", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host />);
      await user.click(view.getByRole("button", { name: "Open" }));
      const close = screen.getByRole("button", { name: /close/i });
      const save = screen.getByRole("button", { name: "Save" });
      save.focus();
      await user.tab();
      expect(document.activeElement).toBe(close); // wraps to the first control of the dialog
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(save); // and back to the last
      await user.tab();
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Reason" }));
    });

    it("pulls focus back in when Tab is pressed with focus outside the dialog", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host />);
      await user.click(view.getByRole("button", { name: "Open" }));
      const dialogKeyTarget = screen.getByRole("dialog");
      (document.activeElement as HTMLElement).blur();
      expect(dialogKeyTarget.contains(document.activeElement)).toBe(false);
      fireEvent.keyDown(dialogKeyTarget.parentElement as HTMLElement, { key: "Tab" });
      expect(dialogKeyTarget.contains(document.activeElement)).toBe(true);
    });

    it("gives focus back to what opened it when it closes", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host />);
      const opener = view.getByRole("button", { name: "Open" });
      await user.click(opener);
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(opener);
    });
  });

  describe("closing", () => {
    it("closes with Escape, once", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const view = renderIn(locale, <Host onClose={onClose} />);
      await user.click(view.getByRole("button", { name: "Open" }));
      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes with the close button", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const view = renderIn(locale, <Host onClose={onClose} />);
      await user.click(view.getByRole("button", { name: "Open" }));
      await user.click(screen.getByRole("button", { name: "Close" }));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("closes when the overlay is pressed, but not when the dialog is", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const view = renderIn(locale, <Host onClose={onClose} />);
      await user.click(view.getByRole("button", { name: "Open" }));
      await user.click(screen.getByText("Check the details first"));
      expect(onClose).not.toHaveBeenCalled();
      const overlay = screen.getByRole("dialog").previousElementSibling as HTMLElement;
      fireEvent.mouseDown(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("lets an open combobox take the first Escape and closes on the second", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const view = renderIn(locale, <Host onClose={onClose} withCombobox />);
      await user.click(view.getByRole("button", { name: "Open" }));
      await user.click(screen.getByRole("combobox", { name: "Zone" }));
      expect(screen.getByRole("listbox")).toBeTruthy();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(onClose).not.toHaveBeenCalled();
      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("page scroll", () => {
    it("locks the page scroll while open and gives it back", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(document.body.style.overflow).toBe("hidden");
      await user.keyboard("{Escape}");
      expect(document.body.style.overflow).toBe("");
    });

    it("keeps the width of the vanished scrollbar as padding on the inline end, and restores the old padding", async () => {
      const user = userEvent.setup();
      setViewport(1039, 768);
      vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(1024); // a 15px scrollbar
      document.body.style.paddingInlineEnd = "4px";
      const view = renderIn(locale, <Host />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(document.body.style.paddingInlineEnd).toBe("15px");
      expect(document.body.style.paddingRight).toBe(""); // never the physical side
      await user.keyboard("{Escape}");
      expect(document.body.style.paddingInlineEnd).toBe("4px");
    });

    it("adds no padding when there is no scrollbar", async () => {
      const user = userEvent.setup();
      setViewport(1024, 768);
      vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(1024);
      const view = renderIn(locale, <Host />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(document.body.style.paddingInlineEnd).toBe("");
    });
  });

  describe("labels", () => {
    it("names the close button in English by default", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host />);
      await user.click(view.getByRole("button", { name: "Open" }));
      const close = screen.getByRole("button", { name: "Close" });
      expect(close.getAttribute("title")).toBe("Close");
    });

    it("names the close button with the application's label, and shows no English default", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host />, { labels: AR_OVERLAY_LABELS });
      await user.click(view.getByRole("button", { name: "Open" }));
      const close = screen.getByRole("button", { name: AR_OVERLAY_LABELS["modal.close"] });
      expect(close.getAttribute("title")).toBe(AR_OVERLAY_LABELS["modal.close"]);
      expectNoDefaultEnglish(document.body);
    });
  });

  it("marks its footer so the toast stack can stay clear of it", async () => {
    const user = userEvent.setup();
    const view = renderIn(locale, <Host />);
    await user.click(view.getByRole("button", { name: "Open" }));
    const footer = screen.getByRole("button", { name: "Save" }).parentElement;
    expect(footer?.hasAttribute("data-overlay-footer")).toBe(true);
  });
});
