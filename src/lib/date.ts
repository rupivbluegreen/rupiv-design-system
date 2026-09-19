/**
 * Dates, times and durations. Every date on a screen goes through here.
 *
 * - Time zone: always Asia/Riyadh (UTC+3 all year, Saudi Arabia has no daylight saving time), whatever the
 *   time zone of the browser or the server. Nothing here reads "now" and nothing reads the machine's zone.
 * - Digits: Western (0 to 9) in English and Arabic. Arabic dates carry no Unicode direction marks.
 * - Calendars: Gregorian, and Hijri as Umm al-Qura through `Intl` (`islamic-umalqura`). The Hijri day changes at
 *   midnight in Riyadh, as the Umm al-Qura table does; it does not follow the sunset.
 * - Input: a `Date`, or an ISO 8601 string. "2026-09-06" is a calendar day (read as noon in Riyadh, so no zone
 *   moves it to another day). A date and time without an offset ("2026-09-06T12:00") is Riyadh time. Any other
 *   text, and impossible dates such as 30 February, are treated as missing.
 * - Missing input (null, undefined, invalid) gives `NO_VALUE`, never a thrown error or the text "Invalid Date".
 *
 * The functions named like the reference kit's `RD.fmt` (`time`, `date`, `dateBoth`, `duration`) take the language
 * in an options object or as the last argument; the `format*` functions keep the signatures of the temporary helper
 * the first application milestone used (`formatDate(value, locale, style)`), so an application can delete its copy
 * and import these. In React, `useFormat()` binds the provider's language.
 */
import { NO_VALUE, resolveFormatLocale, stripBidiMarks, type FormatLocale } from "./locale";

/** All times are Riyadh times. */
export const TIME_ZONE = "Asia/Riyadh";

/** Riyadh is UTC+3 with no daylight saving time. Used only to read strings that carry no offset. */
const RIYADH_OFFSET = "+03:00";

/** What the date functions accept. Anything that is not a real date gives `NO_VALUE`. */
export type DateValue = string | Date | null | undefined;

/** Which calendar to write a date in. */
export type CalendarKind = "gregory" | "hijri";

/** The three `Intl` date styles: 06/09/2026, 6 Sept 2026, 6 September 2026 (English, Gregorian). */
export type DateStyle = "short" | "medium" | "long";

export interface DateOptions {
  /** BCP 47 tag from the provider ("en", "ar", "ar-SA"). Default English. */
  locale?: string | undefined;
  /** Default "gregory". */
  calendar?: CalendarKind | undefined;
  /** Length of the month name. Default "short". */
  month?: "short" | "long" | undefined;
}

/* ------------------------------------------------------------------ */
/* Reading input                                                       */
/* ------------------------------------------------------------------ */

// YYYY-MM-DD, optionally followed by T or a space, HH:mm, optional :ss and fraction, optional Z or offset.
const ISO_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d+)?)?\s?(Z|[+-]\d{2}(?::?\d{2})?)?)?$/i;

/** True when year, month and day name a real day. V8 alone accepts 2026-02-30 and moves it to 2 March. */
function isCalendarDay(year: number, month: number, day: number): boolean {
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

/** "Z" stays, "+03" and "+0300" become "+03:00", no offset means Riyadh. */
function normaliseOffset(offset: string | undefined): string {
  if (offset === undefined) return RIYADH_OFFSET;
  if (offset.toUpperCase() === "Z") return "Z";
  if (offset.length === 3) return `${offset}:00`;
  return offset.includes(":") ? offset : `${offset.slice(0, 3)}:${offset.slice(3)}`;
}

function parseIsoText(text: string): Date | null {
  const match = ISO_PATTERN.exec(text.trim());
  if (match === null) return null;
  const [, year = "", month = "", day = "", hour, minute = "0", second = "0", fraction = "", offset] = match;
  if (!isCalendarDay(Number(year), Number(month), Number(day))) return null;
  const isoDay = `${year}-${month}-${day}`;
  // A calendar day: noon in Riyadh, so it never lands on the neighbouring day in any zone.
  if (hour === undefined) return new Date(`${isoDay}T12:00:00${RIYADH_OFFSET}`);
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null;
  const clock = `${hour}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}${fraction}`;
  return new Date(`${isoDay}T${clock}${normaliseOffset(offset)}`);
}

/** The instant a value stands for, or null when it is missing or not a real date. */
export function toInstant(value: DateValue): Date | null {
  if (value === null || value === undefined) return null;
  const instant = value instanceof Date ? value : parseIsoText(value);
  return instant === null || Number.isNaN(instant.getTime()) ? null : instant;
}

/* ------------------------------------------------------------------ */
/* Intl                                                                */
/* ------------------------------------------------------------------ */

const GREGORIAN_TAGS = {
  en: "en-GB-u-ca-gregory-nu-latn",
  ar: "ar-SA-u-ca-gregory-nu-latn",
} as const satisfies Record<FormatLocale, string>;

const HIJRI_TAGS = {
  en: "en-GB-u-ca-islamic-umalqura-nu-latn",
  ar: "ar-SA-u-ca-islamic-umalqura-nu-latn",
} as const satisfies Record<FormatLocale, string>;

const CLOCK_TAG = "en-GB-u-nu-latn";

const dateFormats = new Map<string, Intl.DateTimeFormat>();

/** Formats with `formatToParts` and drops the direction marks from every part, so no mark can survive in a literal. */
function write(tag: string, options: Intl.DateTimeFormatOptions, instant: Date): string {
  const key = `${tag}|${JSON.stringify(options)}`;
  let format = dateFormats.get(key);
  if (format === undefined) {
    format = new Intl.DateTimeFormat(tag, { ...options, timeZone: TIME_ZONE });
    dateFormats.set(key, format);
  }
  return format
    .formatToParts(instant)
    .map((part) => stripBidiMarks(part.value))
    .join("");
}

function calendarTag(locale: string | undefined, calendar: CalendarKind | undefined): string {
  const language = resolveFormatLocale(locale);
  return (calendar === "hijri" ? HIJRI_TAGS : GREGORIAN_TAGS)[language];
}

const pad2 = (value: number): string => String(value).padStart(2, "0");

/* ------------------------------------------------------------------ */
/* The reference kit's RD.fmt: time, date, dateBoth, duration         */
/* ------------------------------------------------------------------ */

/**
 * "HH:mm", 24 hour, Western digits, in both languages.
 * A number is minutes since midnight (rounded, and wrapped into one day: 1440 is 00:00, -30 is 23:30).
 * A `Date` or an ISO string is the Riyadh clock time of that instant.
 */
export function time(value: number | DateValue): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return NO_VALUE;
    const minutes = ((Math.round(value) % 1440) + 1440) % 1440;
    return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
  }
  const instant = toInstant(value);
  if (instant === null) return NO_VALUE;
  return write(CLOCK_TAG, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, instant);
}

