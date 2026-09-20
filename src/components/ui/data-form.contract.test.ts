// @vitest-environment node
//
// Contract between the TSX and the CSS Modules of the data and form components. Under Vitest a CSS Module is a proxy
// that answers every name, so a class the CSS does not define would pass every rendering test and only show up in the
// browser as a missing style. This reads the sources and checks the two sides agree. It also holds the markup rules the
// right-to-left CSS depends on, since jsdom cannot run `:dir(rtl)`.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const COMPONENTS = [
  "data-table",
  "pagination",
  "filter-bar",
  "file-drop",
  "form-footer",
  "quantity-input",
  "field",
  "input",
  "search-input",
  "checkbox",
  "radio",
  "switch",
  "page-header",
  "breadcrumbs",
  "form-section",
] as const;

function read(name: string, extension: "tsx" | "module.css"): string {
  return readFileSync(new URL(`./${name}.${extension}`, import.meta.url), "utf8");
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Every class name the CSS defines or mentions in a selector. */
function definedClasses(css: string): Set<string> {
  const found = new Set<string>();
  for (const match of stripComments(css).matchAll(/\.([A-Za-z_][\w-]*)/g)) {
    if (match[1]) found.add(match[1]);
  }
  return found;
}

/** Every `styles.name` and `styles["name"]` the TSX reads. */
function usedClasses(tsx: string): Set<string> {
  const found = new Set<string>();
  for (const match of tsx.matchAll(/\bstyles\.([A-Za-z_]\w*)/g)) if (match[1]) found.add(match[1]);
  for (const match of tsx.matchAll(/\bstyles\["([^"]+)"\]/g)) if (match[1]) found.add(match[1]);
  return found;
}

describe("data and form components: TSX and CSS Modules agree", () => {
  it.each(COMPONENTS)("%s: every class the component reads is defined in its CSS Module", (name) => {
    const defined = definedClasses(read(name, "module.css"));
    const missing = [...usedClasses(read(name, "tsx"))].filter((key) => !defined.has(key));
    expect(missing).toEqual([]);
  });

  it("defines the classes chosen at run time (sizes, columns, orientation)", () => {
    const has = (name: (typeof COMPONENTS)[number], keys: string[]) => {
      const defined = definedClasses(read(name, "module.css"));
      return keys.filter((key) => !defined.has(key));
    };
    expect(has("input", ["sm", "md", "lg"])).toEqual([]);
    expect(has("search-input", ["sm", "lg"])).toEqual([]);
    expect(has("quantity-input", ["sm", "lg"])).toEqual([]);
    expect(has("form-section", ["cols1", "cols2", "cols3", "cols4"])).toEqual([]);
    expect(has("radio", ["vertical", "horizontal"])).toEqual([]);
    expect(has("data-table", ["toneNeutral", "toneAccent", "toneSuccess", "toneWarning", "toneDanger", "toneInfo"])).toEqual([]);
  });

  it.each(COMPONENTS)("%s: no left- or right-named prop or class is left", (name) => {
    const tsx = read(name, "tsx");
    expect(tsx).not.toMatch(/\b(leftIcon|rightIcon|alignRight|alignLeft)\b/);
    expect(tsx).not.toMatch(/styles\.(left|right)\b/);
    expect(tsx).not.toMatch(/"(left|right)"/);
    expect(stripComments(read(name, "module.css"))).not.toMatch(/\.(left|right|leftIcon|rightIcon|alignRight)\b/);
  });
});

describe("right-to-left: the CSS rules that mirror an icon match the markup", () => {
  it("the page header back arrow: `.back:dir(rtl) svg`, and `back` is on the link", () => {
    expect(stripComments(read("page-header", "module.css"))).toMatch(/\.back:dir\(rtl\) svg\s*\{[^}]*scaleX\(-1\)/);
    expect(read("page-header", "tsx")).toMatch(/className=\{styles\.back\}/);
  });

  it("the breadcrumb separator: `.separator:dir(rtl) > svg`, and the chevron is a direct child of the separator", () => {
    expect(stripComments(read("breadcrumbs", "module.css"))).toMatch(/\.separator:dir\(rtl\) > svg\s*\{[^}]*scaleX\(-1\)/);
    expect(read("breadcrumbs", "tsx")).toMatch(/className=\{styles\.separator\}>\s*<ChevronRight \/>/);
  });

  it("the pagination arrows: `.end > button:dir(rtl) svg`, and previous and next are buttons directly inside `end`", () => {
    expect(stripComments(read("pagination", "module.css"))).toMatch(/\.end > button:dir\(rtl\) svg\s*\{[^}]*scaleX\(-1\)/);
    const tsx = read("pagination", "tsx");
    expect(tsx).toMatch(/<div className=\{styles\.end\}>\s*<IconButton\s+icon=\{<ChevronLeft \/>\}/);
  });

  it("the row-tone edge is a pseudo-element at the inline start, not an inset shadow", () => {
    const css = stripComments(read("data-table", "module.css"));
    expect(css).toMatch(/\.toned td:first-child::before\s*\{[^}]*inset-inline-start: 0/);
    expect(css).not.toMatch(/box-shadow:\s*inset/);
  });
});

describe("FormFooter: the CSS that makes it a sticky bar with the actions at the inline end", () => {
  /** The declarations of the rule whose selector is exactly `selector`. */
  function rule(css: string, selector: string): string {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(stripComments(css))?.[1] ?? "";
  }

  const css = read("form-footer", "module.css");

  it("sticks to the block end of its scroll container, above the form's content", () => {
    const footer = rule(css, ".footer");
    expect(footer).toMatch(/position:\s*sticky/);
    expect(footer).toMatch(/inset-block-end:\s*0/);
    expect(footer).toMatch(/z-index:\s*var\(--z-sticky\)/);
  });

  it("has the kit's look: a bordered, rounded, surface-coloured row that wraps", () => {
    const footer = rule(css, ".footer");
    expect(footer).toMatch(/display:\s*flex/);
    expect(footer).toMatch(/flex-wrap:\s*wrap/);
    expect(footer).toMatch(/border:\s*1px solid var\(--border-default\)/);
    expect(footer).toMatch(/border-radius:\s*var\(--radius-lg\)/);
    expect(footer).toMatch(/background:\s*var\(--bg-surface\)/);
    expect(footer).toMatch(/padding:\s*var\(--space-12\) var\(--space-16\)/);
  });

  it("pushes the actions to the inline end and the status to the inline start, and reverses nothing", () => {
    expect(rule(css, ".actions")).toMatch(/margin-inline-start:\s*auto/);
    expect(rule(css, ".start")).toMatch(/margin-inline-end:\s*auto/);
    expect(stripComments(css)).not.toMatch(/row-reverse|(?<![\w-])direction:|(?<![\w-])order:/);
  });

  it("reads no raw colour, pixel font size or shadow (the Stylelint rules also check this)", () => {
    const text = stripComments(css);
    expect(text).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|font-size:\s*[\d.]+px|box-shadow/i);
  });
});
