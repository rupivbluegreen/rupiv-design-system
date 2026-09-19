import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderIn } from "../../../test/harness";
import { Select } from "./select";

const OPTIONS = [
  { value: "north", label: "North" },
  { value: "south", label: "South" },
  { value: "east", label: "East", disabled: true },
];

describe.each(LOCALE_CASES)("Select ($locale)", ({ locale }) => {
  const wrapper = (select: HTMLElement) => select.parentElement as HTMLElement;

  it("is a native select with one option per item, the disabled one disabled", () => {
    const view = renderIn(locale, <Select aria-label="Zone" options={OPTIONS} defaultValue="south" />);
    const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "Zone" });
    expect(select.tagName).toBe("SELECT");
    expect(select.value).toBe("south");
    expect(view.getAllByRole("option").map((o) => o.textContent)).toEqual(["North", "South", "East"]);
    expect(screen.getByRole<HTMLOptionElement>("option", { name: "East" }).disabled).toBe(true);
  });

  it("reports the choice", async () => {
    const onChange = vi.fn();
    const view = renderIn(locale, <Select aria-label="Zone" options={OPTIONS} onChange={onChange} />);
    await userEvent.selectOptions(view.getByRole("combobox"), "south");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole<HTMLSelectElement>("combobox").value).toBe("south");
  });

  it("adds an empty first option for a placeholder, selected until a choice is made, unless required", () => {
    const view = renderIn(locale, <Select aria-label="Zone" options={OPTIONS} placeholder="Choose a zone" />);
    const select = screen.getByRole<HTMLSelectElement>("combobox");
    expect(select.value).toBe("");
    expect(screen.getByRole<HTMLOptionElement>("option", { name: "Choose a zone" }).disabled).toBe(false);

    renderIn(locale, <Select aria-label="Zone 2" options={OPTIONS} placeholder="Pick a zone" required />);
    expect(screen.getByRole<HTMLOptionElement>("option", { name: "Pick a zone" }).disabled).toBe(true);
  });

  it("marks itself invalid from `invalid` or from aria-invalid", () => {
    const view = renderIn(
      locale,
      <>
        <Select aria-label="A" options={OPTIONS} invalid />
        <Select aria-label="B" options={OPTIONS} aria-invalid="true" />
        <Select aria-label="C" options={OPTIONS} />
      </>,
    );
    expect(view.getByRole("combobox", { name: "A" }).getAttribute("aria-invalid")).toBe("true");
    expect(view.getByRole("combobox", { name: "B" }).getAttribute("aria-invalid")).toBe("true");
    expect(view.getByRole("combobox", { name: "C" }).hasAttribute("aria-invalid")).toBe(false);
  });

  describe("width", () => {
    // CSS Modules give the wrapper a hashed class such as "_auto_1f3a9c"; the name is the part that is stable.
    const hasClass = (element: HTMLElement, name: string) => element.className.split(" ").some((c) => c.includes(`_${name}_`));

    it("fills its container by default", () => {
      const view = renderIn(locale, <Select aria-label="Zone" options={OPTIONS} />);
      expect(hasClass(wrapper(view.getByRole("combobox")), "auto")).toBe(false);
    });

    it("takes the width of its content with width=\"auto\"", () => {
      const view = renderIn(locale, <Select aria-label="Zone" options={OPTIONS} width="auto" />);
      expect(hasClass(wrapper(view.getByRole("combobox")), "auto")).toBe(true);
    });

    it("keeps its size class and the caller's className next to width=\"auto\"", () => {
      const view = renderIn(locale, <Select aria-label="Zone" options={OPTIONS} width="auto" size="sm" className="extra" />);
      const box = wrapper(view.getByRole("combobox"));
      expect(hasClass(box, "sm")).toBe(true);
      expect(box.classList.contains("extra")).toBe(true);
    });

    it("does not pass width on to the native select element", () => {
      const view = renderIn(locale, <Select aria-label="Zone" options={OPTIONS} width="auto" />);
      expect(view.getByRole("combobox").hasAttribute("width")).toBe(false);
    });
  });
});
