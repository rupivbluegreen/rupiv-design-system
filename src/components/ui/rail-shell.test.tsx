import userEvent from "@testing-library/user-event";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CustomLink,
  LOCALE_CASES,
  renderBoth,
  renderIn,
  type LocaleRender,
  type ProviderOptions,
  type TestLocale,
} from "../../../test/harness";
import { mockVisibleElements } from "../../../test/overlay-dom";
import { NoNavLink, SHELL_CONTENT, expectNoDefaultEnglish } from "../../../test/shell-fixtures";
import type { NavGroup, NavItem } from "./nav-drawer";
import { NotificationsBell, RailShell, type RailShellProps } from "./rail-shell";

// jsdom has no layout and no style sheets: these tests prove the structure, the labels, the keyboard, the focus and the
// state (open, active, expanded). They cannot prove that the rail, the fly-out and the drawer look right, that the
// drawer comes in from the right edge in Arabic, or that nothing overflows sideways at 390px wide. That is for the
// screenshots in the application.

function group(locale: TestLocale, id: string): NavGroup {
  const found = SHELL_CONTENT[locale].groups.find((entry) => entry.id === id);
  if (!found) throw new Error(`no group ${id}`);
  return found;
}

function item(locale: TestLocale, groupId: string, itemId: string): NavItem {
  const found = group(locale, groupId).items.find((entry) => entry.id === itemId);
  if (!found) throw new Error(`no item ${itemId}`);
  return found;
}

function renderShell(locale: TestLocale, props: Partial<RailShellProps> = {}, options: ProviderOptions = {}): LocaleRender {
  const content = SHELL_CONTENT[locale];
  return renderIn(
    locale,
    <RailShell groups={content.groups} brand={content.brand} {...props}>
      <p>Page body</p>
    </RailShell>,
    { labels: content.labels, ...options },
  );
}

function trigger(view: LocaleRender, groupId: string) {
  return view.getByRole("button", { name: group(view.locale, groupId).label });
}

/** The fly-out of a group: a labelled group of links, in the accessibility tree only while it is open. */
function flyout(groupId: string, locale: TestLocale) {
  return screen.queryByRole("group", { name: group(locale, groupId).label });
}

function openFlyout(groupId: string, locale: TestLocale) {
  const element = flyout(groupId, locale);
  if (!element) throw new Error(`the fly-out of ${groupId} is closed`);
  return element;
}

