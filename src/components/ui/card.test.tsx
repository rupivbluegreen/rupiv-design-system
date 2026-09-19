import { describe, expect, it } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { renderBoth } from "../../../test/harness";
import { Card, CardBody, CardFooter, CardHeader } from "./card";

describe("Card", () => {
  it("renders its children in a medium-padded card, in English and Arabic", () => {
    const views = renderBoth(<Card>محتوى</Card>);
    for (const view of [views.en, views.ar]) {
      const card = view.getByText("محتوى");
      expect(hasModuleClass(card, "padMd")).toBe(true);
      expect(hasModuleClass(card, "card")).toBe(true);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("maps padding, tone and interactive to classes", () => {
    const views = renderBoth(
      <>
        <Card padding="none">a</Card>
        <Card padding="sm">b</Card>
        <Card padding="lg" tone="subtle" interactive>
          c
        </Card>
      </>,
    );
    for (const view of [views.en, views.ar]) {
      expect(hasModuleClass(view.getByText("a"), "padNone")).toBe(true);
      expect(hasModuleClass(view.getByText("b"), "padSm")).toBe(true);
      const last = view.getByText("c");
      expect(hasModuleClass(last, "padLg")).toBe(true);
      expect(hasModuleClass(last, "subtle")).toBe(true);
      expect(hasModuleClass(last, "interactive")).toBe(true);
    }
  });

  it("renders as another element with `as`, and passes href and other attributes through", () => {
    const views = renderBoth(
      <Card as="a" href="/cases" interactive aria-label="Cases card">
        Cases
      </Card>,
    );
    for (const view of [views.en, views.ar]) {
      const link = view.getByRole("link", { name: "Cases card" });
      expect(link.tagName).toBe("A");
      expect(link.getAttribute("href")).toBe("/cases");
    }
  });

  it("keeps className and a native element's own semantics", () => {
    const views = renderBoth(
      <Card as="section" className="mine" aria-label="Region">
        x
      </Card>,
    );
    for (const view of [views.en, views.ar]) {
      const region = view.getByRole("region", { name: "Region" });
      expect(region.classList.contains("mine")).toBe(true);
    }
  });
});

describe("CardHeader, CardBody and CardFooter", () => {
  it("compose a card: title as a heading, subtitle, icon, actions, body and footer", () => {
    const views = renderBoth(
      <Card>
        <CardHeader title="الطلبات" subtitle="آخر ٧ أيام" icon={<i data-testid="ic" />} actions={<button type="button">تصدير</button>} bordered />
        <CardBody>النص</CardBody>
        <CardFooter>
          <button type="button">حفظ</button>
        </CardFooter>
      </Card>,
    );
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("heading", { level: 3, name: "الطلبات" })).toBeTruthy();
      expect(view.getByText("آخر ٧ أيام")).toBeTruthy();
      expect(view.getByRole("button", { name: "تصدير" })).toBeTruthy();
      expect(view.getByText("النص")).toBeTruthy();
      expect(view.getByRole("button", { name: "حفظ" })).toBeTruthy();
      // The header icon is decoration.
      expect(view.getByTestId("ic").parentElement?.getAttribute("aria-hidden")).toBe("true");
      expect(hasModuleClass(view.getByRole("heading").closest("div")?.parentElement as Element, "bordered")).toBe(true);
    }
  });

  it("CardHeader without subtitle, icon or actions renders only the title", () => {
    const views = renderBoth(<CardHeader title="Only" />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("heading", { name: "Only" })).toBeTruthy();
      expect(view.container.querySelector("p")).toBeNull();
      expect(view.container.querySelector("[aria-hidden]")).toBeNull();
    }
  });

  it("CardFooter aligns to the end by default and can align to the start or spread", () => {
    const views = renderBoth(
      <>
        <CardFooter>end</CardFooter>
        <CardFooter align="start">start</CardFooter>
        <CardFooter align="between">between</CardFooter>
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const end = view.getByText("end");
      expect(hasModuleClass(end, "alignStart")).toBe(false);
      expect(hasModuleClass(end, "alignBetween")).toBe(false);
      expect(hasModuleClass(view.getByText("start"), "alignStart")).toBe(true);
      expect(hasModuleClass(view.getByText("between"), "alignBetween")).toBe(true);
    }
  });
});
