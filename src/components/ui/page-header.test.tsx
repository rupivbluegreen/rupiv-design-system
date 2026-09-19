import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AR_DATA_LABELS, expectNoDefaultEnglish } from "../../../test/data-labels";
import { CustomLink, renderBoth, renderIn } from "../../../test/harness";
import { PageHeader } from "./page-header";

// jsdom has no layout: these tests prove the structure, the labels and the links, and that the back arrow has the
// markup the CSS rule `.back:dir(rtl) svg` needs. That the arrow really points the other way in right-to-left is
// for the app's screenshots.

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

  it("renders the title as the level 1 heading, with the description, meta and actions around it", () => {
    const views = renderBoth(
      <PageHeader
        title="الطلبات"
        description="آخر التحديثات"
        meta={<span>meta slot</span>}
        actions={<button type="button">إجراء</button>}
      />,
    );
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("banner")).toBeTruthy();
      expect(view.getByRole("heading", { level: 1, name: "الطلبات" })).toBeTruthy();
      expect(view.getByText("آخر التحديثات")).toBeTruthy();
      expect(view.getByText("meta slot")).toBeTruthy();
      expect(view.getByRole("button", { name: "إجراء" })).toBeTruthy();
    }
  });

  it("renders the tabs slot below the header, and no breadcrumb nav without breadcrumbs", () => {
    const views = renderBoth(<PageHeader title="Orders" tabs={<div role="tablist" aria-label="views" />} />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("tablist", { name: "views" })).toBeTruthy();
      expect(view.queryByRole("navigation")).toBeNull();
    }
    const empty = renderIn("en", <PageHeader title="Orders" breadcrumbs={[]} />);
    expect(empty.queryByRole("navigation")).toBeNull();
  });

  it("puts the back link before the title in the DOM, with the arrow icon inside the class the mirroring rule targets", () => {
    const views = renderBoth(<PageHeader title="Order 12" backHref="/orders" />);
    for (const view of [views.en, views.ar]) {
      const back = view.getByRole("link", { name: "Back" });
      const title = view.getByRole("heading", { level: 1 });
      expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(back.className).toContain("back"); // .back:dir(rtl) svg { transform: scaleX(-1) }
      expect(back.querySelector("svg")).not.toBeNull();
      expect(back.querySelector("svg")?.closest("[aria-hidden='true']")).not.toBeNull();
    }
  });

  it("reaches the back link and the breadcrumbs by Tab in reading order", async () => {
    const user = userEvent.setup();
    const view = renderIn(
      "ar",
      <PageHeader title="طلب" backHref="/orders" breadcrumbs={[{ label: "الطلبات", href: "/orders" }, { label: "طلب" }]} />,
    );
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("link", { name: "الطلبات" })); // breadcrumbs come first in the DOM
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("link", { name: "Back" }));
  });

  it("renders no default English string when Arabic labels are given", () => {
    const view = renderIn(
      "ar",
      <PageHeader title="الطلبات" backHref="/x" breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "الطلبات" }]} />,
      { labels: AR_DATA_LABELS },
    );
    expect(view.getByRole("link", { name: "رجوع" })).toBeTruthy();
    expect(view.getByRole("navigation", { name: "مسار التنقل" })).toBeTruthy();
    expectNoDefaultEnglish(view.container);
  });
});

