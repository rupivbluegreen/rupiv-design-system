import { describe, expect, it } from "vitest";
import { CustomLink, renderBoth } from "../../../test/harness";
import { TabLinks } from "./tabs";

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
