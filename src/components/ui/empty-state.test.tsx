import { describe, expect, it } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { renderBoth } from "../../../test/harness";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders the title, description and action, in English and Arabic", () => {
    const views = renderBoth(
      <EmptyState title="لا توجد نتائج" description="جرّب مرشحاً آخر" action={<button type="button">مسح</button>} />,
    );
    for (const view of [views.en, views.ar]) {
      expect(view.getByText("لا توجد نتائج")).toBeTruthy();
      expect(view.getByText("جرّب مرشحاً آخر")).toBeTruthy();
      expect(view.getByRole("button", { name: "مسح" })).toBeTruthy();
    }
    expect(views.en.container.dir).toBe("ltr");
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("shows no description or action wrapper when none is given", () => {
    const views = renderBoth(<EmptyState title="Nothing here" />);
    for (const view of [views.en, views.ar]) {
      expect(view.container.querySelectorAll("p")).toHaveLength(1);
      expect(view.container.querySelectorAll("button")).toHaveLength(0);
    }
  });

  it("has a default inbox icon, hidden from assistive technology, and a custom icon replaces it", () => {
    const views = renderBoth(
      <>
        <EmptyState title="Default" />
        <EmptyState title="Custom" icon={<i data-testid="mine" />} />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const wrappers = Array.from(view.container.querySelectorAll("span[aria-hidden='true']"));
      expect(wrappers).toHaveLength(2);
      expect(wrappers[0]?.querySelector("svg")).not.toBeNull();
      expect(wrappers[1]?.querySelector("[data-testid=mine]")).not.toBeNull();
      expect(wrappers[1]?.querySelector("svg")).toBeNull();
    }
  });

  it("the default tone is plain content: no alert role and no tone class on the icon", () => {
    const views = renderBoth(<EmptyState title="Empty" />);
    for (const view of [views.en, views.ar]) {
      expect(view.queryByRole("alert")).toBeNull();
      const icon = view.container.querySelector("span[aria-hidden='true']");
      expect(icon).not.toBeNull();
      expect(hasModuleClass(icon as Element, "iconDanger")).toBe(false);
      expect(hasModuleClass(icon as Element, "iconWarning")).toBe(false);
    }
  });

  it("tone danger colours the icon and is announced as an alert (the error state)", () => {
    const views = renderBoth(<EmptyState tone="danger" title="حدث خطأ" description="تعذّر تحميل البيانات" />);
    for (const view of [views.en, views.ar]) {
      const alert = view.getByRole("alert");
      expect(alert.textContent).toContain("حدث خطأ");
      const icon = alert.querySelector("span[aria-hidden='true']");
      expect(hasModuleClass(icon as Element, "iconDanger")).toBe(true);
      expect(hasModuleClass(icon as Element, "iconWarning")).toBe(false);
      // The warning triangle goes with the danger tone by default.
      expect(icon?.querySelector("svg")).not.toBeNull();
    }
  });

  it("tone warning colours the icon and is not an alert", () => {
    const views = renderBoth(<EmptyState tone="warning" title="Partial data" />);
    for (const view of [views.en, views.ar]) {
      expect(view.queryByRole("alert")).toBeNull();
      const icon = view.container.querySelector("span[aria-hidden='true']");
      expect(hasModuleClass(icon as Element, "iconWarning")).toBe(true);
      expect(hasModuleClass(icon as Element, "iconDanger")).toBe(false);
    }
  });

  it("a custom icon keeps the tone colour", () => {
    const views = renderBoth(<EmptyState tone="danger" title="Locked" icon={<i data-testid="lock" />} />);
    for (const view of [views.en, views.ar]) {
      const icon = view.getByTestId("lock").parentElement;
      expect(hasModuleClass(icon as Element, "iconDanger")).toBe(true);
    }
  });

  it("compact and className are applied to the root", () => {
    const views = renderBoth(<EmptyState title="Small" compact className="extra" />);
    for (const view of [views.en, views.ar]) {
      const root = view.container.firstElementChild as Element;
      expect(hasModuleClass(root, "compact")).toBe(true);
      expect(root.classList.contains("extra")).toBe(true);
    }
  });
});
