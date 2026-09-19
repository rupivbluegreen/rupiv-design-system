// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as format from "./format";
import {
  NO_VALUE,
  formatDate,
  formatDateTime,
  formatDelta,
  formatHijriDate,
  formatMinutesSeconds,
  formatNumber,
  formatPercent,
  formatTime,
  initials,
  int,
  num,
  pct,
} from "./format";

// U+0660..0669 and U+06F0..06F9 (Arabic-Indic digits), U+066A..066C (Arabic percent sign and separators).
const ARABIC_DIGITS = /[\u{0660}-\u{0669}\u{06F0}-\u{06F9}]/u;
const ARABIC_SYMBOLS = /[\u{066A}-\u{066C}]/u;
const BIDI_MARKS = /[\u{200E}\u{200F}\u{061C}]/u;

// The five formatter tests of the temporary A0 helper (its own format.test.ts), unchanged in what they assert.
// They import from "./format" as that test does, so the application can delete its helper and point them here.
describe("A0 formatter tests, ported (same names, same results)", () => {
  it("uses Riyadh time, not UTC", () => {
    // 21:30 UTC on 6 Sep is 00:30 on 7 Sep in Riyadh.
    expect(formatTime("2026-09-06T21:30:00Z", "en")).toBe("00:30");
    expect(formatDate("2026-09-06T21:30:00Z", "en", "short")).toBe("07/09/2026");
  });

  it("keeps Western digits in Arabic", () => {
    expect(formatTime("2026-09-06T09:05:00+03:00", "ar")).toBe("09:05");
    expect(formatDate("2026-09-06T12:00:00+03:00", "ar")).toMatch(/2026/);
    expect(formatNumber(1486, "ar")).toMatch(/1.?486/);
    expect(formatNumber(1486, "ar")).not.toMatch(/[\u{0660}-\u{0669}]/u);
  });

  it("formats Gregorian dates in both languages", () => {
    expect(formatDate("2026-09-06T12:00:00+03:00", "en")).toMatch(/6 .* 2026/);
    expect(formatDateTime("2026-09-06T12:00:00+03:00", "en")).toMatch(/12:00$/);
  });

  it("supports Hijri (Umm al-Qura) dates", () => {
    expect(formatHijriDate("2026-09-06T12:00:00+03:00", "en")).toMatch(/1448/);
    expect(formatHijriDate("2026-09-06T12:00:00+03:00", "ar")).toMatch(/1448/);
  });

  it("formats percentages and durations", () => {
    expect(formatPercent(0.91, "en")).toBe("91%");
    expect(formatMinutesSeconds(144)).toBe("2:24");
    expect(formatMinutesSeconds(-5)).toBe("0:00");
  });
});

describe("the ./format entry point", () => {
  it("re-exports the date functions and the locale helpers next to the number functions", () => {
    for (const name of [
      "num",
      "int",
      "pct",
      "time",
      "duration",
      "date",
      "dateBoth",
      "toInstant",
      "formatDate",
      "formatTime",
      "formatDateTime",
      "formatHijriDate",
      "formatNumber",
      "formatPercent",
      "formatMinutesSeconds",
      "formatDelta",
      "initials",
      "resolveFormatLocale",
      "stripBidiMarks",
    ]) {
      expect(typeof (format as Record<string, unknown>)[name], name).toBe("function");
    }
    expect(format.NO_VALUE).toBe("-");
    expect(format.TIME_ZONE).toBe("Asia/Riyadh");
  });

  it("no longer exports the ERP helpers or the mock date", () => {
    for (const name of [
      "formatINR",
      "formatINRCompact",
      "formatQty",
      "formatQtyCompact",
      "formatMoney",
      "formatMoneyCompact",
      "formatRate",
      "formatMetres",
      "formatKg",
      "formatWidth",
      "formatUnits",
      "formatDateDotted",
      "formatDateNumeric",
      "formatDateShort",
      "formatDue",
      "formatRelativeDays",
      "daysBetween",
      "TODAY",
      "FINANCIAL_YEAR",
    ]) {
      expect(name in format, name).toBe(false);
    }
  });
});

