/**
 * Dates, times and durations. Every date on a screen goes through here.
 *
 * - Time zone: Asia/Riyadh by default (UTC+3 all year, Saudi Arabia has no daylight saving time), whatever the
 *   time zone of the browser or the server. `date`, `dateBoth` and `time` take an optional IANA `timeZone`
 *   ("Europe/London") for an application that shows another zone. Nothing here reads "now" and nothing reads the
 *   machine's zone. An unknown zone name gives `NO_VALUE`, not a thrown error.
 * - Digits: Western (0 to 9) in English and Arabic. Arabic dates carry no Unicode direction marks.
 * - Calendars: Gregorian, and Hijri as Umm al-Qura through `Intl` (`islamic-umalqura`). The Hijri day changes at
 *   midnight in Riyadh, as the Umm al-Qura table does; it does not follow the sunset.
 * - Input: a `Date`, or an ISO 8601 string. "2026-09-06" is a calendar day (read as noon in the zone in use, so it
 *   stays that day when written back in that zone). A date and time without an offset ("2026-09-06T12:00") is a
 *   wall-clock time in that zone: Riyadh by default. Any other text, and impossible dates such as 30 February, are
 *   treated as missing.
 * - Missing input (null, undefined, invalid) gives `NO_VALUE`, never a thrown error or the text "Invalid Date".
 *
 * The functions named like the reference kit's `RD.fmt` (`time`, `date`, `dateBoth`, `duration`) take the language
 * in an options object or as the last argument; the `format*` functions keep the signatures of the temporary helper
 * the first application milestone used (`formatDate(value, locale, style)`), so an application can delete its copy
 * and import these. In React, `useFormat()` binds the provider's language.
 */
import { NO_VALUE, resolveFormatLocale, stripBidiMarks, type FormatLocale } from "./locale";

/** The default time zone of every date and time function: Riyadh. */
export const TIME_ZONE = "Asia/Riyadh";

/** Riyadh is UTC+3 with no daylight saving time. Used to read strings that carry no offset when the zone is Riyadh. */
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
  /**
   * IANA time zone the date is read and written in, for example "Europe/London". Default `TIME_ZONE` ("Asia/Riyadh").
   * An unknown name gives `NO_VALUE`.
   */
  timeZone?: string | undefined;
}

