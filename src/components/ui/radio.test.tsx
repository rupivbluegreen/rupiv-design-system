import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { RadioGroup, type RadioOption } from "./radio";

// user-event walks a radio group with CSS.escape, which jsdom does not have (the group cancels the native arrow keys
// itself, but a lone radio lets user-event's own emulation run).
beforeAll(() => {
  vi.stubGlobal("CSS", { escape: (value: string) => value.replace(/["\\]/g, "\\$&") });
});
afterAll(() => {
  vi.unstubAllGlobals();
});

// jsdom has no layout: these tests prove the native radios, their states and the arrow keys, including that left
// and right swap in right-to-left. The custom circle and the centring of the hit area are CSS, checked in screenshots.

const options: RadioOption[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta", description: "Second" },
  { value: "c", label: "Gamma" },
];

function Held({ opts = options, onChange }: { opts?: RadioOption[]; onChange?: (v: string) => void }) {
  const [value, setValue] = useState<string | undefined>("a");
  return (
    <RadioGroup
      name="letters"
      aria-label="Letters"
      options={opts}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("RadioGroup", () => {
  it("renders a radiogroup of native radios named by their labels, with descriptions linked", () => {
    const views = renderBoth(<RadioGroup name="letters" aria-label="Letters" options={options} defaultValue="b" />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("radiogroup", { name: "Letters" })).toBeTruthy();
      const radios = view.getAllByRole("radio") as HTMLInputElement[];
      expect(radios.map((r) => r.tagName)).toEqual(["INPUT", "INPUT", "INPUT"]);
      expect(radios.map((r) => r.checked)).toEqual([false, true, false]);
      expect(new Set(radios.map((r) => r.name))).toEqual(new Set(["letters"]));
      expect(view.getByRole("radio", { name: "Beta" }).getAttribute("aria-describedby")).toBe(view.getByText("Second").id);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("does not put aria-orientation on the radiogroup, which the role does not support", () => {
    const view = renderIn("en", <RadioGroup name="n" aria-label="L" options={options} orientation="horizontal" />);
    expect(view.getByRole("radiogroup").hasAttribute("aria-orientation")).toBe(false);
    expect(view.getByRole("radiogroup").className).toContain("horizontal");
  });

  it.each(LOCALE_CASES)("selects with a click on the radio or on its label and reports it ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn(locale, <Held onChange={onChange} />);
    await user.click(view.getByRole("radio", { name: "Gamma" }));
    await user.click(view.getByText("Beta"));
    expect(onChange.mock.calls).toEqual([["c"], ["b"]]);
    expect((view.getByRole("radio", { name: "Beta" }) as HTMLInputElement).checked).toBe(true);
    expect((view.getByRole("radio", { name: "Gamma" }) as HTMLInputElement).checked).toBe(false);
  });

  it("keeps its own value when uncontrolled and waits for the parent when controlled", async () => {
    const user = userEvent.setup();
    const own = renderIn("en", <RadioGroup name="own" aria-label="Own" options={options} defaultValue="a" />);
    await user.click(own.getByRole("radio", { name: "Beta" }));
    expect((own.getByRole("radio", { name: "Beta" }) as HTMLInputElement).checked).toBe(true);
    own.unmount();
    const onChange = vi.fn();
    const controlled = renderIn("en", <RadioGroup name="ctl" aria-label="Ctl" options={options} value="a" onChange={onChange} />);
    await user.click(controlled.getByRole("radio", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith("b");
    expect((controlled.getByRole("radio", { name: "Beta" }) as HTMLInputElement).checked).toBe(false);
  });

  it("enters the group with Tab at the checked radio and leaves it with the next Tab", async () => {
    const user = userEvent.setup();
    const view = renderIn(
      "en",
      <>
        <RadioGroup name="t" aria-label="T" options={options} defaultValue="b" />
        <button type="button">after</button>
      </>,
    );
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Beta" }));
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("button", { name: "after" }));
  });

  it("moves down and right to the next radio in English, up and left to the previous, and wraps", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn("en", <Held onChange={onChange} />);
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Alpha" }));
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Beta" }));
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Gamma" }));
    await user.keyboard("{ArrowRight}"); // wraps to the first
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Alpha" }));
    await user.keyboard("{ArrowLeft}"); // wraps to the last
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Gamma" }));
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Beta" }));
    expect(onChange.mock.calls.map(([v]) => v)).toEqual(["b", "c", "a", "c", "b"]);
    expect((view.getByRole("radio", { name: "Beta" }) as HTMLInputElement).checked).toBe(true);
  });

  it("swaps left and right in right-to-left: the right arrow goes to the previous radio, the left arrow to the next", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn("ar", <Held onChange={onChange} />);
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Alpha" }));
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Beta" }));
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Alpha" }));
    await user.keyboard("{ArrowRight}"); // previous of the first wraps to the last
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Gamma" }));
    await user.keyboard("{ArrowDown}"); // up and down do not swap
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Alpha" }));
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Gamma" }));
    expect(onChange.mock.calls.map(([v]) => v)).toEqual(["b", "a", "c", "a", "c"]);
  });

  it("skips disabled radios when moving with the arrows", async () => {
    const user = userEvent.setup();
    const withOff: RadioOption[] = [
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta", disabled: true },
      { value: "c", label: "Gamma" },
    ];
    const view = renderIn("en", <Held opts={withOff} />);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Gamma" }));
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Alpha" }));
  });

  it("does nothing on the arrows when there is only one enabled radio, and ignores other keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn("en", <Held opts={[{ value: "a", label: "Alpha" }]} onChange={onChange} />);
    await user.tab();
    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(document.activeElement).toBe(view.getByRole("radio", { name: "Alpha" }));
    expect(onChange).not.toHaveBeenCalled();
    view.unmount();
    const many = renderIn("en", <Held onChange={onChange} />);
    await user.tab();
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(many.getByRole("radio", { name: "Alpha" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is disabled as a whole or per option: not selectable, not focusable, dimmed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const whole = renderBoth(<RadioGroup name="w" aria-label="W" options={options} disabled onChange={onChange} defaultValue="a" />);
    for (const view of [whole.en, whole.ar]) {
      for (const radio of view.getAllByRole("radio") as HTMLInputElement[]) expect(radio.disabled).toBe(true);
      await user.click(view.getByText("Beta"));
      expect((view.getByRole("radio", { name: "Alpha" }) as HTMLInputElement).checked).toBe(true);
    }
    expect(onChange).not.toHaveBeenCalled();
    whole.en.unmount();
    whole.ar.unmount();
    const some = renderIn("en", <RadioGroup name="s" aria-label="S" options={[{ value: "a", label: "One" }, { value: "b", label: "Two", disabled: true }]} />);
    expect((some.getByRole("radio", { name: "One" }) as HTMLInputElement).disabled).toBe(false);
    expect((some.getByRole("radio", { name: "Two" }) as HTMLInputElement).disabled).toBe(true);
    expect(some.getByText("Two").closest("div")?.className).toContain("disabled");
  });

  it("names the group through aria-labelledby, or from its id for a Field", () => {
    const view = renderIn(
      "en",
      <>
        <span id="heading">Pick one</span>
        <RadioGroup name="l" aria-labelledby="heading" options={options} />
        <span id="grp-label">Field label</span>
        <RadioGroup name="m" id="grp" options={options} />
      </>,
    );
    expect(view.getByRole("radiogroup", { name: "Pick one" })).toBeTruthy();
    expect(view.getByRole("radiogroup", { name: "Field label" })).toBeTruthy();
  });

  it("gives every radio its own id and label, so a click on the text selects that radio", () => {
    const views = renderBoth(<RadioGroup name="ids" aria-label="Ids" options={options} />);
    for (const view of [views.en, views.ar]) {
      const ids = view.getAllByRole("radio").map((r) => r.id);
      expect(new Set(ids).size).toBe(3);
      expect(view.getByText("Gamma").getAttribute("for")).toBe(view.getByRole("radio", { name: "Gamma" }).id);
    }
  });
});
