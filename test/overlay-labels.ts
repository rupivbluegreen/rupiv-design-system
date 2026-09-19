// Shared by the tests of the overlay components (Combobox, Modal, Drawer, Toast, Tabs).
//
// AR_OVERLAY_LABELS is a stand-in Arabic label set, one entry per key of OVERLAY_LABELS (the compiler checks that none
// is missing). It is a first draft that proves the mechanism, not reviewed Arabic: the application supplies the real
// text. expectNoDefaultEnglish(document.body) then proves that a component given these labels renders none of the
// English defaults, neither as visible text nor in an attribute a screen reader announces.
import { expect } from "vitest";
import { OVERLAY_LABELS } from "../src/provider/label-sets/overlays";
import type { LabelValue } from "../src/provider";

export const AR_OVERLAY_LABELS = {
  "combobox.placeholder": "اختر…",
  "combobox.empty": "لا توجد نتائج مطابقة",
  "combobox.show": "إظهار الخيارات",
  "combobox.hide": "إخفاء الخيارات",
  "drawer.close": "إغلاق اللوحة",
  "modal.close": "إغلاق النافذة",
  "tabs.sections": "الأقسام",
  "toast.region": "الإشعارات",
  "toast.dismiss": "تجاهل الإشعار",
  "toast.dismissTitle": "تجاهل",
} as const satisfies Record<keyof typeof OVERLAY_LABELS, LabelValue>;

/** Splits an English template at its {placeholders}; only pieces of four or more letters are worth looking for. */
function englishFragments(): { key: string; fragment: string }[] {
  const found: { key: string; fragment: string }[] = [];
  for (const [key, value] of Object.entries(OVERLAY_LABELS)) {
    for (const piece of value.split(/\{\w+\}/)) {
      const fragment = piece.replace(/[()/]/g, "").trim();
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

/** Fails, naming the key, when `root` shows or announces any English default of OVERLAY_LABELS. */
export function expectNoDefaultEnglish(root: ParentNode): void {
  const haystack = announcedText(root);
  const leaked = englishFragments()
    .filter(({ fragment }) => haystack.includes(fragment))
    .map(({ key, fragment }) => `${key}: "${fragment}"`);
  expect(leaked).toEqual([]);
}
