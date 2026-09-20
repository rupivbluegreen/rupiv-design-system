// Shared by the tests of the data and form components (DataTable, Pagination, FilterBar, FileDrop, FormFooter,
// QuantityInput, SearchInput, Field, Breadcrumbs, PageHeader).
//
// AR_DATA_LABELS is a stand-in Arabic label set, one entry per key of DATA_LABELS (the compiler checks that none is
// missing). It is a first draft that proves the mechanism, not reviewed Arabic: the application supplies the real text.
// expectNoDefaultEnglish(container) then proves that a component given these labels renders none of the English
// defaults, neither as visible text nor in an attribute a screen reader announces.
import { expect } from "vitest";
import { DATA_LABELS } from "../src/provider/label-sets/data";
import type { LabelValue } from "../src/provider";

/** Arabic has six plural forms; this picks the one for n (0, 1, 2, 3 to 10, 11 to 99, 100 and up). */
function rows(n: number): string {
  if (n === 1) return "صف واحد";
  if (n === 2) return "صفان";
  if (n >= 3 && n <= 10) return `${n} صفوف`;
  return `${n} صفاً`;
}

export const AR_DATA_LABELS = {
  "dataTable.bulkActions": "إجراءات جماعية",
  "dataTable.selectAllRows": "تحديد كل الصفوف في هذه الصفحة",
  "dataTable.deselectAllRows": "إلغاء تحديد كل الصفوف في هذه الصفحة",
  "dataTable.selectedCount": ({ n }) => `تم تحديد ${rows(Number(n))}`,
  "dataTable.clearSelection": "مسح التحديد",
  "dataTable.selectRow": "تحديد الصف {id}",
  "dataTable.emptyTitle": "لا توجد سجلات",
  "dataTable.emptyDescription": "جرّب تعديل البحث أو عوامل التصفية.",

  "pagination.label": "ترقيم الصفحات",
  "pagination.range": "{from} إلى {to} من {total}",
  "pagination.pageOf": "الصفحة {page} من {pages}",
  "pagination.compact": "{page} / {pages}",
  "pagination.pageSize": "عدد الصفوف في الصفحة",
  "pagination.previous": "الصفحة السابقة",
  "pagination.next": "الصفحة التالية",
  "pagination.goToPage": "الانتقال إلى الصفحة {page}",

  "filterBar.filteredBy": "التصفية حسب",
  "filterBar.removeFilter": "إزالة عامل التصفية {label}",
  "filterBar.clearAll": "مسح الكل",
  "filterBar.clearFilter": "إزالة التصفية",

  "fileDrop.dropToUpload": "أفلت الملف للرفع",
  "fileDrop.promptOne": "اسحب ملفاً إلى هنا أو",
  "fileDrop.promptMany": "اسحب الملفات إلى هنا أو",
  "fileDrop.browse": "تصفّح",
  "fileDrop.selectedFiles": "الملفات المحددة",
  "fileDrop.remove": "إزالة {name}",
  "fileDrop.sizeBytes": "{size} بايت",
  "fileDrop.sizeKb": "{size} كيلوبايت",
  "fileDrop.sizeMb": "{size} ميغابايت",
  "fileDrop.rejectType": "{name} ليس نوع ملف مقبولاً.",
  "fileDrop.rejectSize": "حجم {name} يتجاوز {max}.",
  "fileDrop.dismiss": "إغلاق الرسالة",

  "formFooter.label": "إجراءات النموذج",
  "formFooter.unsaved": "تغييرات غير محفوظة",
  "formFooter.clean": "لا توجد تغييرات غير محفوظة",

  "quantityInput.decrease": "إنقاص الكمية",
  "quantityInput.increase": "زيادة الكمية",

  "searchInput.placeholder": "بحث",
  "searchInput.clear": "مسح البحث",

  "field.optional": "(اختياري)",

  "breadcrumbs.label": "مسار التنقل",
  "pageHeader.back": "رجوع",
} as const satisfies Record<keyof typeof DATA_LABELS, LabelValue>;

/** Splits an English template at its {placeholders}; only pieces of four or more letters are worth looking for. */
function englishFragments(): { key: string; fragment: string }[] {
  const found: { key: string; fragment: string }[] = [];
  for (const [key, value] of Object.entries(DATA_LABELS)) {
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

/** Fails, naming the key, when `root` shows or announces any English default of DATA_LABELS. */
export function expectNoDefaultEnglish(root: ParentNode): void {
  const haystack = announcedText(root);
  const leaked = englishFragments()
    .filter(({ fragment }) => haystack.includes(fragment))
    .map(({ key, fragment }) => `${key}: "${fragment}"`);
  expect(leaked).toEqual([]);
}
