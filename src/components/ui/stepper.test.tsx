import { describe, expect, it } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { AR_DISPLAY_LABELS, expectNoDefaultEnglish } from "../../../test/display-labels";
import { renderBoth, renderIn } from "../../../test/harness";
import { Stepper } from "./stepper";

const steps = [
  { label: "رفع الملف", description: "CSV أو Excel" },
  { label: "مطابقة الأعمدة" },
  { label: "المراجعة" },
];

describe("Stepper", () => {
  it("is an ordered list with one item per step, in English and Arabic", () => {
    const views = renderBoth(<Stepper steps={steps} current={1} />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("list").tagName).toBe("OL");
      expect(view.getAllByRole("listitem")).toHaveLength(3);
      expect(view.getByText("رفع الملف")).toBeTruthy();
      expect(view.getByText("CSV أو Excel")).toBeTruthy();
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("marks steps before the current one completed, the current one current, the rest upcoming", () => {
    const views = renderBoth(<Stepper steps={steps} current={1} />);
    for (const view of [views.en, views.ar]) {
      const [done, now, next] = view.getAllByRole("listitem");
      expect(hasModuleClass(done as Element, "completed")).toBe(true);
      expect(hasModuleClass(now as Element, "current")).toBe(true);
      expect(hasModuleClass(next as Element, "upcoming")).toBe(true);
      expect(now?.getAttribute("aria-current")).toBe("step");
      expect(done?.hasAttribute("aria-current")).toBe(false);
      expect(next?.hasAttribute("aria-current")).toBe(false);
    }
  });

  it("draws a check on finished steps and the step number, in Western digits, on the others", () => {
    const views = renderBoth(<Stepper steps={steps} current={2} />);
    for (const view of [views.en, views.ar]) {
      const [first, second, third] = view.getAllByRole("listitem");
      expect(first?.querySelector("svg")).not.toBeNull();
      expect(second?.querySelector("svg")).not.toBeNull();
      expect(third?.querySelector("svg")).toBeNull();
      expect(third?.textContent).toContain("3");
    }
  });

  it("draws a connector after every step but the last", () => {
    const views = renderBoth(<Stepper steps={steps} current={0} />);
    for (const view of [views.en, views.ar]) {
      const items = view.getAllByRole("listitem");
      expect(items.map((item) => item.querySelectorAll("span[aria-hidden='true']").length)).toEqual([1, 1, 0]);
    }
  });

  it("maps orientation to a class; horizontal by default", () => {
    const views = renderBoth(
      <>
        <Stepper steps={steps} current={0} />
        <Stepper steps={steps} current={0} orientation="vertical" />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const [horizontal, vertical] = view.getAllByRole("list");
      expect(hasModuleClass(horizontal as Element, "horizontal")).toBe(true);
      expect(hasModuleClass(vertical as Element, "vertical")).toBe(true);
    }
  });

  it("tells a screen reader which steps are completed, in English by default", () => {
    const view = renderIn("en", <Stepper steps={steps} current={2} />);
    const [first, second, third] = view.getAllByRole("listitem");
    expect(first?.querySelector(".sr-only")?.textContent).toBe(" (completed)");
    expect(second?.querySelector(".sr-only")?.textContent).toBe(" (completed)");
    expect(third?.querySelector(".sr-only")).toBeNull();
  });

  it("tells it in Arabic when Arabic labels are given, with no English default left", () => {
    const view = renderIn("ar", <Stepper steps={steps} current={2} />, { labels: AR_DISPLAY_LABELS });
    expect(view.getAllByRole("listitem")[0]?.querySelector(".sr-only")?.textContent).toBe(" (مكتملة)");
    expectNoDefaultEnglish(view.container);
  });

  it("is a status display, not a control: nothing in it can take focus", () => {
    const views = renderBoth(<Stepper steps={steps} current={1} />);
    for (const view of [views.en, views.ar]) {
      expect(view.queryAllByRole("button")).toHaveLength(0);
      expect(view.queryAllByRole("link")).toHaveLength(0);
      expect(view.container.querySelectorAll("[tabindex]")).toHaveLength(0);
    }
  });

  it("renders nothing for no steps", () => {
    const views = renderBoth(<Stepper steps={[]} current={0} />);
    for (const view of [views.en, views.ar]) expect(view.queryAllByRole("listitem")).toHaveLength(0);
  });
});