/**
 * "6 Sept 2026" in English (day, month, year), "6 سبتمبر 2026" in Arabic. With `calendar: "hijri"` the Umm al-Qura
 * date: "24 Rab. I 1448 AH" and "24 ربيع الأول 1448 هـ". Western digits, no direction marks.
 */
export function date(value: DateValue, options: DateOptions = {}): string {
  const instant = toInstant(value);
  if (instant === null) return NO_VALUE;
  return write(
    calendarTag(options.locale, options.calendar),
    { day: "numeric", month: options.month ?? "short", year: "numeric" },
    instant,
  );
}

/** Gregorian, then the Hijri date as the secondary calendar: "6 Sept 2026 \u00B7 24 Rab. I 1448 AH". */
export function dateBoth(value: DateValue, options: Omit<DateOptions, "calendar"> = {}): string {
  const gregorian = date(value, { ...options, calendar: "gregory" });
  if (gregorian === NO_VALUE) return NO_VALUE;
  return `${gregorian} \u00B7 ${date(value, { ...options, calendar: "hijri" })}`;
}

/** "min" is a count of minutes ("6 min"), "clock" is minutes and seconds ("10:52"). */
export type DurationMode = "min" | "clock";

/**
 * A length of time given in seconds. Mode "min" (default) rounds to whole minutes and appends `minuteLabel`
 * (the provider label "duration.minuteShort", in Arabic "د"); mode "clock" gives "m:ss" with minutes that can pass 59.
 * A negative duration keeps its minus sign, and a value that rounds to zero has none ("0 min", never "-0 min").
 */
export function duration(seconds: number | null | undefined, mode: DurationMode = "min", minuteLabel = "min"): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return NO_VALUE;
  const negative = seconds < 0;
  if (mode === "clock") {
    const whole = Math.round(Math.abs(seconds));
    return `${negative && whole > 0 ? "-" : ""}${Math.floor(whole / 60)}:${pad2(whole % 60)}`;
  }
  const minutes = Math.round(Math.abs(seconds) / 60);
  return `${negative && minutes > 0 ? "-" : ""}${minutes} ${minuteLabel}`;
}

/* ------------------------------------------------------------------ */
/* The A0 helper: same names, same results                            */
/* ------------------------------------------------------------------ */

/** Gregorian date in an `Intl` style: en "07/09/2026", "6 Sept 2026", "6 September 2026"; ar "06/09/2026", ... */
export function formatDate(value: DateValue, locale?: string, style: DateStyle = "medium"): string {
  const instant = toInstant(value);
  if (instant === null) return NO_VALUE;
  return write(calendarTag(locale, "gregory"), { dateStyle: style }, instant);
}

/**
 * 24-hour clock, HH:mm. The clock is the same in both languages, so `locale` changes nothing; the parameter is
 * kept so calls written for the A0 helper compile.
 */
export function formatTime(value: DateValue, _locale?: string): string {
  return time(value);
}

/** `formatDate` and `formatTime` joined by a space. */
export function formatDateTime(value: DateValue, locale?: string, style: DateStyle = "medium"): string {
  const day = formatDate(value, locale, style);
  const clock = formatTime(value);
  return day === NO_VALUE || clock === NO_VALUE ? NO_VALUE : `${day} ${clock}`;
}

/** Hijri (Umm al-Qura) date in an `Intl` style. English is day-month-year ("24 Rabiʻ I 1448 AH"), not the US order. */
export function formatHijriDate(value: DateValue, locale?: string, style: DateStyle = "medium"): string {
  const instant = toInstant(value);
  if (instant === null) return NO_VALUE;
  return write(calendarTag(locale, "hijri"), { dateStyle: style }, instant);
}

/** Seconds as "2:24". A negative or missing length is 0:00 or `NO_VALUE`: a length of time is never below zero. */
export function formatMinutesSeconds(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) return NO_VALUE;
  return duration(Math.max(0, totalSeconds), "clock");
}
