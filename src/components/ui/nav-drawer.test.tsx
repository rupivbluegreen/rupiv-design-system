import userEvent from "@testing-library/user-event";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderIn, type ProviderOptions, type TestLocale } from "../../../test/harness";
import { mockVisibleElements } from "../../../test/overlay-dom";
import { NoNavLink, SHELL_CONTENT, expectNoDefaultEnglish } from "../../../test/shell-fixtures";
import { NavDrawer, resolveActive, sectionsOf, type NavGroup, type ResolvedItem } from "./nav-drawer";

// jsdom has no layout and no style sheets: these tests prove the structure, the sections that open and close, the
// focus and the keys. That the drawer slides in from the right edge in Arabic and that its links run edge to edge is
// for the screenshots in the application.

beforeEach(() => {
  mockVisibleElements();
});

interface HostProps {
  locale: TestLocale;
  groups?: NavGroup[];
  onClose?: () => void;
}

function Host({ locale, groups, onClose }: HostProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open navigation
      </button>
      <NavDrawer
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
        groups={groups ?? SHELL_CONTENT[locale].groups}
        title="Acme"
      />
    </>
  );
}

function renderHost(locale: TestLocale, props: Omit<HostProps, "locale"> = {}, options: ProviderOptions = {}) {
  return renderIn(locale, <Host locale={locale} {...props} />, { labels: SHELL_CONTENT[locale].labels, ...options });
}

async function openDrawer(view: ReturnType<typeof renderHost>, user: ReturnType<typeof userEvent.setup>) {
  await user.click(view.getByRole("button", { name: "Open navigation" }));
  return screen.getByRole("dialog", { name: "Acme" });
}

function groupButton(dialog: HTMLElement, locale: TestLocale, id: string) {
  const found = SHELL_CONTENT[locale].groups.find((entry) => entry.id === id);
  if (!found) throw new Error(`no group ${id}`);
  return within(dialog).getByRole("button", { name: found.label });
}

