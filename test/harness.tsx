// Test harness. renderBoth(ui) renders the same element twice, once as English/ltr and once as Arabic/rtl,
// each inside <DesignSystemProvider>, so every component test can assert both directions.
// jsdom has no layout: this proves logic (links, labels, keys, focus), not how right-to-left looks.
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { DesignSystemProvider, type DesignSystemProviderProps, type LinkComponent } from "../src/provider";

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

/** What a test may set on the provider. Locale and direction come from the case. */
export type ProviderOptions = Omit<DesignSystemProviderProps, "locale" | "dir" | "children">;

export interface LocaleRender extends RenderResult, LocaleCase {}

/**
 * Render `ui` for one locale inside the provider. The container carries `lang` and `dir` (as the app's <html> would).
 * Queries are scoped to the container; use `screen` for portals (Modal, Popover, Tooltip, Toast, Menu).
 */
export function renderIn(locale: TestLocale, ui: ReactElement, options: ProviderOptions = {}): LocaleRender {
  const dir: TestDir = locale === "ar" ? "rtl" : "ltr";
  const container = document.body.appendChild(document.createElement("div"));
  container.lang = locale;
  container.dir = dir;
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <DesignSystemProvider {...options} locale={locale} dir={dir}>
        {children}
      </DesignSystemProvider>
    );
  }
  const result = render(ui, { container, wrapper: Wrapper });
  return Object.assign(result, { locale, dir });
}

/** Render `ui` as English/ltr and as Arabic/rtl, side by side in the same document. */
export function renderBoth(ui: ReactElement, options: ProviderOptions = {}): { en: LocaleRender; ar: LocaleRender } {
  return { en: renderIn("en", ui, options), ar: renderIn("ar", ui, options) };
}

/** A stand-in for a router's Link: an <a> that marks itself, so a test can tell it was used. */
export const CustomLink: LinkComponent = ({ href, children, ...rest }) => (
  <a href={href} data-custom-link="true" {...rest}>
    {children}
  </a>
);
