import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { AR_DISPLAY_LABELS, expectNoDefaultEnglish } from "../../../test/display-labels";
import { renderBoth, renderIn } from "../../../test/harness";
import { Tag } from "./tag";

describe("Tag", () => {
  it("renders its text, a slate tag by default, and no remove button without onRemove", () => {
    const views = renderBoth(<Tag>Zone A</Tag>);
    for (const view of [views.en, views.ar]) {
      const tag = view.getByText("Zone A").parentElement as Element;
      expect(hasModuleClass(tag, "slate")).toBe(true);
      expect(view.queryByRole("button")).toBeNull();
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("maps color to a class and draws the icon as decoration", () => {
    const views = renderBoth(
      <Tag color="neem" icon={<i data-testid="ic" />}>
        Ok
      </Tag>,
    );
    for (const view of [views.en, views.ar]) {
      const tag = view.getByText("Ok").parentElement as Element;
      expect(hasModuleClass(tag, "neem")).toBe(true);
      expect(view.getByTestId("ic").parentElement?.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("names the remove button after the tag text (English defaults)", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    const view = renderIn("en", <Tag onRemove={onRemove}>Zone A</Tag>);
    await user.click(view.getByRole("button", { name: "Remove Zone A" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("removes from the keyboard", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    const view = renderIn("en", <Tag onRemove={onRemove}>Zone A</Tag>);
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("button"));
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onRemove).toHaveBeenCalledTimes(2);
  });

  it("uses the plain label when the content is not text", () => {
    const view = renderIn(
      "en",
      <Tag onRemove={() => {}}>
        <b>Zone</b> A
      </Tag>,
    );
    expect(view.getByRole("button", { name: "Remove" })).toBeTruthy();
  });

  it("announces the remove button in Arabic when Arabic labels are given, with no English default left", () => {
    const view = renderIn(
      "ar",
      <>
        <Tag onRemove={() => {}}>المنطقة أ</Tag>
        <Tag onRemove={() => {}}>
          <b>x</b>
        </Tag>
      </>,
      { labels: AR_DISPLAY_LABELS },
    );
    expect(view.getByRole("button", { name: "إزالة المنطقة أ" })).toBeTruthy();
    expect(view.getByRole("button", { name: "إزالة" })).toBeTruthy();
    expectNoDefaultEnglish(view.container);
  });
});
