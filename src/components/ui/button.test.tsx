import { describe, expect, it } from "vitest";
import { CustomLink, LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { Button, IconButton } from "./button";

describe("Button with href", () => {
  it("renders a plain <a href> by default, in English and Arabic", () => {
    const views = renderBoth(<Button href="/orders">Orders</Button>);
    for (const view of [views.en, views.ar]) {
      const link = view.getByRole("link", { name: "Orders" });
      expect(link.tagName).toBe("A");
      expect(link.getAttribute("href")).toBe("/orders");
      expect(link.className).not.toBe("");
      expect(view.container.querySelector("button")).toBeNull();
      expect(view.container.querySelector("[data-custom-link]")).toBeNull();
    }
    expect(views.en.container.dir).toBe("ltr");
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("uses the provider's link component and keeps its class and anchor props", () => {
    const views = renderBoth(
      <Button href="/orders" variant="primary" title="tip" id="go" leftIcon={<i data-icon />}>
        الطلبات
      </Button>,
      { linkComponent: CustomLink },
    );
    for (const view of [views.en, views.ar]) {
      const link = view.getByRole("link", { name: "الطلبات" });
      expect(link.getAttribute("data-custom-link")).toBe("true");
      expect(link.getAttribute("href")).toBe("/orders");
      expect(link.getAttribute("title")).toBe("tip");
      expect(link.getAttribute("id")).toBe("go");
      expect(link.className).not.toBe("");
      expect(link.querySelector("[data-icon]")).not.toBeNull();
    }
  });

  it("renders a button, not a link, when disabled or loading", () => {
    const views = renderBoth(
      <>
        <Button href="/a" disabled>
          Off
        </Button>
        <Button href="/b" loading>
          Busy
        </Button>
      </>,
      { linkComponent: CustomLink },
    );
    for (const view of [views.en, views.ar]) {
      expect(view.queryByRole("link")).toBeNull();
      expect(view.getAllByRole("button")).toHaveLength(2);
    }
  });

  it("renders a button of type button without an href", () => {
    const views = renderBoth(<Button>Save</Button>);
    for (const view of [views.en, views.ar]) {
      const button = view.getByRole("button", { name: "Save" });
      expect(button.getAttribute("type")).toBe("button");
    }
  });
});

describe("IconButton with href", () => {
  it.each(LOCALE_CASES)("renders a labelled plain <a href> by default ($locale)", ({ locale }) => {
    const view = renderIn(locale, <IconButton href="/back" icon={<i />} label={locale === "ar" ? "رجوع" : "Back"} />);
    const link = view.getByRole("link", { name: locale === "ar" ? "رجوع" : "Back" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/back");
    expect(link.getAttribute("title")).toBe(locale === "ar" ? "رجوع" : "Back");
  });

  it.each(LOCALE_CASES)("uses the provider's link component ($locale)", ({ locale }) => {
    const view = renderIn(locale, <IconButton href="/back" icon={<i />} label="Back" />, { linkComponent: CustomLink });
    expect(view.getByRole("link", { name: "Back" }).getAttribute("data-custom-link")).toBe("true");
  });

  it.each(LOCALE_CASES)("renders a button when disabled ($locale)", ({ locale }) => {
    const view = renderIn(locale, <IconButton href="/back" icon={<i />} label="Back" disabled />);
    expect(view.queryByRole("link")).toBeNull();
    expect(view.getByRole("button", { name: "Back" })).toHaveProperty("disabled", true);
  });
});
