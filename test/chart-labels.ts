// Shared by the tests of the charts (LineChart, BarChart, DonutChart, Sparkline, HeatGrid, ChartLegend).
//
// AR_CHART_LABELS is a stand-in Arabic label set, one entry per key of CHART_LABELS (the compiler checks that none is
// missing). It is a first draft that proves the mechanism, not reviewed Arabic: the application supplies the real
// text. expectNoChartEnglish(container) then proves that a chart given these labels renders none of the English
// defaults, neither as visible text nor in an attribute a screen reader announces.
import { expect } from "vitest";
import { CHART_LABELS } from "../src/provider/label-sets/charts";
import type { LabelParams, LabelValue } from "../src/provider";
import { announcedText } from "./data-labels";

/** Arabic has six plural forms; each of these picks the one for n (1, 2, 3 to 10, 11 and up). */
function points(n: number): string {
  if (n === 1) return "نقطة واحدة";
  if (n === 2) return "نقطتين";
  if (n >= 3 && n <= 10) return `${n} نقاط`;
  return `${n} نقطة`;
}

function rowsOf(n: number): string {
  if (n === 1) return "صف واحد";
  if (n === 2) return "صفين";
  if (n >= 3 && n <= 10) return `${n} صفوف`;
  return `${n} صفاً`;
}

function columnsOf(n: number): string {
  if (n === 1) return "عمود واحد";
  if (n === 2) return "عمودين";
  if (n >= 3 && n <= 10) return `${n} أعمدة`;
  return `${n} عموداً`;
}

function categoriesOf(n: number): string {
  if (n === 1) return "فئة واحدة";
  if (n === 2) return "فئتين";
  if (n >= 3 && n <= 10) return `${n} فئات`;
  return `${n} فئة`;
}

const num = (params: LabelParams, name: string): number => Number(params[name]);
const text = (params: LabelParams, name: string): string => String(params[name]);

export const AR_CHART_LABELS = {
  "chart.noData": "لا توجد بيانات",
  "chart.titled": "{title}. {summary}",
  "chart.listSeparator": "، ",
  "chart.compactThousand": "{n} ألف",
  "chart.compactMillion": "{n} مليون",

  "chartLegend.label": "مفتاح الرسم",

  "lineChart.summary": (p) =>
    `رسم خطي لـ ${text(p, "series")} عبر ${points(num(p, "count"))} من ${text(p, "first")} إلى ${text(p, "last")}، القيم من ${text(p, "min")} إلى ${text(p, "max")}.`,
  "lineChart.markers": "العلامات: {markers}.",
  "lineChart.band": "النطاق المرجح",
  "lineChart.bandValue": "من {low} إلى {high}",

  "barChart.summary": (p) => {
    const kind = `${num(p, "horizontal") ? "مخطط أعمدة أفقي" : "مخطط أعمدة"} ${num(p, "stacked") ? "متراكم" : "مجمّع"}`;
    const series =
      num(p, "seriesCount") > 1 ? ` و${num(p, "seriesCount")} سلاسل (${text(p, "names")})` : ` لـ ${text(p, "names")}`;
    return `${kind} من ${categoriesOf(num(p, "categories"))}${series}، القيم من ${text(p, "min")} إلى ${text(p, "max")}.`;
  },
  "barChart.total": "الإجمالي",

  "donutChart.summary": "رسم حلقي، الإجمالي {total}: {items}.",
  "donutChart.item": "{label} {value} ({percent})",
  "donutChart.empty": "رسم حلقي، لا توجد بيانات.",

  "sparkline.summary": (p) =>
    `اتجاه من ${points(num(p, "count"))}، الأدنى ${text(p, "min")}، الأعلى ${text(p, "max")}، الأحدث ${text(p, "latest")}.`,

  "heatGrid.summary": (p) =>
    `خريطة حرارية من ${rowsOf(num(p, "rows"))} و${columnsOf(num(p, "columns"))}، القيم ${text(p, "min")} إلى ${text(p, "max")}.`,
  "heatGrid.cell": "{row}، {column}: {value}",
  "heatGrid.cellKind": "{row}، {column}: {value}، {kind}",
  "heatGrid.cellNoValue": "{row}، {column}: لا توجد قيمة",
  "heatGrid.kindGap": "فجوة",
  "heatGrid.kindSurplus": "فائض",
  "heatGrid.kindOk": "متوازن",
} as const satisfies Record<keyof typeof CHART_LABELS, LabelValue>;

/** Parameters that make every function label of the English set print all of its words, once with each plural. */
const SAMPLES: readonly LabelParams[] = [
  {
    series: "@@s@@",
    names: "@@s@@",
    first: "@@s@@",
    last: "@@s@@",
    min: "@@s@@",
    max: "@@s@@",
    latest: "@@s@@",
    count: 3,
    rows: 3,
    columns: 3,
    categories: 3,
    seriesCount: 3,
    stacked: 1,
    horizontal: 1,
  },
  {
    series: "@@s@@",
    names: "@@s@@",
    first: "@@s@@",
    last: "@@s@@",
    min: "@@s@@",
    max: "@@s@@",
    latest: "@@s@@",
    count: 1,
    rows: 1,
    columns: 1,
    categories: 1,
    seriesCount: 1,
    stacked: 0,
    horizontal: 0,
  },
];

/** Every run of English words (four or more letters) in the English label set, so a test can look for them. */
function englishFragments(): { key: string; fragment: string }[] {
  const found: { key: string; fragment: string }[] = [];
  const add = (key: string, template: string) => {
    for (const piece of template.split(/\{\w+\}|@@s@@|\d+/)) {
      const fragment = piece.replace(/[()/.,:]/g, "").trim();
      if (fragment.replace(/[^A-Za-z]/g, "").length >= 4) found.push({ key, fragment });
    }
  };
  for (const [key, value] of Object.entries(CHART_LABELS) as [string, LabelValue][]) {
    if (typeof value === "string") add(key, value);
    else for (const sample of SAMPLES) add(key, value(sample));
  }
  return found;
}

/** Fails, naming the key, when `root` shows or announces any English default of CHART_LABELS. */
export function expectNoChartEnglish(root: ParentNode): void {
  const haystack = announcedText(root);
  const leaked = englishFragments()
    .filter(({ fragment }) => haystack.includes(fragment))
    .map(({ key, fragment }) => `${key}: "${fragment}"`);
  expect(leaked).toEqual([]);
}

/** Proves the helper itself can fail: the English text of a default label is found in English output. */
export function englishFragmentsOf(key: keyof typeof CHART_LABELS): string[] {
  return englishFragments()
    .filter((entry) => entry.key === key)
    .map((entry) => entry.fragment);
}
