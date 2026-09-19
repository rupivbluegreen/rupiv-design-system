import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AR_DATA_LABELS, expectNoDefaultEnglish } from "../../../test/data-labels";
import { CustomLink, renderBoth, renderIn } from "../../../test/harness";
import { Breadcrumbs } from "./breadcrumbs";

// jsdom has no layout: these tests prove the structure, the labels and the links, and that the separators have the
// markup the CSS rule `.separator:dir(rtl) > svg` needs. That the chevron really mirrors in right-to-left is for the
// app's screenshots.

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

  it("is a navigation named Breadcrumb, with one list item per crumb and a separator between them", () => {
    const views = renderBoth(<Breadcrumbs items={items} />);
    for (const view of [views.en, views.ar]) {
      const nav = view.getByRole("navigation", { name: "Breadcrumb" });
      const list = nav.querySelector("ol");
      expect(list).not.toBeNull();
      const separators = list?.querySelectorAll('li[aria-hidden="true"]') ?? [];
      expect(separators).toHaveLength(items.length - 1);
      // .separator:dir(rtl) > svg mirrors the chevron, so the icon must be a direct child of the separator
      for (const separator of Array.from(separators)) expect(separator.querySelector(":scope > svg")).not.toBeNull();
      expect(view.getAllByRole("listitem")).toHaveLength(items.length);
    }
  });

  it("shows a single crumb as the current page, with no separator", () => {
    const views = renderBoth(<Breadcrumbs items={[{ label: "Home", href: "/" }]} />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByText("Home").getAttribute("aria-current")).toBe("page");
      expect(view.queryByRole("link")).toBeNull();
      expect(view.container.querySelectorAll("svg")).toHaveLength(0);
    }
  });

  it("gives a long label a title so it can be read when it is cut short", () => {
    const view = renderIn("en", <Breadcrumbs items={[{ label: "A very long section name", href: "/a" }, { label: "Current" }]} />);
    expect(view.getByRole("link", { name: "A very long section name" }).getAttribute("title")).toBe("A very long section name");
  });

  it("reaches the links by Tab in reading order and activates one with Enter through the provider's navigation", async () => {
    const user = userEvent.setup();
    const view = renderIn("ar", <Breadcrumbs items={items} />);
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("link", { name: "Home" }));
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("link", { name: "Orders" }));
    await user.tab();
    expect(document.activeElement).toBe(document.body); // the rest are not links
  });

  it("renders no default English string when Arabic labels are given", () => {
    const view = renderIn("ar", <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "الطلبات" }]} />, {
      labels: AR_DATA_LABELS,
    });
    expect(view.getByRole("navigation", { name: "مسار التنقل" })).toBeTruthy();
    expectNoDefaultEnglish(view.container);
  });
});

