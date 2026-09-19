// @vitest-environment node
//
// Contract between the TSX and the CSS Modules of the display, layout and action components. Under Vitest a CSS Module
// is a proxy that answers every name, so a class the CSS does not define would pass every rendering test and only show
// up in the browser as a missing style. This reads the sources and checks the two sides agree. It also holds the rules
// the right-to-left CSS and the labels depend on, since jsdom can run neither `:dir(rtl)` nor a screenshot.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const COMPONENTS = [
  "empty-state",
  "badge",
  "tag",
  "avatar",
  "alert",
  "stat",
  "card",
  "timeline",
  "skeleton",
  "description-list",
  "kbd",
  "layout",
  "section",
  "progress",
  "stepper",
  "button",
  "accordion",
  "tile",
  "task-list",
] as const;

type Component = (typeof COMPONENTS)[number];

function read(name: string, extension: "tsx" | "module.css"): string {
  return readFileSync(new URL(`./${name}.${extension}`, import.meta.url), "utf8");
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
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

const missingFrom = (name: Component, keys: readonly string[]) => {
  const defined = definedClasses(read(name, "module.css"));
  return keys.filter((key) => !defined.has(key));
};

// The old icon props were named for a side; the pattern is built so this file does not spell them itself.
const SIDE_ICON_PROP = new RegExp(`\\b(?:${["left", "right"].map((side) => `${side}Icon`).join("|")})\\b`);

const TONES = ["neutral", "accent", "success", "warning", "danger", "info"] as const;
const CATEGORY_COLORS = ["indigo", "madder", "turmeric", "neem", "lac", "kattha", "slate"] as const;

describe("display components: TSX and CSS Modules agree", () => {
  it.each(COMPONENTS)("%s: every class the component reads is defined in its CSS Module", (name) => {
    const defined = definedClasses(read(name, "module.css"));
    const missing = [...usedClasses(read(name, "tsx"))].filter((key) => !defined.has(key));
    expect(missing).toEqual([]);
  });

  it("defines the classes chosen at run time (tones, variants, sizes, columns, orientation)", () => {
    expect(missingFrom("badge", [...TONES, "soft", "solid", "outline", "sm", "md"])).toEqual([]);
    expect(missingFrom("alert", TONES)).toEqual([]);
    expect(missingFrom("timeline", TONES)).toEqual([]);
    expect(missingFrom("progress", [...TONES, "sm", "md"])).toEqual([]);
    expect(missingFrom("tag", CATEGORY_COLORS)).toEqual([]);
    expect(missingFrom("avatar", [...CATEGORY_COLORS, "xs", "sm", "md", "lg", "group-xs", "group-sm", "group-md"])).toEqual([]);
    expect(missingFrom("button", ["primary", "secondary", "ghost", "accent", "danger", "link", "sm", "md", "lg"])).toEqual([]);
    expect(missingFrom("skeleton", ["sm", "md", "lg", "full"])).toEqual([]);
    expect(missingFrom("description-list", ["cols1", "cols2", "cols3", "cols4", "span2", "span3", "span4"])).toEqual([]);
    // "upcoming" has no rule on purpose: an unfinished step has the default look.
    expect(missingFrom("stepper", ["horizontal", "vertical", "completed", "current"])).toEqual([]);
    expect(missingFrom("tile", ["mint", "rose", "sky", "sand", "lilac", "square", "lg"])).toEqual([]);
    expect(missingFrom("empty-state", ["iconDanger", "iconWarning", "compact"])).toEqual([]);
    expect(
      missingFrom("layout", [
        ...[0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48].map((gap) => `gap${gap}`),
        ...["start", "center", "end", "baseline", "stretch"].map((align) => `align-${align}`),
        ...["start", "center", "end", "between"].map((justify) => `justify-${justify}`),
        ...[1, 2, 3, 4, 5, 6].map((columns) => `cols${columns}`),
        ...[0, 8, 12, 16, 24].map((spacing) => `spacing${spacing}`),
      ]),
    ).toEqual([]);
  });

  it("every custom property a CSS Module reads is defined in tokens.css or in the module itself", () => {
    const tokens = readFileSync(new URL("../../styles/tokens.css", import.meta.url), "utf8");
    const globallyDefined = new Set([...tokens.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
    const undefinedIn: string[] = [];
    for (const name of COMPONENTS) {
      const css = stripComments(read(name, "module.css"));
      const local = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
      for (const match of css.matchAll(/var\((--[\w-]+)/g)) {
        const property = match[1];
        if (property && !globallyDefined.has(property) && !local.has(property)) undefinedIn.push(`${name}: ${property}`);
      }
    }
    expect(undefinedIn).toEqual([]);
  });
});

describe("display components: nothing physical, nothing hard-coded", () => {
  it.each(COMPONENTS)("%s: no left- or right-named prop or class, and no physical size or position in a style", (name) => {
    const tsx = stripComments(read(name, "tsx"));
    expect(tsx).not.toMatch(SIDE_ICON_PROP);
    expect(tsx).not.toMatch(/styles\.(left|right)\b/);
    expect(tsx).not.toMatch(/"(left|right)"/);
    // A size or position set in a style object must be the logical one: inlineSize, blockSize, insetInlineStart.
    expect(tsx).not.toMatch(/\b(width|height|left|right|top|bottom|minWidth|minHeight|maxWidth|maxHeight)\s*:/);
    expect(tsx).not.toMatch(/\b(margin|padding)(Left|Right)\b/);
    expect(stripComments(read(name, "module.css"))).not.toMatch(/\.(left|right)\b/);
    expect(stripComments(read(name, "module.css"))).not.toMatch(SIDE_ICON_PROP);
  });

  it.each(COMPONENTS)("%s: no English literal in an aria-label, title, placeholder, alt or screen-reader-only text", (name) => {
    const tsx = stripComments(read(name, "tsx"));
    // A literal attribute, or a template string, that holds a word of three or more letters outside ${...}.
    const attributes = [...tsx.matchAll(/\b(?:aria-label|title|placeholder|alt|aria-valuetext)=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map(
      (match) => (match[1] ?? match[2] ?? "").replace(/\$\{[^}]*\}/g, ""),
    );
    const hidden = [...tsx.matchAll(/className="sr-only">([^<{]*)</g)].map((match) => match[1] ?? "");
    const words = [...attributes, ...hidden].filter((text) => /[A-Za-z]{3,}/.test(text));
    expect(words).toEqual([]);
  });
});

describe("right-to-left: the CSS rules that mirror an icon match the markup", () => {
  const mirrored = /:dir\(rtl\)[^{]*\{[^}]*scaleX\(-1\)/;

  it("the Stat trend arrows: `.delta:dir(rtl) svg`, and the arrow is a direct child of the delta chip", () => {
    expect(stripComments(read("stat", "module.css"))).toMatch(/\.delta:dir\(rtl\) svg\s*\{[^}]*scaleX\(-1\)/);
    expect(read("stat", "tsx")).toMatch(/className=\{cn\(styles\.delta, tone\)\}>\s*<Icon /);
  });

  it("the TaskList chevron: `.chevron:dir(rtl) svg`, and the chevron sits inside the `chevron` span", () => {
    expect(stripComments(read("task-list", "module.css"))).toMatch(/\.chevron:dir\(rtl\) svg\s*\{[^}]*scaleX\(-1\)/);
    expect(read("task-list", "tsx")).toMatch(/className=\{styles\.chevron\}[^>]*>\s*<ChevronRight \/>/);
  });

  it("the Accordion chevron turns vertically and is never mirrored, and the Stepper has no direction-dependent rule", () => {
    const accordion = stripComments(read("accordion", "module.css"));
    expect(accordion).not.toMatch(mirrored);
    expect(accordion).toMatch(/\[aria-expanded="true"\] \.chevron\s*\{[^}]*rotate\(180deg\)/);
    const stepper = stripComments(read("stepper", "module.css"));
    expect(stepper).not.toMatch(/:dir\(|scaleX|translateX|rotate/);
  });

  it("the Skeleton shimmer runs with the reading direction through --rd-dir", () => {
    expect(stripComments(read("skeleton", "module.css"))).toMatch(/var\(--rd-dir\)/);
  });
});
