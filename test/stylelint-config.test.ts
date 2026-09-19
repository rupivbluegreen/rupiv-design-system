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

  it("rejects physical size and offset properties through the logical-css plugin", async () => {
    const rules = await rulesHit(wrap("width: 10rem"));
    expect(rules.some((rule) => rule.includes("logical"))).toBe(true);
  });

  it("exempts tokens.css from the colour rules, and only tokens.css", async () => {
    const tokens = ":root {\n  --p-teal-600: #03696d;\n  --shadow-md: rgb(0 0 0 / 0.1);\n}\n";
    expect(await rulesHit(tokens, "src/styles/tokens.css")).toEqual([]);
    expect(await rulesHit(tokens, "src/styles/base.css")).toEqual(
      expect.arrayContaining(["color-no-hex", "function-disallowed-list"]),
    );
  });

  it("ignores legacy/", async () => {
    expect(await rulesHit(wrap("color: #fff"), "legacy/ui-next/libs/x/src/x.css")).toEqual([]);
  });
});
