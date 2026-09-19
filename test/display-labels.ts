// Shared by the tests of the display components (Alert, AvatarGroup, Tag, Stepper, Skeleton, DescriptionList).
//
// AR_DISPLAY_LABELS is a stand-in Arabic label set, one entry per key of DISPLAY_LABELS (the compiler checks that none
// is missing). It is a first draft that proves the mechanism, not reviewed Arabic: the application supplies the real
// text. expectNoDefaultEnglish(container) then proves that a component given these labels renders none of the English
// defaults, neither as visible text nor in an attribute a screen reader announces.
import { expect } from "vitest";
import { DISPLAY_LABELS } from "../src/provider/label-sets/display";
import type { LabelValue } from "../src/provider";

/** Arabic has six plural forms; this picks the one for n people (1, 2, 3 to 10, 11 and up). */
function others(n: number): string {
  if (n === 1) return "شخص آخر";
  if (n === 2) return "شخصان آخران";
  if (n >= 3 && n <= 10) return `${n} أشخاص آخرين`;
  return `${n} شخصاً آخر`;
}

export const AR_DISPLAY_LABELS = {
  "alert.dismiss": "إغلاق التنبيه",
  "avatar.more": ({ n }) => others(Number(n)),
  "tag.remove": "إزالة {name}",
  "tag.removeGeneric": "إزالة",
  "stepper.completed": "(مكتملة)",
  "skeleton.loading": "جارٍ التحميل",
  "descriptionList.empty": "غير محدد",
} as const satisfies Record<keyof typeof DISPLAY_LABELS, LabelValue>;

/** Splits an English template at its {placeholders}; only pieces of four or more letters are worth looking for. */
function englishFragments(): { key: string; fragment: string }[] {
  const found: { key: string; fragment: string }[] = [];
  for (const [key, value] of Object.entries(DISPLAY_LABELS)) {
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

/** Fails, naming the key, when `root` shows or announces any English default of DISPLAY_LABELS. */
export function expectNoDefaultEnglish(root: ParentNode): void {
  const haystack = announcedText(root);
  const leaked = englishFragments()
    .filter(({ fragment }) => haystack.includes(fragment))
    .map(({ key, fragment }) => `${key}: "${fragment}"`);
  expect(leaked).toEqual([]);
}
