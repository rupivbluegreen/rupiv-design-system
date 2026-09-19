// @vitest-environment node
// Reads tokens.css and base.css as text. jsdom does not compute the cascade, so what these tests
// can prove is what the files contain: no font loading, every token base.css reads is defined, the
// light tokens and the Arabic rules are present. How it looks is checked by screenshots in the app.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TOKEN_NAMES } from "../lib/tokens";

const read = (file: string): string => readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "");

const tokensCss = stripComments(read("./tokens.css"));
const baseCss = stripComments(read("./base.css"));

/** The body of the first block whose selector starts at the beginning of a line and matches `selector`. */
function blockBody(css: string, selector: RegExp): string {
  const match = selector.exec(css);
  if (match === null) throw new Error(`no block for ${String(selector)}`);
  const open = css.indexOf("{", match.index);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`unclosed block for ${String(selector)}`);
}

/** Custom property declarations in a block: name to value, whitespace collapsed. */
function declarations(block: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const [, name, value] of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    map.set(name as string, (value as string).trim().replace(/\s+/g, " "));
  }
  return map;
}

const light = declarations(blockBody(tokensCss, /^:root\s*\{/m));
const arabic = declarations(blockBody(baseCss, /^:root:lang\(ar\)\s*\{/m));

/** The 30 tokens added to the source: tiles, heat ramp, rail and fly-out colours, fonts, extra sizes, direction sign. */
const ADDED_TOKENS = [
  "--tile-rose", "--tile-sky", "--tile-sand", "--tile-lilac", "--tile-mint",
  "--heat-1", "--heat-2", "--heat-3", "--heat-4", "--heat-5",
  "--rail-bg-top", "--rail-bg-mid", "--rail-bg-bottom", "--rail-text", "--rail-text-strong",
  "--rail-hover-bg", "--rail-active-bg", "--rail-active-text", "--rail-indicator", "--rail-divider",
  "--flyout-bg", "--flyout-text", "--flyout-muted", "--flyout-hover-bg",
  "--font-latin", "--font-arabic", "--icon-xl", "--rail-w", "--drawer-w", "--rd-dir",
];

describe("tokens.css", () => {
  it("has no @font-face and no @import: the app loads the fonts", () => {
    expect(tokensCss).not.toMatch(/@font-face/i);
    expect(tokensCss).not.toMatch(/@import/i);
  });

  it("names the two font families the app bundles, and no font that is never defined", () => {
    expect(light.get("--font-latin")).toMatch(/^"Figtree", /);
    expect(light.get("--font-arabic")).toMatch(/^"IBM Plex Sans Arabic", "Figtree", /);
    expect(light.get("--font-ui")).toBe("var(--font-latin)");
    expect(light.get("--font-display")).toBe("var(--font-latin)");
    expect(light.get("--font-mono")).toBe("var(--font-ui)");
    expect(tokensCss).not.toContain("--font-figtree");
    expect(baseCss).not.toContain("--font-figtree");
  });

  it("declares the 30 added tokens under :root", () => {
    expect(ADDED_TOKENS).toHaveLength(30);
    expect(ADDED_TOKENS.filter((name) => !light.has(name))).toEqual([]);
  });

  it("carries the six changed values (the three font stacks are checked above)", () => {
    expect(Object.fromEntries(
      ["--bg-subtle", "--bg-hover", "--bg-selected", "--border-subtle", "--page-max", "--page-pad"].map((name) => [
        name,
        light.get(name),
      ]),
    )).toEqual({
      "--bg-subtle": "#fbfbfb",
      "--bg-hover": "#f6f6f6",
      "--bg-selected": "#e9f3f3",
      "--border-subtle": "#e9e9e9",
      "--page-max": "1440px",
      "--page-pad": "32px",
    });
  });

  it("keeps the light tokens the components read, and every name TOKEN_NAMES lists", () => {
    expect(TOKEN_NAMES.filter((name) => !light.has(name))).toEqual([]);
    for (const name of [
      "--bg-app", "--bg-surface", "--text-body", "--border-default", "--border-focus",
      "--space-8", "--radius-lg", "--shadow-md", "--control-md", "--focus-ring", "--z-modal", "--dur-base",
      "--text-14", "--weight-semibold", "--leading-ui",
    ]) {
      expect(light.has(name), name).toBe(true);
    }
    expect(light.size).toBeGreaterThanOrEqual(268);
  });

  it("keeps the Cachet-derived category tokens (renaming them is outside A1)", () => {
    for (const name of ["--cat-madder-bg", "--cat-neem-fg", "--cat-turmeric-bg", "--cat-lac-fg", "--cat-kattha-bg"]) {
      expect(light.has(name), name).toBe(true);
    }
  });

  it("sets the direction sign to 1, and to -1 under dir=rtl", () => {
    expect(light.get("--rd-dir")).toBe("1");
    expect(declarations(blockBody(tokensCss, /^:root\[dir="rtl"\]\s*\{/m)).get("--rd-dir")).toBe("-1");
  });

  it("keeps the two frozen dark blocks", () => {
    expect(tokensCss).toContain('@media (prefers-color-scheme: dark)');
    expect(tokensCss).toContain(':root:not([data-theme="light"])');
    expect(tokensCss).toContain(':root[data-theme="dark"]');
    expect(tokensCss).toContain("color-scheme: light;");
  });
});

describe("base.css", () => {
  it("has no @import and no @font-face: the app imports tokens.css and base.css as two files", () => {
    expect(baseCss).not.toMatch(/@import/i);
    expect(baseCss).not.toMatch(/@font-face/i);
  });

  it("reads only tokens that tokens.css defines", () => {
    const used = new Set([...baseCss.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map((match) => match[1] as string));
    expect(used.size).toBeGreaterThan(20);
    expect([...used].filter((name) => !light.has(name))).toEqual([]);
  });

  it("holds no raw colour, not even in the print block", () => {
    expect(baseCss).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(baseCss).not.toMatch(/\b(rgb|rgba|hsl|hsla|oklch|color-mix)\(/i);
  });

  it("switches to the Arabic face, taller leading and a 6% larger root under :root:lang(ar)", () => {
    expect(arabic.get("--font-ui")).toBe("var(--font-arabic)");
    expect(arabic.get("--font-display")).toBe("var(--font-arabic)");
    for (const name of ["--leading-tight", "--leading-snug", "--leading-ui", "--leading-read"]) {
      expect(Number(arabic.get(name)), name).toBeGreaterThan(Number(light.get(name)));
    }
    expect(blockBody(baseCss, /^:root:lang\(ar\)\s*\{/m)).toMatch(/font-size:\s*106\.25%/);
  });

  it("removes letter spacing and uppercase from the text roles that set them, by selector", () => {
    const display = blockBody(baseCss, /^\.t-display-xl:lang\(ar\)/m);
    expect(display).toMatch(/letter-spacing:\s*0;/);
    expect(baseCss).toMatch(/\.t-display-l:lang\(ar\)/);
    expect(baseCss).toMatch(/\.t-display-m:lang\(ar\)/);
    const overline = blockBody(baseCss, /^\.t-overline:lang\(ar\)/m);
    expect(overline).toMatch(/letter-spacing:\s*0;/);
    expect(overline).toMatch(/text-transform:\s*none;/);
  });

  it("has no blanket Arabic rule and no !important on letter-spacing or text-transform", () => {
    expect(baseCss).not.toMatch(/letter-spacing\s*:[^;}]*!important/i);
    expect(baseCss).not.toMatch(/text-transform\s*:[^;}]*!important/i);
    expect(baseCss).not.toMatch(/:lang\(ar\)\s+\*/);
  });

  it("mirrors directional icons with :dir(rtl)", () => {
    expect(blockBody(baseCss, /^\.icon-flip:dir\(rtl\)/m)).toMatch(/transform:\s*scaleX\(-1\)/);
  });

  it("does not set lang or dir: the server does", () => {
    expect(baseCss).not.toMatch(/\[dir=/);
    expect(baseCss).not.toMatch(/\bdirection\s*:/);
  });
});