export interface TimeOptions {
  /** IANA time zone the clock time is written in. Default `TIME_ZONE` ("Asia/Riyadh"). Not used for a number of minutes. */
  timeZone?: string | undefined;
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

/* ------------------------------------------------------------------ */
/* Time zones                                                          */
/* ------------------------------------------------------------------ */

const zoneClocks = new Map<string, Intl.DateTimeFormat | null>();

/** An `Intl` clock for the zone (numeric parts, 24 hour), or null when the zone name is not known. Cached. */
function zoneClock(timeZone: string): Intl.DateTimeFormat | null {
  let clock = zoneClocks.get(timeZone);
  if (clock === undefined) {
    try {
      clock = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
    } catch {
      clock = null;
    }
    zoneClocks.set(timeZone, clock);
  }
  return clock;
}

/** The zone to use: the default when none is given, `null` when the name is not a known zone. */
function resolveTimeZone(timeZone: string | null | undefined): string | null {
  const zone = timeZone ?? TIME_ZONE;
  return zoneClock(zone) === null ? null : zone;
}

/** How far the zone's wall clock is ahead of UTC at an instant, in milliseconds. */
function zoneOffsetMs(instantMs: number, clock: Intl.DateTimeFormat): number {
  const whole = Math.floor(instantMs / 1000) * 1000;
  const parts: Record<string, number> = {};
  for (const part of clock.formatToParts(whole)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  const wall = Date.UTC(
    parts["year"] ?? 1970,
    (parts["month"] ?? 1) - 1,
    parts["day"] ?? 1,
    parts["hour"] ?? 0,
    parts["minute"] ?? 0,
    parts["second"] ?? 0,
  );
  return wall - whole;
}

/**
 * The instant at which a zone's wall clock shows this date and time. Reads the zone's offset at the guessed instant
 * and again at the corrected one, so a time near a daylight saving change lands on the right side of it (a time that
 * does not exist, or exists twice, gets the offset in force after the first correction).
 */
function wallClockToInstant(wallMs: number, timeZone: string): Date | null {
  const clock = zoneClock(timeZone);
  if (clock === null) return null;
  const first = zoneOffsetMs(wallMs, clock);
  let instant = wallMs - first;
  const second = zoneOffsetMs(instant, clock);
  if (second !== first) instant = wallMs - second;
  return new Date(instant);
}

/* ------------------------------------------------------------------ */
/* Reading input, continued                                            */
/* ------------------------------------------------------------------ */

function parseIsoText(text: string, timeZone: string): Date | null {
  const match = ISO_PATTERN.exec(text.trim());
  if (match === null) return null;
  const [, year = "", month = "", day = "", hour, minute = "0", second = "0", fraction = "", offset] = match;
  if (!isCalendarDay(Number(year), Number(month), Number(day))) return null;
  const isoDay = `${year}-${month}-${day}`;
  const inRiyadh = timeZone === TIME_ZONE;
  const wall = (h: number, m: number, sec: number, ms: number) =>
    wallClockToInstant(Date.UTC(Number(year), Number(month) - 1, Number(day), h, m, sec, ms), timeZone);
  // A calendar day: noon in the zone in use, so writing it back in that zone gives the same day.
  if (hour === undefined) return inRiyadh ? new Date(`${isoDay}T12:00:00${RIYADH_OFFSET}`) : wall(12, 0, 0, 0);
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null;
  if (offset === undefined && !inRiyadh) {
    // No offset: the wall-clock time of the zone in use. `fraction` is ".5" or ".123", read as milliseconds.
    const ms = fraction === "" ? 0 : Math.round(Number(`0${fraction}`) * 1000);
    return wall(Number(hour), Number(minute), Number(second), ms);
  }
  const clock = `${hour}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}${fraction}`;
  return new Date(`${isoDay}T${clock}${normaliseOffset(offset)}`);
}

/**
 * The instant a value stands for, or null when it is missing or not a real date. `timeZone` (default Riyadh) is the
 * zone in which a string without an offset is read; a string with an offset, and a `Date`, name one instant already.
 */
export function toInstant(value: DateValue, timeZone: string = TIME_ZONE): Date | null {
  if (value === null || value === undefined) return null;
  const instant = value instanceof Date ? value : parseIsoText(value, timeZone);
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
function write(tag: string, options: Intl.DateTimeFormatOptions, instant: Date, timeZone: string = TIME_ZONE): string {
  const key = `${tag}|${timeZone}|${JSON.stringify(options)}`;
  let format = dateFormats.get(key);
  if (format === undefined) {
    format = new Intl.DateTimeFormat(tag, { ...options, timeZone });
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
 * A `Date` or an ISO string is the clock time of that instant in `options.timeZone` (default Riyadh).
 */
export function time(value: number | DateValue, options: TimeOptions = {}): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return NO_VALUE;
    const minutes = ((Math.round(value) % 1440) + 1440) % 1440;
    return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
  }
  const zone = resolveTimeZone(options.timeZone);
  if (zone === null) return NO_VALUE;
  const instant = toInstant(value, zone);
  if (instant === null) return NO_VALUE;
  return write(CLOCK_TAG, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, instant, zone);
}

/**
 * "6 Sept 2026" in English (day, month, year), "6 سبتمبر 2026" in Arabic. With `calendar: "hijri"` the Umm al-Qura
 * date: "24 Rab. I 1448 AH" and "24 ربيع الأول 1448 هـ". Western digits, no direction marks. The day is the day in
 * `options.timeZone` (default Riyadh): 21:30 UTC on 6 September is 7 September in Riyadh and 6 September in London.
 */
export function date(value: DateValue, options: DateOptions = {}): string {
  const zone = resolveTimeZone(options.timeZone);
  if (zone === null) return NO_VALUE;
  const instant = toInstant(value, zone);
  if (instant === null) return NO_VALUE;
  return write(
    calendarTag(options.locale, options.calendar),
    { day: "numeric", month: options.month ?? "short", year: "numeric" },
    instant,
    zone,
  );
}

/** Gregorian, then the Hijri date as the secondary calendar: "6 Sept 2026 \u00B7 24 Rab. I 1448 AH". */
export function dateBoth(value: DateValue, options: Omit<DateOptions, "calendar"> = {}): string {
  const gregorian = date(value, { ...options, calendar: "gregory" });
  if (gregorian === NO_VALUE) return NO_VALUE;
  return `${gregorian} \u00B7 ${date(value, { ...options, calendar: "hijri" })}`;
}

/**
 * The weekday name alone: "Sun" (default) or, with `length: "long"`, "Sunday". The same seven names name a day
 * whichever calendar its date is also written in, so there is no `calendar` option here. The day read is the one
 * in `options.timeZone` (default Riyadh), same as `date`.
 */
export function weekday(value: DateValue, options: { locale?: string; length?: "short" | "long"; timeZone?: string } = {}): string {
  const zone = resolveTimeZone(options.timeZone);
  if (zone === null) return NO_VALUE;
  const instant = toInstant(value, zone);
  if (instant === null) return NO_VALUE;
  return write(calendarTag(options.locale, "gregory"), { weekday: options.length ?? "short" }, instant, zone);
}

/** The seven weekday names, Sunday first, in the reader's language: a calendar grid's header row. */
export function weekdayNames(options: { locale?: string; length?: "short" | "long" } = {}): string[] {
  // 13 September 2026 is a Sunday; UTC avoids any zone's date line moving one of the seven off its day.
  return Array.from({ length: 7 }, (_, i) => weekday(new Date(Date.UTC(2026, 8, 13 + i, 12)), { ...options, timeZone: "UTC" }));
}

/** The month name alone: "September" (default) or, with `month: "short"`, "Sept". Hijri names with `calendar: "hijri"`. */
export function monthName(value: DateValue, options: DateOptions = {}): string {
  const zone = resolveTimeZone(options.timeZone);
  if (zone === null) return NO_VALUE;
  const instant = toInstant(value, zone);
  if (instant === null) return NO_VALUE;
  return write(calendarTag(options.locale, options.calendar), { month: options.month ?? "long" }, instant, zone);
}

/** "min" is a count of minutes ("6 min"), "clock" is minutes and seconds ("10:52"). */
export type DurationMode = "min" | "clock";

/**
 * A length of time given in seconds. Mode "min" (default) rounds to whole minutes and appends `minuteLabel`
 * (the provider label "duration.minuteShort", in Arabic "د"); mode "clock" gives "m:ss" with minutes that can pass 59.
 * The default `minuteLabel` is the English "min": this plain function knows no language, so on a page in another
 * language pass the label, or use `useFormat().duration`, which reads it from the provider.
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
