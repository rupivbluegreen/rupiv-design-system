// Test harness. renderBoth(ui) renders the same element twice, once as English/ltr and once as Arabic/rtl,
// so every component test can assert both directions. The provider comes with the provider commit, which
// replaces this wrapper with <DesignSystemProvider>.
// jsdom has no layout: this proves logic, not looks.
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

export type TestLocale = "en" | "ar";
export type TestDir = "ltr" | "rtl";

export interface LocaleCase {
  readonly locale: TestLocale;
  readonly dir: TestDir;
}

/** The two cases every component is tested in. Use with describe.each / it.each. */
export const LOCALE_CASES: readonly LocaleCase[] = [
  { locale: "en", dir: "ltr" },
  { locale: "ar", dir: "rtl" },
];

export interface LocaleRender extends RenderResult, LocaleCase {}

function Wrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Render `ui` for one locale. The container carries `lang` and `dir` (as the app's <html> would).
 * Queries are scoped to the container; use `screen` for portals (Modal, Popover, Tooltip, Toast).
 */
export function renderIn(locale: TestLocale, ui: ReactElement): LocaleRender {
  const dir: TestDir = locale === "ar" ? "rtl" : "ltr";
  const container = document.body.appendChild(document.createElement("div"));
  container.lang = locale;
  container.dir = dir;
  const result = render(ui, { container, wrapper: Wrapper });
  return Object.assign(result, { locale, dir });
}

/** Render `ui` as English/ltr and as Arabic/rtl, side by side in the same document. */
export function renderBoth(ui: ReactElement): { en: LocaleRender; ar: LocaleRender } {
  return { en: renderIn("en", ui), ar: renderIn("ar", ui) };
}
