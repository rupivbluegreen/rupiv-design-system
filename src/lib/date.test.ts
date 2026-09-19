// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  NO_VALUE,
  TIME_ZONE,
  date,
  dateBoth,
  duration,
  formatDate,
  formatDateTime,
  formatHijriDate,
  formatMinutesSeconds,
  formatTime,
  resolveFormatLocale,
  stripBidiMarks,
  time,
  toInstant,
} from "./format";

const BIDI = /[\u200E\u200F\u061C]/;
const ARABIC_INDIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/;

describe("locale helpers", () => {
  it("resolves any tag to English or Arabic", () => {
    expect(resolveFormatLocale("ar")).toBe("ar");
    expect(resolveFormatLocale("ar-SA")).toBe("ar");
    expect(resolveFormatLocale("AR_sa")).toBe("ar");
    expect(resolveFormatLocale("en")).toBe("en");
    expect(resolveFormatLocale("en-GB")).toBe("en");
    expect(resolveFormatLocale("fr")).toBe("en");
    expect(resolveFormatLocale("")).toBe("en");
    expect(resolveFormatLocale(undefined)).toBe("en");
    expect(resolveFormatLocale(null)).toBe("en");
  });

  it("removes exactly the left-to-right, right-to-left and Arabic letter marks", () => {
    expect(stripBidiMarks("6\u200F/9\u200F/2026")).toBe("6/9/2026");
    expect(stripBidiMarks("\u200E-1\u061C5\u200F")).toBe("-15");
    expect(stripBidiMarks("a b\u00A0c")).toBe("a b\u00A0c");
  });

  it("uses a hyphen-minus for a missing value, as the mockup kit does", () => {
    expect(NO_VALUE).toBe("-");
    expect(TIME_ZONE).toBe("Asia/Riyadh");
  });
});

describe("toInstant", () => {
  it("reads a calendar day as noon in Riyadh", () => {
    expect(toInstant("2026-09-06")?.toISOString()).toBe("2026-09-06T09:00:00.000Z");
  });

  it("reads a date and time without an offset as Riyadh time, with or without seconds", () => {
    expect(toInstant("2026-09-06T12:30")?.toISOString()).toBe("2026-09-06T09:30:00.000Z");
    expect(toInstant("2026-09-06T12:30:15")?.toISOString()).toBe("2026-09-06T09:30:15.000Z");
    expect(toInstant("2026-09-06 12:30")?.toISOString()).toBe("2026-09-06T09:30:00.000Z");
  });

  it("respects an explicit offset or Z", () => {
    expect(toInstant("2026-09-06T12:30:00Z")?.toISOString()).toBe("2026-09-06T12:30:00.000Z");
    expect(toInstant("2026-09-06T12:30:00+03:00")?.toISOString()).toBe("2026-09-06T09:30:00.000Z");
    expect(toInstant("2026-09-06T12:30:00+0300")?.toISOString()).toBe("2026-09-06T09:30:00.000Z");
    expect(toInstant("2026-09-06T12:30:00+03")?.toISOString()).toBe("2026-09-06T09:30:00.000Z");
    expect(toInstant("2026-09-06T12:30:00-05:00")?.toISOString()).toBe("2026-09-06T17:30:00.000Z");
    expect(toInstant("2026-09-06T12:30:00.250Z")?.toISOString()).toBe("2026-09-06T12:30:00.250Z");
  });

  it("passes a valid Date through and rejects an invalid one", () => {
    const instant = new Date("2026-09-06T09:00:00Z");
    expect(toInstant(instant)).toBe(instant);
    expect(toInstant(new Date(Number.NaN))).toBeNull();
  });

  it("treats missing, impossible and unrecognised input as missing", () => {
    for (const bad of [null, undefined, "", "   ", "tomorrow", "6 Sep 2026", "2026-9-6", "2026-02-30", "2026-13-01", "2026-04-31"]) {
      expect(toInstant(bad)).toBeNull();
    }
    expect(toInstant("2026-09-06T24:00")).toBeNull();
    expect(toInstant("2026-09-06T12:60")).toBeNull();
    expect(toInstant("2026-09-06T12:30:60")).toBeNull();
  });

  it("accepts 29 February only in a leap year", () => {
    expect(toInstant("2028-02-29")).not.toBeNull();
    expect(toInstant("2026-02-29")).toBeNull();
    expect(toInstant("2100-02-29")).toBeNull();
    expect(toInstant("2000-02-29")).not.toBeNull();
  });
});

