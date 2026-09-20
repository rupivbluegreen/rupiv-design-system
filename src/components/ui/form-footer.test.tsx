import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AR_DATA_LABELS, expectNoDefaultEnglish } from "../../../test/data-labels";
import { hasModuleClass } from "../../../test/css-modules";
import { LOCALE_CASES, renderBoth, renderIn, type LocaleRender } from "../../../test/harness";
import { Button } from "./button";
import { FormFooter } from "./form-footer";

// jsdom has no layout and no style sheets: these tests prove the structure, the names, the order of the actions in
// the markup, the live region and the keyboard. They cannot prove that the bar sticks to the bottom of a scroll
// container, that the status is at the right edge and the primary action at the left edge in Arabic, or how it looks
// at 390px: the CSS text is read by data-form.contract.test.ts, and the rest is screenshots in the application. They
// also cannot prove what a screen reader says, only that the live region is in the page and that its text changes.

function group(view: LocaleRender, name = "Form actions"): HTMLElement {
  return view.getByRole("group", { name });
}

describe("FormFooter", () => {
  it("is a group named by the default label, holding its actions, in English and in Arabic", () => {
    const views = renderBoth(
      <FormFooter>
        <Button>Discard</Button>
        <Button variant="primary">Save</Button>
      </FormFooter>,
    );
    for (const view of [views.en, views.ar]) {
      const footer = group(view);
      expect(footer.tagName).toBe("DIV");
      expect(footer.getAttribute("role")).toBe("group");
      expect(footer.contains(view.getByRole("button", { name: "Discard" }))).toBe(true);
      expect(footer.contains(view.getByRole("button", { name: "Save" }))).toBe(true);
    }
    expect(views.en.container.dir).toBe("ltr");
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("takes its name from the label prop when given", () => {
    const views = renderBoth(<FormFooter label="Policy actions">x</FormFooter>);
    for (const view of [views.en, views.ar]) {
      expect(group(view, "Policy actions")).toBeTruthy();
      expect(view.queryByRole("group", { name: "Form actions" })).toBeNull();
    }
  });

  it("uses the Arabic labels the application gives, and no default English is left", () => {
    const view = renderIn(
      "ar",
      <FormFooter dirty>
        <Button variant="primary">حفظ</Button>
      </FormFooter>,
      { labels: AR_DATA_LABELS },
    );
    expect(view.getByRole("group", { name: "إجراءات النموذج" })).toBeTruthy();
    expect(view.getByRole("status").textContent).toBe("تغييرات غير محفوظة");
    view.rerender(<FormFooter>x</FormFooter>);
    expect(view.getByRole("status").textContent).toBe("لا توجد تغييرات غير محفوظة");
    expectNoDefaultEnglish(view.container);
  });

  it("carries the sticky bar's class, and the class the caller adds", () => {
    const views = renderBoth(<FormFooter className="mine">x</FormFooter>);
    for (const view of [views.en, views.ar]) {
      const footer = group(view);
      expect(hasModuleClass(footer, "footer")).toBe(true);
      expect(footer.classList.contains("mine")).toBe(true);
    }
  });

  it("puts the status at the start and the actions last, and the primary action last among them, in both directions", () => {
    const views = renderBoth(
      <FormFooter status={<span>Draft saved 10:32</span>}>
        <Button>Discard</Button>
        <Button variant="primary">Save</Button>
      </FormFooter>,
    );
    for (const view of [views.en, views.ar]) {
      const footer = group(view);
      const status = view.getByText("Draft saved 10:32");
      const discard = view.getByRole("button", { name: "Discard" });
      const save = view.getByRole("button", { name: "Save" });
      const follows = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      expect(follows(status, discard)).toBe(true);
      expect(follows(discard, save)).toBe(true);
      // The same markup order in both directions: `dir` decides the edge, so in Arabic the status is at the right
      // edge and Save at the left edge (the inline end), with no reversing anywhere.
      const actions = save.parentElement;
      expect(actions?.parentElement).toBe(footer);
      expect(footer.lastElementChild).toBe(actions);
      expect(actions?.lastElementChild).toBe(save);
    }
  });

  it("shows the status node given to it, and no status element when there is none", () => {
    const withStatus = renderIn("en", <FormFooter status="Saved at 10:32">x</FormFooter>);
    expect(withStatus.getByText("Saved at 10:32")).toBeTruthy();
    withStatus.unmount();
    const without = renderIn("en", <FormFooter>x</FormFooter>);
    expect(without.queryByText("Saved at 10:32")).toBeNull();
    expect(without.container.querySelector('[class*="_status_"]')).toBeNull(); // no status slot
  });

  it("renders no actions block when there are no children", () => {
    const views = renderBoth(<FormFooter dirty />);
    for (const view of [views.en, views.ar]) {
      expect(group(view).querySelectorAll("button")).toHaveLength(0);
      expect(group(view).children).toHaveLength(1);
    }
  });
});

describe("FormFooter: unsaved changes", () => {
  it.each(LOCALE_CASES)("shows nothing visible while the form is clean, and the unsaved text once it is dirty ($locale)", ({ locale }) => {
    const view = renderIn(locale, <FormFooter>x</FormFooter>);
    expect(view.queryByText("Unsaved changes")).toBeNull();
    const clean = view.getByText("No unsaved changes");
    expect(clean.classList.contains("sr-only")).toBe(true); // for screen readers only
    view.rerender(<FormFooter dirty>x</FormFooter>);
    const unsaved = view.getByText("Unsaved changes");
    expect(unsaved.classList.contains("sr-only")).toBe(false);
    expect(view.queryByText("No unsaved changes")).toBeNull();
  });

  it.each(LOCALE_CASES)("keeps one polite live region in the page and changes its text when dirty flips ($locale)", ({ locale }) => {
    const view = renderIn(locale, <FormFooter>x</FormFooter>);
    const region = view.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.getAttribute("aria-atomic")).toBe("true");
    expect(region.textContent).toBe("No unsaved changes");
    view.rerender(<FormFooter dirty>x</FormFooter>);
    expect(view.getByRole("status")).toBe(region); // the same element: a live region that is replaced is not announced
    expect(region.textContent).toBe("Unsaved changes");
    view.rerender(<FormFooter>x</FormFooter>);
    expect(view.getByRole("status")).toBe(region);
    expect(region.textContent).toBe("No unsaved changes");
    view.rerender(<FormFooter dirty={false}>x</FormFooter>);
    expect(region.textContent).toBe("No unsaved changes");
  });

  it("starts with the live region already in the page when the form is dirty from the start", () => {
    const views = renderBoth(<FormFooter dirty>x</FormFooter>);
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("status").textContent).toBe("Unsaved changes");
      expect(view.getAllByText("Unsaved changes")).toHaveLength(1);
    }
  });

  it("marks the icon as decoration, so only the words are read", () => {
    const view = renderIn("en", <FormFooter dirty>x</FormFooter>);
    const icon = view.getByText("Unsaved changes").querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(view.getByRole("status").textContent).toBe("Unsaved changes");
  });

  it("shows the status next to the unsaved text, and neither hides the other", () => {
    const view = renderIn("en", <FormFooter dirty status="Session length changed">x</FormFooter>);
    expect(view.getByText("Unsaved changes")).toBeTruthy();
    expect(view.getByText("Session length changed")).toBeTruthy();
    expect(view.getByRole("status").contains(view.getByText("Session length changed"))).toBe(false); // the status is not live
  });
});

