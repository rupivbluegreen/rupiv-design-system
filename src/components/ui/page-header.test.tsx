import { describe, expect, it } from "vitest";
import { CustomLink, renderBoth } from "../../../test/harness";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders the back link as a plain <a href> by default, and the breadcrumb links", () => {
    const views = renderBoth(
      <PageHeader title="Order 12" backHref="/orders" breadcrumbs={[{ label: "Orders", href: "/orders" }, { label: "Order 12" }]} />,
    );
    for (const view of [views.en, views.ar]) {
      const back = view.getByRole("link", { name: "Back" });
      expect(back.tagName).toBe("A");
      expect(back.getAttribute("href")).toBe("/orders");
      const crumb = view.getByRole("link", { name: "Orders" });
      expect(crumb.tagName).toBe("A");
      expect(view.getByRole("heading", { level: 1 }).textContent).toBe("Order 12");
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("sends the back link and the breadcrumbs through the provider's link component", () => {
    const views = renderBoth(
      <PageHeader title="طلب 12" backHref="/orders" breadcrumbs={[{ label: "الطلبات", href: "/orders" }, { label: "طلب 12" }]} />,
      { linkComponent: CustomLink },
    );
    for (const view of [views.en, views.ar]) {
      const links = view.getAllByRole("link");
      expect(links).toHaveLength(2);
      expect(links.every((a) => a.getAttribute("data-custom-link") === "true")).toBe(true);
    }
  });

  it("has no back link without backHref", () => {
    const views = renderBoth(<PageHeader title="Orders" />);
    for (const view of [views.en, views.ar]) expect(view.queryByRole("link")).toBeNull();
  });
});
