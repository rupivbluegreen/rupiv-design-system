import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { Switch } from "./switch";

// jsdom has no layout: these tests prove the switch role, its states and the keyboard. That the thumb slides toward
// the inline end (the left in Arabic) is CSS (`translate: calc(14px * var(--rd-dir))`), checked in screenshots.

function Held({ onCheckedChange }: { onCheckedChange?: (on: boolean) => void }) {
  const [on, setOn] = useState(false);
  return (
    <Switch
      label="Notifications"
      checked={on}
      onCheckedChange={(next) => {
        setOn(next);
        onCheckedChange?.(next);
      }}
    />
  );
}

describe("Switch", () => {
  it("is a button with the switch role, named by its label, with the description linked", () => {
    const views = renderBoth(<Switch label="Notifications" description="By email" />);
    for (const view of [views.en, views.ar]) {
      const control = view.getByRole("switch", { name: "Notifications" });
      expect(control.tagName).toBe("BUTTON");
      expect(control.getAttribute("type")).toBe("button");
      expect(control.getAttribute("aria-checked")).toBe("false");
      expect(view.getByText("By email").id).toBe(control.getAttribute("aria-describedby"));
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("uses aria-label when there is no visible label", () => {
    const views = renderBoth(<Switch aria-label="Dark mode" />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("switch", { name: "Dark mode" })).toBeTruthy();
      expect(view.container.querySelector("label")).toBeNull();
    }
  });

  it.each(LOCALE_CASES)("toggles with a click on the switch or on its label ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const view = renderIn(locale, <Held onCheckedChange={onCheckedChange} />);
    const control = view.getByRole("switch");
    await user.click(control);
    expect(control.getAttribute("aria-checked")).toBe("true");
    await user.click(view.getByText("Notifications"));
    expect(control.getAttribute("aria-checked")).toBe("false");
    expect(onCheckedChange.mock.calls).toEqual([[true], [false]]);
  });

  it("toggles with Space and with Enter, and is reached by Tab", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const view = renderIn("en", <Held onCheckedChange={onCheckedChange} />);
    await user.tab();
    const control = view.getByRole("switch");
    expect(document.activeElement).toBe(control);
    await user.keyboard(" ");
    expect(control.getAttribute("aria-checked")).toBe("true");
    await user.keyboard("{Enter}");
    expect(control.getAttribute("aria-checked")).toBe("false");
    expect(onCheckedChange.mock.calls).toEqual([[true], [false]]);
  });

  it("keeps its own state when uncontrolled and starts from defaultChecked", async () => {
    const user = userEvent.setup();
    const views = renderBoth(<Switch aria-label="Auto" defaultChecked />);
    for (const view of [views.en, views.ar]) {
      const control = view.getByRole("switch");
      expect(control.getAttribute("aria-checked")).toBe("true");
      await user.click(control);
      expect(control.getAttribute("aria-checked")).toBe("false");
    }
  });

  it("does not change on its own when controlled: it reports and waits for the parent", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const view = renderIn("en", <Switch aria-label="Fixed" checked={false} onCheckedChange={onCheckedChange} />);
    await user.click(view.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(view.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("is disabled: skipped by Tab, ignores clicks and keys, and keeps its state", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const views = renderBoth(<Switch label="Locked" disabled defaultChecked onCheckedChange={onCheckedChange} />);
    for (const view of [views.en, views.ar]) {
      const control = view.getByRole("switch") as HTMLButtonElement;
      expect(control.disabled).toBe(true);
      await user.click(control);
      await user.click(view.getByText("Locked"));
      expect(control.getAttribute("aria-checked")).toBe("true");
    }
    await user.tab();
    expect(document.activeElement).toBe(document.body);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("generates a distinct id per switch and keeps one the caller gives", () => {
    const views = renderBoth(
      <>
        <Switch aria-label="a" />
        <Switch aria-label="b" />
        <Switch aria-label="c" id="mine" />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const [a, b, c] = view.getAllByRole("switch");
      expect(a?.id).not.toBe(b?.id);
      expect(c?.id).toBe("mine");
    }
  });
});