describe("FormFooter: inside a form", () => {
  it("submits the form from its primary action, and the other action does not submit", () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const onDiscard = vi.fn();
    const view = renderIn(
      "ar",
      <form onSubmit={onSubmit}>
        <FormFooter dirty>
          <Button onClick={onDiscard}>Discard</Button>
          <Button variant="primary" type="submit">
            Save
          </Button>
        </FormFooter>
      </form>,
    );
    fireEvent.click(view.getByRole("button", { name: "Discard" }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it.each(LOCALE_CASES)("reaches the actions with Tab in reading order, and Enter presses the focused one ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    const onSave = vi.fn();
    const view = renderIn(
      locale,
      <form>
        <input aria-label="Session" />
        <FormFooter dirty>
          <Button onClick={onDiscard}>Discard</Button>
          <Button variant="primary" onClick={onSave}>
            Save
          </Button>
        </FormFooter>
      </form>,
    );
    await user.tab();
    expect(document.activeElement).toBe(view.getByLabelText("Session"));
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("button", { name: "Discard" }));
    await user.keyboard("{Enter}");
    expect(onDiscard).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("button", { name: "Save" }));
    await user.keyboard(" ");
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("keeps a disabled action in the group, disabled", () => {
    const view = renderIn(
      "en",
      <FormFooter status="No changes to save">
        <Button variant="primary" disabled>
          Save
        </Button>
      </FormFooter>,
    );
    expect(group(view).contains(view.getByRole("button", { name: "Save" }))).toBe(true);
    expect((view.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
