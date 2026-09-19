// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AR_OVERLAY_LABELS } from "../../../test/overlay-labels";
import { DEFAULT_LABELS } from "../labels";
import { OVERLAY_LABELS } from "./overlays";

const COMPONENTS = ["menu", "popover", "tooltip", "combobox", "modal", "drawer", "toast", "select", "tabs", "segmented-control"];

describe("OVERLAY_LABELS", () => {
  it("has English defaults, keyed '<component>.<name>', all in DEFAULT_LABELS", () => {
    for (const [key, value] of Object.entries(OVERLAY_LABELS)) {
      expect(key).toMatch(/^[a-z][A-Za-z]*\.[a-z][A-Za-z]*$/);
      expect(typeof value === "string" && value.trim().length > 0).toBe(true);
      expect(DEFAULT_LABELS[key]).toBe(value);
    }
  });

  it("only uses components of this set as key prefixes", () => {
    const prefixes = new Set(Object.keys(OVERLAY_LABELS).map((key) => key.split(".")[0]));
    expect([...prefixes].sort()).toEqual(["combobox", "drawer", "modal", "tabs", "toast"]);
  });

  it("has a stand-in Arabic label for every key, and none that the design system does not have", () => {
    expect(Object.keys(AR_OVERLAY_LABELS).sort()).toEqual(Object.keys(OVERLAY_LABELS).sort());
    for (const value of Object.values(AR_OVERLAY_LABELS)) expect(value).toMatch(/[؀-ۿ]/);
  });
});

describe("the overlay components' source", () => {
  it.each(COMPONENTS)("%s.tsx has no literal words in aria-label, title or placeholder, and no fixed locale", (name) => {
    const source = readFileSync(path.join(import.meta.dirname, "../../components/ui", `${name}.tsx`), "utf8");
    // <button aria-label="Close" ...> and default values such as placeholder = "Select…"
    expect(source).not.toMatch(/\b(aria-label|aria-description|aria-roledescription|title|placeholder)="[^"]*[A-Za-z]/);
    expect(source).not.toMatch(/\b(placeholder|emptyText|ariaLabel|label|title)\s*=\s*"/);
    // a language tag chosen in the component instead of coming from the provider
    expect(source).not.toMatch(/["'`]en-[A-Z]{2}["'`]/);
  });
});
