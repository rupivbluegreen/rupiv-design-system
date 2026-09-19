import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { CustomLink, LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { Button, ButtonGroup, IconButton } from "./button";

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
      <Button href="/orders" variant="primary" title="tip" id="go" startIcon={<i data-icon />}>
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

describe("Button icons follow the reading direction", () => {
  it("puts startIcon before the label and endIcon after it in the DOM, in English and Arabic (CSS flips them in right-to-left)", () => {
    const views = renderBoth(
      <Button startIcon={<i data-testid="start" />} endIcon={<i data-testid="end" />}>
        Save
      </Button>,
    );
    for (const view of [views.en, views.ar]) {
      const button = view.getByRole("button", { name: "Save" });
      const parts = Array.from(button.children).map((child) => child.querySelector("i")?.getAttribute("data-testid") ?? child.textContent);
      expect(parts).toEqual(["start", "Save", "end"]);
      // The icons are decoration: hidden from assistive technology.
      for (const icon of button.querySelectorAll("i")) expect(icon.parentElement?.getAttribute("aria-hidden")).toBe("true");
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("renders no icon wrapper when there is no icon", () => {
    const views = renderBoth(<Button>Plain</Button>);
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("button", { name: "Plain" }).children).toHaveLength(1);
    }
  });
});

describe("Button states and variants", () => {
  it("maps variant and size to their classes, and fullWidth", () => {
    const views = renderBoth(
      <Button variant="danger" size="lg" fullWidth>
        Delete
      </Button>,
    );
    for (const view of [views.en, views.ar]) {
      const button = view.getByRole("button", { name: "Delete" });
      expect(hasModuleClass(button, "danger")).toBe(true);
      expect(hasModuleClass(button, "lg")).toBe(true);
      expect(hasModuleClass(button, "fullWidth")).toBe(true);
    }
  });

  it("defaults to a secondary, medium button", () => {
    const views = renderBoth(<Button>Default</Button>);
    for (const view of [views.en, views.ar]) {
      const button = view.getByRole("button", { name: "Default" });
      expect(hasModuleClass(button, "secondary")).toBe(true);
      expect(hasModuleClass(button, "md")).toBe(true);
    }
  });

  it("loading shows a spinner instead of the start icon, hides the end icon, disables and marks the button busy", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const views = renderBoth(
      <Button loading onClick={onClick} startIcon={<i data-testid="start" />} endIcon={<i data-testid="end" />}>
        Saving
      </Button>,
    );
    for (const view of [views.en, views.ar]) {
      const button = view.getByRole("button", { name: "Saving" });
      expect(button).toHaveProperty("disabled", true);
      expect(button.getAttribute("aria-busy")).toBe("true");
      expect(button.querySelector("[data-testid=start]")).toBeNull();
      expect(button.querySelector("[data-testid=end]")).toBeNull();
      expect(button.querySelector("svg")).not.toBeNull();
      await user.click(button);
    }
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disabled does not fire onClick and is not busy", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const views = renderBoth(
      <Button disabled onClick={onClick}>
        Off
      </Button>,
    );
    for (const view of [views.en, views.ar]) {
      const button = view.getByRole("button", { name: "Off" });
      expect(button).toHaveProperty("disabled", true);
      expect(button.hasAttribute("aria-busy")).toBe(false);
      await user.click(button);
    }
    expect(onClick).not.toHaveBeenCalled();
  });

  it("fires onClick and works from the keyboard (Enter and Space)", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const views = renderBoth(<Button onClick={onClick}>Press</Button>);
    for (const view of [views.en, views.ar]) {
      const button = view.getByRole("button", { name: "Press" });
      await user.click(button);
      button.focus();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");
    }
    expect(onClick).toHaveBeenCalledTimes(6);
  });

  it("forwards a ref to the button", () => {
    let node: HTMLButtonElement | null = null;
    renderBoth(
      <Button
        ref={(el) => {
          node = el;
        }}
      >
        Ref
      </Button>,
    );
    expect(node).not.toBeNull();
  });
});

describe("IconButton and ButtonGroup", () => {
  it.each(LOCALE_CASES)("IconButton names itself from `label` and keeps the icon out of the name ($locale)", ({ locale }) => {
    const name = locale === "ar" ? "حذف" : "Delete";
    const view = renderIn(locale, <IconButton icon={<i data-testid="glyph" />} label={name} />);
    const button = view.getByRole("button", { name });
    expect(button.getAttribute("title")).toBe(name);
    expect(button.querySelector("[data-testid=glyph]")?.parentElement?.getAttribute("aria-hidden")).toBe("true");
  });

  it.each(LOCALE_CASES)("ButtonGroup groups its buttons and can be attached ($locale)", ({ locale }) => {
    const view = renderIn(
      locale,
      <ButtonGroup attached>
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>,
    );
    const group = view.getByRole("group");
    expect(hasModuleClass(group, "attached")).toBe(true);
    expect(view.getAllByRole("button")).toHaveLength(2);
  });
});
