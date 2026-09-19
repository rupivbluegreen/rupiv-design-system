import { afterEach, describe, expect, it, vi } from "vitest";
import { readToken, readTokens, TOKEN_NAMES } from "./tokens";

const html = document.documentElement;

afterEach(() => {
  vi.unstubAllGlobals();
  html.removeAttribute("style");
});

describe("readToken", () => {
  it("returns the value set on <html>, trimmed", () => {
    html.style.setProperty("--chart-1", "  #0b7b7d  ");
    expect(readToken("--chart-1")).toBe("#0b7b7d");
  });

  it("returns an empty string for a token that is not defined", () => {
    expect(readToken("--not-a-token")).toBe("");
  });

  it("reads from the element it is given, not from <html>", () => {
    html.style.setProperty("--bg-surface", "#ffffff");
    const scope = document.createElement("div");
    scope.style.setProperty("--bg-surface", "#141720");
    document.body.append(scope);
    expect(readToken("--bg-surface", scope)).toBe("#141720");
    expect(readToken("--bg-surface")).toBe("#ffffff");
  });

  it("rejects a name that is not a custom property", () => {
    expect(() => readToken("bg-surface")).toThrow(TypeError);
    expect(() => readToken("color")).toThrow(/start with "--"/);
  });

  it("throws a clear error, and does not return empty values, when there is no DOM", () => {
    vi.stubGlobal("document", undefined);
    expect(() => readToken("--chart-1")).toThrow(/needs a browser DOM/);
  });
});

describe("readTokens", () => {
  it("returns exactly the names asked for", () => {
    html.style.setProperty("--chart-1", "#0b7b7d");
    html.style.setProperty("--chart-2", "#1b9a88");
    const values = readTokens(["--chart-1", "--chart-2", "--chart-3"]);
    expect(values).toEqual({ "--chart-1": "#0b7b7d", "--chart-2": "#1b9a88", "--chart-3": "" });
  });

  it("returns every name in TOKEN_NAMES when it is called with no names", () => {
    html.style.setProperty("--text-title", "#131313");
    const values = readTokens();
    expect(Object.keys(values).sort()).toEqual([...TOKEN_NAMES].sort());
    expect(values["--text-title"]).toBe("#131313");
    expect(values["--bg-app"]).toBe("");
  });

  it("reads from the element it is given", () => {
    html.style.setProperty("--chart-1", "#0b7b7d");
    const scope = document.createElement("section");
    scope.style.setProperty("--chart-1", "#3cb6b4");
    document.body.append(scope);
    expect(readTokens(["--chart-1"], scope)).toEqual({ "--chart-1": "#3cb6b4" });
  });

  it("keeps a colour function as written (custom properties are not evaluated)", () => {
    html.style.setProperty("--bg-overlay", "rgb(13 15 22 / 0.48)");
    expect(readTokens(["--bg-overlay"])).toEqual({ "--bg-overlay": "rgb(13 15 22 / 0.48)" });
  });

  it("rejects a name that is not a custom property, before it reads anything", () => {
    expect(() => readTokens(["--chart-1", "chart-2"])).toThrow(TypeError);
  });

  it("throws a clear error when there is no DOM", () => {
    vi.stubGlobal("document", undefined);
    expect(() => readTokens()).toThrow(/needs a browser DOM/);
    expect(() => readTokens([])).toThrow(/needs a browser DOM/);
  });
});

describe("TOKEN_NAMES", () => {
  it("lists only custom property names, each once", () => {
    expect(TOKEN_NAMES.every((name) => /^--[a-z0-9-]+$/.test(name))).toBe(true);
    expect(new Set(TOKEN_NAMES).size).toBe(TOKEN_NAMES.length);
  });

  it("covers the colour groups canvas code needs", () => {
    const has = (prefix: string): boolean => TOKEN_NAMES.some((name) => name.startsWith(prefix));
    for (const prefix of ["--bg-", "--text-", "--border-", "--chart-", "--heat-"]) expect(has(prefix)).toBe(true);
    for (const tone of ["neutral", "accent", "success", "warning", "danger", "info"]) {
      for (const part of ["bg", "border", "text", "solid"]) {
        expect(TOKEN_NAMES).toContain(`--${tone}-${part}`);
      }
    }
    for (const n of [1, 2, 3, 4, 5, 6]) expect(TOKEN_NAMES).toContain(`--chart-${n}`);
  });

  it("holds no font size, which the --text-* prefix could be mistaken for", () => {
    expect(TOKEN_NAMES.filter((name) => /^--text-\d+$/.test(name))).toEqual([]);
  });
});
