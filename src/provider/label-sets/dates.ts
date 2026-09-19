import type { LabelMap } from "../labels";

/** English defaults for the dates components. Keys are "<component>.<name>"; values are strings with {name} placeholders or functions. */
export const DATE_LABELS = {
  /** Unit after a count of minutes, for `duration(seconds, "min", label)`: "6 min". Arabic: "د". */
  "duration.minuteShort": "min",
  /** Caption under a date field that shows the Hijri date. {date} is the Hijri date, already formatted: "24 Rab. I 1448 AH". */
  "dateInput.hijriCaption": "Hijri: {date}",
} as const satisfies LabelMap;
