import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AR_DATA_LABELS, expectNoDefaultEnglish } from "../../../test/data-labels";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { QuantityInput } from "./quantity-input";

// jsdom has no layout: these tests prove the value handling, the keys, the labels and the number format, not how the
// steppers and the unit sit in right-to-left.

/**
 * The input selects its text one animation frame after it gets focus (a mouse-up right after focus would undo an
 * immediate select). Typing before that frame lets the late select() replace what was typed, so tests wait for it.
 */
const focusSettled = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

/** Holds the value the way an application does, so the input can be typed into. */
function Held(props: { start?: number; min?: number; max?: number; step?: number; onChange?: (n: number) => void; uom?: string }) {
  const [value, setValue] = useState(props.start ?? 0);
  return (
    <QuantityInput
      aria-label="Quantity"
      value={value}
      min={props.min}
      max={props.max}
      step={props.step}
      uom={props.uom}
      onChange={(n) => {
        setValue(n);
        props.onChange?.(n);
      }}
    />
  );
}

describe("QuantityInput", () => {
  it("renders a spinbutton with the value, limits and unit in English and Arabic", () => {
    const views = renderBoth(<QuantityInput aria-label="Quantity" value={12} min={0} max={40} uom="people" />);
    for (const view of [views.en, views.ar]) {
      const input = view.getByRole("spinbutton", { name: "Quantity" }) as HTMLInputElement;
      expect(input.value).toBe("12");
      expect(input.getAttribute("aria-valuenow")).toBe("12");
      expect(input.getAttribute("aria-valuemin")).toBe("0");
      expect(input.getAttribute("aria-valuemax")).toBe("40");
      expect(input.getAttribute("aria-valuetext")).toBe("12 people");
      expect(view.getByText("people")).toBeTruthy();
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("formats the value with grouping and up to three decimals, with Western digits, in both languages", () => {
    const views = renderBoth(<QuantityInput aria-label="Quantity" value={1234567.891234} />);
    for (const view of [views.en, views.ar]) {
      expect((view.getByRole("spinbutton") as HTMLInputElement).value).toBe("1,234,567.891");
    }
  });

  it("starts from defaultValue, then min, then 0", () => {
    const views = renderBoth(
      <>
        <QuantityInput aria-label="a" defaultValue={7} />
        <QuantityInput aria-label="b" min={3} />
        <QuantityInput aria-label="c" />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      expect((view.getByRole("spinbutton", { name: "a" }) as HTMLInputElement).value).toBe("7");
      expect((view.getByRole("spinbutton", { name: "b" }) as HTMLInputElement).value).toBe("3");
      expect((view.getByRole("spinbutton", { name: "c" }) as HTMLInputElement).value).toBe("0");
    }
  });

  it.each(LOCALE_CASES)("steps with the buttons and reports each change ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn(locale, <Held start={5} step={2.5} onChange={onChange} />);
    await user.click(view.getByRole("button", { name: "Increase" }));
    await user.click(view.getByRole("button", { name: "Increase" }));
    await user.click(view.getByRole("button", { name: "Decrease" }));
    expect(onChange.mock.calls).toEqual([[7.5], [10], [7.5]]);
    expect((view.getByRole("spinbutton") as HTMLInputElement).value).toBe("7.5");
  });

  it("disables a stepper at its limit and clamps every result", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <Held start={9} min={8} max={10} step={5} />);
    await user.click(view.getByRole("button", { name: "Increase" }));
    expect((view.getByRole("spinbutton") as HTMLInputElement).value).toBe("10");
    expect(view.getByRole("button", { name: "Increase" })).toHaveProperty("disabled", true);
    await user.click(view.getByRole("button", { name: "Decrease" }));
    expect((view.getByRole("spinbutton") as HTMLInputElement).value).toBe("8");
    expect(view.getByRole("button", { name: "Decrease" })).toHaveProperty("disabled", true);
  });

  it("steps with the arrow keys and takes the stepper buttons out of the tab order", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn("en", <Held start={1} onChange={onChange} />);
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("spinbutton"));
    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowDown}");
    expect(onChange.mock.calls).toEqual([[2], [3], [2]]);
    expect(view.getByRole("button", { name: "Increase" }).getAttribute("tabindex")).toBe("-1");
    expect(view.getByRole("button", { name: "Decrease" }).getAttribute("tabindex")).toBe("-1");
    await user.tab();
    expect(document.activeElement).not.toBe(view.getByRole("button", { name: "Increase" }));
  });

  it("commits typed text on blur and on Enter, and drops it on Escape", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn("en", <Held start={1} min={0} max={100} onChange={onChange} />);
    const input = view.getByRole("spinbutton") as HTMLInputElement;
    await user.click(input);
    await focusSettled();
    await user.keyboard("{Control>}a{/Control}42");
    expect(input.value).toBe("42");
    expect(onChange).not.toHaveBeenCalled(); // still typing
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(42);
    await user.keyboard("{Control>}a{/Control}7{Escape}");
    expect(input.value).toBe("42");
    await user.keyboard("{Control>}a{/Control}500");
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith(100); // clamped to max
    expect(input.value).toBe("100");
  });

  it("accepts digits and separators from an Arabic keyboard", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn("ar", <Held start={0} onChange={onChange} />);
    const input = view.getByRole("spinbutton") as HTMLInputElement;
    await user.click(input);
    await focusSettled();
    await user.keyboard("{Control>}a{/Control}١٢٣");
    expect(input.value).toBe("123");
    await user.keyboard("{Control>}a{/Control}٣٫٥");
    expect(input.value).toBe("3.5");
    await user.keyboard("{Control>}a{/Control}۱٬۲۰۰");
    expect(input.value).toBe("1200");
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith(1200);
    expect(input.value).toBe("1,200");
  });

  it("ignores letters and keeps a lone minus or dot from becoming a value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn("en", <Held start={5} onChange={onChange} />);
    const input = view.getByRole("spinbutton") as HTMLInputElement;
    await user.click(input);
    await focusSettled();
    await user.keyboard("{Control>}a{/Control}{Backspace}abc");
    expect(input.value).toBe("");
    await user.keyboard("-");
    expect(input.value).toBe("-");
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("5");
  });

  it("is disabled as a whole: input and both steppers", () => {
    const views = renderBoth(<QuantityInput aria-label="Quantity" value={3} disabled />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("spinbutton")).toHaveProperty("disabled", true);
      expect(view.getByRole("button", { name: "Increase" })).toHaveProperty("disabled", true);
      expect(view.getByRole("button", { name: "Decrease" })).toHaveProperty("disabled", true);
    }
  });

  it("shows the error state through invalid or aria-invalid", () => {
    const views = renderBoth(
      <>
        <QuantityInput aria-label="a" value={1} invalid />
        <QuantityInput aria-label="b" value={1} aria-invalid="true" />
        <QuantityInput aria-label="c" value={1} />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("spinbutton", { name: "a" }).getAttribute("aria-invalid")).toBe("true");
      expect(view.getByRole("spinbutton", { name: "b" }).getAttribute("aria-invalid")).toBe("true");
      expect(view.getByRole("spinbutton", { name: "c" }).hasAttribute("aria-invalid")).toBe(false);
    }
  });

  it("renders no default English string when Arabic labels are given", () => {
    const view = renderIn("ar", <QuantityInput aria-label="الكمية" value={4} uom="صف" />, { labels: AR_DATA_LABELS });
    expect(view.getByRole("button", { name: "زيادة الكمية" })).toBeTruthy();
    expect(view.getByRole("button", { name: "إنقاص الكمية" })).toBeTruthy();
    expectNoDefaultEnglish(view.container);
  });
});
