// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as status from "./status";
import { TONES, createToneResolver, isTone } from "./status";
import type { Tone } from "./types";

describe("TONES and isTone", () => {
  it("lists all six tones once each", () => {
    expect([...TONES].sort()).toEqual(["accent", "danger", "info", "neutral", "success", "warning"]);
    expect(new Set(TONES).size).toBe(TONES.length);
  });

  it("accepts a tone and nothing else", () => {
    for (const tone of TONES) expect(isTone(tone)).toBe(true);
    for (const bad of ["", "Success", "green", "constructor", "toString", "__proto__", null, undefined, 3, {}, ["danger"]]) {
      expect(isTone(bad)).toBe(false);
    }
  });
});

describe("createToneResolver", () => {
  const resolve = createToneResolver({ Open: "warning", Closed: "success", Failed: "danger", "قيد التنفيذ": "info" });

  it("maps the application's own statuses, in any language", () => {
    expect(resolve("Open")).toBe("warning");
    expect(resolve("Closed")).toBe("success");
    expect(resolve("Failed")).toBe("danger");
    expect(resolve("قيد التنفيذ")).toBe("info");
  });

  it("falls back to neutral for a status that is not in the map", () => {
    expect(resolve("Unknown")).toBe("neutral");
    expect(resolve("")).toBe("neutral");
    expect(resolve("open")).toBe("neutral");
  });

  it("takes another fallback", () => {
    const strict = createToneResolver({ Open: "warning" }, "danger");
    expect(strict("Open")).toBe("warning");
    expect(strict("Unknown")).toBe("danger");
  });

  it("does not treat names every object has as statuses", () => {
    for (const name of ["constructor", "toString", "hasOwnProperty", "__proto__", "valueOf"]) {
      expect(resolve(name)).toBe("neutral");
    }
  });

  it("reads the map when called, so a status that is present is found even if it is falsy-looking", () => {
    const map: Record<string, Tone> = { "0": "accent" };
    expect(createToneResolver(map)("0")).toBe("accent");
  });
});

describe("the module is generic", () => {
  it("has no built-in status map and no domain helper", () => {
    expect("statusTone" in status).toBe(false);
    expect("gradeTone" in status).toBe(false);
    expect(Object.keys(status).every((name) => ["TONES", "createToneResolver", "isTone"].includes(name))).toBe(true);
  });
});
