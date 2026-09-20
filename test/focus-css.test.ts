// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Reads the CSS text, never renders it. It proves that no `:focus-visible` rule removes the outline without putting
// another indicator in its place, and it pins the controls that rely on the soft focus ring alone. It cannot prove that
// an indicator is visible enough (WCAG asks for 3:1 against its surroundings: that needs computed colours), that an
// ancestor's `overflow` does not clip it, or that the control can be reached by keyboard. Those need a browser.

const root = fileURLToPath(new URL("../", import.meta.url));
const src = join(root, "src");

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith(".css") ? [path] : [];
  });
}

interface Rule {
  file: string;
  selector: string;
  body: string;
}

/** Every innermost `selector { declarations }` block, also inside @media. Comments are removed first. */
function rulesOf(file: string): Rule[] {
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    file: relative(root, file),
    selector: (match[1] ?? "").trim().replace(/\s+/g, " "),
    body: (match[2] ?? "").trim().replace(/\s+/g, " "),
  }));
}

const rules = cssFiles(src).flatMap(rulesOf);
const focusRules = rules.filter((rule) => /:focus-visible/.test(rule.selector));
const removesOutline = (rule: Rule) => /(?:^|;|\s)outline\s*:\s*(?:none|0)\s*(?:;|$)/.test(rule.body);
const hasSoftRing = (rule: Rule) => /box-shadow\s*:\s*var\(--focus-ring[\w-]*\)/.test(rule.body);
const hasFocusBorder = (rule: Rule) => /border-color\s*:\s*var\(--(?:border-focus|danger-solid)\)/.test(rule.body);
const hasSolidOutline = (rule: Rule) => /outline\s*:\s*[1-9]\d*px\s+solid\s+var\(--[\w-]+\)/.test(rule.body);

// Controls whose `:focus-visible` rule removes the outline and shows only the soft focus ring (3px, 28% teal: about
// 1.5:1 against white, below the 3:1 WCAG asks for). This is the reference kit's look, kept as it was. Fixing one
// means giving it `outline: 2px solid var(--border-focus)` and deleting its line here.
const SOFT_RING_ONLY = [
  "src/components/ui/alert.module.css .close:focus-visible",
  "src/components/ui/breadcrumbs.module.css .link:focus-visible",
  "src/components/ui/button.module.css .root:focus-visible",
  "src/components/ui/data-table.module.css .bulkClear:focus-visible",
  "src/components/ui/data-table.module.css .sortButton:focus-visible",
  "src/components/ui/drawer.module.css .close:focus-visible",
  "src/components/ui/file-drop.module.css .remove:focus-visible",
  "src/components/ui/filter-bar.module.css .chipRemove:focus-visible",
  "src/components/ui/filter-bar.module.css .clearAll:focus-visible",
  "src/components/ui/filter-bar.module.css .filterChip:focus-visible",
  "src/components/ui/modal.module.css .close:focus-visible",
  "src/components/ui/pagination.module.css .page:focus-visible",
  "src/components/ui/search-input.module.css .clear:focus-visible",
  "src/components/ui/segmented-control.module.css .item:focus-visible",
  "src/components/ui/switch.module.css .track:focus-visible",
  "src/components/ui/tabs.module.css .tab:focus-visible",
  "src/components/ui/tag.module.css .remove:focus-visible",
  "src/components/ui/toast.module.css .close:focus-visible",
];

describe("focus indicators in the CSS text", () => {
  it("finds the focus rules it is meant to check", () => {
    expect(focusRules.length).toBeGreaterThan(30);
    expect(focusRules.filter(removesOutline).length).toBeGreaterThan(15);
  });

  it("keeps an indicator in every :focus-visible rule that removes the outline", () => {
    const bare = focusRules
      .filter(removesOutline)
      .filter((rule) => !hasSoftRing(rule) && !hasFocusBorder(rule) && !hasSolidOutline(rule))
      .map((rule) => `${rule.file} ${rule.selector}`);
    expect(bare).toEqual([]);
  });

  it("lists exactly the controls that show only the soft focus ring", () => {
    const softOnly = focusRules
      .filter(removesOutline)
      .filter((rule) => hasSoftRing(rule) && !hasFocusBorder(rule) && !hasSolidOutline(rule))
      .map((rule) => `${rule.file} ${rule.selector}`)
      .sort();
    expect(softOnly).toEqual([...SOFT_RING_ONLY].sort());
  });

  it("gives the top bar's brand link and its icon buttons a solid 2px outline", () => {
    const shell = focusRules.filter((rule) => rule.file.endsWith("rail-shell.module.css"));
    for (const selector of [".brand:focus-visible", ".iconButton:focus-visible"]) {
      const rule = shell.find((entry) => entry.selector === selector);
      expect(rule, selector).toBeDefined();
      expect(rule?.body, selector).toMatch(/outline\s*:\s*2px\s+solid\s+var\(--border-focus\)/);
      expect(rule?.body, selector).toMatch(/outline-offset\s*:\s*2px/);
    }
  });

  it("keeps the global 2px solid outline for everything a component does not restyle", () => {
    const global = rules.find((rule) => rule.file === "src/styles/base.css" && rule.selector === ":focus-visible");
    expect(global?.body).toMatch(/outline\s*:\s*2px\s+solid\s+var\(--border-focus\)/);
  });
});
