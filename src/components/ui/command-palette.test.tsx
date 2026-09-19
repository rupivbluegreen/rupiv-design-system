import userEvent from "@testing-library/user-event";
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderBoth, renderIn, type LocaleRender, type ProviderOptions, type TestLocale } from "../../../test/harness";
import { NoNavLink, PALETTE_ITEMS, SHELL_CONTENT, expectNoDefaultEnglish } from "../../../test/shell-fixtures";
import { CommandPalette, normalizeSearchText, type CommandPaletteItem, type CommandPaletteProps } from "./command-palette";

// jsdom has no layout: these tests prove the roles and states of the combobox, the filtering, the keys and the
// navigation. They cannot prove that the list hangs from the inline-start edge of the box (the left edge in English,
// the right in Arabic) or that it stays inside the window: that is CSS, and is for the screenshots in the application.

/** What a person types to find each item, per language, and what they see. */
const QUERIES: Readonly<
  Record<TestLocale, { byLabel: string; byLabelUpper: string; byMeta: string; byKeyword: string; none: string; results: string }>
> = {
  en: { byLabel: "forecast", byLabelUpper: "FORECAST", byMeta: "administration", byKeyword: "schedule", none: "zzz", results: "Search results" },
  ar: { byLabel: "التوقعات", byLabelUpper: "التوقعات", byMeta: "الإدارة", byKeyword: "المناوبات", none: "ززز", results: "نتائج البحث" },
};

function renderPalette(locale: TestLocale, props: Partial<CommandPaletteProps> = {}, options: ProviderOptions = {}): LocaleRender {
  return renderIn(locale, <CommandPalette items={PALETTE_ITEMS[locale]} {...props} />, {
    labels: SHELL_CONTENT[locale].labels,
    ...options,
  });
}

function box(view: LocaleRender): HTMLInputElement {
  const found = view.getByRole("combobox");
  if (!(found instanceof HTMLInputElement)) throw new Error("the combobox is not an <input>");
  return found;
}

/** The option at `index`; fails the test when there is none. */
function optionAt(index: number): HTMLElement {
  const found = screen.getAllByRole("option")[index];
  if (!found) throw new Error(`no option at ${index}`);
  return found;
}

function optionLabels(): string[] {
  return screen.queryAllByRole("option").map((option) => option.querySelector("span")?.textContent ?? "");
}

