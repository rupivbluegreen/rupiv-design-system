import { describe, expect, it } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { renderBoth } from "../../../test/harness";
import { Kbd } from "./kbd";

describe("Kbd", () => {
  it("renders a <kbd> with its key text, in English and Arabic", () => {
    const views = renderBoth(
      <>
        <Kbd>/</Kbd>
        <Kbd>Ctrl K</Kbd>
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const keys = Array.from(view.container.querySelectorAll("kbd"));
      expect(keys.map((node) => node.textContent)).toEqual(["/", "Ctrl K"]);
      expect(hasModuleClass(keys[0] as Element, "root")).toBe(true);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("keeps className and passes other attributes through", () => {
    const views = renderBoth(
      <Kbd className="mine" title="Search shortcut" data-hint="search">
        /
      </Kbd>,
    );
    for (const view of [views.en, views.ar]) {
      const key = view.container.querySelector("kbd") as Element;
      expect(key.classList.contains("mine")).toBe(true);
      expect(key.getAttribute("title")).toBe("Search shortcut");
      expect(key.getAttribute("data-hint")).toBe("search");
    }
  });

  it("does not take focus: it is a hint, not a control", () => {
    const views = renderBoth(<Kbd>/</Kbd>);
    for (const view of [views.en, views.ar]) expect(view.container.querySelector("kbd")?.getAttribute("tabindex")).toBeNull();
  });
});
