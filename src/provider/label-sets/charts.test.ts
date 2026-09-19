// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AR_CHART_LABELS } from "../../../test/chart-labels";
import { DEFAULT_LABELS, resolveLabel } from "../labels";
import { CHART_LABELS } from "./charts";

const chartsDir = path.join(import.meta.dirname, "../../components/charts");

/** The chart component sources, not their tests. */
function sources(): { name: string; text: string }[] {
  return readdirSync(chartsDir)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .map((name) => ({ name, text: readFileSync(path.join(chartsDir, name), "utf8") }));
}

/** Every "component.name" key the sources ask the label function for. */
function keysUsed(): Set<string> {
  const found = new Set<string>();
  for (const { text } of sources()) {
    for (const match of text.matchAll(/\b(?:t|label)\(\s*"([A-Za-z]+\.[A-Za-z]+)"/g)) if (match[1]) found.add(match[1]);
  }
  return found;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("CHART_LABELS", () => {
  it("has English defaults keyed '<component>.<name>', all in DEFAULT_LABELS", () => {
    for (const [key, value] of Object.entries(CHART_LABELS)) {
      expect(key).toMatch(/^[a-z][A-Za-z]*\.[a-z][A-Za-z]*$/);
      expect(DEFAULT_LABELS[key]).toBe(value);
    }
  });

  it("only uses the charts as key prefixes", () => {
    const prefixes = new Set(Object.keys(CHART_LABELS).map((key) => key.split(".")[0]));
    expect([...prefixes].sort()).toEqual(["barChart", "chart", "chartLegend", "donutChart", "heatGrid", "lineChart", "sparkline"]);
  });

  it("has every key the chart sources ask for (an unknown key would show on screen as the key itself)", () => {
    const known = new Set(Object.keys(CHART_LABELS));
    expect([...keysUsed()].filter((key) => !known.has(key))).toEqual([]);
  });

  it("has no key that no chart source uses", () => {
    const used = keysUsed();
    expect(Object.keys(CHART_LABELS).filter((key) => !used.has(key))).toEqual([]);
  });

  it("has a stand-in Arabic label for every key, and none extra, with the same placeholders", () => {
    expect(Object.keys(AR_CHART_LABELS).sort()).toEqual(Object.keys(CHART_LABELS).sort());
    for (const [key, english] of Object.entries(CHART_LABELS)) {
      const arabic = AR_CHART_LABELS[key as keyof typeof AR_CHART_LABELS];
      expect(typeof arabic).toBe(typeof english);
      if (typeof english === "string" && typeof arabic === "string") expect(placeholders(arabic)).toEqual(placeholders(english));
    }
  });

  it("writes summaries as functions, because they need plural rules", () => {
    for (const key of ["lineChart.summary", "barChart.summary", "sparkline.summary", "heatGrid.summary"] as const) {
      expect(typeof CHART_LABELS[key]).toBe("function");
    }
  });

  it("makes the plural summaries agree with their counts in English", () => {
    const one = { series: "S", count: 1, first: "a", last: "b", min: "0", max: "1", latest: "1", rows: 1, columns: 1, categories: 1, seriesCount: 1, names: "S", stacked: 0, horizontal: 0 };
    const many = { ...one, count: 4, rows: 4, columns: 4, categories: 4, seriesCount: 4 };
    expect(resolveLabel({}, "lineChart.summary", one)).toContain("1 point");
    expect(resolveLabel({}, "lineChart.summary", many)).toContain("4 points");
    expect(resolveLabel({}, "sparkline.summary", one)).toContain("1 point,");
    expect(resolveLabel({}, "heatGrid.summary", one)).toContain("1 row by 1 column");
    expect(resolveLabel({}, "heatGrid.summary", many)).toContain("4 rows by 4 columns");
    expect(resolveLabel({}, "barChart.summary", one)).toContain("1 category for S");
    expect(resolveLabel({}, "barChart.summary", many)).toContain("4 categories and 4 series (S)");
  });

  it("lets an application replace any of them, and falls back to English for the rest", () => {
    expect(resolveLabel({ "chart.noData": "Nothing" }, "chart.noData")).toBe("Nothing");
    expect(resolveLabel({ "chart.noData": "Nothing" }, "lineChart.band")).toBe("Likely range");
  });
});
