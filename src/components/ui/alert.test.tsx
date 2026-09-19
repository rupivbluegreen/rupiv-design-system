import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { AR_DISPLAY_LABELS, expectNoDefaultEnglish } from "../../../test/display-labels";
import { renderBoth, renderIn } from "../../../test/harness";
import { Alert } from "./alert";

describe("Alert", () => {
  it("renders title, body and action, in English and Arabic", () => {
    const views = renderBoth(
      <Alert title="تنبيه" action={<a href="/x">التفاصيل</a>}>
        الموقع الحالي قديم
      </Alert>,
    );
    for (const view of [views.en, views.ar]) {
      const alert = view.getByRole("status");
      expect(alert.textContent).toContain("تنبيه");
      expect(alert.textContent).toContain("الموقع الحالي قديم");
      expect(view.getByRole("link", { name: "التفاصيل" })).toBeTruthy();
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("is a polite status for info, success, neutral and accent, and an alert for warning and danger", () => {
    const tones = ["info", "success", "neutral", "accent", "warning", "danger"] as const;
    const views = renderBoth(
      <>
        {tones.map((tone) => (
          <Alert key={tone} tone={tone} title={tone} />
        ))}
      </>,
    );
    for (const view of [views.en, views.ar]) {
      expect(view.getAllByRole("status")).toHaveLength(4);
      expect(view.getAllByRole("alert")).toHaveLength(2);
      for (const tone of tones) {
        const root = view.getByText(tone).closest("[role]") as Element;
        expect(hasModuleClass(root, tone)).toBe(true);
      }
    }
  });

  it("defaults to the info tone", () => {
    const views = renderBoth(<Alert title="Note" />);
    for (const view of [views.en, views.ar]) expect(hasModuleClass(view.getByRole("status"), "info")).toBe(true);
  });

  it("has a default icon for the tone, hidden from assistive technology, and a custom icon replaces it", () => {
    const views = renderBoth(
      <>
        <Alert title="Default" />
        <Alert title="Custom" icon={<i data-testid="mine" />} />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const icons = Array.from(view.container.querySelectorAll("span[aria-hidden='true']"));
      expect(icons).toHaveLength(2);
      expect(icons[0]?.querySelector("svg")).not.toBeNull();
      expect(icons[1]?.querySelector("[data-testid=mine]")).not.toBeNull();
    }
  });

  it("has no dismiss button without onDismiss", () => {
    const views = renderBoth(<Alert title="Fixed" />);
    for (const view of [views.en, views.ar]) expect(view.queryByRole("button")).toBeNull();
  });

  it("dismisses with the button, named and titled 'Dismiss' by default", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    const view = renderIn("en", <Alert title="Saved" onDismiss={onDismiss} />);
    const button = view.getByRole("button", { name: "Dismiss" });
    expect(button.getAttribute("title")).toBe("Dismiss");
    await user.click(button);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses from the keyboard", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    const view = renderIn("ar", <Alert title="Saved" onDismiss={onDismiss} />);
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("button"));
    await user.keyboard("{Enter}");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("names the dismiss button in Arabic when Arabic labels are given, with no English default", () => {
    const view = renderIn("ar", <Alert title="تم الحفظ" onDismiss={() => {}} />, { labels: AR_DISPLAY_LABELS });
    const button = view.getByRole("button", { name: "إغلاق التنبيه" });
    expect(button.getAttribute("title")).toBe("إغلاق التنبيه");
    expectNoDefaultEnglish(view.container);
  });
});
