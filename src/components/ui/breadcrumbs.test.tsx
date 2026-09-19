import { describe, expect, it } from "vitest";
import { CustomLink, renderBoth } from "../../../test/harness";
import { Breadcrumbs } from "./breadcrumbs";

const items = [
  { label: "Home", href: "/" },
  { label: "Orders", href: "/orders" },
  { label: "No link" },
  { label: "Order 12", href: "/orders/12" },
];

describe("Breadcrumbs", () => {
  it("renders plain <a href> links by default, the last item as the current page", () => {
    const views = renderBoth(<Breadcrumbs items={items} />);
    for (const view of [views.en, views.ar]) {
      const links = view.getAllByRole("link");
      expect(links.map((a) => a.getAttribute("href"))).toEqual(["/", "/orders"]);
      expect(links.every((a) => a.tagName === "A" && !a.hasAttribute("data-custom-link"))).toBe(true);
      const current = view.getByText("Order 12");
      expect(current.getAttribute("aria-current")).toBe("page");
      expect(view.getByText("No link").closest("a")).toBeNull();
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("uses the provider's link component for every link", () => {
    const views = renderBoth(
      <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "الطلبات", href: "/orders" }, { label: "طلب 12" }]} />,
      { linkComponent: CustomLink },
    );
    for (const view of [views.en, views.ar]) {
      const links = view.getAllByRole("link");
      expect(links).toHaveLength(2);
      expect(links.every((a) => a.getAttribute("data-custom-link") === "true")).toBe(true);
    }
  });

  it("renders nothing for no items", () => {
    const views = renderBoth(<Breadcrumbs items={[]} />);
    for (const view of [views.en, views.ar]) expect(view.container.querySelector("nav")).toBeNull();
  });
});
