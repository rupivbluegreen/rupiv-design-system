// @vitest-environment node
//
// The data label set against the components that use it, and against the stand-in Arabic set the tests use.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AR_DATA_LABELS } from "../../../test/data-labels";
import { DATA_LABELS } from "./data";

const SOURCES = [
  "data-table",
  "pagination",
  "filter-bar",
  "file-drop",
  "quantity-input",
  "field",
  "search-input",
  "breadcrumbs",
  "page-header",
] as const;

const PREFIXES = ["dataTable", "pagination", "filterBar", "fileDrop", "quantityInput", "searchInput", "field", "breadcrumbs", "pageHeader"];

function source(name: string): string {
  return readFileSync(new URL(`../../components/ui/${name}.tsx`, import.meta.url), "utf8");
}

/** Every "prefix.name" string literal in the component sources that looks like a label key. */
function keysUsed(): Set<string> {
  const found = new Set<string>();
  const pattern = new RegExp(`"((?:${PREFIXES.join("|")})\\.[A-Za-z]+)"`, "g");
  for (const name of SOURCES) for (const match of source(name).matchAll(pattern)) if (match[1]) found.add(match[1]);
  return found;
}

describe("DATA_LABELS", () => {
  it("has every key the components ask for (an unknown key would show up on screen as the key itself)", () => {
    const known = new Set(Object.keys(DATA_LABELS));
    expect([...keysUsed()].filter((key) => !known.has(key))).toEqual([]);
  });

  it("has no key that no component uses", () => {
    const used = keysUsed();
    expect(Object.keys(DATA_LABELS).filter((key) => !used.has(key))).toEqual([]);
  });

  it("names each key <component>.<name>", () => {
    for (const key of Object.keys(DATA_LABELS)) expect(key).toMatch(new RegExp(`^(${PREFIXES.join("|")})\\.[A-Za-z]+$`));
  });

  it("is a string in English for every key (an application overrides with a function where plurals need one)", () => {
    for (const value of Object.values(DATA_LABELS)) expect(typeof value).toBe("string");
  });

  it("has an entry in the stand-in Arabic set for every key, and none extra", () => {
    expect(Object.keys(AR_DATA_LABELS).sort()).toEqual(Object.keys(DATA_LABELS).sort());
  });

  it("keeps every {placeholder} of the English text in the Arabic text", () => {
    for (const [key, english] of Object.entries(DATA_LABELS)) {
      const arabic = AR_DATA_LABELS[key as keyof typeof AR_DATA_LABELS];
      if (typeof arabic !== "string") continue; // a function builds its own text from the parameters
      const placeholders = english.match(/\{\w+\}/g) ?? [];
      for (const placeholder of placeholders) expect(arabic, `${key} lost ${placeholder}`).toContain(placeholder);
    }
  });
});