describe("time", () => {
  it("is the Riyadh clock, UTC+3", () => {
    expect(time("2026-09-06T09:00:00Z")).toBe("12:00");
    expect(time("2026-09-06T21:30:00Z")).toBe("00:30");
    expect(time(new Date("2026-09-06T05:05:00Z"))).toBe("08:05");
  });

  it("has no daylight saving time: the offset is the same in January and July", () => {
    expect(time("2026-01-15T12:00:00Z")).toBe("15:00");
    expect(time("2026-07-15T12:00:00Z")).toBe("15:00");
  });

  it("writes midnight as 00:00, never 24:00, and the minute either side of it", () => {
    expect(time("2026-09-06T21:00:00Z")).toBe("00:00");
    expect(time("2026-09-06T20:59:00Z")).toBe("23:59");
    expect(time("2026-09-06T21:01:00Z")).toBe("00:01");
    expect(time("2026-09-06T00:00:00+03:00")).toBe("00:00");
  });

  it("takes minutes since midnight when given a number, as the mockup kit does", () => {
    expect(time(0)).toBe("00:00");
    expect(time(5)).toBe("00:05");
    expect(time(90)).toBe("01:30");
    expect(time(1439)).toBe("23:59");
    expect(time(755)).toBe("12:35");
  });

  it("wraps minutes into one day and rounds them before splitting", () => {
    expect(time(1440)).toBe("00:00");
    expect(time(1500)).toBe("01:00");
    expect(time(-30)).toBe("23:30");
    // the kit prints 01:60 here: it rounds the minute part after taking the hour
    expect(time(119.6)).toBe("02:00");
    expect(time(59.4)).toBe("00:59");
  });

  it("gives NO_VALUE for missing input, NaN and Infinity", () => {
    for (const bad of [null, undefined, "", "soon", Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(time(bad)).toBe(NO_VALUE);
    }
  });

  it("uses Western digits", () => {
    expect(time("2026-09-06T06:05:00Z")).not.toMatch(ARABIC_INDIC_DIGITS);
    expect(time("2026-09-06T06:05:00Z")).toBe("09:05");
  });
});

describe("date", () => {
  const day = "2026-09-06";

  it("writes day, month and year in English (en-GB order)", () => {
    expect(date(day)).toBe("6 Sept 2026");
    expect(date(day, { locale: "en" })).toBe("6 Sept 2026");
    expect(date(day, { month: "long" })).toBe("6 September 2026");
  });

  it("writes Arabic month names with Western digits", () => {
    expect(date(day, { locale: "ar" })).toBe("6 سبتمبر 2026");
    expect(date(day, { locale: "ar-SA", month: "long" })).toBe("6 سبتمبر 2026");
    expect(date(day, { locale: "ar" })).not.toMatch(ARABIC_INDIC_DIGITS);
  });

  it("writes Hijri (Umm al-Qura) with the English day, month, year order", () => {
    expect(date(day, { calendar: "hijri" })).toBe("24 Rab. I 1448 AH");
    // not the US order the A0 helper used ("3/24/1448 AH")
    expect(date(day, { calendar: "hijri" })).not.toMatch(/^\d+\/\d+\/\d+/);
  });

  it("writes Hijri in Arabic with Western digits", () => {
    expect(date(day, { locale: "ar", calendar: "hijri" })).toBe("24 ربيع الأول 1448 هـ");
    expect(date(day, { locale: "ar", calendar: "hijri" })).not.toMatch(ARABIC_INDIC_DIGITS);
  });

  it("has no direction marks in any language, calendar or month length", () => {
    for (const locale of ["en", "ar"]) {
      for (const calendar of ["gregory", "hijri"] as const) {
        for (const month of ["short", "long"] as const) {
          expect(date(day, { locale, calendar, month })).not.toMatch(BIDI);
        }
      }
    }
  });

  it("uses the Riyadh day, not the machine's or UTC's", () => {
    // 21:30 UTC on 6 Sep is 00:30 on 7 Sep in Riyadh
    expect(date("2026-09-06T21:30:00Z")).toBe("7 Sept 2026");
    expect(date("2026-09-06T20:59:59Z")).toBe("6 Sept 2026");
    expect(date("2026-09-06T21:00:00Z")).toBe("7 Sept 2026");
  });

  it("does not move a plain calendar day in any time zone", () => {
    expect(date("2026-01-01")).toBe("1 Jan 2026");
    expect(date("2026-12-31")).toBe("31 Dec 2026");
  });

  it("gives NO_VALUE for missing or impossible dates", () => {
    for (const bad of [null, undefined, "", "2026-02-30", "nope", new Date(Number.NaN)]) {
      expect(date(bad)).toBe(NO_VALUE);
      expect(date(bad, { locale: "ar", calendar: "hijri" })).toBe(NO_VALUE);
    }
  });
});

describe("Hijri boundaries (Umm al-Qura)", () => {
  const hijri = (value: string) => date(value, { calendar: "hijri" });

  it("rolls the year over from 29 Dhuʻl-H. 1447 to 1 Muh. 1448 at 16 June 2026", () => {
    expect(hijri("2026-06-15")).toBe("29 Dhuʻl-H. 1447 AH");
    expect(hijri("2026-06-16")).toBe("1 Muh. 1448 AH");
  });

  it("changes the Hijri day at midnight in Riyadh, not at midnight UTC and not at sunset", () => {
    expect(hijri("2026-06-15T20:59:59Z")).toBe("29 Dhuʻl-H. 1447 AH");
    expect(hijri("2026-06-15T21:00:00Z")).toBe("1 Muh. 1448 AH");
    expect(hijri("2026-06-15T23:59:00+03:00")).toBe("29 Dhuʻl-H. 1447 AH");
    expect(hijri("2026-06-16T00:00:00+03:00")).toBe("1 Muh. 1448 AH");
    // the Gregorian day changes at the same instant
    expect(date("2026-06-15T20:59:59Z")).toBe("15 Jun 2026");
    expect(date("2026-06-15T21:00:00Z")).toBe("16 Jun 2026");
  });

  it("matches the published Umm al-Qura month starts around 2026", () => {
    expect(hijri("2025-06-26")).toBe("1 Muh. 1447 AH");
    expect(hijri("2026-02-17")).toBe("29 Sha. 1447 AH");
    expect(hijri("2026-02-18")).toBe("1 Ram. 1447 AH");
    expect(hijri("2026-03-19")).toBe("30 Ram. 1447 AH");
    expect(hijri("2026-03-20")).toBe("1 Shaw. 1447 AH");
    expect(hijri("2026-05-17")).toBe("30 Dhuʻl-Q. 1447 AH");
    expect(hijri("2026-05-18")).toBe("1 Dhuʻl-H. 1447 AH");
    expect(hijri("2026-05-27")).toBe("10 Dhuʻl-H. 1447 AH");
  });

  it("has the same boundaries in Arabic", () => {
    const arabic = (value: string) => date(value, { locale: "ar", calendar: "hijri" });
    expect(arabic("2026-06-15")).toBe("29 ذو الحجة 1447 هـ");
    expect(arabic("2026-06-16")).toBe("1 محرم 1448 هـ");
    expect(arabic("2026-02-18")).toBe("1 رمضان 1447 هـ");
  });

  it("does not throw outside the years the Umm al-Qura table covers (about 1882 to 2174), where ICU approximates", () => {
    for (const day of ["1800-01-01", "2300-01-01"]) {
      expect(() => date(day, { calendar: "hijri" })).not.toThrow();
      expect(date(day, { calendar: "hijri" })).toMatch(/^\d{1,2} \S+.* \d{3,4} AH$/);
      expect(date(day, { locale: "ar", calendar: "hijri" })).toMatch(/\d{3,4} \S+$/);
    }
  });

  it("crosses a Gregorian year end inside one Hijri year", () => {
    expect(hijri("2026-12-31")).toBe("22 Raj. 1448 AH");
    expect(hijri("2027-01-01")).toBe("23 Raj. 1448 AH");
  });
});

describe("dateBoth", () => {
  it("is the Gregorian date, a middle dot, then the Hijri date", () => {
    expect(dateBoth("2026-09-06")).toBe("6 Sept 2026 \u00B7 24 Rab. I 1448 AH");
    expect(dateBoth("2026-09-06", { locale: "ar" })).toBe("6 سبتمبر 2026 \u00B7 24 ربيع الأول 1448 هـ");
  });

  it("takes the month length and has no direction marks", () => {
    expect(dateBoth("2026-09-06", { month: "long" })).toBe("6 September 2026 \u00B7 24 Rabiʻ I 1448 AH");
    expect(dateBoth("2026-09-06", { locale: "ar" })).not.toMatch(BIDI);
  });

  it("gives NO_VALUE when the date is missing, not half a string", () => {
    expect(dateBoth(null)).toBe(NO_VALUE);
    expect(dateBoth("2026-02-30", { locale: "ar" })).toBe(NO_VALUE);
  });
});

describe("duration", () => {
  it("counts whole minutes by default, with the unit given", () => {
    expect(duration(360)).toBe("6 min");
    expect(duration(0)).toBe("0 min");
    expect(duration(629)).toBe("10 min");
    expect(duration(360, "min", "د")).toBe("6 د");
  });

  it("rounds to the nearest minute, half up", () => {
    expect(duration(89)).toBe("1 min");
    expect(duration(90)).toBe("2 min");
    expect(duration(29)).toBe("0 min");
    expect(duration(30)).toBe("1 min");
  });

  it("writes m:ss in clock mode, with minutes that pass 59", () => {
    expect(duration(652, "clock")).toBe("10:52");
    expect(duration(144, "clock")).toBe("2:24");
    expect(duration(5, "clock")).toBe("0:05");
    expect(duration(0, "clock")).toBe("0:00");
    expect(duration(3725, "clock")).toBe("62:05");
  });

  it("rounds seconds before splitting, so 119.6 s is 2:00, not the kit's 1:60", () => {
    expect(duration(119.6, "clock")).toBe("2:00");
    expect(duration(59.5, "clock")).toBe("1:00");
    expect(duration(59.4, "clock")).toBe("0:59");
  });

  it("keeps the sign of a negative length, and never writes -0", () => {
    expect(duration(-360)).toBe("-6 min");
    expect(duration(-144, "clock")).toBe("-2:24");
    expect(duration(-20)).toBe("0 min");
    expect(duration(-0.2, "clock")).toBe("0:00");
  });

  it("gives NO_VALUE for missing input, NaN and Infinity", () => {
    for (const bad of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(duration(bad)).toBe(NO_VALUE);
      expect(duration(bad, "clock")).toBe(NO_VALUE);
    }
  });
});

describe("the A0 helper names (formatDate, formatTime, formatDateTime, formatHijriDate, formatMinutesSeconds)", () => {
  it("formatDate: Intl styles in Riyadh time, English day-month-year", () => {
    expect(formatDate("2026-09-06T21:30:00Z", "en", "short")).toBe("07/09/2026");
    expect(formatDate("2026-09-06T12:00:00+03:00", "en")).toBe("6 Sept 2026");
    expect(formatDate("2026-09-06T12:00:00+03:00", "en", "long")).toBe("6 September 2026");
    expect(formatDate("2026-09-06T12:00:00+03:00")).toBe("6 Sept 2026");
  });

  it("formatDate: Arabic has no direction marks and keeps Western digits", () => {
    for (const style of ["short", "medium", "long"] as const) {
      const text = formatDate("2026-09-06T12:00:00+03:00", "ar", style);
      expect(text).not.toMatch(BIDI);
      expect(text).not.toMatch(ARABIC_INDIC_DIGITS);
      expect(text).toMatch(/2026/);
    }
    expect(formatDate("2026-09-06T12:00:00+03:00", "ar", "short")).toBe("6/9/2026");
    expect(formatDate("2026-09-06T12:00:00+03:00", "ar", "medium")).toBe("06/09/2026");
    expect(formatDate("2026-09-06T12:00:00+03:00", "ar", "long")).toBe("6 سبتمبر 2026");
  });

  it("formatHijriDate: Umm al-Qura, English in day-month-year order, no marks in Arabic", () => {
    expect(formatHijriDate("2026-09-06T12:00:00+03:00", "en")).toBe("24 Rab. I 1448 AH");
    expect(formatHijriDate("2026-09-06T12:00:00+03:00", "en", "long")).toBe("24 Rabiʻ I 1448 AH");
    expect(formatHijriDate("2026-09-06T12:00:00+03:00", "en", "short")).toBe("24/03/1448 AH");
    expect(formatHijriDate("2026-09-06T12:00:00+03:00", "ar", "long")).toBe("24 ربيع الأول 1448 هـ");
    expect(formatHijriDate("2026-09-06T12:00:00+03:00", "ar", "short")).toBe("24/3/1448 هـ");
    expect(formatHijriDate("2026-09-06T12:00:00+03:00", "ar")).not.toMatch(BIDI);
  });

  it("formatTime ignores the language: same 24-hour clock in both", () => {
    expect(formatTime("2026-09-06T09:05:00+03:00", "ar")).toBe("09:05");
    expect(formatTime("2026-09-06T09:05:00+03:00", "en")).toBe("09:05");
    expect(formatTime("2026-09-06T09:05:00+03:00")).toBe("09:05");
  });

  it("formatDateTime joins the date and the time", () => {
    expect(formatDateTime("2026-09-06T12:00:00+03:00", "en")).toBe("6 Sept 2026 12:00");
    expect(formatDateTime("2026-09-06T12:00:00+03:00", "en", "short")).toBe("06/09/2026 12:00");
    expect(formatDateTime("2026-09-06T21:30:00Z", "ar", "long")).toBe("7 سبتمبر 2026 00:30");
  });

  it("gives NO_VALUE instead of throwing for an invalid date", () => {
    for (const fn of [formatDate, formatTime, formatDateTime, formatHijriDate]) {
      expect(fn("not a date", "en")).toBe(NO_VALUE);
      expect(fn(null, "ar")).toBe(NO_VALUE);
      expect(fn(new Date(Number.NaN), "en")).toBe(NO_VALUE);
    }
  });

  it("formatMinutesSeconds: m:ss, never below zero", () => {
    expect(formatMinutesSeconds(144)).toBe("2:24");
    expect(formatMinutesSeconds(-5)).toBe("0:00");
    expect(formatMinutesSeconds(0)).toBe("0:00");
    expect(formatMinutesSeconds(Number.NaN)).toBe(NO_VALUE);
    expect(formatMinutesSeconds(Number.NEGATIVE_INFINITY)).toBe(NO_VALUE);
    expect(formatMinutesSeconds(null)).toBe(NO_VALUE);
  });
});

describe("determinism", () => {
  const original = process.env["TZ"];

  afterEach(() => {
    if (original === undefined) delete process.env["TZ"];
    else process.env["TZ"] = original;
  });

  const sample = () => [
    time("2026-09-06T21:30:00Z"),
    time("2026-09-06T12:30"),
    date("2026-09-06"),
    date("2026-09-06T21:30:00Z", { locale: "ar", calendar: "hijri" }),
    dateBoth("2026-06-15T21:00:00Z"),
    formatDate("2026-09-06T21:30:00Z", "en", "short"),
    formatDateTime("2026-09-06", "ar"),
    formatHijriDate("2026-06-15T20:59:59Z", "en"),
  ];

  it("gives the same text whatever the machine's time zone is", () => {
    process.env["TZ"] = "Pacific/Kiritimati"; // UTC+14
    const eastOfRiyadh = new Date("2026-09-06T21:30:00Z").getDate();
    const first = sample();
    process.env["TZ"] = "Pacific/Pago_Pago"; // UTC-11
    const westOfRiyadh = new Date("2026-09-06T21:30:00Z").getDate();
    const second = sample();
    process.env["TZ"] = "UTC";
    const third = sample();
    // proves the zone really changed under the code, so the equality below means something
    expect(eastOfRiyadh).not.toBe(westOfRiyadh);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(first[0]).toBe("00:30");
    expect(first[1]).toBe("12:30");
    expect(first[2]).toBe("6 Sept 2026");
  });

  it("reads no clock: the same call twice is the same text", () => {
    expect(sample()).toEqual(sample());
  });
});
