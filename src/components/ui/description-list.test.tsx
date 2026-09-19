import { describe, expect, it } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { AR_DISPLAY_LABELS, expectNoDefaultEnglish } from "../../../test/display-labels";
import { renderBoth, renderIn } from "../../../test/harness";
import { DescriptionList, KeyValue } from "./description-list";

describe("DescriptionList", () => {
  it("renders terms and descriptions as a <dl>, in English and Arabic", () => {
    const views = renderBoth(
      <DescriptionList
        items={[
          { label: "المنطقة", value: "RD-C" },
          { label: "المرحلة", value: "توصية" },
        ]}
      />,
    );
    for (const view of [views.en, views.ar]) {
      const terms = view.container.querySelectorAll("dt");
      const values = view.container.querySelectorAll("dd");
      expect(view.container.querySelector("dl")).not.toBeNull();
      expect(Array.from(terms).map((node) => node.textContent)).toEqual(["المنطقة", "المرحلة"]);
      expect(Array.from(values).map((node) => node.textContent)).toEqual(["RD-C", "توصية"]);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("maps columns and dense to classes; two columns by default", () => {
    const views = renderBoth(
      <>
        <DescriptionList items={[{ label: "a", value: "1" }]} />
        <DescriptionList items={[{ label: "b", value: "2" }]} columns={3} dense />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const [first, second] = Array.from(view.container.querySelectorAll("dl"));
      expect(hasModuleClass(first as Element, "cols2")).toBe(true);
      expect(hasModuleClass(second as Element, "cols3")).toBe(true);
      expect(hasModuleClass(second as Element, "dense")).toBe(true);
    }
  });

  it("spreads an item across columns, but never past the number of columns", () => {
    const views = renderBoth(
      <DescriptionList
        columns={2}
        items={[
          { label: "wide", value: "1", span: 4 },
          { label: "narrow", value: "2" },
        ]}
      />,
    );
    for (const view of [views.en, views.ar]) {
      const [wide, narrow] = Array.from(view.container.querySelectorAll("dl > div"));
      expect(hasModuleClass(wide as Element, "span2")).toBe(true);
      expect(hasModuleClass(wide as Element, "span4")).toBe(false);
      expect(hasModuleClass(narrow as Element, "span2")).toBe(false);
    }
  });

  it("shows a dash for an empty value (null, undefined or the empty string) but keeps 0", () => {
    const views = renderBoth(
      <DescriptionList
        items={[
          { label: "a", value: null },
          { label: "b", value: undefined },
          { label: "c", value: "" },
          { label: "d", value: 0 },
        ]}
      />,
    );
    for (const view of [views.en, views.ar]) {
      const values = Array.from(view.container.querySelectorAll("dd"));
      expect(values.map((node) => node.textContent)).toEqual(["—", "—", "—", "0"]);
      expect(hasModuleClass(values[0] as Element, "empty")).toBe(true);
      expect(hasModuleClass(values[3] as Element, "empty")).toBe(false);
    }
  });

  it("shows the application's word for an empty value, with no English default left", () => {
    const view = renderIn("ar", <DescriptionList items={[{ label: "المركبة", value: null }]} />, { labels: AR_DISPLAY_LABELS });
    expect(view.container.querySelector("dd")?.textContent).toBe("غير محدد");
    expectNoDefaultEnglish(view.container);
  });

  it("renders no rows for no items", () => {
    const views = renderBoth(<DescriptionList items={[]} />);
    for (const view of [views.en, views.ar]) expect(view.container.querySelectorAll("dt")).toHaveLength(0);
  });
});

describe("KeyValue", () => {
  it("shows a label and its value, with an emphasised total", () => {
    const views = renderBoth(
      <>
        <KeyValue label="الإجمالي الفرعي" value="120" />
        <KeyValue label="الإجمالي" value="150" emphasis />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      expect(view.getByText("الإجمالي الفرعي")).toBeTruthy();
      expect(view.getByText("150")).toBeTruthy();
      const rows = Array.from(view.container.children);
      expect(hasModuleClass(rows[0] as Element, "emphasis")).toBe(false);
      expect(hasModuleClass(rows[1] as Element, "emphasis")).toBe(true);
    }
  });
});
