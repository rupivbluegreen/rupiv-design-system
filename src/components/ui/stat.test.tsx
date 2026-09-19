import { describe, expect, it } from "vitest";
import { CustomLink, renderBoth } from "../../../test/harness";
import { Stat } from "./stat";

describe("Stat", () => {
  it("renders a plain <a href> by default when it has an href", () => {
    const views = renderBoth(<Stat label="Open cases" value="42" href="/cases" />);
    for (const view of [views.en, views.ar]) {
      const link = view.getByRole("link");
      expect(link.tagName).toBe("A");
      expect(link.getAttribute("href")).toBe("/cases");
      expect(link.textContent).toContain("Open cases");
      expect(link.textContent).toContain("42");
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("uses the provider's link component", () => {
    const views = renderBoth(<Stat label="الحالات المفتوحة" value="42" href="/cases" />, { linkComponent: CustomLink });
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("link").getAttribute("data-custom-link")).toBe("true");
    }
  });

  it("renders a plain block without a link when it has no href", () => {
    const views = renderBoth(<Stat label="Open cases" value="42" unit="cases" delta={{ value: 3.2 }} />, {
      linkComponent: CustomLink,
    });
    for (const view of [views.en, views.ar]) {
      expect(view.queryByRole("link")).toBeNull();
      expect(view.container.textContent).toContain("cases");
    }
  });
});
