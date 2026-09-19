import { describe, expect, it } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { renderBoth } from "../../../test/harness";
import { Badge, CountBadge } from "./badge";

const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/;

describe("Badge", () => {
  it("renders its text in English and Arabic with a neutral soft medium look by default", () => {
    const views = renderBoth(<Badge>نشط</Badge>);
    for (const view of [views.en, views.ar]) {
      const badge = view.getByText("نشط").parentElement as Element;
      expect(badge.textContent).toBe("نشط");
      expect(hasModuleClass(badge, "neutral")).toBe(true);
      expect(hasModuleClass(badge, "soft")).toBe(true);
      expect(hasModuleClass(badge, "md")).toBe(true);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("maps tone, variant and size to classes", () => {
    const views = renderBoth(
      <Badge tone="danger" variant="outline" size="sm">
        Late
      </Badge>,
    );
    for (const view of [views.en, views.ar]) {
      const badge = view.getByText("Late").parentElement as Element;
      for (const name of ["danger", "outline", "sm"]) expect(hasModuleClass(badge, name)).toBe(true);
    }
  });

  it("draws a dot and an icon as decoration, hidden from assistive technology", () => {
    const views = renderBoth(
      <Badge dot icon={<i data-testid="ic" />}>
        Live
      </Badge>,
    );
    for (const view of [views.en, views.ar]) {
      const hidden = view.container.querySelectorAll("span[aria-hidden='true']");
      expect(hidden).toHaveLength(2);
      expect(view.getByTestId("ic").parentElement?.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("draws neither dot nor icon by default", () => {
    const views = renderBoth(<Badge>Plain</Badge>);
    for (const view of [views.en, views.ar]) expect(view.container.querySelectorAll("[aria-hidden]")).toHaveLength(0);
  });
});

describe("CountBadge", () => {
  it("shows the count, and 99+ above the maximum", () => {
    const views = renderBoth(
      <>
        <CountBadge count={5} />
        <CountBadge count={99} />
        <CountBadge count={120} />
        <CountBadge count={12} max={10} />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const texts = Array.from(view.container.querySelectorAll("span")).map((node) => node.textContent);
      expect(texts).toEqual(["5", "99", "99+", "10+"]);
    }
  });

  it("writes the number with Western digits and grouping in both languages, never Arabic-Indic digits", () => {
    const views = renderBoth(<CountBadge count={1234} max={99999} />);
    for (const view of [views.en, views.ar]) {
      const text = view.container.textContent ?? "";
      expect(text).toBe("1,234");
      expect(ARABIC_INDIC_DIGITS.test(text)).toBe(false);
    }
  });

  it("is a soft neutral pill, and a solid pill for any other tone", () => {
    const views = renderBoth(
      <>
        <CountBadge count={1} />
        <CountBadge count={2} tone="danger" />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const [neutral, danger] = Array.from(view.container.querySelectorAll("span"));
      expect(hasModuleClass(neutral as Element, "soft")).toBe(true);
      expect(hasModuleClass(danger as Element, "solid")).toBe(true);
      expect(hasModuleClass(danger as Element, "danger")).toBe(true);
    }
  });

  it("shows zero as 0", () => {
    const views = renderBoth(<CountBadge count={0} />);
    for (const view of [views.en, views.ar]) expect(view.container.textContent).toBe("0");
  });
});