describe.each(LOCALE_CASES)("NavDrawer ($locale)", ({ locale }) => {
  const content = SHELL_CONTENT[locale];

  it("renders nothing while closed, and a modal dialog named by its title from the inline start when open", async () => {
    const user = userEvent.setup();
    const view = renderHost(locale);
    expect(screen.queryByRole("dialog")).toBeNull();
    const dialog = await openDrawer(view, user);
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.dataset["side"]).toBe("start");
    expect(within(dialog).getByRole("navigation", { name: content.text.nav })).toBeTruthy();
  });

  it("puts the focus on the close button when it opens, so it is the first stop and the groups follow in order", async () => {
    const user = userEvent.setup();
    const view = renderHost(locale);
    const dialog = await openDrawer(view, user);
    const close = dialog.querySelector<HTMLElement>("[data-dialog-close]");
    expect(document.activeElement).toBe(close);
    // The tab order is the document order, and the close button leads it.
    const stops = Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button")).filter((el) => !el.closest("[hidden]"));
    expect(stops[0]).toBe(close);
    expect(stops.length).toBeGreaterThan(3);
    const visited: (Element | null)[] = [document.activeElement];
    for (let index = 1; index < stops.length; index += 1) {
      await user.tab();
      visited.push(document.activeElement);
    }
    expect(visited).toEqual(stops);
    // the first Tab after the close button reaches the first group, and Shift+Tab from the close button wraps to the last stop
    expect(visited[1]).toBe(groupButton(dialog, locale, "plan"));
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(stops[stops.length - 1]);
  });

  it("lists every group as a button that opens and closes its section", async () => {
    const user = userEvent.setup();
    const view = renderHost(locale);
    const dialog = await openDrawer(view, user);
    const plan = groupButton(dialog, locale, "plan");
    const admin = groupButton(dialog, locale, "admin");
    // no active page: the first group starts open
    expect(plan.getAttribute("aria-expanded")).toBe("true");
    expect(admin.getAttribute("aria-expanded")).toBe("false");
    expect(within(dialog).queryByRole("link", { name: content.groups[1]?.items[0]?.label ?? "" })).toBeNull();
    await user.click(admin);
    expect(admin.getAttribute("aria-expanded")).toBe("true");
    expect(within(dialog).getByRole("link", { name: content.groups[1]?.items[0]?.label ?? "" })).toBeTruthy();
    await user.click(plan);
    expect(plan.getAttribute("aria-expanded")).toBe("false");
    expect(within(dialog).queryByRole("link", { name: content.groups[0]?.items[0]?.label ?? "" })).toBeNull();
    expect(plan.getAttribute("aria-controls")).toBeTruthy();
    expect(document.getElementById(plan.getAttribute("aria-controls") ?? "")?.hasAttribute("hidden")).toBe(true);
  });

  it("opens the group that holds the active page, and marks the active link", async () => {
    const user = userEvent.setup();
    const view = renderHost(locale, {}, { activePath: "/admin/users" });
    const dialog = await openDrawer(view, user);
    expect(groupButton(dialog, locale, "admin").getAttribute("aria-expanded")).toBe("true");
    expect(groupButton(dialog, locale, "plan").getAttribute("aria-expanded")).toBe("false");
    const active = within(dialog).getByRole("link", { current: "page" });
    expect(active.getAttribute("href")).toBe("/admin/users");
  });

  it("keeps a section the person closed closed, even if it holds the active page", async () => {
    const user = userEvent.setup();
    const view = renderHost(locale, {}, { activePath: "/admin/users" });
    const dialog = await openDrawer(view, user);
    await user.click(groupButton(dialog, locale, "admin"));
    expect(groupButton(dialog, locale, "admin").getAttribute("aria-expanded")).toBe("false");
  });

  it("shows headings over runs of items, a marker with a name, and a badge", async () => {
    const user = userEvent.setup();
    const view = renderHost(locale);
    const dialog = await openDrawer(view, user);
    const plan = content.groups[0];
    const demand = within(dialog).getByRole("list", { name: plan?.items[0]?.section ?? "" });
    expect(within(demand).getAllByRole("link")).toHaveLength(2);
    expect(within(dialog).getByRole("img", { name: plan?.items[2]?.iconLabel ?? "" })).toBeTruthy();
    await user.click(groupButton(dialog, locale, "admin"));
    const audit = within(dialog).getByRole("link", { name: new RegExp(content.groups[1]?.items[1]?.label ?? "") });
    expect(audit.textContent).toContain("3");
  });

  it("uses the provider's link component and closes when a link is chosen", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const view = renderHost(locale, { onClose }, { linkComponent: NoNavLink });
    const dialog = await openDrawer(view, user);
    const link = within(dialog).getByRole("link", { name: content.groups[0]?.items[1]?.label ?? "" });
    expect(link.getAttribute("data-custom-link")).toBe("true");
    await user.click(link);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes with Escape and gives the focus back to the button that opened it", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const view = renderHost(locale, { onClose });
    const opener = view.getByRole("button", { name: "Open navigation" });
    await openDrawer(view, user);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes when the scrim is pressed, and not when the panel is", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const view = renderHost(locale, { onClose });
    const dialog = await openDrawer(view, user);
    fireEvent.mouseDown(dialog);
    expect(onClose).not.toHaveBeenCalled();
    const scrim = dialog.previousElementSibling;
    expect(scrim).not.toBeNull();
    if (scrim) fireEvent.mouseDown(scrim);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with its close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const view = renderHost(locale, { onClose });
    const dialog = await openDrawer(view, user);
    const close = dialog.querySelector<HTMLElement>("[data-dialog-close]");
    expect(close).not.toBeNull();
    if (close) await user.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps the focus: Tab from the last control goes to the first, and Shift+Tab from the first to the last", async () => {
    const user = userEvent.setup();
    const view = renderHost(locale);
    const dialog = await openDrawer(view, user);
    const visible = Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button")).filter((el) => !el.closest("[hidden]"));
    const first = visible[0];
    const last = visible[visible.length - 1];
    expect(visible.length).toBeGreaterThan(2);
    await act(async () => last?.focus());
    await user.tab();
    expect(document.activeElement).toBe(first);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });

  it("names its navigation from a prop when the application gives one", () => {
    renderIn(locale, <NavDrawer open onClose={() => {}} groups={content.groups} title="Acme" navLabel="Pages" />, {
      labels: content.labels,
    });
    expect(within(screen.getByRole("dialog")).getByRole("navigation", { name: "Pages" })).toBeTruthy();
  });
});

