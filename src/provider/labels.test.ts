// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_LABELS, createLabelFn, interpolate, resolveLabel } from "./labels";

describe("interpolate", () => {
  it("replaces {name} placeholders, numbers included", () => {
    expect(interpolate("Page {page} of {pages}", { page: 2, pages: 9 })).toBe("Page 2 of 9");
  });

  it("keeps a placeholder that has no parameter, and text without placeholders", () => {
    expect(interpolate("Page {page} of {pages}", { page: 2 })).toBe("Page 2 of {pages}");
    expect(interpolate("Next")).toBe("Next");
    expect(interpolate("{a}{a}", { a: "x" })).toBe("xx");
  });

  it("does not read inherited properties", () => {
    expect(interpolate("{toString}", { a: "x" })).toBe("{toString}");
  });
});

describe("resolveLabel", () => {
  it("uses strings with placeholders, functions, and Arabic text with Western digits", () => {
    const map = {
      "table.range": "{from} to {to}",
      "table.selected": ({ count }: Record<string, string | number>) => (Number(count) === 1 ? "one row" : `${count} rows`),
      "table.rows": "الصفوف {count}",
    };
    expect(resolveLabel(map, "table.range", { from: 1, to: 10 })).toBe("1 to 10");
    expect(resolveLabel(map, "table.selected", { count: 1 })).toBe("one row");
    expect(resolveLabel(map, "table.selected", { count: 3 })).toBe("3 rows");
    expect(resolveLabel(map, "table.rows", { count: 25 })).toBe("الصفوف 25");
  });

  it("calls a label function with an empty object when no parameters are given", () => {
    expect(resolveLabel({ k: (p) => `n=${Object.keys(p).length}` }, "k")).toBe("n=0");
  });

  it("falls back to the English defaults, then to the key itself", () => {
    expect(resolveLabel({}, "no.such.key")).toBe("no.such.key");
    for (const [key, value] of Object.entries(DEFAULT_LABELS)) {
      const expected = typeof value === "function" ? value({}) : value;
      expect(resolveLabel({}, key)).toBe(expected);
    }
  });

  it("createLabelFn binds a map", () => {
    const label = createLabelFn({ hi: "Hi {name}" });
    expect(label("hi", { name: "Sara" })).toBe("Hi Sara");
  });
});
