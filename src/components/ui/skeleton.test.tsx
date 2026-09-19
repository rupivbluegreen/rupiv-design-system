import { describe, expect, it } from "vitest";
import { AR_DISPLAY_LABELS, expectNoDefaultEnglish } from "../../../test/display-labels";
import { renderBoth, renderIn } from "../../../test/harness";
import { Skeleton, SkeletonText } from "./skeleton";

describe("Skeleton", () => {
  it("is a shape hidden from assistive technology, sized along the logical axes", () => {
    const views = renderBoth(<Skeleton width="60%" height={20} radius="full" />);
    for (const view of [views.en, views.ar]) {
      const shape = view.container.firstElementChild as HTMLElement;
      expect(shape.getAttribute("aria-hidden")).toBe("true");
      expect(shape.style.inlineSize).toBe("60%");
      expect(shape.style.blockSize).toBe("20px");
      expect(shape.style.width).toBe("");
      expect(shape.style.height).toBe("");
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("fills the container by default and is 12px thick", () => {
    const views = renderBoth(<Skeleton />);
    for (const view of [views.en, views.ar]) {
      const shape = view.container.firstElementChild as HTMLElement;
      expect(shape.style.inlineSize).toBe("100%");
      expect(shape.style.blockSize).toBe("12px");
    }
  });

  it("says nothing to a screen reader by default", () => {
    const views = renderBoth(<Skeleton />);
    for (const view of [views.en, views.ar]) expect(view.container.textContent).toBe("");
  });

  it("announce adds 'Loading' for screen readers, and keeps the shape hidden", () => {
    const view = renderIn("en", <Skeleton announce />);
    const text = view.getByText("Loading");
    expect(text.className).toContain("sr-only");
    expect(view.container.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("announces in Arabic when Arabic labels are given, with no English default", () => {
    const view = renderIn("ar", <Skeleton announce />, { labels: AR_DISPLAY_LABELS });
    expect(view.getByText("جارٍ التحميل")).toBeTruthy();
    expectNoDefaultEnglish(view.container);
  });
});

describe("SkeletonText", () => {
  it("draws three lines by default, the last one shorter, all hidden from assistive technology", () => {
    const views = renderBoth(<SkeletonText />);
    for (const view of [views.en, views.ar]) {
      const wrapper = view.container.firstElementChild as HTMLElement;
      expect(wrapper.getAttribute("aria-hidden")).toBe("true");
      const lines = Array.from(wrapper.children) as HTMLElement[];
      expect(lines).toHaveLength(3);
      expect(lines.at(-1)?.style.inlineSize).toBe("60%");
      expect(lines[0]?.style.inlineSize).toBe("100%");
    }
  });

  it("draws the number of lines asked for, and one full line for a single line", () => {
    const views = renderBoth(
      <>
        <SkeletonText lines={5} />
        <SkeletonText lines={1} />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const [five, one] = Array.from(view.container.children) as HTMLElement[];
      expect(five?.children).toHaveLength(5);
      expect(one?.children).toHaveLength(1);
      expect((one?.firstElementChild as HTMLElement).style.inlineSize).toBe("100%");
    }
  });

  it("announce adds 'Loading' once, and none without it", () => {
    const quiet = renderIn("en", <SkeletonText />);
    expect(quiet.queryByText("Loading")).toBeNull();
    const loud = renderIn("en", <SkeletonText announce />);
    expect(loud.getAllByText("Loading")).toHaveLength(1);
  });
});
