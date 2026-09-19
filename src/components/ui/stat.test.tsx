import { describe, expect, it } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { CustomLink, renderBoth, renderIn } from "../../../test/harness";
import { formatDelta } from "../../lib/format";
import { Stat } from "./stat";

const ARABIC_DIGITS_OR_PERCENT = /[\u0660-\u0669\u06F0-\u06F9\u066A\u066B\u066C]|٪/;

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

describe("Stat delta", () => {
  it("writes the delta for the provider's language: Western digits and an ASCII percent sign in both", () => {
    const views = renderBoth(<Stat label="Median wait" value="2:10" delta={{ value: 3.24 }} />);
    for (const view of [views.en, views.ar]) {
      const text = view.container.textContent ?? "";
      expect(text).toContain(formatDelta(3.24, 1, view.locale));
      expect(text).toContain("+3.2%");
      expect(ARABIC_DIGITS_OR_PERCENT.test(text)).toBe(false);
    }
  });

  it("writes a fall with a true minus sign", () => {
    const views = renderBoth(<Stat label="Acceptance" value="78%" delta={{ value: -3.1 }} />);
    for (const view of [views.en, views.ar]) expect(view.container.textContent).toContain("\u22123.1%");
  });

  it("is good when it moves the way goodWhen says, bad when it does not, flat at zero", () => {
    const views = renderBoth(
      <>
        <Stat label="Up is good" value="1" delta={{ value: 5 }} />
        <Stat label="Up is bad" value="2" delta={{ value: 5, goodWhen: "down" }} />
        <Stat label="Down is good" value="3" delta={{ value: -5, goodWhen: "down" }} />
        <Stat label="No change" value="4" delta={{ value: 0 }} />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const deltaOf = (label: string) => {
        const stat = view.getByText(label).closest("div")?.parentElement as Element;
        return Array.from(stat.querySelectorAll("span")).find((node) => /[+\u2212]?\d/.test(node.textContent ?? "") && node.querySelector("svg")) as Element;
      };
      expect(hasModuleClass(deltaOf("Up is good"), "good")).toBe(true);
      expect(hasModuleClass(deltaOf("Up is bad"), "bad")).toBe(true);
      expect(hasModuleClass(deltaOf("Down is good"), "good")).toBe(true);
      expect(hasModuleClass(deltaOf("No change"), "flat")).toBe(true);
      expect(deltaOf("No change").textContent).toBe("0%");
    }
  });

  it("shows the delta label, and hides the trend arrow from assistive technology", () => {
    const views = renderBoth(<Stat label="Cases" value="9" delta={{ value: 2, label: "vs last week" }} />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByText("vs last week")).toBeTruthy();
      expect(view.container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    }
  });
});

describe("Stat content", () => {
  it("shows label, value, unit, hint and footer, and an icon hidden from assistive technology", () => {
    const views = renderBoth(
      <Stat label="Storage" value="2.9" unit="GB" hint="of 100 GB" footer={<span>Backups</span>} icon={<i data-testid="ic" />} />,
    );
    for (const view of [views.en, views.ar]) {
      for (const text of ["Storage", "2.9", "GB", "of 100 GB", "Backups"]) expect(view.getByText(text)).toBeTruthy();
      expect(view.getByTestId("ic").parentElement?.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("has no delta row without a delta", () => {
    const view = renderIn("en", <Stat label="Cases" value="9" />);
    expect(view.container.querySelector("svg")).toBeNull();
  });
});
