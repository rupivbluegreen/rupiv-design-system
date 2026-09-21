// Shared by the tests of the shell components (RailShell, NavDrawer, CommandPalette).
//
// SHELL_CONTENT is one navigation, in English and in Arabic, that every shell test renders. The Arabic is a stand-in,
// a first draft that proves the mechanism, not reviewed text: the application supplies the real words.
//
// AR_SHELL_LABELS is a stand-in Arabic label set, one entry per key of SHELL_LABELS (the compiler checks that none is
// missing). expectNoDefaultEnglish(view.container) then proves that a component given these labels renders none of
// the English defaults, neither as visible text nor in an attribute a screen reader announces.
import { Eye, LayoutDashboard, Settings } from "lucide-react";
import { expect } from "vitest";
import type { CommandPaletteItem } from "../src/components/ui/command-palette";
import type { NavBrand, NavGroup } from "../src/components/ui/nav-drawer";
import { SHELL_LABELS } from "../src/provider/label-sets/shell";
import type { LabelValue, LinkComponent } from "../src/provider";
import type { TestLocale } from "./harness";

export const AR_SHELL_LABELS = {
  "railShell.nav": "التنقل الرئيسي",
  "railShell.skip": "تخطي إلى المحتوى الرئيسي",
  "railShell.menuOpen": "فتح القائمة",
  "railShell.railExpand": "توسيع التنقل",
  "railShell.railCollapse": "طي التنقل",
  "railShell.notifications": "الإشعارات",
  "railShell.notificationsUnread": "الإشعارات: {count} غير مقروءة",
  "commandPalette.placeholder": "بحث",
  "commandPalette.results": "نتائج البحث",
  "commandPalette.empty": "لا توجد نتائج",
  "commandPalette.count": "{count} نتائج",
} as const satisfies Record<keyof typeof SHELL_LABELS, LabelValue>;

/**
 * A link component for tests that click links: an <a> that marks itself and does not navigate (jsdom cannot), so the
 * test can tell the provider's component was used and the click still reaches the component's own handlers.
 */
export const NoNavLink: LinkComponent = ({ href, children, onClick, ...rest }) => (
  <a
    href={href}
    data-custom-link="true"
    onClick={(event) => {
      event.preventDefault();
      onClick?.(event);
    }}
    {...rest}
  >
    {children}
  </a>
);

/** Everything a shell test needs in one language. */
export interface ShellContent {
  brand: NavBrand;
  groups: NavGroup[];
  /** The shell's own labels: none for English (the defaults), the stand-in set for Arabic. */
  labels: typeof AR_SHELL_LABELS | undefined;
  /** What the labels say, so a test asks for text without repeating it. */
  text: {
    nav: string;
    skip: string;
    menuOpen: string;
    railExpand: string;
    railCollapse: string;
    notifications: string;
    placeholder: string;
    empty: string;
  };
}

export const SHELL_CONTENT: Readonly<Record<TestLocale, ShellContent>> = {
  en: {
    brand: { href: "/", label: "Acme", mark: "AC", name: "Acme", context: "Operations" },
    groups: [
      {
        id: "plan",
        label: "Planning",
        icon: <LayoutDashboard />,
        items: [
          { id: "forecast", label: "Forecast", href: "/plan/forecast", section: "Demand" },
          { id: "capacity", label: "Capacity", href: "/plan/capacity", section: "Demand" },
          { id: "roster", label: "Roster", href: "/plan/roster", section: "Supply", icon: <Eye />, iconLabel: "View only" },
        ],
      },
      {
        id: "admin",
        label: "Administration",
        icon: <Settings />,
        items: [
          { id: "users", label: "Users", href: "/admin/users" },
          { id: "audit", label: "Audit log", href: "/admin/audit", badge: 3 },
        ],
      },
    ],
    labels: undefined,
    text: {
      nav: "Main navigation",
      skip: "Skip to main content",
      menuOpen: "Open menu",
      railExpand: "Expand the navigation",
      railCollapse: "Collapse the navigation",
      notifications: "Notifications",
      placeholder: "Search",
      empty: "No results",
    },
  },
  ar: {
    brand: { href: "/", label: "أكمي", mark: "أك", name: "Acme", context: "العمليات" },
    groups: [
      {
        id: "plan",
        label: "التخطيط",
        icon: <LayoutDashboard />,
        items: [
          { id: "forecast", label: "التوقعات", href: "/plan/forecast", section: "الطلب" },
          { id: "capacity", label: "السعة", href: "/plan/capacity", section: "الطلب" },
          { id: "roster", label: "الجدول", href: "/plan/roster", section: "العرض", icon: <Eye />, iconLabel: "عرض فقط" },
        ],
      },
      {
        id: "admin",
        label: "الإدارة",
        icon: <Settings />,
        items: [
          { id: "users", label: "المستخدمون", href: "/admin/users" },
          { id: "audit", label: "سجل التدقيق", href: "/admin/audit", badge: 3 },
        ],
      },
    ],
    labels: AR_SHELL_LABELS,
    text: {
      nav: "التنقل الرئيسي",
      skip: "تخطي إلى المحتوى الرئيسي",
      menuOpen: "فتح القائمة",
      railExpand: "توسيع التنقل",
      railCollapse: "طي التنقل",
      notifications: "الإشعارات",
      placeholder: "بحث",
      empty: "لا توجد نتائج",
    },
  },
};

