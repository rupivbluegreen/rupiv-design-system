// @vitest-environment node
import { describe, expect, it } from "vitest";
import { textCollator } from "./intl";

describe("textCollator", () => {
  it("compares numbers inside text as numbers", () => {
    expect(["item 10", "item 2", "item 1"].sort(textCollator("en").compare)).toEqual(["item 1", "item 2", "item 10"]);
  });

  it("ignores case and accents", () => {
    expect(textCollator("en").compare("apple", "APPLE")).toBe(0);
    expect(textCollator("en").compare("resume", "résumé")).toBe(0);
  });

  it("follows the locale's alphabet", () => {
    expect(["Zebra", "Ärlig", "Apa"].sort(textCollator("sv").compare)).toEqual(["Apa", "Zebra", "Ärlig"]);
    expect(["Zebra", "Ärlig", "Apa"].sort(textCollator("en").compare)).toEqual(["Apa", "Ärlig", "Zebra"]);
    expect(["جيم", "ألف", "باء"].sort(textCollator("ar").compare)).toEqual(["ألف", "باء", "جيم"]);
  });

  it("caches per locale and falls back to English for a bad tag", () => {
    expect(textCollator("ar")).toBe(textCollator("ar"));
    expect(textCollator("bad tag!").compare("a", "b")).toBeLessThan(0);
  });
});
