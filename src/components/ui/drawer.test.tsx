import userEvent from "@testing-library/user-event";
import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderIn } from "../../../test/harness";
import { mockVisibleElements, setViewport } from "../../../test/overlay-dom";
import { AR_OVERLAY_LABELS, expectNoDefaultEnglish } from "../../../test/overlay-labels";
import { Drawer, type DrawerProps } from "./drawer";

beforeEach(() => {
  mockVisibleElements();
});

type HostProps = Partial<Pick<DrawerProps, "side" | "width">> & { onClose?: () => void };

function Host({ onClose, side, width }: HostProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Drawer
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
        title="Case details"
        subtitle="Read only"
        {...(side !== undefined ? { side } : {})}
        {...(width !== undefined ? { width } : {})}
        footer={
          <>
            <button type="button">Cancel</button>
            <button type="button">Save</button>
          </>
        }
      >
        <input aria-label="Note" />
      </Drawer>
    </>
  );
}

describe.each(LOCALE_CASES)("Drawer ($locale)", ({ locale }) => {
  it("renders nothing while closed and a labelled, described modal dialog when open", async () => {
    const user = userEvent.setup();
    const view = renderIn(locale, <Host />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(view.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog", { name: "Case details" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-describedby")).toBe(screen.getByText("Read only").id);
  });

  describe("side and width", () => {
    it("comes in from the inline end by default", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(screen.getByRole("dialog").dataset["side"]).toBe("end");
    });

    it("comes in from the inline start with side=\"start\" (the navigation drawer)", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host side="start" />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(screen.getByRole("dialog").dataset["side"]).toBe("start");
    });

    it("takes its default width from the --drawer-w token, so it sets no inline size of its own", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(screen.getByRole("dialog").style.inlineSize).toBe("");
    });

    it("sets the inline size from a width prop, never the physical width", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host width={320} />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(screen.getByRole("dialog").style.inlineSize).toBe("320px");
      expect(screen.getByRole("dialog").style.width).toBe("");
    });
  });

  describe("focus", () => {
    it("moves focus into the drawer on open, to the first control that is not the close button", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Note" }));
    });

    it("keeps Tab inside: from the last control to the first, and Shift+Tab from the first to the last", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host />);
      await user.click(view.getByRole("button", { name: "Open" }));
      const close = screen.getByRole("button", { name: /close/i });
      const save = screen.getByRole("button", { name: "Save" });
      save.focus();
      await user.tab();
      expect(document.activeElement).toBe(close);
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(save);
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
    it("closes with Escape, with the close button, and with a press on the overlay, and not with a press on the panel", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const view = renderIn(locale, <Host onClose={onClose} />);
      const opener = view.getByRole("button", { name: "Open" });

      await user.click(opener);
      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);

      await user.click(opener);
      await user.click(screen.getByRole("button", { name: "Close" }));
      expect(onClose).toHaveBeenCalledTimes(2);

      await user.click(opener);
      await user.click(screen.getByText("Read only"));
      expect(onClose).toHaveBeenCalledTimes(2);
      fireEvent.mouseDown(screen.getByRole("dialog").previousElementSibling as HTMLElement);
      expect(onClose).toHaveBeenCalledTimes(3);
    });
  });

  describe("page scroll", () => {
    it("locks the page scroll while open and keeps the scrollbar's width as padding on the inline end", async () => {
      const user = userEvent.setup();
      setViewport(1039, 768);
      vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(1024);
      const view = renderIn(locale, <Host />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(document.body.style.overflow).toBe("hidden");
      expect(document.body.style.paddingInlineEnd).toBe("15px");
      expect(document.body.style.paddingRight).toBe("");
      await user.keyboard("{Escape}");
      expect(document.body.style.overflow).toBe("");
      expect(document.body.style.paddingInlineEnd).toBe("");
    });
  });

  describe("labels", () => {
    it("names the close button in English by default", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host />);
      await user.click(view.getByRole("button", { name: "Open" }));
      expect(screen.getByRole("button", { name: "Close" }).getAttribute("title")).toBe("Close");
    });

    it("names the close button with the application's label, and shows no English default", async () => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Host />, { labels: AR_OVERLAY_LABELS });
      await user.click(view.getByRole("button", { name: "Open" }));
      const close = screen.getByRole("button", { name: AR_OVERLAY_LABELS["drawer.close"] });
      expect(close.getAttribute("title")).toBe(AR_OVERLAY_LABELS["drawer.close"]);
      expectNoDefaultEnglish(document.body);
    });
  });

  it("marks its footer so the toast stack can stay clear of it", async () => {
    const user = userEvent.setup();
    const view = renderIn(locale, <Host />);
    await user.click(view.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("button", { name: "Save" }).parentElement?.hasAttribute("data-overlay-footer")).toBe(true);
  });
});
