"use client";

import { createContext, useContext, useMemo, type ComponentPropsWithRef, type ComponentType, type ReactNode } from "react";
import { DEFAULT_LABELS, createLabelFn, type LabelFn, type LabelMap } from "./labels";

/**
 * The design system never imports a framework. Anything that depends on the application (its link component, how it
 * navigates, which page is active, the language and the text) comes in through this provider.
 *
 * Every hook works without a provider and returns the defaults: English, left to right, a plain <a>,
 * navigation by full page load, no active path.
 *
 * Client boundary: this file is a client module. A Server Component page passes only plain values (locale, dir,
 * strings) to a client wrapper that holds the functions (linkComponent, navigate, label functions).
 * See docs/client-boundary.md.
 */

export type Direction = "ltr" | "rtl";

/** Props every link component receives: those of an <a>, with a required string href. */
export interface LinkComponentProps extends ComponentPropsWithRef<"a"> {
  href: string;
}

/** A component that renders a link, such as the router's Link. Must forward `className`, `ref` and anchor props. */
export type LinkComponent = ComponentType<LinkComponentProps>;

/**
 * What the `linkComponent` prop accepts: a LinkComponent, or any router Link. A router Link (next/link declares its
 * optional props without `| undefined`) is not assignable to LinkComponent in a project that turns on
 * exactOptionalPropertyTypes, although it renders an <a> and forwards the anchor props. The provider stores it as a
 * LinkComponent; the router's Link is trusted to forward `className`, `ref` and anchor props.
 */
export type LinkComponentInput = LinkComponent | ComponentType<never>;

/** Moves to another page. */
export type NavigateFn = (href: string) => void;

const RTL_LANGUAGES: ReadonlySet<string> = new Set(["ar", "he", "fa", "ur"]);

/** Left to right or right to left for a BCP 47 language tag such as "ar" or "ar-SA". */
export function directionOf(locale: string): Direction {
  const language = locale.split("-")[0]?.toLowerCase() ?? "";
  return RTL_LANGUAGES.has(language) ? "rtl" : "ltr";
}

function DefaultLink(props: LinkComponentProps) {
  return <a {...props} />;
}

function defaultNavigate(href: string): void {
  window.location.assign(href);
}

interface DesignSystemContextValue {
  locale: string;
  dir: Direction;
  labels: LabelMap;
  label: LabelFn;
  linkComponent: LinkComponent;
  navigate: NavigateFn;
  activePath: string;
}

const DEFAULTS: DesignSystemContextValue = {
  locale: "en",
  dir: "ltr",
  labels: DEFAULT_LABELS,
  label: createLabelFn(DEFAULT_LABELS),
  linkComponent: DefaultLink,
  navigate: defaultNavigate,
  activePath: "",
};

const DesignSystemContext = createContext<DesignSystemContextValue>(DEFAULTS);

export interface DesignSystemProviderProps {
  /** BCP 47 language tag. Default "en". */
  locale?: string | undefined;
  /** Text direction. Default: derived from `locale` ("ar", "he", "fa", "ur" are right to left). */
  dir?: Direction | undefined;
  /** The application's own text, by key. Keys left out fall back to English. */
  labels?: LabelMap | undefined;
  /** The router's Link. Default: a plain <a>. Must be created in a client file. */
  linkComponent?: LinkComponentInput | undefined;
  /** Moves to a page (DataTable rowHref). Default: full page load. Must be created in a client file. */
  navigate?: NavigateFn | undefined;
  /** The current path, for route-backed tabs. A string, not a hook. Default: "" (nothing is active). */
  activePath?: string | undefined;
  children?: ReactNode;
}

/** A nested provider changes only what it is given; the rest comes from the provider above it. */
export function DesignSystemProvider({
  locale,
  dir,
  labels,
  linkComponent,
  navigate,
  activePath,
  children,
}: DesignSystemProviderProps) {
  const parent = useContext(DesignSystemContext);

  const value = useMemo<DesignSystemContextValue>(() => {
    const merged: LabelMap = labels ? { ...parent.labels, ...labels } : parent.labels;
    return {
      locale: locale ?? parent.locale,
      dir: dir ?? (locale !== undefined ? directionOf(locale) : parent.dir),
      labels: merged,
      label: merged === parent.labels ? parent.label : createLabelFn(merged),
      linkComponent: (linkComponent as LinkComponent | undefined) ?? parent.linkComponent,
      navigate: navigate ?? parent.navigate,
      activePath: activePath ?? parent.activePath,
    };
  }, [parent, locale, dir, labels, linkComponent, navigate, activePath]);

  return <DesignSystemContext.Provider value={value}>{children}</DesignSystemContext.Provider>;
}

/** The language tag, for sorting and number formats. */
export function useLocale(): string {
  return useContext(DesignSystemContext).locale;
}

/** Text direction, for keyboard handling that has no DOM to read (placement reads the computed direction instead). */
export function useDir(): Direction {
  return useContext(DesignSystemContext).dir;
}

/** Resolves a label key to text: `const label = useLabels(); label("pagination.next")`. */
export function useLabels(): LabelFn {
  return useContext(DesignSystemContext).label;
}

/** The link component to render for an href. */
export function useLink(): LinkComponent {
  return useContext(DesignSystemContext).linkComponent;
}

/** Moves to another page. */
export function useNavigate(): NavigateFn {
  return useContext(DesignSystemContext).navigate;
}

/** The current path. */
export function useActivePath(): string {
  return useContext(DesignSystemContext).activePath;
}