describe.each(LOCALE_CASES)("RailShell ($locale)", ({ locale, dir }) => {
  const content = SHELL_CONTENT[locale];
  const towardFlyout = dir === "rtl" ? "{ArrowLeft}" : "{ArrowRight}";
  const towardRail = dir === "rtl" ? "{ArrowRight}" : "{ArrowLeft}";

  describe("landmarks and structure", () => {
    it("has a banner, a main navigation named by the label, and a main region holding the page", () => {
      const view = renderShell(locale);
      expect(view.getByRole("banner")).toBeTruthy();
      expect(view.getByRole("navigation", { name: content.text.nav })).toBeTruthy();
      const main = view.getByRole("main");
      expect(main.textContent).toBe("Page body");
      expect(main.getAttribute("tabindex")).toBe("-1");
      expect(main.id).toBe("main-content");
    });

    it("takes the id of <main> from a prop, and the skip link points at it", () => {
      const view = renderShell(locale, { mainId: "page" });
      expect(view.getByRole("main").id).toBe("page");
      expect(view.getByRole("link", { name: content.text.skip }).getAttribute("href")).toBe("#page");
    });

    it("puts a skip link first in the tab order, and following it moves the focus to <main>", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.tab();
      const skip = view.getByRole("link", { name: content.text.skip });
      expect(document.activeElement).toBe(skip);
      await user.keyboard("{Enter}");
      expect(document.activeElement).toBe(view.getByRole("main"));
    });

    it("has one rail button per group, collapsed, named by the group, with fly-outs out of the accessibility tree", () => {
      const view = renderShell(locale);
      const rail = view.container.querySelector('[data-shell="rail"]');
      expect(rail).not.toBeNull();
      const buttons = Array.from(view.container.querySelectorAll<HTMLElement>("[data-shell-trigger]"));
      expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual(content.groups.map((entry) => entry.label));
      for (const button of buttons) {
        expect(button.getAttribute("aria-expanded")).toBe("false");
        expect(button.getAttribute("aria-controls")).toBeTruthy();
        expect(document.getElementById(button.getAttribute("aria-controls") ?? "")?.hasAttribute("hidden")).toBe(true);
      }
      expect(flyout("plan", locale)).toBeNull();
      expect(flyout("admin", locale)).toBeNull();
      expect(view.queryByRole("link", { name: item(locale, "plan", "forecast").label })).toBeNull();
    });

    it("keeps every link in the DOM for the application's own checks, marked with stable hooks", () => {
      const view = renderShell(locale);
      const ids = Array.from(view.container.querySelectorAll<HTMLElement>('[data-shell="rail"] [data-shell-item]')).map(
        (link) => link.dataset["shellItem"],
      );
      expect(ids).toEqual(content.groups.flatMap((entry) => entry.items.map((entry2) => entry2.id)));
      expect(view.container.querySelectorAll("[data-shell-group]")).toHaveLength(content.groups.length);
    });

    it("shows the first letter of a group that has no icon", () => {
      const view = renderShell(locale, { groups: [{ id: "plain", label: "Reports", items: [{ id: "a", label: "A", href: "/a" }] }] });
      expect(view.getByRole("button", { name: "Reports" }).textContent).toBe("R");
    });

    it("renders the search and end slots inside the banner, and the brand as links", () => {
      const view = renderShell(locale, {
        search: <input aria-label="Find anything" />,
        end: <button type="button">Profile</button>,
      });
      const banner = view.getByRole("banner");
      expect(within(banner).getByLabelText("Find anything")).toBeTruthy();
      expect(within(banner).getByRole("button", { name: "Profile" })).toBeTruthy();
      // the rail mark is named by the brand label; the top bar link reads the wordmark and the context
      expect(view.getAllByRole("link", { name: content.brand.label })[0]?.getAttribute("href")).toBe("/");
      const topbarBrand = within(banner).getByRole("link", { name: new RegExp(`Acme.*${String(content.brand.context)}`) });
      expect(topbarBrand.getAttribute("href")).toBe("/");
      for (const mark of view.container.querySelectorAll("[translate]")) expect(mark.getAttribute("translate")).toBe("no");
    });

    it("leaves out the search slot and the context when there are none", () => {
      const view = renderShell(locale, { brand: { href: "/", label: "Acme", mark: "AC" } });
      const banner = view.getByRole("banner");
      expect(within(banner).queryByRole("search")).toBeNull();
      expect(within(banner).getByRole("link", { name: "Acme" }).textContent).toBe("Acme");
    });

    it("has a menu button, named by the label, that says it opens a dialog", () => {
      const view = renderShell(locale);
      const menu = view.getByRole("button", { name: content.text.menuOpen });
      expect(menu.getAttribute("aria-haspopup")).toBe("dialog");
      expect(menu.getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("fly-outs with the pointer", () => {
    it("opens a fly-out on hover and closes it when the pointer leaves", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.hover(trigger(view, "plan"));
      const open = openFlyout("plan", locale);
      expect(trigger(view, "plan").getAttribute("aria-expanded")).toBe("true");
      expect(within(open).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
        "/plan/forecast",
        "/plan/capacity",
        "/plan/roster",
      ]);
      await user.unhover(trigger(view, "plan"));
      expect(flyout("plan", locale)).toBeNull();
      expect(trigger(view, "plan").getAttribute("aria-expanded")).toBe("false");
    });

    it("opens one fly-out at a time", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.hover(trigger(view, "plan"));
      await user.hover(trigger(view, "admin"));
      expect(flyout("plan", locale)).toBeNull();
      expect(flyout("admin", locale)).not.toBeNull();
    });

    it("keeps a fly-out open after a click until it is toggled or dismissed, and a second click closes it", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.click(trigger(view, "plan"));
      expect(flyout("plan", locale)).not.toBeNull();
      await user.unhover(trigger(view, "plan"));
      expect(flyout("plan", locale)).not.toBeNull();
      await user.click(trigger(view, "plan"));
      expect(flyout("plan", locale)).toBeNull();
    });

    it("does not move the focus into the fly-out when a click opens it", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.click(trigger(view, "plan"));
      expect(document.activeElement).toBe(trigger(view, "plan"));
    });

    it("closes a fly-out on a press outside the rail", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.click(trigger(view, "plan"));
      fireEvent.pointerDown(view.getByRole("main"));
      expect(flyout("plan", locale)).toBeNull();
    });

    it("does not close a fly-out on a press inside it", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.click(trigger(view, "plan"));
      fireEvent.pointerDown(openFlyout("plan", locale));
      expect(flyout("plan", locale)).not.toBeNull();
    });

    it("closes a fly-out opened by hover when Escape is pressed, without moving the focus", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.hover(trigger(view, "plan"));
      await user.keyboard("{Escape}");
      expect(flyout("plan", locale)).toBeNull();
      expect(document.activeElement).toBe(document.body);
    });

    it("ignores touch pointers for hover (a tap is a click)", () => {
      const view = renderShell(locale);
      fireEvent.pointerOver(trigger(view, "plan"), { pointerType: "touch" });
      expect(flyout("plan", locale)).toBeNull();
    });

    it("closes the fly-out and follows the link when a link in it is chosen, through the provider's link component", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale, {}, { linkComponent: NoNavLink });
      await user.click(trigger(view, "plan"));
      const link = within(openFlyout("plan", locale)).getByRole("link", { name: item(locale, "plan", "capacity").label });
      expect(link.getAttribute("data-custom-link")).toBe("true");
      await user.click(link);
      expect(flyout("plan", locale)).toBeNull();
    });
  });

  describe("fly-outs with the keyboard", () => {
    async function focusTrigger(view: LocaleRender, groupId: string) {
      await act(async () => trigger(view, groupId).focus());
    }

    it("opens a fly-out with Enter and puts the focus on its first item", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await focusTrigger(view, "plan");
      await user.keyboard("{Enter}");
      expect(trigger(view, "plan").getAttribute("aria-expanded")).toBe("true");
      expect(document.activeElement).toBe(within(openFlyout("plan", locale)).getAllByRole("link")[0]);
    });

    it("opens a fly-out with Space", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await focusTrigger(view, "admin");
      await user.keyboard(" ");
      expect(document.activeElement).toBe(within(openFlyout("admin", locale)).getAllByRole("link")[0]);
    });

    it("opens with the arrow that points from the rail to the fly-out, and not with the other one", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await focusTrigger(view, "plan");
      await user.keyboard(towardRail);
      expect(flyout("plan", locale)).toBeNull();
      await user.keyboard(towardFlyout);
      expect(document.activeElement).toBe(within(openFlyout("plan", locale)).getAllByRole("link")[0]);
    });

    it("moves through the items with the arrow keys, Home and End, and wraps around", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await focusTrigger(view, "plan");
      await user.keyboard("{Enter}");
      const links = within(openFlyout("plan", locale)).getAllByRole("link");
      const [first, second, third] = links;
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(second);
      await user.keyboard("{End}");
      expect(document.activeElement).toBe(third);
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(first);
      await user.keyboard("{ArrowUp}");
      expect(document.activeElement).toBe(third);
      await user.keyboard("{Home}");
      expect(document.activeElement).toBe(first);
    });

    it("closes with Escape and gives the focus back to the rail button", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await focusTrigger(view, "plan");
      await user.keyboard("{Enter}");
      await user.keyboard("{Escape}");
      expect(flyout("plan", locale)).toBeNull();
      expect(trigger(view, "plan").getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(trigger(view, "plan"));
    });

    it("closes with the arrow that points back to the rail, and gives the focus back to the rail button", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await focusTrigger(view, "plan");
      await user.keyboard("{Enter}");
      await user.keyboard(towardFlyout); // the wrong way: nothing happens
      expect(flyout("plan", locale)).not.toBeNull();
      await user.keyboard(towardRail);
      expect(flyout("plan", locale)).toBeNull();
      expect(document.activeElement).toBe(trigger(view, "plan"));
    });

    it("toggles a pinned fly-out shut with Enter on its button", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await focusTrigger(view, "plan");
      await user.keyboard("{Enter}");
      await act(async () => trigger(view, "plan").focus());
      await user.keyboard("{Enter}");
      expect(flyout("plan", locale)).toBeNull();
    });

    it("moves between the rail buttons with the vertical arrow keys, Home and End, and wraps around", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await focusTrigger(view, "plan");
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(trigger(view, "admin"));
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(trigger(view, "plan"));
      await user.keyboard("{ArrowUp}");
      expect(document.activeElement).toBe(trigger(view, "admin"));
      await user.keyboard("{Home}");
      expect(document.activeElement).toBe(trigger(view, "plan"));
      await user.keyboard("{End}");
      expect(document.activeElement).toBe(trigger(view, "admin"));
    });

    it("closes a fly-out when the focus leaves the button and the fly-out", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await focusTrigger(view, "plan");
      await user.keyboard("{Enter}");
      await user.tab({ shift: true }); // to the button
      expect(flyout("plan", locale)).not.toBeNull();
      await user.tab({ shift: true }); // out of the group
      expect(flyout("plan", locale)).toBeNull();
    });

    it("leaves the keys with a modifier alone", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await focusTrigger(view, "plan");
      await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
      expect(document.activeElement).toBe(trigger(view, "plan"));
    });
  });

  describe("the active item", () => {
    it("marks the item whose href is the active path, and the rail button of its group", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale, {}, { activePath: "/plan/capacity" });
      expect(trigger(view, "plan").getAttribute("data-active")).toBe("true");
      expect(trigger(view, "admin").getAttribute("data-active")).toBe("false");
      await user.click(trigger(view, "plan"));
      const links = within(openFlyout("plan", locale)).getAllByRole("link");
      expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([null, "page", null]);
    });

    it("counts a page below an item as that item", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale, {}, { activePath: "/admin/users/42/edit" });
      await user.click(trigger(view, "admin"));
      const active = within(openFlyout("admin", locale)).getByRole("link", { current: "page" });
      expect(active.getAttribute("href")).toBe("/admin/users");
    });

    it("marks nothing without an active path", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.click(trigger(view, "plan"));
      expect(within(openFlyout("plan", locale)).queryByRole("link", { current: "page" })).toBeNull();
      expect(trigger(view, "plan").getAttribute("data-active")).toBe("false");
    });

    it("lets an item's own `active` win over the path", async () => {
      const user = userEvent.setup();
      const groups: NavGroup[] = [
        {
          id: "g",
          label: "Group",
          items: [
            { id: "a", label: "Alpha", href: "/alpha", active: false },
            { id: "b", label: "Beta", href: "/beta", active: true },
          ],
        },
      ];
      const view = renderShell(locale, { groups }, { activePath: "/alpha" });
      await user.click(view.getByRole("button", { name: "Group" }));
      const links = within(screen.getByRole("group", { name: "Group" })).getAllByRole("link");
      expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([null, "page"]);
    });
  });

  describe("sections, markers and badges", () => {
    it("shows a heading over each run of items and names the list by it", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.click(trigger(view, "plan"));
      const open = openFlyout("plan", locale);
      const demand = within(open).getByRole("list", { name: item(locale, "plan", "forecast").section ?? "" });
      expect(within(demand).getAllByRole("link")).toHaveLength(2);
      const supply = within(open).getByRole("list", { name: item(locale, "plan", "roster").section ?? "" });
      expect(within(supply).getAllByRole("link")).toHaveLength(1);
    });

    it("shows a group with no headings as one list", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.click(trigger(view, "admin"));
      const open = openFlyout("admin", locale);
      expect(within(open).getAllByRole("list")).toHaveLength(1);
      expect(within(open).getAllByRole("link")).toHaveLength(2);
    });

    it("names a marker icon for a screen reader when it has a label, and hides it when it has none", async () => {
      const user = userEvent.setup();
      const groups: NavGroup[] = [
        {
          id: "g",
          label: "Group",
          items: [
            { id: "a", label: "Alpha", href: "/alpha", icon: <svg data-testid="plain" />, iconLabel: "Read only" },
            { id: "b", label: "Beta", href: "/beta", icon: <svg data-testid="decor" /> },
          ],
        },
      ];
      const view = renderShell(locale, { groups });
      await user.click(view.getByRole("button", { name: "Group" }));
      const alpha = screen.getByRole("link", { name: /Alpha.*Read only/ });
      expect(within(alpha).getByRole("img", { name: "Read only" })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Beta" }).querySelector('[aria-hidden="true"]')).not.toBeNull();
    });

    it("shows a badge after the label", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.click(trigger(view, "admin"));
      const audit = within(openFlyout("admin", locale)).getByRole("link", { name: new RegExp(item(locale, "admin", "audit").label) });
      expect(audit.textContent).toContain("3");
    });
  });

  describe("the navigation drawer", () => {
    beforeEach(() => {
      mockVisibleElements();
    });

    it("opens from the menu button, as a modal dialog named by the wordmark, from the inline start", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      const menu = view.getByRole("button", { name: content.text.menuOpen });
      await user.click(menu);
      const dialog = screen.getByRole("dialog", { name: "Acme" });
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(dialog.dataset["side"]).toBe("start");
      expect(menu.getAttribute("aria-expanded")).toBe("true");
      expect(within(dialog).getByRole("navigation", { name: content.text.nav })).toBeTruthy();
    });

    it("lists the same groups and items as the rail", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      const railItems = Array.from(view.container.querySelectorAll<HTMLElement>('[data-shell="rail"] [data-shell-item]')).map(
        (link) => `${link.dataset["shellItem"]} ${link.getAttribute("href")}`,
      );
      await user.click(view.getByRole("button", { name: content.text.menuOpen }));
      const dialog = screen.getByRole("dialog");
      const drawerItems = Array.from(dialog.querySelectorAll<HTMLElement>("[data-shell-item]")).map(
        (link) => `${link.dataset["shellItem"]} ${link.getAttribute("href")}`,
      );
      expect(drawerItems).toEqual(railItems);
      for (const entry of content.groups) expect(within(dialog).getByRole("button", { name: entry.label })).toBeTruthy();
    });

    it("closes with Escape and gives the focus back to the menu button", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      const menu = view.getByRole("button", { name: content.text.menuOpen });
      await user.click(menu);
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(menu);
      expect(menu.getAttribute("aria-expanded")).toBe("false");
    });

    it("closes when the scrim is pressed", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.click(view.getByRole("button", { name: content.text.menuOpen }));
      const scrim = screen.getByRole("dialog").previousElementSibling;
      expect(scrim).not.toBeNull();
      if (scrim) fireEvent.mouseDown(scrim);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("closes when a link in it is chosen", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale, {}, { linkComponent: NoNavLink });
      await user.click(view.getByRole("button", { name: content.text.menuOpen }));
      const dialog = screen.getByRole("dialog");
      await user.click(within(dialog).getByRole("link", { name: item(locale, "plan", "forecast").label }));
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("keeps the focus inside while it is open (Tab wraps from the last item to the first control)", async () => {
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.click(view.getByRole("button", { name: content.text.menuOpen }));
      const dialog = screen.getByRole("dialog");
      const visible = Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button")).filter((el) => !el.closest("[hidden]"));
      const first = visible[0];
      const last = visible[visible.length - 1];
      expect(first).toBeDefined();
      expect(last).toBeDefined();
      await act(async () => last?.focus());
      await user.tab();
      expect(document.activeElement).toBe(first);
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(last);
    });

    it("closes when the window grows past the drawer breakpoint", async () => {
      let matches = false;
      const listeners = new Set<() => void>();
      vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
        get matches() {
          return matches;
        },
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_type: string, listener: unknown) => {
          if (typeof listener === "function") {
            listeners.add(() => {
              listener();
            });
          }
        },
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }));
      const user = userEvent.setup();
      const view = renderShell(locale);
      await user.click(view.getByRole("button", { name: content.text.menuOpen }));
      expect(screen.getByRole("dialog")).toBeTruthy();
      act(() => {
        matches = true;
        for (const listener of listeners) listener();
      });
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  describe("links and labels", () => {
    it("uses the provider's link component for the brand and every item", () => {
      const view = renderShell(locale, {}, { linkComponent: CustomLink });
      const links = Array.from(view.container.querySelectorAll("a[href]:not([href^='#'])"));
      expect(links.length).toBeGreaterThan(0);
      expect(links.every((link) => link.getAttribute("data-custom-link") === "true")).toBe(true);
    });

  });
});

