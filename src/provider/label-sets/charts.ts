import type { LabelMap, LabelParams } from "../labels";

/**
 * English defaults for the charts components: LineChart, BarChart, DonutChart, Sparkline, HeatGrid, ChartLegend.
 * Keys are "<component>.<name>"; "chart.*" keys are shared by all of them.
 *
 * A summary is a function where it needs plural rules (Arabic has six forms) and its own word order, so an
 * application replaces the whole sentence. Numbers and value lists arrive already formatted for the language.
 * The parameters each label receives are listed in the comment above it.
 */

/** "1 point", "3 points". */
function count(n: number, one: string, many: string): string {
  return n === 1 ? `1 ${one}` : `${n} ${many}`;
}

const num = (params: LabelParams, name: string): number => Number(params[name]);
const text = (params: LabelParams, name: string): string => String(params[name]);

export const CHART_LABELS = {
  // Shared by every chart
  "chart.noData": "No data",
  // titled: title (the name the screen gave the chart), summary (the generated description)
  "chart.titled": "{title}. {summary}",
  // between the items of a list inside a sentence
  "chart.listSeparator": ", ",
  // compact numbers on an axis: n is already formatted, 12.6 gives "12.6K"
  "chart.compactThousand": "{n}K",
  "chart.compactMillion": "{n}M",

  // ChartLegend
  "chartLegend.label": "Legend",

  // LineChart. summary: series (names, joined), count, first, last, min, max
  "lineChart.summary": (params) =>
    `Line chart of ${text(params, "series")} across ${count(num(params, "count"), "point", "points")} from ${text(
      params,
      "first",
    )} to ${text(params, "last")}, values from ${text(params, "min")} to ${text(params, "max")}.`,
  // markers: the labels of the labelled vertical lines, joined
  "lineChart.markers": "Markers: {markers}.",
  "lineChart.band": "Likely range",
  "lineChart.bandValue": "{low} to {high}",

  // BarChart. summary: stacked (0 or 1), horizontal (0 or 1), categories, seriesCount, names (joined), min, max
  "barChart.summary": (params) => {
    const kind = `${num(params, "stacked") ? "Stacked" : "Grouped"} ${num(params, "horizontal") ? "horizontal " : ""}bar chart`;
    const series =
      num(params, "seriesCount") > 1
        ? ` and ${num(params, "seriesCount")} series (${text(params, "names")})`
        : ` for ${text(params, "names")}`;
    return `${kind} of ${count(num(params, "categories"), "category", "categories")}${series}, values from ${text(
      params,
      "min",
    )} to ${text(params, "max")}.`;
  },
  "barChart.total": "Total",

  // DonutChart. summary: total, items (each one built with donutChart.item, joined)
  "donutChart.summary": "Donut chart, total {total}: {items}.",
  "donutChart.item": "{label} {value} ({percent})",
  "donutChart.empty": "Donut chart, no data.",

  // Sparkline. summary: count, min, max, latest
  "sparkline.summary": (params) =>
    `Trend of ${count(num(params, "count"), "point", "points")}, low ${text(params, "min")}, high ${text(
      params,
      "max",
    )}, latest ${text(params, "latest")}.`,

  // HeatGrid. summary: rows, columns, min, max
  "heatGrid.summary": (params) =>
    `Heat grid of ${count(num(params, "rows"), "row", "rows")} by ${count(num(params, "columns"), "column", "columns")}, values ${text(
      params,
      "min",
    )} to ${text(params, "max")}.`,
  // the accessible name of one cell
  "heatGrid.cell": "{row}, {column}: {value}",
  // the same for a signed grid, where kind is one of the three words below
  "heatGrid.cellKind": "{row}, {column}: {value}, {kind}",
  "heatGrid.cellNoValue": "{row}, {column}: no value",
  "heatGrid.kindGap": "Gap",
  "heatGrid.kindSurplus": "Surplus",
  "heatGrid.kindOk": "Balanced",
} as const satisfies LabelMap;