describe.each(LOCALE_CASES)("CommandPalette ($locale)", ({ locale }) => {
  const content = SHELL_CONTENT[locale];
  const queries = QUERIES[locale];
  const items = PALETTE_ITEMS[locale];

  describe("roles and states", () => {
    it("is a search landmark holding a combobox named by the placeholder label, collapsed, with a listbox it controls", () => {
      const view = renderPalette(locale);
      expect(view.getByRole("search")).toBeTruthy();
      const input = view.getByRole("combobox", { name: content.text.placeholder });
      expect(input.getAttribute("placeholder")).toBe(content.text.placeholder);
      expect(input.getAttribute("aria-expanded")).toBe("false");
      expect(input.getAttribute("aria-autocomplete")).toBe("list");
      expect(input.getAttribute("aria-haspopup")).toBe("listbox");
      expect(input.hasAttribute("aria-activedescendant")).toBe(false);
      const controlled = document.getElementById(input.getAttribute("aria-controls") ?? "");
      expect(controlled?.getAttribute("role")).toBe("listbox");
      expect(controlled?.hasAttribute("hidden")).toBe(true);
      expect(screen.queryAllByRole("option")).toHaveLength(0);
    });

    it("takes its name and placeholder from props when the application gives them", () => {
      const view = renderPalette(locale, { placeholder: "Find a page", "aria-label": "Page search" });
      expect(view.getByRole("combobox", { name: "Page search" }).getAttribute("placeholder")).toBe("Find a page");
    });

    it("opens the listbox as soon as something is typed, and points aria-activedescendant at the first option", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), queries.byLabel);
      const input = box(view);
      expect(input.getAttribute("aria-expanded")).toBe("true");
      const listbox = screen.getByRole("listbox", { name: queries.results });
      expect(input.getAttribute("aria-controls")).toBe(listbox.id);
      const options = within(listbox).getAllByRole("option");
      expect(options).toHaveLength(1);
      expect(input.getAttribute("aria-activedescendant")).toBe(options[0]?.id);
      expect(options[0]?.getAttribute("aria-selected")).toBe("true");
    });

    it("shows the meta text of a result as secondary text after its label, and each result as a link to its page", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), queries.byLabel);
      const option = screen.getByRole("option");
      const spans = Array.from(option.querySelectorAll("span")).map((span) => span.textContent);
      expect(spans).toEqual([items[0]?.label, items[0]?.meta]);
      expect(option.tagName).toBe("A");
      expect(option.getAttribute("href")).toBe("/plan/forecast");
      expect(option.getAttribute("tabindex")).toBe("-1");
    });

    it("leaves out the meta when an item has none", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale, { items: [{ id: "x", label: "Solo page", href: "/solo" }] });
      await user.type(box(view), "solo");
      expect(screen.getByRole("option").querySelectorAll("span")).toHaveLength(1);
    });

    it("announces the number of results, and the empty text when there are none, in a status region", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      const status = view.getByRole("status");
      expect(status.textContent).toBe("");
      await user.type(box(view), queries.byMeta);
      expect(status.textContent).toBe(locale === "ar" ? "2 نتائج" : "2 results");
      await user.clear(box(view));
      await user.type(box(view), queries.none);
      expect(status.textContent).toBe(content.text.empty);
    });
  });

  describe("filtering", () => {
    it("matches a substring of the label without regard to case", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), queries.byLabelUpper);
      expect(optionLabels()).toEqual([items[0]?.label]);
    });

    it("matches a substring of the meta text, and keeps the order of the items", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), queries.byMeta);
      expect(optionLabels()).toEqual([items[3]?.label, items[4]?.label]);
    });

    it("matches keywords that the list does not show", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), queries.byKeyword);
      expect(optionLabels()).toEqual([items[2]?.label]);
      expect(screen.getByRole("option").textContent).not.toContain(queries.byKeyword);
    });

    it("keeps the list closed for an empty or blank query", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), "   ");
      expect(box(view).getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryAllByRole("option")).toHaveLength(0);
    });

    it("shows at most eight results by default, and at most `maxResults` when it is given", async () => {
      const user = userEvent.setup();
      const many: CommandPaletteItem[] = Array.from({ length: 12 }, (_, index) => ({
        id: `p${index}`,
        label: `Page ${index}`,
        href: `/p/${index}`,
      }));
      const view = renderPalette(locale, { items: many });
      await user.type(box(view), "page");
      expect(screen.getAllByRole("option")).toHaveLength(8);
      view.unmount();
      const limited = renderPalette(locale, { items: many, maxResults: 3 });
      await user.type(box(limited), "page");
      expect(screen.getAllByRole("option")).toHaveLength(3);
    });

    it("updates when the items change", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), "extra");
      expect(screen.queryAllByRole("option")).toHaveLength(0);
      view.rerender(<CommandPalette items={[{ id: "e", label: "Extra page", href: "/extra" }]} />);
      expect(optionLabels()).toEqual(["Extra page"]);
    });
  });

  describe("no results", () => {
    it("shows the empty text from the labels, keeps the box collapsed, and offers no option", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), queries.none);
      expect(box(view).getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryAllByRole("option")).toHaveLength(0);
      const empty = view.container.querySelector('[data-shell="search-empty"]');
      expect(empty?.textContent).toBe(content.text.empty);
      expect(view.container.querySelector('[data-shell="search-popup"]')?.hasAttribute("hidden")).toBe(false);
    });

    it("does nothing on Enter", async () => {
      const user = userEvent.setup();
      const navigate = vi.fn();
      const view = renderPalette(locale, {}, { navigate });
      await user.type(box(view), `${queries.none}{Enter}`);
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe("keyboard", () => {
    it("moves the highlight with the arrow keys, and wraps around at both ends", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), queries.byMeta);
      const [first, second] = screen.getAllByRole("option");
      expect(box(view).getAttribute("aria-activedescendant")).toBe(first?.id);
      await user.keyboard("{ArrowDown}");
      expect(box(view).getAttribute("aria-activedescendant")).toBe(second?.id);
      expect(second?.getAttribute("aria-selected")).toBe("true");
      expect(first?.getAttribute("aria-selected")).toBe("false");
      await user.keyboard("{ArrowDown}");
      expect(box(view).getAttribute("aria-activedescendant")).toBe(first?.id);
      await user.keyboard("{ArrowUp}");
      expect(box(view).getAttribute("aria-activedescendant")).toBe(second?.id);
    });

    it("keeps the focus in the input while the highlight moves", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), queries.byMeta);
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(box(view));
    });

    it("goes to the highlighted result on Enter through the provider's navigate, and clears the box", async () => {
      const user = userEvent.setup();
      const navigate = vi.fn();
      const view = renderPalette(locale, {}, { navigate });
      await user.type(box(view), queries.byMeta);
      await user.keyboard("{ArrowDown}{Enter}");
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith("/admin/audit");
      expect(box(view).value).toBe("");
      expect(box(view).getAttribute("aria-expanded")).toBe("false");
    });

    it("starts a new search with the first result highlighted", async () => {
      const user = userEvent.setup();
      const navigate = vi.fn();
      const view = renderPalette(locale, {}, { navigate });
      await user.type(box(view), queries.byMeta);
      await user.keyboard("{ArrowDown}");
      await user.clear(box(view));
      await user.type(box(view), queries.byMeta);
      await user.keyboard("{Enter}");
      expect(navigate).toHaveBeenCalledWith("/admin/users");
    });

    it("moves the highlight with the pointer", async () => {
      const user = userEvent.setup();
      const navigate = vi.fn();
      const view = renderPalette(locale, {}, { navigate });
      await user.type(box(view), queries.byMeta);
      fireEvent.mouseMove(optionAt(1));
      expect(box(view).getAttribute("aria-activedescendant")).toBe(optionAt(1).id);
      await user.keyboard("{Enter}");
      expect(navigate).toHaveBeenCalledWith("/admin/audit");
    });

    it("closes the list on Escape and keeps the text; a second Escape clears it", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), queries.byMeta);
      await user.keyboard("{Escape}");
      expect(box(view).getAttribute("aria-expanded")).toBe("false");
      expect(box(view).value).toBe(queries.byMeta);
      await user.keyboard("{Escape}");
      expect(box(view).value).toBe("");
    });

    it("keeps Escape to itself while it has something to close, and lets it through when it has nothing", async () => {
      const user = userEvent.setup();
      const outside = vi.fn();
      document.addEventListener("keydown", outside);
      const view = renderPalette(locale);
      await user.click(box(view));
      await user.keyboard("{Escape}");
      expect(outside).toHaveBeenCalledTimes(1); // nothing to close: the key goes on
      outside.mockClear();
      await user.type(box(view), queries.byMeta);
      outside.mockClear();
      await user.keyboard("{Escape}");
      expect(outside).not.toHaveBeenCalled(); // it closed the list
      document.removeEventListener("keydown", outside);
    });

    it("opens the list again with an arrow key after Escape closed it", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), queries.byMeta);
      await user.keyboard("{Escape}");
      await user.keyboard("{ArrowDown}");
      expect(box(view).getAttribute("aria-expanded")).toBe("true");
      expect(screen.getAllByRole("option")).toHaveLength(2);
    });

    it("leaves the arrow keys alone when the box is empty", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.click(box(view));
      await user.keyboard("{ArrowDown}");
      expect(box(view).getAttribute("aria-expanded")).toBe("false");
    });

    it("closes the list when the focus leaves the box", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), queries.byMeta);
      await user.tab();
      expect(box(view).getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).not.toBe(box(view));
    });

    it("opens the list again when the box that still has text gets the focus back", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), queries.byMeta);
      await user.tab();
      await user.click(box(view));
      expect(box(view).getAttribute("aria-expanded")).toBe("true");
    });
  });

  describe("the pointer", () => {
    it("keeps the focus in the input when the list is pressed, so it does not close before the click lands", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.type(box(view), queries.byMeta);
      const notPrevented = fireEvent.mouseDown(screen.getByRole("listbox"));
      expect(notPrevented).toBe(false);
      expect(document.activeElement).toBe(box(view));
    });

    it("follows a clicked result as a link through the provider's link component, and clears the box", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale, {}, { linkComponent: NoNavLink });
      await user.type(box(view), queries.byMeta);
      const option = optionAt(1);
      expect(option.getAttribute("data-custom-link")).toBe("true");
      await user.click(option);
      expect(box(view).value).toBe("");
      expect(box(view).getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("the shortcut key", () => {
    it("focuses the box from anywhere and shows the key as a hint while the box is empty", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale, { shortcut: "/" });
      expect(view.container.querySelector("kbd")?.textContent).toBe("/");
      expect(box(view).getAttribute("aria-keyshortcuts")).toBe("/");
      await user.keyboard("/");
      expect(document.activeElement).toBe(box(view));
      await user.keyboard("a");
      expect(view.container.querySelector("kbd")).toBeNull();
    });

    it("does not type the key into the box when it focuses it", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale, { shortcut: "/" });
      await user.keyboard("/");
      expect(box(view).value).toBe("");
    });

    it("leaves the key alone while the person types in another field, and with a modifier", async () => {
      const user = userEvent.setup();
      const view = renderIn(
        locale,
        <>
          <input aria-label="Other field" />
          <CommandPalette items={items} shortcut="/" />
        </>,
      );
      await user.click(view.getByLabelText("Other field"));
      await user.keyboard("/");
      expect(document.activeElement).toBe(view.getByLabelText("Other field"));
      view.getByLabelText("Other field").blur();
      await user.keyboard("{Control>}/{/Control}");
      expect(document.activeElement).not.toBe(box(view));
    });

    it("does nothing without a `shortcut`", async () => {
      const user = userEvent.setup();
      const view = renderPalette(locale);
      await user.keyboard("/");
      expect(document.activeElement).not.toBe(box(view));
      expect(view.container.querySelector("kbd")).toBeNull();
    });
  });
});

