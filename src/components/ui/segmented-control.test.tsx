import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderIn } from "../../../test/harness";
import { emulateDirectionInheritance } from "../../../test/overlay-dom";
import { SegmentedControl } from "./segmented-control";

const OPTIONS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

describe.each(LOCALE_CASES)("SegmentedControl ($locale)", ({ locale, dir }) => {
  beforeEach(() => {
    emulateDirectionInheritance();
  });

  const next = dir === "ltr" ? "{ArrowRight}" : "{ArrowLeft}";
  const previous = dir === "ltr" ? "{ArrowLeft}" : "{ArrowRight}";

  function radio(view: { getByRole: (role: string, options: { name: string }) => HTMLElement }, name: string): HTMLElement {
    return view.getByRole("radio", { name });
  }

  it("is a radio group with the current option checked and only that one in the tab order", () => {
    const view = renderIn(locale, <SegmentedControl ariaLabel="Range" options={OPTIONS} defaultValue="week" />);
    expect(view.getByRole("radiogroup", { name: "Range" })).toBeTruthy();
    expect(view.getAllByRole("radio").map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(view.getAllByRole("radio").map((r) => r.getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
  });

  it("starts on the first option when nothing is chosen, and that option is the one in the tab order", () => {
    const view = renderIn(locale, <SegmentedControl ariaLabel="Range" options={OPTIONS} />);
    expect(radio(view, "Day").getAttribute("aria-checked")).toBe("true");
    expect(radio(view, "Day").getAttribute("tabindex")).toBe("0");
  });

  it("ArrowRight goes forward in English and back in Arabic; ArrowLeft the other way", async () => {
    const user = userEvent.setup();
    const view = renderIn(locale, <SegmentedControl ariaLabel="Range" options={OPTIONS} defaultValue="week" />);
    radio(view, "Week").focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(radio(view, dir === "ltr" ? "Month" : "Day"));
    expect(document.activeElement?.getAttribute("aria-checked")).toBe("true");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(document.activeElement).toBe(radio(view, dir === "ltr" ? "Day" : "Month"));
  });

  it("moves to the next option with the arrow that points that way on screen, and selects it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn(locale, <SegmentedControl ariaLabel="Range" options={OPTIONS} onChange={onChange} />);
    radio(view, "Day").focus();
    await user.keyboard(next);
    expect(document.activeElement).toBe(radio(view, "Week"));
    expect(radio(view, "Week").getAttribute("aria-checked")).toBe("true");
    expect(radio(view, "Day").getAttribute("aria-checked")).toBe("false");
    expect(onChange).toHaveBeenLastCalledWith("week");
  });

  it("moves to the previous option with the opposite arrow, and wraps at both ends", async () => {
    const user = userEvent.setup();
    const view = renderIn(locale, <SegmentedControl ariaLabel="Range" options={OPTIONS} />);
    radio(view, "Day").focus();
    await user.keyboard(previous);
    expect(document.activeElement).toBe(radio(view, "Month")); // first to last
    await user.keyboard(next);
    expect(document.activeElement).toBe(radio(view, "Day")); // last to first
  });

  it("ArrowDown goes forward and ArrowUp goes back in both directions", async () => {
    const user = userEvent.setup();
    const view = renderIn(locale, <SegmentedControl ariaLabel="Range" options={OPTIONS} defaultValue="week" />);
    radio(view, "Week").focus();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(radio(view, "Month"));
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(document.activeElement).toBe(radio(view, "Day"));
  });

  it("jumps to the first and last option with Home and End", async () => {
    const user = userEvent.setup();
    const view = renderIn(locale, <SegmentedControl ariaLabel="Range" options={OPTIONS} defaultValue="week" />);
    radio(view, "Week").focus();
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(radio(view, "Month"));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(radio(view, "Day"));
  });

  it("leaves a controlled value to the parent", async () => {
    const user = userEvent.setup();
    function Host() {
      const [value, setValue] = useState("day");
      return <SegmentedControl ariaLabel="Range" options={OPTIONS} value={value} onChange={setValue} />;
    }
    const view = renderIn(locale, <Host />);
    radio(view, "Day").focus();
    await user.keyboard(next);
    expect(radio(view, "Week").getAttribute("aria-checked")).toBe("true");
  });

  it("selects on click and reports only real changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderIn(locale, <SegmentedControl ariaLabel="Range" options={OPTIONS} onChange={onChange} />);
    await user.click(radio(view, "Day"));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(radio(view, "Month"));
    expect(onChange).toHaveBeenCalledExactlyOnceWith("month");
  });

  it("names the group from aria-label, or from aria-labelledby, or from the ariaLabel prop (aria-label wins)", () => {
    const view = renderIn(
      locale,
      <>
        <span id="cap">Caption</span>
        <SegmentedControl aria-labelledby="cap" options={OPTIONS} />
        <SegmentedControl ariaLabel="Prop" aria-label="Attribute" options={OPTIONS} />
      </>,
    );
    expect(view.getByRole("radiogroup", { name: "Caption" })).toBeTruthy();
    expect(view.getByRole("radiogroup", { name: "Attribute" })).toBeTruthy();
  });
});
