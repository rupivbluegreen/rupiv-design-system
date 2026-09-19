import { describe, expect, it } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { renderBoth } from "../../../test/harness";
import { Tile } from "./tile";

describe("Tile", () => {
  it("shows its icon on a mint circle, hidden from assistive technology, in English and Arabic", () => {
    const views = renderBoth(<Tile icon={<i data-testid="ic" />} />);
    for (const view of [views.en, views.ar]) {
      const tile = view.getByTestId("ic").parentElement as Element;
      expect(tile.getAttribute("aria-hidden")).toBe("true");
      expect(tile.hasAttribute("role")).toBe(false);
      for (const name of ["tile", "mint"]) expect(hasModuleClass(tile, name)).toBe(true);
      expect(hasModuleClass(tile, "square")).toBe(false);
      expect(hasModuleClass(tile, "lg")).toBe(false);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it.each(["mint", "rose", "sky", "sand", "lilac"] as const)("maps the %s tint to its class", (color) => {
    const views = renderBoth(<Tile icon={<i data-testid="ic" />} color={color} />);
    for (const view of [views.en, views.ar]) expect(hasModuleClass(view.getByTestId("ic").parentElement as Element, color)).toBe(true);
  });

  it("maps size and shape to classes", () => {
    const views = renderBoth(<Tile icon={<i data-testid="ic" />} size="lg" shape="square" />);
    for (const view of [views.en, views.ar]) {
      const tile = view.getByTestId("ic").parentElement as Element;
      expect(hasModuleClass(tile, "lg")).toBe(true);
      expect(hasModuleClass(tile, "square")).toBe(true);
    }
  });

  it("with a label it is an image with that name, and no longer hidden", () => {
    const views = renderBoth(<Tile icon={<i />} label="المستخدمون" />);
    for (const view of [views.en, views.ar]) {
      const tile = view.getByRole("img", { name: "المستخدمون" });
      expect(tile.hasAttribute("aria-hidden")).toBe(false);
    }
  });

  it("keeps className", () => {
    const views = renderBoth(<Tile icon={<i data-testid="ic" />} className="mine" />);
    for (const view of [views.en, views.ar]) expect(view.getByTestId("ic").parentElement?.classList.contains("mine")).toBe(true);
  });
});
