import { describe, expect, it } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { renderBoth } from "../../../test/harness";
import { Timeline, type TimelineItem } from "./timeline";

const items: TimelineItem[] = [
  { id: "a", title: "تم الاستلام", time: "14:12", description: "من البوابة", tone: "success", actor: "Ravi Shah" },
  { id: "b", title: "قيد المراجعة", tone: "warning", icon: <i data-testid="ic" /> },
  { title: "Closed" },
];

describe("Timeline", () => {
  it("renders an ordered list with one item per entry, in English and Arabic", () => {
    const views = renderBoth(<Timeline items={items} />);
    for (const view of [views.en, views.ar]) {
      const list = view.getByRole("list");
      expect(list.tagName).toBe("OL");
      expect(view.getAllByRole("listitem")).toHaveLength(3);
    }
    expect(views.en.container.dir).toBe("ltr");
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("shows title, time in a <time> element, description and actor", () => {
    const views = renderBoth(<Timeline items={items} />);
    for (const view of [views.en, views.ar]) {
      const first = view.getAllByRole("listitem")[0] as HTMLElement;
      expect(first.textContent).toContain("تم الاستلام");
      expect(first.querySelector("time")?.textContent).toBe("14:12");
      expect(first.textContent).toContain("من البوابة");
      expect(first.textContent).toContain("Ravi Shah");
      expect(first.querySelector("[role=img]")?.getAttribute("aria-label")).toBe("Ravi Shah");
    }
  });

  it("maps tone to a class, neutral by default", () => {
    const views = renderBoth(<Timeline items={items} />);
    for (const view of [views.en, views.ar]) {
      const [a, b, c] = view.getAllByRole("listitem");
      expect(hasModuleClass(a as Element, "success")).toBe(true);
      expect(hasModuleClass(b as Element, "warning")).toBe(true);
      expect(hasModuleClass(c as Element, "neutral")).toBe(true);
    }
  });

  it("draws a dot, or the icon you give, in a rail that is hidden from assistive technology", () => {
    const views = renderBoth(<Timeline items={items} />);
    for (const view of [views.en, views.ar]) {
      const rails = view.container.querySelectorAll("li > div[aria-hidden='true']");
      expect(rails).toHaveLength(3);
      expect(rails[1]?.querySelector("[data-testid=ic]")).not.toBeNull();
      expect(rails[0]?.querySelector("[data-testid=ic]")).toBeNull();
    }
  });

  it("dense uses a tighter class", () => {
    const views = renderBoth(<Timeline items={items} dense />);
    for (const view of [views.en, views.ar]) expect(hasModuleClass(view.getByRole("list"), "dense")).toBe(true);
  });

  it("renders no items for an empty list", () => {
    const views = renderBoth(<Timeline items={[]} />);
    for (const view of [views.en, views.ar]) expect(view.queryAllByRole("listitem")).toHaveLength(0);
  });
});
