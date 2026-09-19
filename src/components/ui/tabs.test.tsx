import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomLink, LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { emulateDirectionInheritance } from "../../../test/overlay-dom";
import { AR_OVERLAY_LABELS, expectNoDefaultEnglish } from "../../../test/overlay-labels";
import { TabLinks, Tabs } from "./tabs";

const items = [
  { href: "/orders", label: "Orders" },
  { href: "/orders/archive", label: "Archive" },
  { href: "/settings?tab=general#top", label: "Settings" },
];

function activeOf(view: { getAllByRole: (role: string) => HTMLElement[] }): string[] {
  return view
    .getAllByRole("link")
    .filter((a) => a.getAttribute("aria-current") === "page")
    .map((a) => a.textContent ?? "");
}

describe("TabLinks", () => {
  it("renders plain <a href> links by default, none active without an active path", () => {
    const views = renderBoth(<TabLinks items={items} />);
    for (const view of [views.en, views.ar]) {
      const links = view.getAllByRole("link");
      expect(links.map((a) => a.getAttribute("href"))).toEqual(items.map((i) => i.href));
      expect(links.every((a) => a.tagName === "A" && !a.hasAttribute("data-custom-link"))).toBe(true);
      expect(activeOf(view)).toEqual([]);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("uses the provider's link component", () => {
    const views = renderBoth(<TabLinks items={items} />, { linkComponent: CustomLink });
    for (const view of [views.en, views.ar]) {
      expect(view.getAllByRole("link").every((a) => a.getAttribute("data-custom-link") === "true")).toBe(true);
    }
  });

  it("marks the exact match active", () => {
    const views = renderBoth(<TabLinks items={items} />, { activePath: "/orders" });
    for (const view of [views.en, views.ar]) expect(activeOf(view)).toEqual(["Orders"]);
  });

  it("marks the longest matching path prefix active, and ignores query and hash in hrefs", () => {
    const deep = renderBoth(<TabLinks items={items} />, { activePath: "/orders/archive/2026" });
    for (const view of [deep.en, deep.ar]) expect(activeOf(view)).toEqual(["Archive"]);
    const query = renderBoth(<TabLinks items={items} />, { activePath: "/settings" });
    for (const view of [query.en, query.ar]) expect(activeOf(view)).toEqual(["Settings"]);
  });

  it("does not mark a tab active for a path that only shares a name prefix", () => {
    const views = renderBoth(<TabLinks items={items} />, { activePath: "/orders-old" });
    for (const view of [views.en, views.ar]) expect(activeOf(view)).toEqual([]);
  });

  it("labels the navigation, with an aria-label override", () => {
    const views = renderBoth(<TabLinks items={items} aria-label="أقسام" />);
    for (const view of [views.en, views.ar]) expect(view.getByRole("navigation").getAttribute("aria-label")).toBe("أقسام");
  });
});

describe("TabLinks labels", () => {
  it("names the navigation 'Sections' in English by default", () => {
    const views = renderBoth(<TabLinks items={items} />);
    for (const view of [views.en, views.ar]) expect(view.getByRole("navigation").getAttribute("aria-label")).toBe("Sections");
  });

  it("names it with the application's label, and shows no English default", () => {
    const views = renderBoth(<TabLinks items={items} />, { labels: AR_OVERLAY_LABELS });
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("navigation").getAttribute("aria-label")).toBe(AR_OVERLAY_LABELS["tabs.sections"]);
      expectNoDefaultEnglish(view.container);
    }
  });

  it("lets the ariaLabel prop win over the label, and aria-label over both", () => {
    const named = renderIn("en", <TabLinks items={items} ariaLabel="Parts" />, { labels: AR_OVERLAY_LABELS });
    expect(named.getByRole("navigation").getAttribute("aria-label")).toBe("Parts");
    const both = renderIn("ar", <TabLinks items={items} ariaLabel="Parts" aria-label="Pieces" />);
    expect(both.getByRole("navigation").getAttribute("aria-label")).toBe("Pieces");
  });
});

const TABS = [
  { value: "list", label: "List" },
  { value: "map", label: "Map" },
  { value: "board", label: "Board" },
];

describe.each(LOCALE_CASES)("Tabs keyboard ($locale)", ({ locale, dir }) => {
  beforeEach(() => {
    emulateDirectionInheritance();
  });

  // The arrow that points to the next tab on screen: right when the tabs run left to right, left when right to left.
  const next = dir === "ltr" ? "{ArrowRight}" : "{ArrowLeft}";
  const previous = dir === "ltr" ? "{ArrowLeft}" : "{ArrowRight}";

  function tab(view: { getByRole: (role: string, options: { name: string }) => HTMLElement }, name: string): HTMLElement {
    return view.getByRole("tab", { name });
  }

  it("is a tablist of tabs with the current one selected and only that one in the tab order", () => {
    const view = renderIn(locale, <Tabs ariaLabel="View" items={TABS} defaultValue="map" />);
    expect(view.getByRole("tablist", { name: "View" })).toBeTruthy();
    expect(view.getAllByRole("tab").map((t) => t.getAttribute("aria-selected"))).toEqual(["false", "true", "false"]);
    expect(view.getAllByRole("tab").map((t) => t.getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
  });

  it("moves to the next tab with the arrow that points that way on screen, and selects it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn(locale, <Tabs ariaLabel="View" items={TABS} onChange={onChange} />);
    tab(view, "List").focus();
    await user.keyboard(next);
    expect(document.activeElement).toBe(tab(view, "Map"));
    expect(tab(view, "Map").getAttribute("aria-selected")).toBe("true");
    expect(onChange).toHaveBeenLastCalledWith("map");
    await user.keyboard(next);
    expect(document.activeElement).toBe(tab(view, "Board"));
  });

  it("moves to the previous tab with the opposite arrow", async () => {
    const user = userEvent.setup();
    const view = renderIn(locale, <Tabs ariaLabel="View" items={TABS} defaultValue="board" />);
    tab(view, "Board").focus();
    await user.keyboard(previous);
    expect(document.activeElement).toBe(tab(view, "Map"));
  });

  it("wraps from the last tab to the first and from the first to the last", async () => {
    const user = userEvent.setup();
    const view = renderIn(locale, <Tabs ariaLabel="View" items={TABS} defaultValue="board" />);
    tab(view, "Board").focus();
    await user.keyboard(next);
    expect(document.activeElement).toBe(tab(view, "List"));
    await user.keyboard(previous);
    expect(document.activeElement).toBe(tab(view, "Board"));
  });

  it("ArrowRight goes forward in English and back in Arabic; ArrowLeft the other way", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn(locale, <Tabs ariaLabel="View" items={TABS} defaultValue="map" onChange={onChange} />);
    tab(view, "Map").focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tab(view, dir === "ltr" ? "Board" : "List"));
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(document.activeElement).toBe(tab(view, dir === "ltr" ? "List" : "Board"));
  });

  it("jumps to the first and last tab with Home and End, in both directions", async () => {
    const user = userEvent.setup();
    const view = renderIn(locale, <Tabs ariaLabel="View" items={TABS} defaultValue="map" />);
    tab(view, "Map").focus();
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(tab(view, "Board"));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(tab(view, "List"));
  });

  it("does not use ArrowUp or ArrowDown: the tablist is horizontal", async () => {
    const user = userEvent.setup();
    const view = renderIn(locale, <Tabs ariaLabel="View" items={TABS} defaultValue="map" />);
    tab(view, "Map").focus();
    await user.keyboard("{ArrowDown}{ArrowUp}");
    expect(document.activeElement).toBe(tab(view, "Map"));
  });

  it("leaves a controlled value to the parent", async () => {
    const user = userEvent.setup();
    function Host() {
      const [value, setValue] = useState("list");
      return <Tabs ariaLabel="View" items={TABS} value={value} onChange={setValue} />;
    }
    const view = renderIn(locale, <Host />);
    tab(view, "List").focus();
    await user.keyboard(next);
    expect(tab(view, "Map").getAttribute("aria-selected")).toBe("true");
    expect(tab(view, "List").getAttribute("aria-selected")).toBe("false");
  });

  it("selects on click and reports only real changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn(locale, <Tabs ariaLabel="View" items={TABS} onChange={onChange} />);
    await user.click(tab(view, "List"));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(tab(view, "Board"));
    expect(onChange).toHaveBeenCalledExactlyOnceWith("board");
  });
});