describe("RailShell with Arabic labels", () => {
  it("renders no English default in the page, and none in the drawer", async () => {
    mockVisibleElements();
    const user = userEvent.setup();
    const content = SHELL_CONTENT.ar;
    const view = renderShell("ar", { end: <NotificationsBell unreadCount={4} href="/notifications" /> });
    expectNoDefaultEnglish(view.container);
    expect(view.container.dir).toBe("rtl");
    expect(view.container.lang).toBe("ar");
    await user.click(view.getByRole("button", { name: content.text.menuOpen }));
    expectNoDefaultEnglish(screen.getByRole("dialog"));
  });
});

describe("RailShell in both languages at once", () => {
  it("renders the same structure in English/ltr and Arabic/rtl", () => {
    const ui = (locale: TestLocale) => (
      <RailShell groups={SHELL_CONTENT[locale].groups} brand={SHELL_CONTENT[locale].brand}>
        <p>Page body</p>
      </RailShell>
    );
    const views = renderBoth(ui("en"));
    // renderBoth renders one element twice; the Arabic view of the English content still has the Arabic direction
    expect(views.en.container.dir).toBe("ltr");
    expect(views.ar.container.dir).toBe("rtl");
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("banner")).toBeTruthy();
      expect(view.getByRole("main")).toBeTruthy();
      expect(view.container.querySelectorAll("[data-shell-trigger]")).toHaveLength(2);
    }
  });
});

