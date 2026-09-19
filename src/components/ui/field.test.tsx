import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AR_DATA_LABELS, expectNoDefaultEnglish } from "../../../test/data-labels";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { Field } from "./field";
import { Input } from "./input";
import { RadioGroup } from "./radio";

// jsdom has no layout: these tests prove the wiring between label, control, hint and error, and the labels.

describe("Field", () => {
  it("names the control by its label and passes the generated id to it", () => {
    const views = renderBoth(
      <Field label="Full name">
        <Input />
      </Field>,
    );
    for (const view of [views.en, views.ar]) {
      const input = view.getByLabelText("Full name");
      expect(input.tagName).toBe("INPUT");
      expect(input.id).not.toBe("");
      expect(view.getByText("Full name").getAttribute("for")).toBe(input.id);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("clicking the label focuses the control", async () => {
    const user = userEvent.setup();
    const view = renderIn(
      "en",
      <Field label="Full name">
        <Input />
      </Field>,
    );
    await user.click(view.getByText("Full name"));
    expect(document.activeElement).toBe(view.getByLabelText("Full name"));
  });

  it("keeps a control id the caller chose and uses htmlFor for the label", () => {
    const view = renderIn(
      "en",
      <Field label="Code" htmlFor="code-1">
        <Input id="code-1" />
      </Field>,
    );
    expect(view.getByLabelText("Code").id).toBe("code-1");
  });

  it("links the hint and the error to the control and marks it invalid", () => {
    const views = renderBoth(
      <Field label="Email" hint="Work address" error="Enter a valid address">
        <Input />
      </Field>,
    );
    for (const view of [views.en, views.ar]) {
      const input = view.getByLabelText("Email");
      const described = (input.getAttribute("aria-describedby") ?? "").split(" ");
      expect(described).toHaveLength(2);
      expect(view.getByText("Work address").id).toBe(described[0]);
      expect(view.getByText("Enter a valid address").closest("p")?.id).toBe(described[1]);
      expect(input.getAttribute("aria-invalid")).toBe("true");
    }
  });

  it("adds nothing when there is no hint and no error, and does not mark the control invalid", () => {
    const view = renderIn(
      "en",
      <Field label="Email">
        <Input />
      </Field>,
    );
    const input = view.getByLabelText("Email");
    expect(input.hasAttribute("aria-describedby")).toBe(false);
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  it("appends to an aria-describedby the control already has", () => {
    const view = renderIn(
      "en",
      <Field label="Email" hint="Work address">
        <Input aria-describedby="extra" />
      </Field>,
    );
    expect(view.getByLabelText("Email").getAttribute("aria-describedby")).toMatch(/^extra .+/);
  });

  it("shows a required marker that is hidden from screen readers and sets aria-required on the control", () => {
    const views = renderBoth(
      <Field label="Full name" required>
        <Input />
      </Field>,
    );
    for (const view of [views.en, views.ar]) {
      const marker = view.getByText("*");
      expect(marker.getAttribute("aria-hidden")).toBe("true");
      // the accessible name leaves the hidden asterisk out: "Full name", not "Full name*"
      const input = view.getByRole("textbox", { name: "Full name" });
      expect(input.getAttribute("aria-required")).toBe("true");
    }
  });

  it("does not overwrite an aria-required the control sets, and adds none when not required", () => {
    const own = renderIn(
      "en",
      <Field label="A" required>
        <Input aria-required="false" />
      </Field>,
    );
    expect(own.getByRole("textbox", { name: "A" }).getAttribute("aria-required")).toBe("false");
    own.unmount();
    const plain = renderIn(
      "en",
      <Field label="B">
        <Input />
      </Field>,
    );
    expect(plain.getByLabelText("B").hasAttribute("aria-required")).toBe(false);
  });

  it("shows an optional note from the provider's labels, but not for a required field", () => {
    const views = renderBoth(
      <>
        <Field label="Nickname" optional>
          <Input />
        </Field>
        <Field label="Name" optional required>
          <Input />
        </Field>
      </>,
    );
    for (const view of [views.en, views.ar]) expect(view.getAllByText("(optional)")).toHaveLength(1);
  });

  it("names a control that a label cannot name (a radio group) through aria-labelledby", () => {
    const view = renderIn(
      "en",
      <Field label="Channel">
        <RadioGroup
          name="channel"
          options={[
            { value: "a", label: "Email" },
            { value: "b", label: "Phone" },
          ]}
        />
      </Field>,
    );
    expect(view.getByRole("radiogroup", { name: "Channel" })).toBeTruthy();
  });

  it("does not name a child that already has an aria-label", () => {
    const view = renderIn(
      "en",
      <Field label="Channel">
        <RadioGroup name="c" aria-label="Own name" options={[{ value: "a", label: "Email" }]} />
      </Field>,
    );
    expect(view.getByRole("radiogroup", { name: "Own name" })).toBeTruthy();
  });

  it("renders the label action beside the label, and passes root attributes through", () => {
    const view = renderIn(
      "en",
      <Field label="Rate" labelAction={<button type="button">Use default</button>} data-span="full" id="rate-field">
        <Input />
      </Field>,
    );
    expect(view.getByRole("button", { name: "Use default" })).toBeTruthy();
    const root = view.container.querySelector("#rate-field");
    expect(root?.getAttribute("data-span")).toBe("full");
  });

  it("leaves several children alone (no wiring), keeping the label for the caller's htmlFor", () => {
    const view = renderIn(
      "en",
      <Field label="Range" htmlFor="from">
        <Input id="from" />
        <Input id="to" />
      </Field>,
    );
    expect(view.getByLabelText("Range").id).toBe("from");
    expect(view.container.querySelector("#to")?.hasAttribute("aria-describedby")).toBe(false);
  });

  it.each(LOCALE_CASES)("renders no default English string when Arabic labels are given ($locale)", ({ locale }) => {
    const view = renderIn(
      locale,
      <Field label="الاسم" optional hint="كما في الهوية">
        <Input />
      </Field>,
      { labels: AR_DATA_LABELS },
    );
    expect(view.getByText("(اختياري)")).toBeTruthy();
    expectNoDefaultEnglish(view.container);
  });
});
