import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomLink, LOCALE_CASES, renderBoth, renderIn } from "../../test/harness";
import {
  DesignSystemProvider,
  directionOf,
  useActivePath,
  useDir,
  useLabels,
  useLink,
  useLocale,
  useNavigate,
} from "./index";

function Probe() {
  const label = useLabels();
  const Link = useLink();
  const navigate = useNavigate();
  return (
    <div>
      <span data-testid="locale">{useLocale()}</span>
      <span data-testid="dir">{useDir()}</span>
      <span data-testid="path">{useActivePath()}</span>
      <span data-testid="label">{label("greeting", { name: "Sara" })}</span>
      <span data-testid="missing">{label("no.such.key")}</span>
      <Link href="/x">go</Link>
      <button type="button" onClick={() => navigate("/y")}>
        nav
      </button>
    </div>
  );
}

const text = (view: { getByTestId: (id: string) => HTMLElement }, id: string) => view.getByTestId(id).textContent;

describe("directionOf", () => {
  it("is rtl for Arabic, Hebrew, Persian and Urdu (with or without a region), ltr otherwise", () => {
    for (const tag of ["ar", "ar-SA", "AR", "he", "fa-IR", "ur"]) expect(directionOf(tag)).toBe("rtl");
    for (const tag of ["en", "en-GB", "fr", "", "tr"]) expect(directionOf(tag)).toBe("ltr");
  });
});

describe("DesignSystemProvider", () => {
  it("gives English, ltr, a plain <a>, and no active path when there is no provider", () => {
    const { container, getByTestId, getByRole } = render(<Probe />);
    expect(getByTestId("locale").textContent).toBe("en");
    expect(getByTestId("dir").textContent).toBe("ltr");
    expect(getByTestId("path").textContent).toBe("");
    expect(getByTestId("missing").textContent).toBe("no.such.key");
    const link = getByRole("link", { name: "go" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/x");
    expect(container.querySelector("[data-custom-link]")).toBeNull();
  });

  it("passes locale and dir through in English/ltr and Arabic/rtl", () => {
    const { en, ar } = renderBoth(<Probe />);
    expect([text(en, "locale"), text(en, "dir")]).toEqual(["en", "ltr"]);
    expect([text(ar, "locale"), text(ar, "dir")]).toEqual(["ar", "rtl"]);
    expect(en.container.dir).toBe("ltr");
    expect(ar.container.dir).toBe("rtl");
    expect(ar.container.lang).toBe("ar");
  });

  it.each(LOCALE_CASES)("resolves labels with placeholders and functions ($locale)", ({ locale }) => {
    const labels =
      locale === "ar"
        ? { greeting: "مرحبا {name}", extra: () => "x" }
        : { greeting: ({ name }: Record<string, string | number>) => `Hello ${name}` };
    const view = renderIn(locale, <Probe />, { labels });
    expect(text(view, "label")).toBe(locale === "ar" ? "مرحبا Sara" : "Hello Sara");
    expect(text(view, "missing")).toBe("no.such.key");
  });

  it.each(LOCALE_CASES)("uses the given link component ($locale)", ({ locale }) => {
    const view = renderIn(locale, <Probe />, { linkComponent: CustomLink });
    const link = view.getByRole("link", { name: "go" });
    expect(link.getAttribute("data-custom-link")).toBe("true");
    expect(link.getAttribute("href")).toBe("/x");
  });

  it.each(LOCALE_CASES)("calls the given navigate function ($locale)", ({ locale }) => {
    const calls: string[] = [];
    const view = renderIn(locale, <Probe />, { navigate: (href) => calls.push(href) });
    view.getByRole("button", { name: "nav" }).click();
    expect(calls).toEqual(["/y"]);
  });

  it("passes activePath through", () => {
    const view = renderIn("en", <Probe />, { activePath: "/orders/12" });
    expect(text(view, "path")).toBe("/orders/12");
  });

  it("derives dir from locale when dir is not given", () => {
    const { getByTestId } = render(
      <DesignSystemProvider locale="ar-SA">
        <Probe />
      </DesignSystemProvider>,
    );
    expect(getByTestId("dir").textContent).toBe("rtl");
  });

  it("lets a nested provider change only what it is given", () => {
    const calls: string[] = [];
    const { getByTestId, getByRole } = render(
      <DesignSystemProvider
        locale="ar"
        labels={{ greeting: "مرحبا {name}" }}
        linkComponent={CustomLink}
        navigate={(href) => calls.push(href)}
        activePath="/a"
      >
        <DesignSystemProvider activePath="/b" labels={{ other: "y" }}>
          <Probe />
        </DesignSystemProvider>
      </DesignSystemProvider>,
    );
    expect(getByTestId("locale").textContent).toBe("ar");
    expect(getByTestId("dir").textContent).toBe("rtl");
    expect(getByTestId("path").textContent).toBe("/b");
    expect(getByTestId("label").textContent).toBe("مرحبا Sara");
    expect(getByRole("link", { name: "go" }).getAttribute("data-custom-link")).toBe("true");
    getByRole("button", { name: "nav" }).click();
    expect(calls).toEqual(["/y"]);
  });
});
