import { describe, expect, it } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { renderBoth } from "../../../test/harness";
import { Divider, Grid, Inline, Stack } from "./layout";

describe("Stack", () => {
  it("is a vertical container with a 12px gap and stretched items by default", () => {
    const views = renderBoth(<Stack data-testid="s">x</Stack>);
    for (const view of [views.en, views.ar]) {
      const stack = view.getByTestId("s");
      expect(hasModuleClass(stack, "stack")).toBe(true);
      expect(hasModuleClass(stack, "gap12")).toBe(true);
      expect(hasModuleClass(stack, "align-stretch")).toBe(true);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("maps gap and align, renders `as` another element, and passes attributes through", () => {
    const views = renderBoth(
      <Stack as="ul" gap={24} align="end" aria-label="List" className="mine">
        <li>one</li>
      </Stack>,
    );
    for (const view of [views.en, views.ar]) {
      const list = view.getByRole("list", { name: "List" });
      expect(list.tagName).toBe("UL");
      expect(hasModuleClass(list, "gap24")).toBe(true);
      expect(hasModuleClass(list, "align-end")).toBe(true);
      expect(list.classList.contains("mine")).toBe(true);
    }
  });
});

describe("Inline", () => {
  it("is a horizontal container with an 8px gap, centred, starting at the inline start", () => {
    const views = renderBoth(<Inline data-testid="i">x</Inline>);
    for (const view of [views.en, views.ar]) {
      const inline = view.getByTestId("i");
      expect(hasModuleClass(inline, "inline")).toBe(true);
      expect(hasModuleClass(inline, "gap8")).toBe(true);
      expect(hasModuleClass(inline, "align-center")).toBe(true);
      expect(hasModuleClass(inline, "justify-start")).toBe(true);
      expect(hasModuleClass(inline, "wrap")).toBe(false);
    }
  });

  it("maps gap, align, justify (start, center, end, between) and wrap", () => {
    const views = renderBoth(
      <>
        <Inline data-testid="a" gap={16} align="baseline" justify="between" wrap />
        <Inline data-testid="b" justify="end" />
        <Inline data-testid="c" justify="center" align="stretch" />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const a = view.getByTestId("a");
      for (const name of ["gap16", "align-baseline", "justify-between", "wrap"]) expect(hasModuleClass(a, name)).toBe(true);
      expect(hasModuleClass(view.getByTestId("b"), "justify-end")).toBe(true);
      expect(hasModuleClass(view.getByTestId("c"), "justify-center")).toBe(true);
      expect(hasModuleClass(view.getByTestId("c"), "align-stretch")).toBe(true);
    }
  });
});

describe("Grid", () => {
  it("is a two-column grid with a 16px gap by default", () => {
    const views = renderBoth(<Grid data-testid="g">x</Grid>);
    for (const view of [views.en, views.ar]) {
      const grid = view.getByTestId("g");
      expect(hasModuleClass(grid, "grid")).toBe(true);
      expect(hasModuleClass(grid, "cols2")).toBe(true);
      expect(hasModuleClass(grid, "gap16")).toBe(true);
    }
  });

  it("maps columns and gap", () => {
    const views = renderBoth(<Grid data-testid="g" columns={4} gap={8} />);
    for (const view of [views.en, views.ar]) {
      expect(hasModuleClass(view.getByTestId("g"), "cols4")).toBe(true);
      expect(hasModuleClass(view.getByTestId("g"), "gap8")).toBe(true);
    }
  });

  it("minItemWidth switches to an auto-fill grid: an inline template, and no column class", () => {
    const views = renderBoth(<Grid data-testid="g" columns={3} minItemWidth="240px" style={{ rowGap: "4px" }} />);
    for (const view of [views.en, views.ar]) {
      const grid = view.getByTestId("g");
      expect(grid.style.gridTemplateColumns).toContain("auto-fill");
      expect(grid.style.gridTemplateColumns).toContain("240px");
      expect(grid.style.rowGap).toBe("4px");
      expect(hasModuleClass(grid, "cols3")).toBe(false);
    }
  });
});

describe("Divider", () => {
  it("is a horizontal rule by default", () => {
    const views = renderBoth(<Divider />);
    for (const view of [views.en, views.ar]) {
      expect(view.container.querySelector("hr")).not.toBeNull();
    }
  });

  it("a labelled divider is a separator named by its text", () => {
    const views = renderBoth(<Divider label="أو" spacing={16} />);
    for (const view of [views.en, views.ar]) {
      const separator = view.getByRole("separator", { name: "أو" });
      expect(separator.textContent).toBe("أو");
      expect(hasModuleClass(separator, "spacing16")).toBe(true);
    }
  });

  it("a vertical divider is a vertical separator", () => {
    const views = renderBoth(<Divider vertical spacing={8} />);
    for (const view of [views.en, views.ar]) {
      const separator = view.getByRole("separator");
      expect(separator.getAttribute("aria-orientation")).toBe("vertical");
      expect(hasModuleClass(separator, "vertical")).toBe(true);
      expect(hasModuleClass(separator, "spacing8")).toBe(true);
    }
  });
});
