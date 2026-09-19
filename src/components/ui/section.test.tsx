import { describe, expect, it } from "vitest";
import { renderBoth } from "../../../test/harness";
import { Section } from "./section";

describe("Section", () => {
  it("is a <section> with a level-2 heading first, then its children, in English and Arabic", () => {
    const views = renderBoth(
      <Section title="الطلب اليومي">
        <p>المحتوى</p>
      </Section>,
    );
    for (const view of [views.en, views.ar]) {
      expect(view.container.querySelector("section")).not.toBeNull();
      expect(view.getByRole("heading", { level: 2, name: "الطلب اليومي" })).toBeTruthy();
      expect(view.getByText("المحتوى")).toBeTruthy();
      // The header comes before the children.
      const section = view.container.querySelector("section") as Element;
      expect(section.firstElementChild?.tagName).toBe("HEADER");
      expect(section.lastElementChild?.textContent).toBe("المحتوى");
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("shows a description and actions when given, and neither when not", () => {
    const views = renderBoth(
      <>
        <Section title="With" description="وصف قصير" actions={<button type="button">عرض</button>} />
        <Section title="Without" />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const [withAll, without] = Array.from(view.container.querySelectorAll("section")) as HTMLElement[];
      expect(withAll?.textContent).toContain("وصف قصير");
      expect(withAll?.querySelector("button")?.textContent).toBe("عرض");
      expect(without?.querySelector("p")).toBeNull();
      expect(without?.querySelector("button")).toBeNull();
    }
  });

  it("keeps className", () => {
    const views = renderBoth(<Section title="T" className="mine" />);
    for (const view of [views.en, views.ar]) expect(view.container.querySelector("section")?.classList.contains("mine")).toBe(true);
  });
});