describe("NotificationsBell", () => {
  it.each(LOCALE_CASES)("shows a count on the badge, in Western digits, and names the button with it ($locale)", ({ locale }) => {
    const content = SHELL_CONTENT[locale];
    const view = renderIn(locale, <NotificationsBell unreadCount={3} href="/notifications" />, { labels: content.labels });
    const link = view.getByRole("link", { name: locale === "ar" ? "الإشعارات: 3 غير مقروءة" : "Notifications: 3 unread" });
    expect(link.getAttribute("href")).toBe("/notifications");
    const badge = link.querySelector('[data-shell="bell-count"]');
    expect(badge?.textContent).toBe("3");
    expect(badge?.getAttribute("aria-hidden")).toBe("true");
    expect(link.textContent).toBe("3");
    expect(/[٠-٩۰-۹]/.test(link.textContent ?? "")).toBe(false);
    expect(/[٠-٩۰-۹]/.test(link.getAttribute("aria-label") ?? "")).toBe(false);
  });

  it("reads the count from a label function, so the application can decide plurals and digits", () => {
    const view = renderIn("ar", <NotificationsBell unreadCount={12} onClick={() => {}} />, {
      labels: { "railShell.notificationsUnread": ({ count }) => `لديك ${count} إشعارًا` },
    });
    expect(view.getByRole("button", { name: "لديك 12 إشعارًا" }).textContent).toBe("12");
  });

  it("speaks the singular in English", () => {
    const view = renderIn("en", <NotificationsBell unreadCount={1} onClick={() => {}} />);
    expect(view.getByRole("button", { name: "Notifications: 1 unread" })).toBeTruthy();
  });

  it("shows no badge and a plain name when nothing is unread, and treats a bad count as zero", () => {
    for (const count of [0, -4, Number.NaN, Number.POSITIVE_INFINITY]) {
      const view = renderIn("en", <NotificationsBell unreadCount={count} onClick={() => {}} />);
      const button = view.getByRole("button", { name: "Notifications" });
      expect(button.querySelector('[data-shell="bell-count"]')).toBeNull();
      view.unmount();
    }
  });

  it("caps the badge at 99+ but keeps the exact count in the name", () => {
    const view = renderIn("en", <NotificationsBell unreadCount={250} onClick={() => {}} />);
    const button = view.getByRole("button", { name: "Notifications: 250 unread" });
    expect(button.textContent).toBe("99+");
  });

  it("is a button that calls onClick when there is no href, and a link through the provider when there is one", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const asButton = renderIn("en", <NotificationsBell unreadCount={2} onClick={onClick} />);
    await user.click(asButton.getByRole("button", { name: "Notifications: 2 unread" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    asButton.unmount();
    const asLink = renderIn("en", <NotificationsBell unreadCount={2} href="/n" />, { linkComponent: CustomLink });
    expect(asLink.getByRole("link", { name: "Notifications: 2 unread" }).getAttribute("data-custom-link")).toBe("true");
  });
});

describe("the package entry", () => {
  it("exports the shell components, the notifications bell and the search box", async () => {
    const entry = await import("./index");
    expect(entry.RailShell).toBe(RailShell);
    expect(entry.NotificationsBell).toBe(NotificationsBell);
    expect(typeof entry.NavDrawer).toBe("function");
    expect(typeof entry.CommandPalette).toBe("function");
    expect(entry.normalizeSearchText("  ABC ")).toBe("abc");
  });
});
