// @vitest-environment node
import { fileURLToPath } from "node:url";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";
import config from "../stylelint.config.mjs";

// Proves the design system's Stylelint config rejects what the rules forbid (raw colours, pixel font sizes,
// ad-hoc shadows, physical direction) and accepts token-only, logical-only CSS Modules.

const root = fileURLToPath(new URL("../", import.meta.url));

async function rulesHit(css: string, file = "src/components/ui/example.module.css"): Promise<string[]> {
  const { results } = await stylelint.lint({
    code: css,
    codeFilename: `${root}${file}`,
    config,
    configBasedir: root,
  });
  return (results[0]?.warnings ?? []).map((w) => w.rule);
}

const wrap = (declaration: string): string => `.example {\n  ${declaration};\n}\n`;

describe("design system Stylelint config", () => {
  it("accepts tokens, logical properties, shadow tokens and global/composes", async () => {
    const css = `.example {
  inline-size: 100%;
  margin-inline-start: var(--space-2);
  margin-inline: 0 var(--space-2);
  padding: var(--space-1) calc(var(--space-2) + 2px) var(--space-1);
  padding-block: var(--space-1);
  inset: 0;
  color: var(--text-primary);
  font-size: var(--text-body);
  text-align: start;
  box-shadow: var(--focus-ring);
  transform: translateX(var(--slide-from));
}

.other { box-shadow: none; }
.third { box-shadow: var(--focus-ring), var(--shadow-sm); }
.fourth { box-shadow: var(--focus-ring-danger); }
.fifth { transform: translateX(0); }

:global(.other) .example {
  composes: base from "./base.module.css";
}
`;
    expect(await rulesHit(css)).toEqual([]);
  });

  it.each([
    ["color: #fff", "color-no-hex"],
    ["color: red", "color-named"],
    ["color: rgb(0 0 0)", "function-disallowed-list"],
    ["font-size: 10px", "declaration-property-value-disallowed-list"],
    ["box-shadow: 0 1px 2px black", "declaration-property-value-disallowed-list"],
    ["box-shadow: inset 2px 0 0 var(--accent-solid)", "declaration-property-value-disallowed-list"],
    ["box-shadow: var(--border-strong)", "declaration-property-value-disallowed-list"],
    ["margin-left: 4px", "property-disallowed-list"],
    ["padding-right: 4px", "property-disallowed-list"],
    ["border-left: 1px solid var(--border-subtle)", "property-disallowed-list"],
    ["left: 0", "property-disallowed-list"],
    ["text-align: right", "declaration-property-value-disallowed-list"],
    ["float: left", "declaration-property-value-disallowed-list"],
    ["margin: 1px 2px 3px 4px", "declaration-property-value-disallowed-list"],
    ["padding: 1px var(--a) calc(var(--b) + 2px) 4px", "declaration-property-value-disallowed-list"],
    ["inset: 50% auto auto 50%", "declaration-property-value-disallowed-list"],
    ["transform: translateX(100%)", "declaration-property-value-disallowed-list"],
    ["transform: scale(1) translateX(-8px)", "declaration-property-value-disallowed-list"],
  ])("rejects %s", async (declaration, rule) => {
    expect(await rulesHit(wrap(declaration))).toContain(rule);
  });

  // Value rules added after the first review: shorthands, transforms, positions, origins, fonts, filters.
  const VALUE_RULE = "declaration-property-value-disallowed-list";

  it.each([
    // the translate property and the translate functions with a literal horizontal offset
    ["translate: 10px 0", VALUE_RULE],
    ["translate: 10px", VALUE_RULE],
    ["translate: -50% -50%", VALUE_RULE],
    ["translate: 0.5px 0", VALUE_RULE],
    ["translate: calc(10px + 2px) 0", VALUE_RULE],
    ["transform: translate(10px, 0)", VALUE_RULE],
    ["transform: translate(-50%, -50%)", VALUE_RULE],
    ["transform: translate3d(10px, 0, 0)", VALUE_RULE],
    ["transform: translateX( 10px )", VALUE_RULE],
    ["transform: rotate(4deg) translate(6px 0)", VALUE_RULE],
    ["transform: TRANSLATEX(10px)", VALUE_RULE],
    ["TRANSFORM: translateX(10px)", VALUE_RULE],
    ["-webkit-transform: translateX(10px)", VALUE_RULE],
    // left and right keywords in positions, origins and gradient directions
    ["background-position: left", VALUE_RULE],
    ["background-position: left 4px top 2px", VALUE_RULE],
    ["background: url(x.svg) no-repeat left center", VALUE_RULE],
    ["background-image: linear-gradient(to right, var(--a), var(--b))", VALUE_RULE],
    ["mask-position: left", VALUE_RULE],
    ["object-position: right center", VALUE_RULE],
    ["transform-origin: left", VALUE_RULE],
    ["transform-origin: right top", VALUE_RULE],
    ["perspective-origin: right", VALUE_RULE],
    // vendor and upper-case spellings of left and right
    ["text-align: -webkit-left", VALUE_RULE],
    ["text-align: -moz-left", VALUE_RULE],
    ["text-align: -webkit-right", VALUE_RULE],
    ["text-align: -moz-right", VALUE_RULE],
    ["text-align: LEFT", VALUE_RULE],
    ["float: RIGHT", VALUE_RULE],
    // shorthands whose values differ per side or corner
    ["border-radius: 4px 0 0 4px", VALUE_RULE],
    ["border-radius: 4px 0", VALUE_RULE],
    ["border-radius: 4px 0 0", VALUE_RULE],
    ["border-radius: 0 4px 4px 0", VALUE_RULE],
    ["border-radius: 4px 4px 4px 0", VALUE_RULE],
    ["border-radius: 10px 20px / 5px", VALUE_RULE],
    ["border-radius: 4px / 4px 8px", VALUE_RULE],
    ["border-width: 1px 2px 3px 4px", VALUE_RULE],
    ["border-style: solid none none solid", VALUE_RULE],
    ["border-color: var(--a) var(--b) var(--c) var(--d)", VALUE_RULE],
    ["BORDER-WIDTH: 1px 2px 3px 4px", VALUE_RULE],
    ["scroll-margin: 1px 2px 3px 4px", VALUE_RULE],
    ["scroll-padding: 0 0 0 10px", VALUE_RULE],
    // the physical corner longhands (rejected by the plugin and by the property list)
    ["border-top-left-radius: 4px", "property-disallowed-list"],
    ["border-bottom-right-radius: 4px", "property-disallowed-list"],
    // font sizes in pixels or points, also inside the font shorthand
    ["font-size: 12pt", VALUE_RULE],
    ["font-size: 10PX", VALUE_RULE],
    ["font: 14px/1 sans-serif", VALUE_RULE],
    ["font: 12pt sans-serif", VALUE_RULE],
    ["font: 400 14px/1.4 var(--font-latin)", VALUE_RULE],
    ["font: italic 600 .75pt serif", VALUE_RULE],
    // shadows that are not tokens
    ["filter: drop-shadow(4px 0 0 var(--x))", VALUE_RULE],
    ["filter: brightness(0.9) drop-shadow(0 1px 2px var(--x))", VALUE_RULE],
    ["backdrop-filter: drop-shadow(1px 1px 1px var(--x))", VALUE_RULE],
    ["-webkit-filter: drop-shadow(1px 1px 1px var(--x))", VALUE_RULE],
    ["text-shadow: 1px 1px var(--x)", VALUE_RULE],
    ["-webkit-box-shadow: 0 1px 2px var(--x)", VALUE_RULE],
    // colour functions in any case, and named colours in any case and property
    ["color: RGB(0 0 0)", "function-disallowed-list"],
    ["color: Hsl(0 0% 0%)", "function-disallowed-list"],
    ["color: RGBA(0, 0, 0, 0.5)", "function-disallowed-list"],
    ["color: OKLCH(0.5 0.1 200)", "function-disallowed-list"],
    ["color: COLOR(srgb 1 0 0)", "function-disallowed-list"],
    ["color: RED", "color-named"],
    ["color: white", "color-named"],
    ["background: White", "color-named"],
    ["border-color: black", "color-named"],
    ["outline: 2px solid blue", "color-named"],
    ["background: linear-gradient(red, blue)", "color-named"],
    ["color: #FFF", "color-no-hex"],
  ])("also rejects %s", async (declaration, rule) => {
    expect(await rulesHit(wrap(declaration))).toContain(rule);
  });

  it.each([
    // the direction-aware ways to write the same thing
    "translate: calc(14px * var(--rd-dir)) 0",
    "translate: calc(-16px * var(--rd-dir)) 0",
    "translate: var(--slide-from)",
    "translate: 0 0",
    "translate: 0 8px",
    "translate: 0",
    "translate: none",
    "transform: translate(calc(-50% * var(--rd-dir)), -50%)",
    "transform: translate(var(--x), 0)",
    "transform: translate(0, 10px)",
    "transform: translate3d(0, 10px, 0)",
    "transform: translateX(calc(var(--a) * 2))",
    "transform: translateY(-50%)",
    "transform: translateY(4px)",
    "transform: scaleX(-1)",
    "background-position: calc(50% + 100% * var(--rd-dir)) 0",
    "background-position: center",
    "background: var(--left) no-repeat",
    "background: url(left.png) no-repeat",
    "background-image: linear-gradient(90deg, var(--a), var(--b))",
    "object-position: center",
    "transform-origin: center",
    "transform-origin: top center",
    "transform-origin: var(--origin)",
    "text-align: start",
    "text-align: -webkit-center",
    "text-align: end",
    // radius: equal on both sides, or the logical corner longhands
    "border-radius: 4px",
    "border-radius: 4px 4px",
    "border-radius: 4px 4px 4px",
    "border-radius: var(--radius-xs) var(--radius-xs) 0 0",
    "border-radius: 0 0 4px 4px",
    "border-radius: 50% / 10%",
    "border-radius: 4px 4px 0 0 / 8px 8px 0 0",
    "border-radius: inherit",
    "border-start-start-radius: 4px",
    "border-end-end-radius: 4px",
    // two and three values, or logical longhands
    "border-width: 1px 2px",
    "border-width: 1px 2px 3px",
    "border-style: solid none",
    "border-color: var(--a) var(--b)",
    "border-inline-start-width: 2px",
    "scroll-padding: 0 10px",
    // fonts and shadows from tokens
    "font-size: var(--text-sm)",
    "font-size: 1rem",
    "font: 400 var(--text-body)/1.4 var(--font-latin)",
    "font: var(--text-body)/20px var(--font-latin)",
    "font: inherit",
    "filter: brightness(0.9)",
    "filter: none",
    "filter: drop-shadow(var(--shadow-sm))",
    "text-shadow: none",
    "text-shadow: var(--shadow-xs)",
    "-webkit-box-shadow: var(--shadow-sm)",
    "color: transparent",
    "color: currentColor",
    "color: var(--text-primary)",
  ])("accepts %s", async (declaration) => {
    expect(await rulesHit(wrap(declaration))).toEqual([]);
  });

  it("checks declarations inside @keyframes and @media as well", async () => {
    const css = `@keyframes slide {
  from { translate: 10px 0; }
  to { translate: 0 0; }
}

@media (min-width: 40rem) {
  .example { background-position: right; }
}
`;
    expect(await rulesHit(css)).toEqual([VALUE_RULE, VALUE_RULE]);
  });

  it("rejects physical size and offset properties through the logical-css plugin", async () => {
    const rules = await rulesHit(wrap("width: 10rem"));
    expect(rules.some((rule) => rule.includes("logical"))).toBe(true);
  });

  it("exempts tokens.css from the colour rules, and only tokens.css", async () => {
    const tokens = ":root {\n  --p-teal-600: #03696d;\n  --shadow-md: rgb(0 0 0 / 0.1);\n}\n";
    expect(await rulesHit(tokens, "src/styles/tokens.css")).toEqual([]);
    expect(await rulesHit(":root {\n  --shadow-sm: RGB(0 0 0 / 0.1);\n  --c: RED;\n}\n", "src/styles/tokens.css")).toEqual([]);
    expect(await rulesHit(tokens, "src/styles/base.css")).toEqual(
      expect.arrayContaining(["color-no-hex", "function-disallowed-list"]),
    );
  });

  it("ignores legacy/", async () => {
    expect(await rulesHit(wrap("color: #fff"), "legacy/ui-next/libs/x/src/x.css")).toEqual([]);
  });
});
