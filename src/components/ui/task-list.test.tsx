import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { CustomLink, renderBoth, renderIn } from "../../../test/harness";
import { TaskList, type TaskListItem } from "./task-list";

const items: TaskListItem[] = [
  { id: "mfa", title: "المصادقة متعددة العوامل", icon: <i data-testid="ic-mfa" />, color: "mint", meta: "مفروضة" },
  { id: "alert", title: "يرفع تنبيهاً", icon: <i data-testid="ic-alert" />, color: "rose", badge: <span>جديد</span> },
  { id: "audit", title: "يُسجَّل في السجل" },
];

describe("TaskList", () => {
  it("is a list with one row per item, in English and Arabic", () => {
    const views = renderBoth(<TaskList items={items} />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("list").tagName).toBe("UL");
      expect(view.getAllByRole("listitem")).toHaveLength(3);
      expect(view.getByText("المصادقة متعددة العوامل")).toBeTruthy();
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("shows the tile with its colour, the chip beside the title and the meta line under it", () => {
    const views = renderBoth(<TaskList items={items} />);
    for (const view of [views.en, views.ar]) {
      expect(hasModuleClass(view.getByTestId("ic-mfa").parentElement as Element, "mint")).toBe(true);
      expect(hasModuleClass(view.getByTestId("ic-alert").parentElement as Element, "rose")).toBe(true);
      expect(view.getByText("مفروضة")).toBeTruthy();
      const titleRow = view.getByText("يرفع تنبيهاً").parentElement as Element;
      expect(titleRow.textContent).toContain("جديد");
    }
  });

  it("draws no tile for a row without an icon, and no meta line without meta", () => {
    const views = renderBoth(<TaskList items={[{ id: "a", title: "Plain" }]} />);
    for (const view of [views.en, views.ar]) {
      const row = view.getAllByRole("listitem")[0] as Element;
      expect(row.querySelector("[aria-hidden]")).toBeNull();
      expect(row.textContent).toBe("Plain");
    }
  });

  it("a row without an href is static: no link and no chevron", () => {
    const views = renderBoth(<TaskList items={[{ id: "a", title: "Static", icon: <i /> }]} />);
    for (const view of [views.en, views.ar]) {
      expect(view.queryByRole("link")).toBeNull();
      expect(view.getAllByRole("listitem")[0]?.querySelector("svg")).toBeNull();
    }
  });

  it("a row with an href is a link with a chevron, rendered by the provider's link component", () => {
    const views = renderBoth(<TaskList items={[{ id: "a", title: "Users", href: "/admin/users" }]} />, {
      linkComponent: CustomLink,
    });
    for (const view of [views.en, views.ar]) {
      const link = view.getByRole("link", { name: "Users" });
      expect(link.getAttribute("href")).toBe("/admin/users");
      expect(link.getAttribute("data-custom-link")).toBe("true");
      expect(link.querySelector("svg")).not.toBeNull();
      expect(hasModuleClass(link, "link")).toBe(true);
    }
  });

  it("uses a plain <a href> when the provider gives no link component", () => {
    const views = renderBoth(<TaskList items={[{ id: "a", title: "Users", href: "/admin/users" }]} />);
    for (const view of [views.en, views.ar]) {
      const link = view.getByRole("link", { name: "Users" });
      expect(link.tagName).toBe("A");
      expect(link.hasAttribute("data-custom-link")).toBe(false);
    }
  });

  it("a link row can be reached and followed from the keyboard", async () => {
    const user = userEvent.setup();
    const view = renderIn("ar", <TaskList items={[{ id: "a", title: "Users", href: "/admin/users" }, { id: "b", title: "Roles", href: "/admin/roles" }]} />);
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("link", { name: "Users" }));
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("link", { name: "Roles" }));
  });

  it("a disabled row with an href is a dimmed, unlinked, disabled link that the keyboard skips", async () => {
    const user = userEvent.setup();
    const views = renderBoth(
      <TaskList
        items={[
          { id: "a", title: "Reports", href: "/reports", disabled: true },
          { id: "b", title: "Users", href: "/users" },
        ]}
      />,
    );
    for (const view of [views.en, views.ar]) {
      const disabled = view.getByRole("link", { name: "Reports" });
      expect(disabled.getAttribute("aria-disabled")).toBe("true");
      expect(disabled.hasAttribute("href")).toBe(false);
      expect(disabled.getAttribute("tabindex")).toBeNull();
      expect(hasModuleClass(disabled, "disabled")).toBe(true);
      expect(view.getAllByRole("link")).toHaveLength(2);
    }
    await user.tab();
    expect(document.activeElement?.textContent).toBe("Users");
  });

  it("a disabled row without an href is just dimmed", () => {
    const views = renderBoth(<TaskList items={[{ id: "a", title: "Later", disabled: true }]} />);
    for (const view of [views.en, views.ar]) {
      const row = view.getByText("Later").closest("[class]")?.parentElement?.closest("li")?.firstElementChild as Element;
      expect(hasModuleClass(row, "disabled")).toBe(true);
      expect(row.hasAttribute("role")).toBe(false);
      expect(row.hasAttribute("aria-disabled")).toBe(false);
    }
  });

  it("renders an empty list for no items", () => {
    const views = renderBoth(<TaskList items={[]} />);
    for (const view of [views.en, views.ar]) expect(view.queryAllByRole("listitem")).toHaveLength(0);
  });
});
