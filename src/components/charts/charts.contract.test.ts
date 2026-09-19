// @vitest-environment node
//
// Contract between the TSX and the CSS Modules of the charts, and the rules the right-to-left behaviour depends on.
// Under Vitest a CSS Module answers every class name with `_<name>_<hash>`, so a class the CSS does not define would
// pass every rendering test and only show up in the browser as a missing style. jsdom also cannot run the CSS, so the
// declarations that keep a plot left to right are read here from the stylesheets.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dir = import.meta.dirname;

const files = readdirSync(dir);
const sourceNames = files.filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name));
const cssNames = files.filter((name) => name.endsWith(".module.css"));

const read = (name: string) => readFileSync(path.join(dir, name), "utf8");
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every class name the CSS defines or mentions in a selector. */
function definedClasses(css: string): Set<string> {
  const found = new Set<string>();
  for (const match of stripComments(css).matchAll(/\.([A-Za-z_][\w-]*)/g)) if (match[1]) found.add(match[1]);
  return found;
}

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(stripComments(css));
  if (!match) throw new Error(`no rule for ${selector}`);
  return match[1] ?? "";
}

describe("every styles.name in a chart source is a class of its stylesheet", () => {
  const pairs = [
    ["bar-chart.tsx", "chart.module.css"],
    ["line-chart.tsx", "chart.module.css"],
    ["text-measure.tsx", "chart.module.css"],
    ["chart-legend.tsx", "chart-legend.module.css"],
    ["chart-tooltip.tsx", "chart-tooltip.module.css"],
    ["donut-chart.tsx", "donut-chart.module.css"],
    ["heat-grid.tsx", "heat-grid.module.css"],
    ["sparkline.tsx", "sparkline.module.css"],
  ] as const;

  it.each(pairs)("%s uses only classes of %s", (source, sheet) => {
    const defined = definedClasses(read(sheet));
    const used = new Set([...read(source).matchAll(/\bstyles\.([A-Za-z_]\w*)/g)].map((match) => match[1]));
    expect([...used].filter((name) => name !== undefined && !defined.has(name))).toEqual([]);
  });

  it("covers every stylesheet", () => {
    expect(new Set(pairs.map(([, sheet]) => sheet))).toEqual(new Set(cssNames));
  });
});

describe("the plot stays left to right", () => {
  it("has direction: ltr on the plot, the ring, the sparkline, the scrolling grid and the tooltip layer", () => {
    expect(rule(read("chart.module.css"), ".plot")).toMatch(/direction:\s*ltr/);
    expect(rule(read("donut-chart.module.css"), ".chart")).toMatch(/direction:\s*ltr/);
    expect(rule(read("sparkline.module.css"), ".svg")).toMatch(/direction:\s*ltr/);
    expect(rule(read("heat-grid.module.css"), ".scroll")).toMatch(/direction:\s*ltr/);
    expect(rule(read("chart-tooltip.module.css"), ".layer")).toMatch(/direction:\s*ltr/);
  });

  it("does not force a direction on the legend, the row names, the chart root or the tooltip's words", () => {
    // `direction:` on its own, not `flex-direction:`
    const forced = /(^|[\s;{])direction\s*:/;
    expect(stripComments(read("chart-legend.module.css"))).not.toMatch(forced);
    expect(rule(read("chart.module.css"), ".root")).not.toMatch(forced);
    expect(rule(read("heat-grid.module.css"), ".root")).not.toMatch(forced);
    expect(rule(read("heat-grid.module.css"), ".rowHead")).not.toMatch(forced);
    expect(rule(read("chart-tooltip.module.css"), ".content")).not.toMatch(forced);
  });

  it("scrolls the grid sideways only, and keeps the row names in a column of their own next to it", () => {
    const css = read("heat-grid.module.css");
    expect(rule(css, ".scroll")).toMatch(/overflow:\s*auto hidden/);
    expect(rule(css, ".root")).toMatch(/grid-template-columns:\s*max-content minmax\(0, 1fr\)/);
    expect(stripComments(css)).not.toMatch(/position:\s*sticky/); // outside the scrolling box, so nothing to stick
  });

  it("writes no physical horizontal position or slide", () => {
    for (const name of cssNames) {
      const css = stripComments(read(name));
      expect(css, name).not.toMatch(/(^|[\s;{])(left|right)\s*:/);
      expect(css, name).not.toMatch(/translateX\(/);
      expect(css, name).not.toMatch(/margin-(left|right)|padding-(left|right)|border-(left|right)|text-align:\s*(left|right)/);
    }
  });
});

describe("the sources", () => {
  it.each(sourceNames)("%s has no literal words in aria-label, title, placeholder or a text node, and no fixed locale", (name) => {
    const source = read(name);
    expect(source).not.toMatch(/\b(aria-label|aria-description|aria-roledescription|title|placeholder)="[^"]*[A-Za-z]/);
    expect(source).not.toMatch(/["'`]en-[A-Z]{2}["'`]/);
    // the English defaults live in the label set, nowhere else
    expect(source).not.toMatch(/["'`>]\s*(No data|Total|Likely range|Sparkline|Legend|Donut chart|Line chart|Heat grid)\s*["'`<]/);
  });

  it.each([...sourceNames, ...cssNames])("%s has no invisible or look-alike characters in its code", (name) => {
    const risky = new RegExp(String.raw`[\u{A0}\u{2212}\u{200B}-\u{200F}\u{2028}-\u{202E}\u{2060}\u{FEFF}\u{61C}]`, "u");
    expect(read(name)).not.toMatch(risky);
  });

  it("guesses no character width and formats no lakh grouping", () => {
    for (const name of sourceNames.filter((n) => n !== "text-measure.tsx")) {
      expect(read(name), name).not.toMatch(/CHAR_WIDTH|textWidth\(|truncateLabel|widestLabel|labelEvery|\b6\.[25]\b/);
    }
    expect(read("text-measure.tsx").match(/ESTIMATED_CHAR_WIDTH = /g)).toHaveLength(1);
  });

  it("exports every chart and the shared types from the index", () => {
    const index = read("index.ts");
    for (const name of ["Sparkline", "BarChart", "LineChart", "DonutChart", "HeatGrid", "ChartLegend"]) {
      expect(index).toContain(`export { ${name} }`);
    }
    for (const type of ["LineBand", "LineMarker", "LineSeries", "HeatCell", "HeatKind", "TextMeasure"]) expect(index).toContain(type);
  });
});