describe("CommandPalette with Arabic text", () => {
  it("finds an Arabic item however the person spells it: with vowel marks, with tatweel, or with another alef", async () => {
    const user = userEvent.setup();
    const view = renderPalette("ar");
    const input = box(view);
    // the label is مستكشف التوقعات; the marks and the tatweel are typed, the item has none
    await user.type(input, "التَّوقُّعات");
    expect(optionLabels()).toEqual(["مستكشف التوقعات"]);
    await user.clear(input);
    await user.type(input, "التـــوقعات");
    expect(optionLabels()).toEqual(["مستكشف التوقعات"]);
    await user.clear(input);
    // the meta الإدارة has an alef with hamza; a plain alef finds it
    await user.type(input, "الادارة");
    expect(optionLabels()).toEqual(["المستخدمون والأدوار", "سجل التدقيق"]);
  });

  it("finds an item with Arabic-Indic digits when the person types Western digits, and the other way round", async () => {
    const user = userEvent.setup();
    const items: CommandPaletteItem[] = [
      { id: "z", label: "المنطقة ١٢", href: "/z" },
      { id: "w", label: "المنطقة 34", href: "/w" },
    ];
    const view = renderPalette("ar", { items });
    await user.type(box(view), "12");
    expect(optionLabels()).toEqual(["المنطقة ١٢"]);
    await user.clear(box(view));
    await user.type(box(view), "٣٤");
    expect(optionLabels()).toEqual(["المنطقة 34"]);
  });

  it("renders no English default with Arabic labels, with the list open and with no results", async () => {
    const user = userEvent.setup();
    const view = renderPalette("ar", { shortcut: "/" });
    expectNoDefaultEnglish(view.container);
    await user.type(box(view), "الإدارة");
    expectNoDefaultEnglish(view.container);
    await user.clear(box(view));
    await user.type(box(view), "ززز");
    expectNoDefaultEnglish(view.container);
    expect(view.container.dir).toBe("rtl");
  });
});

