import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { Checkbox } from "./checkbox";

// jsdom has no layout: these tests prove the native input, its states and the keyboard. The custom box, the check mark
// and the centring of the hit area in right-to-left are CSS, checked in the app's screenshots.

function Held({ onChange }: { onChange?: (checked: boolean) => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      label="Accept"
      checked={checked}
      onChange={(event) => {
        setChecked(event.target.checked);
        onChange?.(event.target.checked);
      }}
    />
  );
}

describe("Checkbox", () => {
  it("is a native checkbox named by its label, with the description linked to it", () => {
    const views = renderBoth(<Checkbox label="Send updates" description="Once a week" />);
    for (const view of [views.en, views.ar]) {
      const box = view.getByRole("checkbox", { name: "Send updates" }) as HTMLInputElement;
      expect(box.tagName).toBe("INPUT");
      expect(box.type).toBe("checkbox");
      expect(view.getByText("Once a week").id).toBe(box.getAttribute("aria-describedby"));
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("needs an aria-label when it has no visible label, and then renders no label element", () => {
    const views = renderBoth(<Checkbox aria-label="Select row 4" />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("checkbox", { name: "Select row 4" })).toBeTruthy();
      expect(view.container.querySelector("label")).toBeNull();
    }
  });

  it.each(LOCALE_CASES)("toggles with a click on the box or on the label ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn(locale, <Held onChange={onChange} />);
    const box = view.getByRole("checkbox") as HTMLInputElement;
    await user.click(box);
    expect(box.checked).toBe(true);
    await user.click(view.getByText("Accept"));
    expect(box.checked).toBe(false);
    expect(onChange.mock.calls).toEqual([[true], [false]]);
  });

  it("toggles with Space, is reached by Tab, and Enter does not toggle it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn("en", <Held onChange={onChange} />);
    await user.tab();
    const box = view.getByRole("checkbox") as HTMLInputElement;
    expect(document.activeElement).toBe(box);
    await user.keyboard(" ");
    expect(box.checked).toBe(true);
    await user.keyboard("{Enter}");
    expect(box.checked).toBe(true);
    await user.keyboard(" ");
    expect(box.checked).toBe(false);
    expect(onChange.mock.calls).toEqual([[true], [false]]);
  });

  it("works uncontrolled with defaultChecked", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <Checkbox label="Remember" defaultChecked />);
    const box = view.getByRole("checkbox") as HTMLInputElement;
    expect(box.checked).toBe(true);
    await user.click(box);
    expect(box.checked).toBe(false);
  });

  it("shows the mixed state through the indeterminate property and aria-checked", () => {
    const views = renderBoth(<Checkbox label="Some" indeterminate onChange={() => {}} />);
    for (const view of [views.en, views.ar]) {
      const box = view.getByRole("checkbox") as HTMLInputElement;
      expect(box.indeterminate).toBe(true);
      expect(box.getAttribute("aria-checked")).toBe("mixed");
    }
    const plain = renderIn("en", <Checkbox label="None" />);
    expect((plain.getByRole("checkbox") as HTMLInputElement).indeterminate).toBe(false);
    expect(plain.getByRole("checkbox").hasAttribute("aria-checked")).toBe(false);
  });

  it("sets indeterminate again after a click if the parent still asks for it", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <Checkbox label="Some" indeterminate onChange={() => {}} />);
    const box = view.getByRole("checkbox") as HTMLInputElement;
    await user.click(box); // the browser clears indeterminate on a click
    expect(box.indeterminate).toBe(true);
  });

  it("follows indeterminate as the prop changes", () => {
    const view = render(<Checkbox label="Some" onChange={() => {}} />);
    const box = view.getByRole("checkbox") as HTMLInputElement;
    expect(box.indeterminate).toBe(false);
    view.rerender(<Checkbox label="Some" indeterminate onChange={() => {}} />);
    expect(box.indeterminate).toBe(true);
    view.rerender(<Checkbox label="Some" onChange={() => {}} />);
    expect(box.indeterminate).toBe(false);
  });

  it("is disabled: skipped by Tab, ignores clicks and keys, and dims its label", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const views = renderBoth(<Checkbox label="Locked" disabled onChange={onChange} />);
    for (const view of [views.en, views.ar]) {
      const box = view.getByRole("checkbox") as HTMLInputElement;
      expect(box.disabled).toBe(true);
      await user.click(box);
      await user.click(view.getByText("Locked"));
      expect(box.checked).toBe(false);
      expect(view.getByText("Locked").closest("span[class]")?.parentElement?.className).toContain("disabled");
    }
    await user.tab();
    expect(document.activeElement).toBe(document.body);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("marks the error state through aria-invalid on the native input", () => {
    const views = renderBoth(<Checkbox label="Agree" aria-invalid="true" />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("checkbox").getAttribute("aria-invalid")).toBe("true");
    }
  });

  it("forwards its ref to the native input, and generates distinct ids", () => {
    let node: HTMLInputElement | null = null;
    const views = renderBoth(
      <>
        <Checkbox
          label="One"
          ref={(el) => {
            node = el;
          }}
        />
        <Checkbox label="Two" />
      </>,
    );
    expect(node).toBe(views.ar.getByRole("checkbox", { name: "One" }));
    for (const view of [views.en, views.ar]) {
      const ids = view.getAllByRole("checkbox").map((box) => box.id);
      expect(new Set(ids).size).toBe(2);
    }
  });
});
