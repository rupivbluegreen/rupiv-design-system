import { describe, expect, it } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { renderBoth, renderIn } from "../../../test/harness";
import { Progress, SegmentBar } from "./progress";

const ARABIC_INDIC_OR_PERCENT = /[٠-٩۰-۹٪]|٪/;

describe("Progress", () => {
  it("is a progress bar with its values, in English and Arabic", () => {
    const views = renderBoth(<Progress value={62} label="تغطية الجدول" showValue />);
    for (const view of [views.en, views.ar]) {
      const bar = view.getByRole("progressbar", { name: "تغطية الجدول" });
      expect(bar.getAttribute("aria-valuemin")).toBe("0");
      expect(bar.getAttribute("aria-valuemax")).toBe("100");
      expect(bar.getAttribute("aria-valuenow")).toBe("62");
      expect(bar.getAttribute("aria-valuetext")).toBe("62%");
      expect(view.getByText("62%")).toBeTruthy();
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("writes the value with Western digits and an ASCII percent sign in both languages", () => {
    const views = renderBoth(<Progress value={7.4} showValue />);
    for (const view of [views.en, views.ar]) {
      const text = view.getByRole("progressbar").getAttribute("aria-valuetext") ?? "";
      expect(text).toBe("7%");
      expect(ARABIC_INDIC_OR_PERCENT.test(text)).toBe(false);
    }
  });

  it("fills the track from the inline start with a logical size", () => {
    const views = renderBoth(<Progress value={30} max={60} />);
    for (const view of [views.en, views.ar]) {
      const fill = view.getByRole("progressbar").firstElementChild as HTMLElement;
      expect(fill.style.inlineSize).toBe("50%");
      expect(fill.style.width).toBe("");
      expect(view.getByRole("progressbar").getAttribute("aria-valuemax")).toBe("60");
    }
  });

  it("clamps a value below zero or above the maximum", () => {
    const views = renderBoth(
      <>
        <Progress value={-5} label="low" />
        <Progress value={250} label="high" />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const low = view.getByRole("progressbar", { name: "low" });
      const high = view.getByRole("progressbar", { name: "high" });
      expect(low.getAttribute("aria-valuenow")).toBe("0");
      expect((low.firstElementChild as HTMLElement).style.inlineSize).toBe("0%");
      expect(high.getAttribute("aria-valuenow")).toBe("100");
      expect((high.firstElementChild as HTMLElement).style.inlineSize).toBe("100%");
    }
  });

  it("does not divide by a maximum of zero", () => {
    const views = renderBoth(<Progress value={5} max={0} showValue />);
    for (const view of [views.en, views.ar]) expect(view.getByText("0%")).toBeTruthy();
  });

  it("valueLabel replaces the shown and the spoken value", () => {
    const views = renderBoth(<Progress value={3} max={100} showValue valueLabel="2.9 GB من 100 GB" />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByText("2.9 GB من 100 GB")).toBeTruthy();
      expect(view.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("2.9 GB من 100 GB");
    }
  });

  it("names the bar from a label that is not plain text", () => {
    const view = renderIn("en", <Progress value={40} label={<span>Roster <b>coverage</b></span>} />);
    expect(view.getByRole("progressbar", { name: "Roster coverage" })).toBeTruthy();
  });

  it("shows no header without a label or value, and no value text unless asked", () => {
    const views = renderBoth(<Progress value={10} />);
    for (const view of [views.en, views.ar]) {
      expect(view.container.textContent).toBe("");
      expect(view.getByRole("progressbar").hasAttribute("aria-labelledby")).toBe(false);
    }
  });

  it("maps tone and size to classes", () => {
    const views = renderBoth(<Progress value={10} tone="danger" size="sm" />);
    for (const view of [views.en, views.ar]) {
      const bar = view.getByRole("progressbar");
      expect(hasModuleClass(bar, "sm")).toBe(true);
      expect(hasModuleClass(bar.firstElementChild as Element, "danger")).toBe(true);
    }
  });
});

describe("SegmentBar", () => {
  const segments = [
    { value: 60, label: "Shift" },
    { value: 25, label: "Break", tone: "warning" as const },
    { value: 15, label: "Leave", color: "var(--chart-3)" },
    { value: 0, label: "Empty" },
  ];

  it("is one image whose name lists each part and its share", () => {
    const views = renderBoth(<SegmentBar segments={segments} />);
    for (const view of [views.en, views.ar]) {
      const image = view.getByRole("img");
      const name = image.getAttribute("aria-label") ?? "";
      for (const part of ["Shift 60%", "Break 25%", "Leave 15%", "Empty 0%"]) expect(name).toContain(part);
      expect(ARABIC_INDIC_OR_PERCENT.test(name)).toBe(false);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("joins the parts the way the language joins a list", () => {
    const en = renderIn("en", <SegmentBar segments={segments.slice(0, 2)} />);
    expect(en.getByRole("img").getAttribute("aria-label")).toBe("Shift 71%, Break 29%");
    const ar = renderIn("ar", <SegmentBar segments={segments.slice(0, 2)} />);
    expect(ar.getByRole("img").getAttribute("aria-label")).toBe(
      new Intl.ListFormat("ar", { style: "narrow", type: "conjunction" }).format(["Shift 71%", "Break 29%"]),
    );
  });

  it("draws a segment for each part with a value, sized by it, and skips parts with none", () => {
    const views = renderBoth(<SegmentBar segments={segments} height={10} />);
    for (const view of [views.en, views.ar]) {
      const bar = view.getByRole("img");
      expect(bar.children).toHaveLength(3);
      expect((bar.children[0] as HTMLElement).style.flexGrow).toBe("60");
      expect((bar as HTMLElement).style.blockSize).toBe("10px");
      expect((bar as HTMLElement).style.height).toBe("");
      expect((bar.children[1] as HTMLElement).style.background).toContain("--warning-solid");
      expect((bar.children[2] as HTMLElement).style.background).toContain("--chart-3");
      expect((bar.children[0] as HTMLElement).style.background).toContain("--chart-1");
    }
  });

  it("shows an empty track when every value is zero", () => {
    const views = renderBoth(<SegmentBar segments={[{ value: 0, label: "None" }]} />);
    for (const view of [views.en, views.ar]) {
      const bar = view.getByRole("img");
      expect(bar.children).toHaveLength(1);
      expect(hasModuleClass(bar.firstElementChild as Element, "segmentEmpty")).toBe(true);
      expect(bar.getAttribute("aria-label")).toBe("None 0%");
    }
  });

  it("shows a legend with the name and share of each part when asked, hiding the swatch from assistive technology", () => {
    const views = renderBoth(<SegmentBar segments={segments.slice(0, 3)} showLegend />);
    for (const view of [views.en, views.ar]) {
      const items = view.getAllByRole("listitem");
      expect(items).toHaveLength(3);
      expect(items[0]?.textContent).toBe("Shift60%");
      expect(items[2]?.textContent).toBe("Leave15%");
      expect(items[0]?.querySelector("[aria-hidden='true']")).not.toBeNull();
    }
  });

  it("has no legend by default", () => {
    const views = renderBoth(<SegmentBar segments={segments} />);
    for (const view of [views.en, views.ar]) expect(view.queryByRole("list")).toBeNull();
  });
});