describe("CommandPalette in both languages at once", () => {
  it("renders the same combobox in English/ltr and Arabic/rtl", () => {
    const views = renderBoth(<CommandPalette items={PALETTE_ITEMS.en} />);
    expect(views.en.container.dir).toBe("ltr");
    expect(views.ar.container.dir).toBe("rtl");
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("combobox").getAttribute("aria-expanded")).toBe("false");
      expect(view.getByRole("search")).toBeTruthy();
    }
  });
});

describe("normalizeSearchText", () => {
  it("lower-cases, trims and collapses white space", () => {
    expect(normalizeSearchText("  Live   DISPATCH\tBoard ")).toBe("live dispatch board");
  });

  it("removes Arabic vowel marks, the tatweel and bidirectional marks", () => {
    expect(normalizeSearchText("مُحَمَّد")).toBe("محمد");
    expect(normalizeSearchText("العـــربية")).toBe("العربيه");
    expect(normalizeSearchText("\u200Fمرحبا\u200E")).toBe("مرحبا");
  });

  it("folds the alef forms, alef maqsura and teh marbuta, as the Lucene Arabic normaliser does", () => {
    expect(normalizeSearchText("أإآٱ")).toBe("اااا");
    expect(normalizeSearchText("على")).toBe("علي");
    expect(normalizeSearchText("مدرسة")).toBe("مدرسه");
  });

  it("turns Arabic-Indic and Persian digits into Western digits", () => {
    expect(normalizeSearchText("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(normalizeSearchText("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
  });

  it("turns presentation forms of Arabic letters into the plain letters (NFKC)", () => {
    expect(normalizeSearchText("\uFEE3\uFEAE\uFE92\uFE8E")).toBe("مربا");
  });

  it("leaves Latin text alone apart from case", () => {
    expect(normalizeSearchText("Zone 12-B")).toBe("zone 12-b");
    expect(normalizeSearchText("")).toBe("");
  });
});
