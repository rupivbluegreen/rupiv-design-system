import { createRef, useState, type ReactElement } from "react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderBoth, renderIn, type LocaleRender } from "../../../test/harness";
import { DateInput } from "./date-input";
import styles from "./date-input.module.css";
import { Field } from "./field";

// What an Arabic application passes to the provider. The design system ships English defaults only.
const ARABIC_LABELS = { "dateInput.hijriCaption": "هجري: {date}" } as const;

const ARABIC_INDIC_DIGITS = /[\u{0660}-\u{0669}\u{06F0}-\u{06F9}]/u;
const BIDI_MARKS = /[\u{200E}\u{200F}\u{061C}]/u;

function input(view: LocaleRender): HTMLInputElement {
  const found = view.container.querySelector("input");
  if (found === null) throw new Error("no input rendered");
  return found;
}

function caption(view: LocaleRender): HTMLElement | null {
  return view.container.querySelector(`.${styles["caption"]}`);
}

/** English and Arabic side by side, with the Arabic application labels given only to the Arabic provider. */
function renderLocalised(ui: ReactElement): { en: LocaleRender; ar: LocaleRender } {
  return { en: renderIn("en", ui), ar: renderIn("ar", ui, { labels: ARABIC_LABELS }) };
}

describe("DateInput", () => {
  describe("the field", () => {
    it("is a native date input that keeps the Gregorian value, in both directions", () => {
      const views = renderBoth(<DateInput defaultValue="2026-09-06" name="visit" />);
      for (const view of [views.en, views.ar]) {
        const field = input(view);
        expect(field.type).toBe("date");
        expect(field.value).toBe("2026-09-06");
        expect(field.name).toBe("visit");
      }
      expect(views.en.container.dir).toBe("ltr");
      expect(views.ar.container.dir).toBe("rtl");
    });

    it("renders only the input when showHijri is off: no wrapper, no caption, nothing described", () => {
      const views = renderBoth(<DateInput value="2026-09-06" onChange={() => {}} />);
      for (const view of [views.en, views.ar]) {
        expect(view.container.firstElementChild?.tagName).toBe("INPUT");
        expect(caption(view)).toBeNull();
        expect(input(view).hasAttribute("aria-describedby")).toBe(false);
        expect(view.container.textContent).toBe("");
      }
    });

    it("forwards the ref, the class name, the size and other input attributes", () => {
      const ref = createRef<HTMLInputElement>();
      const views = renderBoth(<DateInput ref={ref} className="extra" size="lg" id="visit-date" required />);
      for (const view of [views.en, views.ar]) {
        const field = input(view);
        expect(field.id).toBe("visit-date");
        expect(field.required).toBe(true);
        expect(field.className).toContain("extra");
        expect(field.className).toContain(styles["root"]);
        expect(field.className).toContain(styles["lg"]);
      }
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it("passes min and max to the browser", () => {
      const views = renderBoth(<DateInput min="2026-01-01" max="2026-12-31" />);
      for (const view of [views.en, views.ar]) {
        expect(input(view).min).toBe("2026-01-01");
        expect(input(view).max).toBe("2026-12-31");
      }
    });

    it("can be disabled", () => {
      const views = renderBoth(<DateInput disabled defaultValue="2026-09-06" showHijri />);
      for (const view of [views.en, views.ar]) {
        expect(input(view).disabled).toBe(true);
        // the Hijri date is information, so it stays visible while the field is disabled
        expect(caption(view)?.textContent).not.toBe("");
      }
    });
  });

  describe("invalid state", () => {
    it("is off by default", () => {
      const views = renderBoth(<DateInput defaultValue="2026-09-06" />);
      for (const view of [views.en, views.ar]) {
        expect(input(view).hasAttribute("aria-invalid")).toBe(false);
        expect(input(view).className).not.toContain(styles["invalid"]);
      }
    });

    it("is set by `invalid`, by aria-invalid, and by a Field error", () => {
      const byProp = renderBoth(<DateInput invalid />);
      const byAria = renderBoth(<DateInput aria-invalid="true" />);
      const byField = renderBoth(
        <Field label="Date" error="Pick a date">
          <DateInput />
        </Field>,
      );
      for (const view of [byProp.en, byProp.ar, byAria.en, byAria.ar, byField.en, byField.ar]) {
        expect(input(view).getAttribute("aria-invalid")).toBe("true");
        expect(input(view).className).toContain(styles["invalid"]);
      }
    });

    it("marks a value before min or after max as invalid, and a value on the limit as valid", () => {
      const cases: ReadonlyArray<[string, boolean]> = [
        ["2025-12-31", true],
        ["2026-01-01", false],
        ["2026-06-15", false],
        ["2026-12-31", false],
        ["2027-01-01", true],
      ];
      for (const [value, outOfRange] of cases) {
        const views = renderBoth(<DateInput value={value} min="2026-01-01" max="2026-12-31" onChange={() => {}} />);
        for (const view of [views.en, views.ar]) {
          expect(input(view).hasAttribute("aria-invalid"), value).toBe(outOfRange);
        }
      }
    });

    it("checks only one limit when only one is given, and ignores an empty value or an unreadable limit", () => {
      const onlyMin = renderBoth(<DateInput value="2020-01-01" min="2026-01-01" onChange={() => {}} />);
      const onlyMax = renderBoth(<DateInput value="2030-01-01" max="2026-12-31" onChange={() => {}} />);
      const empty = renderBoth(<DateInput value="" min="2026-01-01" onChange={() => {}} />);
      const unreadable = renderBoth(<DateInput value="2020-01-01" min="soon" onChange={() => {}} />);
      for (const view of [onlyMin.en, onlyMin.ar, onlyMax.en, onlyMax.ar]) {
        expect(input(view).getAttribute("aria-invalid")).toBe("true");
      }
      for (const view of [empty.en, empty.ar, unreadable.en, unreadable.ar]) {
        expect(input(view).hasAttribute("aria-invalid")).toBe(false);
      }
    });

    it("follows the value as it changes", () => {
      const views = renderBoth(<DateInput defaultValue="2026-06-15" min="2026-01-01" max="2026-12-31" />);
      for (const view of [views.en, views.ar]) {
        expect(input(view).hasAttribute("aria-invalid")).toBe(false);
        fireEvent.change(input(view), { target: { value: "2027-03-01" } });
        expect(input(view).getAttribute("aria-invalid")).toBe("true");
        fireEvent.change(input(view), { target: { value: "2026-03-01" } });
        expect(input(view).hasAttribute("aria-invalid")).toBe(false);
      }
    });
  });

  describe("Hijri caption (showHijri)", () => {
    it("shows the Umm al-Qura date of the chosen day in the language of the provider, Western digits, no direction marks", () => {
      const views = renderLocalised(<DateInput defaultValue="2026-09-06" showHijri />);
      expect(caption(views.en)?.textContent).toBe("Hijri: 24 Rab. I 1448 AH");
      expect(caption(views.ar)?.textContent).toBe("هجري: 24 ربيع الأول 1448 هـ");
      for (const view of [views.en, views.ar]) {
        const text = caption(view)?.textContent ?? "";
        expect(text).not.toMatch(ARABIC_INDIC_DIGITS);
        expect(text).not.toMatch(BIDI_MARKS);
        // the value itself is still Gregorian
        expect(input(view).value).toBe("2026-09-06");
      }
    });

    it("gets its text from the provider labels, so an application can change it", () => {
      const view = renderIn("en", <DateInput defaultValue="2026-09-06" showHijri />, {
        labels: { "dateInput.hijriCaption": ({ date }) => `Islamic calendar: ${String(date)}` },
      });
      expect(caption(view)?.textContent).toBe("Islamic calendar: 24 Rab. I 1448 AH");
    });

    it("falls back to the English label when the application gives none", () => {
      const view = renderIn("ar", <DateInput defaultValue="2026-09-06" showHijri />);
      expect(caption(view)?.textContent).toBe("Hijri: 24 ربيع الأول 1448 هـ");
    });

    it("describes the input with the caption", () => {
      const views = renderLocalised(<DateInput defaultValue="2026-09-06" showHijri />);
      for (const view of [views.en, views.ar]) {
        const captionElement = caption(view);
        expect(captionElement?.id).toBeTruthy();
        expect(input(view).getAttribute("aria-describedby")).toBe(captionElement?.id);
      }
    });

    it("keeps an aria-describedby the caller gave, and adds the caption after it", () => {
      const view = renderIn("en", <DateInput defaultValue="2026-09-06" showHijri aria-describedby="hint-1" />);
      expect(input(view).getAttribute("aria-describedby")).toBe(`hint-1 ${caption(view)?.id}`);
    });

    it("shows nothing, and describes nothing, while there is no value", () => {
      const views = renderLocalised(<DateInput showHijri />);
      for (const view of [views.en, views.ar]) {
        expect(caption(view)).not.toBeNull();
        expect(caption(view)?.textContent).toBe("");
        expect(input(view).hasAttribute("aria-describedby")).toBe(false);
      }
    });

    it("follows a controlled value, across a Hijri year boundary", () => {
      function Controlled({ value }: { value: string }) {
        return <DateInput value={value} onChange={() => {}} showHijri />;
      }
      const en = renderIn("en", <Controlled value="2026-06-15" />);
      const ar = renderIn("ar", <Controlled value="2026-06-15" />, { labels: ARABIC_LABELS });
      expect(caption(en)?.textContent).toBe("Hijri: 29 Dhu\u{02BB}l-H. 1447 AH");
      expect(caption(ar)?.textContent).toBe("هجري: 29 ذو الحجة 1447 هـ");
      en.rerender(<Controlled value="2026-06-16" />);
      ar.rerender(<Controlled value="2026-06-16" />);
      expect(caption(en)?.textContent).toBe("Hijri: 1 Muh. 1448 AH");
      expect(caption(ar)?.textContent).toBe("هجري: 1 محرم 1448 هـ");
      en.rerender(<Controlled value="" />);
      expect(caption(en)?.textContent).toBe("");
      expect(input(en).hasAttribute("aria-describedby")).toBe(false);
    });

    it("follows an uncontrolled value as the person picks a day, and still calls onChange", () => {
      const onChange = vi.fn();
      const views = renderLocalised(<DateInput showHijri onChange={onChange} />);
      for (const view of [views.en, views.ar]) {
        expect(caption(view)?.textContent).toBe("");
        fireEvent.change(input(view), { target: { value: "2026-03-20" } });
        expect(input(view).value).toBe("2026-03-20");
      }
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(caption(views.en)?.textContent).toBe("Hijri: 1 Shaw. 1447 AH");
      expect(caption(views.ar)?.textContent).toBe("هجري: 1 شوال 1447 هـ");
      fireEvent.change(input(views.en), { target: { value: "" } });
      expect(caption(views.en)?.textContent).toBe("");
    });

    it("works inside a component that holds the value in state", () => {
      function Form() {
        const [value, setValue] = useState("2026-02-17");
        return <DateInput showHijri value={value} onChange={(event) => setValue(event.target.value)} />;
      }
      const views = renderLocalised(<Form />);
      expect(caption(views.en)?.textContent).toBe("Hijri: 29 Sha. 1447 AH");
      fireEvent.change(input(views.en), { target: { value: "2026-02-18" } });
      expect(caption(views.en)?.textContent).toBe("Hijri: 1 Ram. 1447 AH");
      expect(caption(views.ar)?.textContent).toBe("هجري: 29 شعبان 1447 هـ");
    });

    it("uses the Gregorian value as the source of truth: 2026-09-06 stays 2026-09-06 in Arabic", () => {
      const views = renderLocalised(<DateInput defaultValue="2026-09-06" showHijri />);
      expect(input(views.ar).value).toBe(input(views.en).value);
    });
  });

  describe("inside a Field", () => {
    it("is named by the field label and described by the hint, the error and the caption", () => {
      const views = renderLocalised(
        <Field label="Visit date" hint="Choose a day" error="Required">
          <DateInput defaultValue="2026-09-06" showHijri />
        </Field>,
      );
      for (const view of [views.en, views.ar]) {
        const field = view.getByLabelText("Visit date");
        expect(field).toBe(input(view));
        const describedBy = (field.getAttribute("aria-describedby") ?? "").split(" ");
        expect(describedBy).toContain(caption(view)?.id);
        expect(describedBy.length).toBe(3);
        expect(field.getAttribute("aria-invalid")).toBe("true");
      }
    });
  });
});
