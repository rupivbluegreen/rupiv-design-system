import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { Input, Textarea } from "./input";

// jsdom has no layout: these tests prove the props, the states and the keyboard, not how the adornments sit in
// right-to-left (they use inline-start and inline-end in the CSS).

describe("Input", () => {
  it("renders a native text input that takes the native props", () => {
    const views = renderBoth(<Input aria-label="Name" placeholder="Full name" name="name" maxLength={20} />);
    for (const view of [views.en, views.ar]) {
      const input = view.getByRole("textbox", { name: "Name" }) as HTMLInputElement;
      expect(input.placeholder).toBe("Full name");
      expect(input.name).toBe("name");
      expect(input.maxLength).toBe(20);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it.each(LOCALE_CASES)("accepts typing and reports it ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn(locale, <Input aria-label="Name" onChange={(event) => onChange(event.target.value)} />);
    await user.type(view.getByRole("textbox"), locale === "ar" ? "سلام" : "hi");
    expect(onChange).toHaveBeenLastCalledWith(locale === "ar" ? "سلام" : "hi");
  });

  it("forwards its ref to the native input", () => {
    const ref = createRef<HTMLInputElement>();
    const view = renderIn("en", <Input aria-label="Name" ref={ref} />);
    expect(ref.current).toBe(view.getByRole("textbox"));
  });

  it("shows the prefix and suffix as text next to the value, and the start icon hidden from screen readers", () => {
    const views = renderBoth(<Input aria-label="Amount" prefix="$" suffix="kg" startIcon={<svg data-testid="icon" />} />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByText("$")).toBeTruthy();
      expect(view.getByText("kg")).toBeTruthy();
      expect(view.getByTestId("icon").parentElement?.getAttribute("aria-hidden")).toBe("true");
      // order in the DOM is icon, prefix, input, suffix: the CSS lays them out from the inline start
      const order = Array.from(view.getByRole("textbox").parentElement?.children ?? []).map((el) => el.tagName + (el.textContent ?? ""));
      expect(order[0]).toBe("SPAN");
      expect(order.at(-1)).toBe("SPANkg");
    }
  });

  it("does not render an icon slot without startIcon, or affixes without prefix and suffix", () => {
    const view = renderIn("en", <Input aria-label="Plain" />);
    expect(view.getByRole("textbox").parentElement?.children).toHaveLength(1);
  });

  it("has no left- or right-named icon prop any more", () => {
    const view = renderIn("en", <Input aria-label="Plain" />);
    expect(view.container.innerHTML).not.toMatch(/leftIcon|rightIcon/);
  });

  it("marks the error state through invalid or aria-invalid", () => {
    const views = renderBoth(
      <>
        <Input aria-label="a" invalid />
        <Input aria-label="b" aria-invalid="true" />
        <Input aria-label="c" aria-invalid={true} />
        <Input aria-label="d" />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      for (const name of ["a", "b", "c"]) expect(view.getByRole("textbox", { name }).getAttribute("aria-invalid")).toBe("true");
      expect(view.getByRole("textbox", { name: "d" }).hasAttribute("aria-invalid")).toBe(false);
    }
  });

  it("is disabled and read-only through the native props", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const views = renderBoth(
      <>
        <Input aria-label="off" disabled onChange={onChange} />
        <Input aria-label="ro" readOnly defaultValue="fixed" onChange={onChange} />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const off = view.getByRole("textbox", { name: "off" }) as HTMLInputElement;
      const ro = view.getByRole("textbox", { name: "ro" }) as HTMLInputElement;
      expect(off.disabled).toBe(true);
      expect(ro.readOnly).toBe(true);
      await user.type(off, "x");
      await user.type(ro, "x");
      expect(ro.value).toBe("fixed");
    }
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is reachable by Tab, and a disabled one is skipped", async () => {
    const user = userEvent.setup();
    const view = renderIn(
      "en",
      <>
        <Input aria-label="one" />
        <Input aria-label="two" disabled />
        <Input aria-label="three" />
      </>,
    );
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("textbox", { name: "one" }));
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("textbox", { name: "three" }));
  });

  it("supports the three sizes without changing the input", () => {
    const view = renderIn(
      "en",
      <>
        <Input aria-label="sm" size="sm" />
        <Input aria-label="md" />
        <Input aria-label="lg" size="lg" />
      </>,
    );
    const boxes = ["sm", "md", "lg"].map((name) => view.getByRole("textbox", { name }).parentElement?.className ?? "");
    expect(new Set(boxes).size).toBe(3);
    expect(boxes[0]).toContain("sm");
    expect(boxes[2]).toContain("lg");
  });
});

describe("Textarea", () => {
  it("renders a native textarea with three rows by default, and takes native props", () => {
    const views = renderBoth(<Textarea aria-label="Notes" placeholder="Notes" />);
    for (const view of [views.en, views.ar]) {
      const area = view.getByRole("textbox", { name: "Notes" }) as HTMLTextAreaElement;
      expect(area.tagName).toBe("TEXTAREA");
      expect(area.rows).toBe(3);
    }
  });

  it("takes rows, a ref and typing", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLTextAreaElement>();
    const view = renderIn("ar", <Textarea aria-label="Notes" rows={5} ref={ref} />);
    await user.type(view.getByRole("textbox"), "ملاحظة");
    expect(ref.current?.rows).toBe(5);
    expect(ref.current?.value).toBe("ملاحظة");
  });

  it("marks the error state and can be disabled", () => {
    const views = renderBoth(
      <>
        <Textarea aria-label="bad" invalid />
        <Textarea aria-label="off" disabled />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("textbox", { name: "bad" }).getAttribute("aria-invalid")).toBe("true");
      expect((view.getByRole("textbox", { name: "off" }) as HTMLTextAreaElement).disabled).toBe(true);
    }
  });
});