describe("num", () => {
  it("groups thousands and shows at most one decimal, as the kit does", () => {
    expect(num(0)).toBe("0");
    expect(num(7)).toBe("7");
    expect(num(999)).toBe("999");
    expect(num(1000)).toBe("1,000");
    expect(num(1234.5)).toBe("1,234.5");
    expect(num(1234.56)).toBe("1,234.6");
    expect(num(1234567.89)).toBe("1,234,567.9");
  });

  it("shows exactly `digits` decimals when given", () => {
    expect(num(1234.5, 2)).toBe("1,234.50");
    expect(num(3, 1)).toBe("3.0");
    expect(num(1234.567, 0)).toBe("1,235");
    expect(num(0.125, 2)).toBe("0.13");
  });

  it("rounds half away from zero on the decimal value", () => {
    expect(num(2.25)).toBe("2.3");
    expect(num(2.35)).toBe("2.4");
    expect(num(-2.25)).toBe("-2.3");
    expect(num(0.04)).toBe("0");
    expect(num(0.05)).toBe("0.1");
    expect(num(2.5, 0)).toBe("3");
    expect(num(-2.5, 0)).toBe("-3");
    expect(num(1.005, 2)).toBe("1.01");
  });

  it("writes negative numbers with a hyphen-minus", () => {
    expect(num(-1234.5)).toBe("-1,234.5");
    expect(num(-7)).toBe("-7");
  });

  it("never writes a negative zero, even when the number rounds to zero", () => {
    expect(num(-0)).toBe("0");
    expect(num(-0.04)).toBe("0");
    expect(num(-0.4, 0)).toBe("0");
    expect(num(-0.001, 2)).toBe("0.00");
  });

  it("gives NO_VALUE for null, undefined, NaN and Infinity", () => {
    for (const bad of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(num(bad)).toBe(NO_VALUE);
      expect(num(bad, 2)).toBe(NO_VALUE);
    }
  });

  it("clamps a wild `digits` instead of throwing, and ignores NaN", () => {
    expect(num(1.5, -3)).toBe("2");
    expect(num(1.5, Number.NaN)).toBe("1.5");
    expect(num(1.5, 2.9)).toBe("1.50");
    expect(num(1.5, 500)).toMatch(/^1\.5(0{19})$/);
  });

  it("is the same in English and Arabic: Western digits, en-US separators, no direction marks", () => {
    for (const locale of ["en", "ar", "ar-SA", "fr", undefined]) {
      expect(num(1234567.5, 1, locale)).toBe("1,234,567.5");
      expect(num(-1234.5, 1, locale)).toBe("-1,234.5");
    }
    for (const value of [num(-1234.5, 1, "ar"), int(9876543, "ar"), pct(-45.5, 1, "ar")]) {
      expect(value).not.toMatch(ARABIC_DIGITS);
      expect(value).not.toMatch(ARABIC_SYMBOLS);
      expect(value).not.toMatch(BIDI_MARKS);
    }
  });
});

describe("int", () => {
  it("is a whole number with grouping", () => {
    expect(int(0)).toBe("0");
    expect(int(1234.4)).toBe("1,234");
    expect(int(1234.5)).toBe("1,235");
    expect(int(-1234.5)).toBe("-1,235");
    expect(int(1234567)).toBe("1,234,567");
  });

  it("gives NO_VALUE for missing and non-finite input, and never -0", () => {
    for (const bad of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(int(bad)).toBe(NO_VALUE);
    }
    expect(int(-0.4)).toBe("0");
    expect(int(-0)).toBe("0");
  });
});

describe("pct", () => {
  it("takes a value already in percent and adds the ASCII percent sign", () => {
    expect(pct(91)).toBe("91%");
    expect(pct(0)).toBe("0%");
    expect(pct(100)).toBe("100%");
    expect(pct(12.34, 1)).toBe("12.3%");
    expect(pct(12, 1)).toBe("12.0%");
    expect(pct(1234.5, 1)).toBe("1,234.5%");
  });

  it("rounds to `digits` (0 by default) and handles negatives", () => {
    expect(pct(91.5)).toBe("92%");
    expect(pct(-4.6)).toBe("-5%");
    expect(pct(-0.2)).toBe("0%");
  });

  it("uses U+0025, never the Arabic percent sign, in Arabic", () => {
    const text = pct(91, 0, "ar");
    expect(text).toBe("91%");
    expect(text).not.toContain("\u{066A}");
    expect(text).not.toMatch(BIDI_MARKS);
    expect(pct(45.5, 1, "ar")).toBe("45.5%");
    expect(pct(-45.5, 1, "ar")).toBe("-45.5%");
  });

  it("gives NO_VALUE, not '-%', for missing input", () => {
    for (const bad of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(pct(bad)).toBe(NO_VALUE);
      expect(pct(bad, 1, "ar")).toBe(NO_VALUE);
    }
  });
});

