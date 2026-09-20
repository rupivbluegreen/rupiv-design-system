// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Reads the CSS text, never prints it. It proves that the style sheets of the shell and the drawer carry `@media
// print` rules that hide the navigation. It cannot prove what a printed page looks like (page breaks, the rest of the
// content, what a browser does with backgrounds): that needs a print preview or a PDF.

const root = fileURLToPath(new URL("../", import.meta.url));

function read(path: string): string {
  return readFileSync(`${root}${path}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

/** The text between the braces of every `@media print { ... }` block (braces are counted, so nested blocks are safe). */
function printBlocks(css: string): string[] {
  const blocks: string[] = [];
  for (const match of css.matchAll(/@media\s+print\s*\{/g)) {
    let depth = 1;
    let index = (match.index ?? 0) + match[0].length;
    const start = index;
    while (depth > 0 && index < css.length) {
      const char = css[index];
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
      index += 1;
    }
    blocks.push(css.slice(start, index - 1));
  }
  return blocks;
}

/** Body of the rule whose selector list contains `selector`, inside the print blocks. */
function printRule(css: string, selector: string): string | undefined {
  for (const block of printBlocks(css)) {
    for (const match of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectors = (match[1] ?? "").split(",").map((entry) => entry.trim());
      if (selectors.includes(selector)) return (match[2] ?? "").trim().replace(/\s+/g, " ");
    }
  }
  return undefined;
}

describe("print rules in the CSS text", () => {
  const shell = read("src/components/ui/rail-shell.module.css");
  const drawer = read("src/components/ui/drawer.module.css");

  it.each([".rail", ".topbar", ".skip"])("hides the shell's %s when printing", (selector) => {
    expect(printRule(shell, selector)).toMatch(/display\s*:\s*none/);
  });

  it("lets the page use the whole sheet when the rail is gone", () => {
    expect(printRule(shell, ".shell")).toMatch(/display\s*:\s*block/);
    expect(printRule(shell, ".main")).toMatch(/max-inline-size\s*:\s*none/);
  });

  it("hides an open drawer, and with it the scrim (the navigation drawer is a Drawer)", () => {
    expect(printRule(drawer, ".root")).toMatch(/display\s*:\s*none/);
  });

  it("does not hide anything the shell's own print rules did not list", () => {
    const hidden = printBlocks(shell)
      .join("\n")
      .split("}")
      .filter((rule) => /display\s*:\s*none/.test(rule))
      .flatMap((rule) => (rule.split("{")[0] ?? "").split(",").map((entry) => entry.trim()))
      .sort();
    expect(hidden).toEqual([".rail", ".skip", ".topbar"]);
  });

  it("keeps the [data-print=\"hide\"] helper in the base style sheet", () => {
    const base = read("src/styles/base.css");
    expect(printRule(base, '[data-print="hide"]')).toMatch(/display\s*:\s*none/);
  });
});
