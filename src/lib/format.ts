/**
 * Formatting helpers. Every number, currency, quantity and date shown in the UI
 * goes through here so the whole product reads the same way.
 * Locale is en-IN: lakh/crore grouping (12,34,567) and DD MMM YYYY dates.
 */

/** The mock "today" for the whole app. Keep screens deterministic. */
export const TODAY = "2026-09-15";
export const FINANCIAL_YEAR = "FY 2026-27";

const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num0 = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const num2 = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹12,34,567 — or ₹12,34,567.50 with `decimals: true`. */
export function formatINR(value: number, opts: { decimals?: boolean } = {}): string {
  return (opts.decimals ? inr2 : inr0).format(value);
}

/** Compact Indian notation: ₹8.4 K, ₹12.6 L, ₹3.25 Cr. */
export function formatINRCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1e7) return `${sign}₹${trimZeros((abs / 1e7).toFixed(2))} Cr`;
  if (abs >= 1e5) return `${sign}₹${trimZeros((abs / 1e5).toFixed(1))} L`;
  if (abs >= 1e3) return `${sign}₹${trimZeros((abs / 1e3).toFixed(1))} K`;
  return `${sign}₹${num0.format(abs)}`;
}

/** Compact quantity: 12.4 K m, 1.2 L m. */
export function formatQtyCompact(value: number, uom: string = "m"): string {
  const abs = Math.abs(value);
  if (abs >= 1e5) return `${trimZeros((value / 1e5).toFixed(1))} L ${uom}`;
  if (abs >= 1e3) return `${trimZeros((value / 1e3).toFixed(1))} K ${uom}`;
  return `${num0.format(value)} ${uom}`;
}

export function formatNumber(value: number, decimals: 0 | 1 | 2 = 0): string {
  return (decimals === 2 ? num2 : decimals === 1 ? num1 : num0).format(value);
}

/** 12,480 m · 1,250.5 kg · 36 pcs */
export function formatQty(value: number, uom: string = "m", decimals: 0 | 1 | 2 = 0): string {
  return `${formatNumber(value, decimals)} ${uom}`;
}

export function formatMetres(value: number): string {
  return formatQty(value, "m");
}

export function formatKg(value: number, decimals: 0 | 1 | 2 = 1): string {
  return formatQty(value, "kg", decimals);
}

/** ₹142.50/m */
export function formatRate(value: number, uom: string = "m"): string {
  return `${inr2.format(value)}/${uom}`;
}

/** 12.4% · −3.1% (true minus sign, like formatDelta; no sign when it rounds to zero) */
export function formatPercent(value: number, decimals: 0 | 1 | 2 = 1): string {
  const roundsToZero = Math.round(Math.abs(value) * 10 ** decimals) === 0;
  const sign = value < 0 && !roundsToZero ? "−" : "";
  return `${sign}${formatNumber(Math.abs(value), decimals)}%`;
}

/** Signed delta for KPI chips: +12.4% / −3.1% */
export function formatDelta(value: number, decimals: 0 | 1 = 1): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatNumber(Math.abs(value), decimals)}%`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(iso: string) {
  const [y = NaN, m = NaN, d = NaN] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

/** 15 Sep 2026 */
export function formatDate(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** 15 Sep */
export function formatDateShort(iso: string): string {
  const { m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]}`;
}

/** 15/09/2026 — for printed documents */
export function formatDateNumeric(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

/** 15 Sep 2026, 10:42 — input is an ISO datetime */
export function formatDateTime(isoDateTime: string): string {
  const time = isoDateTime.slice(11, 16);
  return time ? `${formatDate(isoDateTime)}, ${time}` : formatDate(isoDateTime);
}

function toUTC(iso: string): number {
  const { y, m, d } = parts(iso);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string = TODAY): number {
  return Math.round((toUTC(to) - toUTC(from)) / 86_400_000);
}

/** "in 3 days", "today", "5 days ago", relative to TODAY */
export function formatRelativeDays(iso: string): string {
  const diff = daysBetween(TODAY, iso);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}

/** "Overdue by 12 days" / "Due in 4 days" / "Due today" */
export function formatDue(iso: string): string {
  const diff = daysBetween(TODAY, iso);
  if (diff === 0) return "Due today";
  return diff > 0 ? `Due in ${diff} day${diff === 1 ? "" : "s"}` : `Overdue by ${-diff} day${diff === -1 ? "" : "s"}`;
}

/** "Ravi Shah" -> "RS" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** 58″ · 58.5″ (U+2033 double prime; up to 1 decimal) */
export function formatWidth(inches: number): string {
  return `${formatNumber(inches, 1)}″`;
}

function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/* ------------------------------------------------------------------ */
/* Multi-currency (Cachet: EUR · USD · TRY · AED · GBP)                */
/* ------------------------------------------------------------------ */

export type CurrencyCode = "EUR" | "USD" | "TRY" | "AED" | "GBP";

const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: CurrencyCode, decimals: number): Intl.NumberFormat {
  const key = `${currency}:${decimals}`;
  let f = moneyFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      currencyDisplay: currency === "AED" ? "code" : "narrowSymbol",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    moneyFormatters.set(key, f);
  }
  return f;
}

/** €12,480.50 · $7,980.00 · ₺1,245,000 · AED 45,200.00 (decimals default 2) */
export function formatMoney(value: number, currency: CurrencyCode, opts: { decimals?: 0 | 2 } = {}): string {
  return moneyFormatter(currency, opts.decimals ?? 2).format(value);
}

/** €1.24M · $86.4K · ₺3.2M */
export function formatMoneyCompact(value: number, currency: CurrencyCode): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  const symbol = moneyFormatter(currency, 0).formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;
  const pre = currency === "AED" ? `${symbol} ` : symbol;
  if (abs >= 1e6) return `${sign}${pre}${trimZeros((abs / 1e6).toFixed(2))}M`;
  if (abs >= 1e3) return `${sign}${pre}${trimZeros((abs / 1e3).toFixed(1))}K`;
  return `${sign}${pre}${formatNumber(abs, 0)}`;
}

/** 25.08.2025 — the dotted date format used on Cachet documents */
export function formatDateDotted(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

/** 2,400 pcs · 1,250.5 MT */
export function formatUnits(value: number, unit: string = "PCS"): string {
  return `${formatNumber(value, Number.isInteger(value) ? 0 : 1)} ${unit.toLowerCase() === "pcs" ? "pcs" : unit}`;
}
