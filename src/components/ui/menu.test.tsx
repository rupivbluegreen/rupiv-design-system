import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomLink, LOCALE_CASES, renderIn } from "../../../test/harness";
import { Button } from "./button";
import { Menu } from "./menu";

describe("Menu", () => {
  it.each(LOCALE_CASES)("renders item links as plain <a href> by default ($locale)", async ({ locale }) => {
    const view = renderIn(
      locale,
      <Menu
        label="Actions"
        trigger={<Button>Open</Button>}
        items={[{ label: "Profile", href: "/profile" }, "separator", { label: "Sign out", onSelect: () => {} }]}
      />,
    );
    await userEvent.click(view.getByRole("button", { name: "Open" }));
    const link = screen.getByRole("menuitem", { name: "Profile" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/profile");
    expect(link.hasAttribute("data-custom-link")).toBe(false);
    expect(screen.getByRole("menuitem", { name: "Sign out" }).tagName).toBe("BUTTON");
  });

  it.each(LOCALE_CASES)("uses the provider's link component for item links ($locale)", async ({ locale }) => {
    const view = renderIn(
      locale,
      <Menu trigger={<Button>Open</Button>} items={[{ label: "Profile", href: "/profile" }]} />,
      { linkComponent: CustomLink },
    );
    await userEvent.click(view.getByRole("button", { name: "Open" }));
    const link = screen.getByRole("menuitem", { name: "Profile" });
    expect(link.getAttribute("data-custom-link")).toBe("true");
    expect(link.getAttribute("href")).toBe("/profile");
    expect(link.getAttribute("role")).toBe("menuitem");
  });

  it.each(LOCALE_CASES)("renders a disabled item with an href as a button, not a link ($locale)", async ({ locale }) => {
    const view = renderIn(
      locale,
      <Menu trigger={<Button>Open</Button>} items={[{ label: "Profile", href: "/profile", disabled: true }]} />,
      { linkComponent: CustomLink },
    );
    await userEvent.click(view.getByRole("button", { name: "Open" }));
    const item = screen.getByRole("menuitem", { name: "Profile" });
    expect(item.tagName).toBe("BUTTON");
    expect(item.getAttribute("aria-disabled")).toBe("true");
  });
});
