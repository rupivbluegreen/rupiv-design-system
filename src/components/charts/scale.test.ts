// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { barPath, clamp, finite, formatCompact, niceScale, round, sanitizeId, seriesColor } from "./scale";

describe("formatCompact", () => {
  it("writes small numbers whole and up to two decimals", () => {
    expect(formatCompact(950)).toBe("950");
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(0.25)).toBe("0.25");
    expect(formatCompact(12.5)).toBe("12.5");
  });

  it("uses K and M, never lakh or crore grouping", () => {
    expect(formatCompact(8400)).toBe("8.4K");
    expect(formatCompact(12600)).toBe("12.6K");
    expect(formatCompact(100000)).toBe("100K");
    expect(formatCompact(1234567)).toBe("1.2M");
    expect(formatCompact(12345678)).toBe("12.3M");
    expect(formatCompact(5000)).toBe("5K");
  });

  it("moves 999,950 up to millions instead of writing 1,000K", () => {
    expect(formatCompact(999950)).toBe("1M");
    expect(formatCompact(999400)).toBe("999.4K");
  });

  it("writes a negative number with a hyphen-minus and no lakh grouping", () => {
    expect(formatCompact(-3200)).toBe("-3.2K");
    expect(formatCompact(-12)).toBe("-12");
    expect(formatCompact(-0)).toBe("0");
  });

  it("gives the placeholder for a value that is not a number", () => {
    expect(formatCompact(Number.NaN)).toBe("-");
    expect(formatCompact(Number.POSITIVE_INFINITY)).toBe("-");
  });

  it("uses Western digits and en-US grouping in Arabic too, and the language's own words for the unit", () => {
    expect(formatCompact(12600, { locale: "ar" })).toBe("12.6K");
    expect(formatCompact(1234.5, { locale: "ar-SA" })).toBe("1.2K");
    expect(formatCompact(8400, { locale: "ar", thousand: (n) => `${n} ألف` })).toBe("8.4 ألف");
    expect(formatCompact(3500000, { locale: "ar", million: (n) => `${n} M!` })).toBe("3.5 M!");
  });
});

describe("niceScale", () => {
  it("rounds the domain out to nice ticks", () => {
    expect(niceScale(0, 52)).toEqual({ min: 0, max: 60, ticks: [0, 20, 40, 60] });
    expect(niceScale(-3, 5).ticks).toEqual([-4, -2, 0, 2, 4, 6]);
  });

  it("copes with a flat or empty domain", () => {
    expect(niceScale(0, 0).ticks.length).toBeGreaterThanOrEqual(2);
    expect(niceScale(5, 5).min).toBeLessThan(5);
    expect(niceScale(Number.NaN, Number.NaN).ticks.length).toBeGreaterThanOrEqual(2);
  });
});

describe("helpers", () => {
  it("round, clamp, finite, seriesColor, sanitizeId", () => {
    expect(round(1.23456)).toBe(1.23);
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(finite(3)).toBe(true);
    expect(finite(Number.NaN)).toBe(false);
    expect(finite(null)).toBe(false);
    expect(finite(undefined)).toBe(false);
    expect(seriesColor(0)).toBe("var(--chart-1)");
    expect(seriesColor(6)).toBe("var(--chart-1)");
    expect(seriesColor(2, "red")).toBe("red");
    expect(seriesColor(0, "chart-3")).toBe("var(--chart-3)");
    expect(seriesColor(0, "var(--chart-3)")).toBe("var(--chart-3)");
    expect(seriesColor(0, "chart-7")).toBe("chart-7");
    expect(sanitizeId(":r1:")).toBe("r1");
  });

  it("barPath rounds only the outer corners and draws nothing for an empty bar", () => {
    expect(barPath(0, 0, 0, 10, 3, "top")).toBe("");
    expect(barPath(0, 0, 10, 10, 3, "none")).toBe("M0 0H10V10H0Z");
    expect(barPath(0, 0, 10, 10, 3, "top")).toContain("Q");
    expect(barPath(0, 0, 10, 10, 3, "left")).toContain("Q");
  });
});

describe("the source of scale.ts", () => {
  const source = readFileSync(new URL("./scale.ts", import.meta.url), "utf8");

  it("names no locale of its own and has no lakh grouping", () => {
    expect(source).not.toMatch(/["'`]en-[A-Z]{2}["'`]/);
    expect(source).not.toMatch(/\bCr\b|\bLakh\b/);
  });

  it("has no invisible or look-alike characters: no non-breaking space, minus sign, ellipsis or direction mark", () => {
    const risky = new RegExp(String.raw`[\u{A0}\u{2212}\u{2026}\u{2014}\u{200B}-\u{200F}\u{2028}-\u{202E}\u{2060}\u{FEFF}\u{61C}]`, "u");
    expect(source).not.toMatch(risky);
  });

  it("guesses no character width", () => {
    expect(source).not.toMatch(/CHAR_WIDTH|textWidth|truncateLabel|widestLabel/);
  });
});