describe("NavDrawer with Arabic labels", () => {
  it("renders no English default in the open drawer", async () => {
    const user = userEvent.setup();
    const view = renderHost("ar");
    const dialog = await openDrawer(view, user);
    await user.click(groupButton(dialog, "ar", "admin"));
    expectNoDefaultEnglish(dialog);
    expect(view.container.dir).toBe("rtl");
  });
});

function link(id: string, href: string, extra: Partial<NavGroup["items"][number]> = {}): NavGroup["items"][number] {
  return { id, label: id, href, ...extra };
}

function activeIds(groups: readonly NavGroup[], path: string): string[] {
  return resolveActive(groups, path)
    .flatMap((entry) => entry.items)
    .filter((entry) => entry.active)
    .map((entry) => entry.item.id);
}

describe("resolveActive", () => {
  const groups: NavGroup[] = [
    {
      id: "one",
      label: "One",
      items: [link("home", "/"), link("ops", "/ops"), link("forecast", "/ops/forecast"), link("operations", "/operations")],
    },
    { id: "two", label: "Two", items: [link("users", "/admin/users?tab=all"), link("audit", "/admin/audit/")] },
  ];

  it("marks the item whose href is the path", () => {
    expect(activeIds(groups, "/ops")).toEqual(["ops"]);
  });

  it("marks an item for a page below it", () => {
    expect(activeIds(groups, "/ops/anything/deeper")).toEqual(["ops"]);
  });

  it("counts only the longest matching href", () => {
    expect(activeIds(groups, "/ops/forecast/2026")).toEqual(["forecast"]);
  });

  it("does not take a sibling that only starts with the same letters", () => {
    expect(activeIds(groups, "/operations")).toEqual(["operations"]);
    expect(activeIds(groups, "/opsx")).toEqual([]);
  });

  it("matches the root page only for the root, or every page would be active", () => {
    expect(activeIds(groups, "/")).toEqual(["home"]);
    expect(activeIds(groups, "/somewhere")).toEqual([]);
  });

  it("ignores the query and the hash of the href and of the path, and a trailing slash", () => {
    expect(activeIds(groups, "/admin/users")).toEqual(["users"]);
    expect(activeIds(groups, "/admin/audit?page=2#top")).toEqual(["audit"]);
    expect(activeIds(groups, "/admin/users/")).toEqual(["users"]);
  });

  it("marks nothing for an empty path", () => {
    expect(activeIds(groups, "")).toEqual([]);
  });

  it("lets an item's own `active` win, and keeps it out of the competition for the path", () => {
    const own: NavGroup[] = [
      {
        id: "g",
        label: "G",
        items: [link("a", "/a", { active: false }), link("child", "/a/child"), link("b", "/b", { active: true })],
      },
    ];
    expect(activeIds(own, "/a/child")).toEqual(["child", "b"]);
    expect(activeIds(own, "/a")).toEqual(["b"]);
  });

  it("says which groups hold an active item", () => {
    expect(resolveActive(groups, "/admin/audit").map((entry) => entry.active)).toEqual([false, true]);
  });
});

describe("sectionsOf", () => {
  const entry = (id: string, section?: string): ResolvedItem => ({
    item: link(id, `/${id}`, section === undefined ? {} : { section }),
    active: false,
  });

  it("makes one section with no heading when no item has one", () => {
    const sections = sectionsOf([entry("a"), entry("b")]);
    expect(sections.map((section) => [section.heading, section.items.length])).toEqual([[undefined, 2]]);
  });

  it("starts a section at each new heading, and an item with no heading joins the section before it", () => {
    const sections = sectionsOf([entry("a", "One"), entry("b"), entry("c", "Two"), entry("d", "Two"), entry("e", "One")]);
    expect(sections.map((section) => [section.heading, section.items.map((item) => item.item.id)])).toEqual([
      ["One", ["a", "b"]],
      ["Two", ["c", "d"]],
      ["One", ["e"]],
    ]);
  });

  it("returns no sections for no items", () => {
    expect(sectionsOf([])).toEqual([]);
  });
});