/** The same pages as SHELL_CONTENT, as a flat list for the search box: label, meta (the group) and a keyword. */
export const PALETTE_ITEMS: Readonly<Record<TestLocale, CommandPaletteItem[]>> = {
  en: [
    { id: "forecast", label: "Forecast explorer", meta: "Planning", href: "/plan/forecast" },
    { id: "capacity", label: "Capacity plan", meta: "Planning", href: "/plan/capacity" },
    { id: "roster", label: "Roster builder", meta: "Planning", href: "/plan/roster", keywords: "shifts schedule" },
    { id: "users", label: "Users and roles", meta: "Administration", href: "/admin/users" },
    { id: "audit", label: "Audit log", meta: "Administration", href: "/admin/audit" },
  ],
  ar: [
    { id: "forecast", label: "مستكشف التوقعات", meta: "التخطيط", href: "/plan/forecast" },
    { id: "capacity", label: "خطة السعة", meta: "التخطيط", href: "/plan/capacity" },
    { id: "roster", label: "منشئ الجدول", meta: "التخطيط", href: "/plan/roster", keywords: "المناوبات" },
    { id: "users", label: "المستخدمون والأدوار", meta: "الإدارة", href: "/admin/users" },
    { id: "audit", label: "سجل التدقيق", meta: "الإدارة", href: "/admin/audit" },
  ],
};

/** Splits an English template at its {placeholders}; only pieces of four or more letters are worth looking for. */
function englishFragments(): { key: string; fragment: string }[] {
  const found: { key: string; fragment: string }[] = [];
  for (const [key, value] of Object.entries(SHELL_LABELS)) {
    const template: string = typeof value === "function" ? value({ count: 3 }) : value;
    for (const piece of template.split(/\{\w+\}|\d+/)) {
      const fragment = piece.replace(/[():]/g, "").trim();
      if (fragment.replace(/[^A-Za-z]/g, "").length >= 4) found.push({ key, fragment });
    }
  }
  return found;
}

const ANNOUNCED_ATTRIBUTES = ["aria-label", "title", "placeholder", "aria-valuetext", "alt"] as const;

/** Everything a person or a screen reader gets from `root`: its text and the attributes that carry words. */
export function announcedText(root: ParentNode): string {
  const parts: string[] = [root instanceof Node ? (root.textContent ?? "") : ""];
  for (const element of Array.from(root.querySelectorAll("*"))) {
    for (const attribute of ANNOUNCED_ATTRIBUTES) {
      const value = element.getAttribute(attribute);
      if (value) parts.push(value);
    }
  }
  return parts.join("\n");
}

/** Fails, naming the key, when `root` shows or announces any English default of SHELL_LABELS. */
export function expectNoDefaultEnglish(root: ParentNode): void {
  const haystack = announcedText(root);
  const leaked = englishFragments()
    .filter(({ fragment }) => haystack.includes(fragment))
    .map(({ key, fragment }) => `${key}: "${fragment}"`);
  expect(leaked).toEqual([]);
}
