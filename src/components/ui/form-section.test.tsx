import { describe, expect, it } from "vitest";
import { renderBoth } from "../../../test/harness";
import { Field } from "./field";
import { FormGrid, FormSection } from "./form-section";
import { Input } from "./input";

// jsdom has no layout: these tests prove the structure and the names. The two-column layout, the stacking below
// 768px and the direction are CSS, checked in the app's screenshots.

describe("FormSection", () => {
  it("is a region named by its heading, with the content beside it", () => {
    const views = renderBoth(
      <FormSection title="Contact" description="How we reach you" actions={<button type="button">Edit</button>}>
        <p>content</p>
      </FormSection>,
    );
    for (const view of [views.en, views.ar]) {
      const section = view.getByRole("region", { name: "Contact" });
      expect(section.tagName).toBe("SECTION");
      expect(view.getByRole("heading", { level: 2, name: "Contact" })).toBeTruthy();
      expect(view.getByText("How we reach you")).toBeTruthy();
      expect(view.getByRole("button", { name: "Edit" })).toBeTruthy();
      expect(section.contains(view.getByText("content"))).toBe(true);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("renders no description or actions block when none are given", () => {
    const views = renderBoth(
      <FormSection title="Contact">
        <p>content</p>
      </FormSection>,
    );
    for (const view of [views.en, views.ar]) {
      expect(view.container.querySelectorAll("p")).toHaveLength(1);
      expect(view.queryByRole("button")).toBeNull();
    }
  });

  it("gives each section its own heading id", () => {
    const views = renderBoth(
      <>
        <FormSection title="One">
          <p>a</p>
        </FormSection>
        <FormSection title="Two">
          <p>b</p>
        </FormSection>
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const ids = view.getAllByRole("heading", { level: 2 }).map((h) => h.id);
      expect(new Set(ids).size).toBe(2);
      expect(view.getByRole("region", { name: "One" })).toBeTruthy();
      expect(view.getByRole("region", { name: "Two" })).toBeTruthy();
    }
  });
});

describe("FormGrid", () => {
  it("holds its children in a grid with two columns by default and takes 1 to 4", () => {
    const views = renderBoth(
      <>
        <FormGrid>
          <span>a</span>
        </FormGrid>
        <FormGrid columns={1}>
          <span>b</span>
        </FormGrid>
        <FormGrid columns={4} className="mine">
          <span>c</span>
        </FormGrid>
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const [two, one, four] = ["a", "b", "c"].map((text) => view.getByText(text).parentElement);
      expect(two?.className).toContain("cols2");
      expect(one?.className).toContain("cols1");
      expect(four?.className).toContain("cols4");
      expect(four?.className).toContain("mine");
    }
  });

  it("works with Fields inside a section, and lets a child span the full width with data-span", () => {
    const views = renderBoth(
      <FormSection title="Person">
        <FormGrid>
          <Field label="First">
            <Input />
          </Field>
          <Field label="Notes" data-span="full">
            <Input />
          </Field>
        </FormGrid>
      </FormSection>,
    );
    for (const view of [views.en, views.ar]) {
      expect(view.getByLabelText("First")).toBeTruthy();
      expect(view.getByLabelText("Notes").closest("[data-span]")?.getAttribute("data-span")).toBe("full");
    }
  });
});
