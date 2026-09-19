import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderBoth, renderIn } from "../../../test/harness";
import { Accordion, type AccordionItem } from "./accordion";

const items: AccordionItem[] = [
  { id: "settings", title: "settings.json", content: <p>الإعدادات</p> },
  { id: "health", title: "health.json", content: <p>الحالة</p> },
  { id: "jobs", title: "jobs.json", content: <p>المهام</p>, disabled: true },
  { id: "readme", title: "README.txt", content: <p>ملاحظة</p> },
];

const trigger = (view: { getByRole: (role: string, options: { name: string }) => HTMLElement }, name: string) =>
  view.getByRole("button", { name });

describe("Accordion", () => {
  it("renders a button for each title, all closed, with their panels hidden, in English and Arabic", () => {
    const views = renderBoth(<Accordion items={items} />);
    for (const view of [views.en, views.ar]) {
      const buttons = view.getAllByRole("button");
      expect(buttons).toHaveLength(4);
      for (const button of buttons) expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(view.container.querySelectorAll("[role=region]")).toHaveLength(4);
      for (const panel of Array.from(view.container.querySelectorAll("[role=region]"))) expect((panel as HTMLElement).hidden).toBe(true);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("opens the items in defaultValue", () => {
    const views = renderBoth(<Accordion items={items} defaultValue={["health"]} />);
    for (const view of [views.en, views.ar]) {
      expect(trigger(view, "health.json").getAttribute("aria-expanded")).toBe("true");
      expect(trigger(view, "settings.json").getAttribute("aria-expanded")).toBe("false");
      expect(view.getByText("الحالة").closest("[role=region]")?.hasAttribute("hidden")).toBe(false);
    }
  });

  it("connects each button to its panel: aria-controls, and the panel is labelled by the button", () => {
    const views = renderBoth(<Accordion items={items} defaultValue={["settings"]} />);
    for (const view of [views.en, views.ar]) {
      const button = trigger(view, "settings.json");
      const panel = document.getElementById(button.getAttribute("aria-controls") ?? "") as HTMLElement;
      expect(panel).not.toBeNull();
      expect(panel.getAttribute("aria-labelledby")).toBe(button.id);
      expect(view.getByRole("region", { name: "settings.json" })).toBe(panel);
    }
  });

  it("opens an item on click and closes it on a second click", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <Accordion items={items} />);
    const button = trigger(view, "settings.json");
    await user.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(view.getByText("الإعدادات").closest("[role=region]")?.hasAttribute("hidden")).toBe(false);
    await user.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(view.getByText("الإعدادات", { ignore: "" }).closest("[role=region]")?.hasAttribute("hidden")).toBe(true);
  });

  it("opens and closes with Enter and Space", async () => {
    const user = userEvent.setup();
    const view = renderIn("ar", <Accordion items={items} />);
    const button = trigger(view, "settings.json");
    button.focus();
    await user.keyboard("{Enter}");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    await user.keyboard(" ");
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("single (the default): opening one closes the other", async () => {
    const user = userEvent.setup();
    const views = renderBoth(<Accordion items={items} defaultValue={["settings"]} />);
    for (const view of [views.en, views.ar]) {
      await user.click(trigger(view, "health.json"));
      expect(trigger(view, "health.json").getAttribute("aria-expanded")).toBe("true");
      expect(trigger(view, "settings.json").getAttribute("aria-expanded")).toBe("false");
    }
  });

  it("single: a defaultValue with several ids opens only the first", () => {
    const view = renderIn("en", <Accordion items={items} defaultValue={["health", "settings"]} />);
    expect(trigger(view, "health.json").getAttribute("aria-expanded")).toBe("true");
    expect(trigger(view, "settings.json").getAttribute("aria-expanded")).toBe("false");
  });

  it("multiple: several items stay open together", async () => {
    const user = userEvent.setup();
    const views = renderBoth(<Accordion items={items} type="multiple" />);
    for (const view of [views.en, views.ar]) {
      await user.click(trigger(view, "settings.json"));
      await user.click(trigger(view, "health.json"));
      expect(trigger(view, "settings.json").getAttribute("aria-expanded")).toBe("true");
      expect(trigger(view, "health.json").getAttribute("aria-expanded")).toBe("true");
      await user.click(trigger(view, "settings.json"));
      expect(trigger(view, "settings.json").getAttribute("aria-expanded")).toBe("false");
      expect(trigger(view, "health.json").getAttribute("aria-expanded")).toBe("true");
    }
  });

  it("tells onValueChange which ids are open after each change", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    const view = renderIn("en", <Accordion items={items} type="multiple" onValueChange={onValueChange} />);
    await user.click(trigger(view, "settings.json"));
    await user.click(trigger(view, "README.txt"));
    await user.click(trigger(view, "settings.json"));
    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([["settings"], ["settings", "readme"], ["readme"]]);
  });

  it("controlled: shows what `value` says, and changes only when the application changes it", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const view = renderIn("en", <Accordion items={items} value={["health"]} onValueChange={onValueChange} />);
    await user.click(trigger(view, "settings.json"));
    expect(onValueChange).toHaveBeenCalledWith(["settings"]);
    // The application did not update `value`, so nothing moved.
    expect(trigger(view, "health.json").getAttribute("aria-expanded")).toBe("true");
    expect(trigger(view, "settings.json").getAttribute("aria-expanded")).toBe("false");
  });

  it("controlled by a parent that keeps the ids", async () => {
    const user = userEvent.setup();
    function Parent() {
      const [open, setOpen] = useState<string[]>([]);
      return <Accordion items={items} value={open} onValueChange={setOpen} />;
    }
    const view = renderIn("ar", <Parent />);
    await user.click(trigger(view, "health.json"));
    expect(trigger(view, "health.json").getAttribute("aria-expanded")).toBe("true");
  });

  it("a disabled item cannot be opened", async () => {
    const user = userEvent.setup();
    const views = renderBoth(<Accordion items={items} />);
    for (const view of [views.en, views.ar]) {
      const disabled = trigger(view, "jobs.json");
      expect(disabled).toHaveProperty("disabled", true);
      await user.click(disabled);
      expect(disabled.getAttribute("aria-expanded")).toBe("false");
    }
  });

  it("Tab skips a disabled item", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <Accordion items={items} />);
    await user.tab();
    expect(document.activeElement).toBe(trigger(view, "settings.json"));
    await user.tab();
    expect(document.activeElement).toBe(trigger(view, "health.json"));
    await user.tab();
    expect(document.activeElement).toBe(trigger(view, "README.txt"));
  });

  describe("arrow keys move between titles (vertical, so the same in right-to-left)", () => {
    it.each(["en", "ar"] as const)("ArrowDown and ArrowUp move focus and wrap, skipping disabled titles (%s)", async (locale) => {
      const user = userEvent.setup();
      const view = renderIn(locale, <Accordion items={items} />);
      const settings = trigger(view, "settings.json");
      const health = trigger(view, "health.json");
      const readme = trigger(view, "README.txt");
      settings.focus();
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(health);
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(readme); // jobs.json is disabled
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(settings); // wraps
      await user.keyboard("{ArrowUp}");
      expect(document.activeElement).toBe(readme); // wraps back
      await user.keyboard("{ArrowUp}");
      expect(document.activeElement).toBe(health);
    });

    it("Home and End go to the first and last enabled title", async () => {
      const user = userEvent.setup();
      const view = renderIn("ar", <Accordion items={items} />);
      trigger(view, "health.json").focus();
      await user.keyboard("{End}");
      expect(document.activeElement).toBe(trigger(view, "README.txt"));
      await user.keyboard("{Home}");
      expect(document.activeElement).toBe(trigger(view, "settings.json"));
    });

    it("the horizontal arrows do nothing, and moving focus does not open a panel", async () => {
      const user = userEvent.setup();
      const view = renderIn("ar", <Accordion items={items} />);
      const settings = trigger(view, "settings.json");
      settings.focus();
      await user.keyboard("{ArrowRight}{ArrowLeft}");
      expect(document.activeElement).toBe(settings);
      await user.keyboard("{ArrowDown}");
      for (const button of view.getAllByRole("button")) expect(button.getAttribute("aria-expanded")).toBe("false");
    });
  });

  it("keeps closed content in the DOM so its state survives", async () => {
    const user = userEvent.setup();
    const view = renderIn(
      "en",
      <Accordion items={[{ id: "f", title: "Form", content: <input aria-label="name" defaultValue="" /> }]} />,
    );
    await user.click(trigger(view, "Form"));
    await user.type(view.getByLabelText("name"), "Ali");
    await user.click(trigger(view, "Form"));
    await user.click(trigger(view, "Form"));
    expect((view.getByLabelText("name") as HTMLInputElement).value).toBe("Ali");
  });

  it("renders a title that is not plain text, and no buttons for no items", () => {
    const view = renderIn(
      "en",
      <Accordion items={[{ id: "a", title: <span translate="no">a.json</span>, content: "x" }]} />,
    );
    expect(view.getByRole("button", { name: "a.json" })).toBeTruthy();
    const empty = renderIn("en", <Accordion items={[]} />);
    expect(empty.queryAllByRole("button")).toHaveLength(0);
  });
});