describe("formatNumber", () => {
  it("is Intl-style: at most 3 decimals unless options say otherwise", () => {
    expect(formatNumber(1486)).toBe("1,486");
    expect(formatNumber(1.23456)).toBe("1.235");
    expect(formatNumber(1486, "ar", { minimumFractionDigits: 2 })).toBe("1,486.00");
    expect(formatNumber(1486.5, "en", { maximumFractionDigits: 0 })).toBe("1,487");
  });

  it("keeps Western digits and en-US grouping in Arabic, with no direction marks", () => {
    expect(formatNumber(-1486.5, "ar")).toBe("-1,486.5");
    expect(formatNumber(1486.5, "ar-SA")).toBe("1,486.5");
    expect(formatNumber(-1486.5, "ar")).not.toMatch(BIDI_MARKS);
  });

  it("gives NO_VALUE for missing and non-finite input", () => {
    for (const bad of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(formatNumber(bad, "ar")).toBe(NO_VALUE);
    }
  });

  it("lets the caller's options win over the default sign display", () => {
    expect(formatNumber(5, "en", { signDisplay: "always" })).toBe("+5");
  });
});

describe("formatPercent (ratio to percent)", () => {
  it("multiplies a ratio by 100", () => {
    expect(formatPercent(0.91)).toBe("91%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(1.5)).toBe("150%");
    expect(formatPercent(0.9123, "en", 1)).toBe("91.2%");
    expect(formatPercent(0.285)).toBe("29%");
    expect(formatPercent(-0.004)).toBe("0%");
    expect(formatPercent(-0.0912, "en", 1)).toBe("-9.1%");
  });

  it("uses the ASCII percent sign in Arabic (Intl alone gives the Arabic one)", () => {
    expect(formatPercent(0.91, "ar")).toBe("91%");
    expect(formatPercent(0.91, "ar")).not.toMatch(ARABIC_SYMBOLS);
    expect(formatPercent(0.9123, "ar-SA", 1)).toBe("91.2%");
  });

  it("gives NO_VALUE for missing and non-finite input", () => {
    for (const bad of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(formatPercent(bad, "ar")).toBe(NO_VALUE);
    }
  });
});

describe("formatDelta", () => {
  it("signs the change and keeps at most `decimals` decimals", () => {
    expect(formatDelta(12.4)).toBe("+12.4%");
    expect(formatDelta(12)).toBe("+12%");
    expect(formatDelta(12.345, 2)).toBe("+12.35%");
    expect(formatDelta(12.6, 0)).toBe("+13%");
    expect(formatDelta(1234.5)).toBe("+1,234.5%");
  });

  it("uses a true minus sign (U+2212) for a fall, and no sign for zero", () => {
    expect(formatDelta(-3.1)).toBe("\u{2212}3.1%");
    expect(formatDelta(-3.1)).not.toContain("-");
    expect(formatDelta(0)).toBe("0%");
    expect(formatDelta(-0)).toBe("0%");
  });

  it("is the same in Arabic and never shows the Arabic percent sign", () => {
    expect(formatDelta(12.4, 1, "ar")).toBe("+12.4%");
    expect(formatDelta(-3.1, 1, "ar")).toBe("\u{2212}3.1%");
    expect(formatDelta(-3.1, 1, "ar")).not.toMatch(ARABIC_SYMBOLS);
  });

  it("gives NO_VALUE for missing and non-finite input", () => {
    for (const bad of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(formatDelta(bad)).toBe(NO_VALUE);
    }
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words, upper-cased", () => {
    expect(initials("Ravi Shah")).toBe("RS");
    expect(initials("  ravi   shah kumar ")).toBe("RS");
    expect(initials("ravi")).toBe("R");
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
  });

  it("works for Arabic names and for characters outside the Basic Multilingual Plane", () => {
    expect(initials("محمد علي")).toBe("مع");
    expect(initials("\u{20BB7}\u{91CE} \u{5BB6}")).toBe("\u{20BB7}\u{5BB6}");
  });
});
