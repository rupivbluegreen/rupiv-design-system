import { describe, expect, it } from "vitest";
import { hasModuleClass } from "../../../test/css-modules";
import { AR_DISPLAY_LABELS, expectNoDefaultEnglish } from "../../../test/display-labels";
import { renderBoth, renderIn } from "../../../test/harness";
import { Avatar, AvatarGroup } from "./avatar";

describe("Avatar", () => {
  it("is an image named after the person, showing their initials, in English and Arabic", () => {
    const views = renderBoth(
      <>
        <Avatar name="Ravi Shah" />
        <Avatar name="محمد علي" />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      expect(view.getByRole("img", { name: "Ravi Shah" }).textContent).toBe("RS");
      expect(view.getByRole("img", { name: "محمد علي" }).textContent).toBe("مع");
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("shows one letter at size xs and a question mark for an empty name", () => {
    const views = renderBoth(
      <>
        <Avatar name="Ravi Shah" size="xs" />
        <Avatar name="" />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const avatars = view.getAllByRole("img");
      expect(avatars[0]?.textContent).toBe("R");
      expect(avatars[1]?.textContent).toBe("?");
    }
  });

  it("gives the same name the same colour every time, and an explicit colour wins", () => {
    const views = renderBoth(
      <>
        <Avatar name="Sara" />
        <Avatar name="Sara" />
        <Avatar name="Sara" color="lac" />
      </>,
    );
    for (const view of [views.en, views.ar]) {
      const [a, b, c] = view.getAllByRole("img");
      const colours = ["indigo", "madder", "turmeric", "neem", "lac", "kattha", "slate"];
      const colourOf = (node: Element | undefined) => colours.filter((name) => node && hasModuleClass(node, name));
      expect(colourOf(a)).toHaveLength(1);
      expect(colourOf(a)).toEqual(colourOf(b));
      expect(colourOf(c)).toEqual(["lac"]);
    }
  });

  it("maps size to a class", () => {
    const views = renderBoth(<Avatar name="Sara" size="lg" />);
    for (const view of [views.en, views.ar]) expect(hasModuleClass(view.getByRole("img"), "lg")).toBe(true);
  });
});

describe("AvatarGroup", () => {
  const names = ["Ann Lee", "Bob Ray", "Cy Dune", "Di Fox", "Ed Guy", "Flo Hart"];

  it("shows every avatar when they fit, with no +N bubble", () => {
    const views = renderBoth(<AvatarGroup names={names.slice(0, 3)} />);
    for (const view of [views.en, views.ar]) {
      expect(view.getAllByRole("img")).toHaveLength(3);
      expect(view.container.textContent).not.toContain("+");
    }
  });

  it("shows max minus one avatars and a +N bubble for the rest, with Western digits", () => {
    const views = renderBoth(<AvatarGroup names={names} max={4} />);
    for (const view of [views.en, views.ar]) {
      const images = view.getAllByRole("img");
      expect(images).toHaveLength(4); // 3 avatars + the bubble
      expect(images[3]?.textContent).toBe("+3");
    }
  });

  it("names the group by its people, joined the way the language joins a list", () => {
    const en = renderIn("en", <AvatarGroup names={["Ann", "Bob", "Cy"]} />);
    expect(en.getByRole("group").getAttribute("aria-label")).toBe("Ann, Bob, Cy");
    const ar = renderIn("ar", <AvatarGroup names={["Ann", "Bob", "Cy"]} />);
    const arName = ar.getByRole("group").getAttribute("aria-label") ?? "";
    expect(arName).toBe(new Intl.ListFormat("ar", { style: "narrow", type: "conjunction" }).format(["Ann", "Bob", "Cy"]));
    expect(arName).not.toContain(", ");
  });

  it("announces the hidden people with the label, in English by default", () => {
    const view = renderIn("en", <AvatarGroup names={names} max={4} />);
    const bubble = view.getAllByRole("img")[3] as Element;
    expect(bubble.getAttribute("aria-label")).toBe("3 more");
    expect(bubble.getAttribute("title")).toBe("Di Fox, Ed Guy, Flo Hart");
  });

  it("announces the hidden people in Arabic when Arabic labels are given, with no English default", () => {
    const view = renderIn("ar", <AvatarGroup names={names} max={4} />, { labels: AR_DISPLAY_LABELS });
    const bubble = view.getAllByRole("img")[3] as Element;
    expect(bubble.getAttribute("aria-label")).toBe("3 أشخاص آخرين");
    expectNoDefaultEnglish(view.container);
  });

  it("uses the plural form the application's label function chooses", () => {
    const view = renderIn("ar", <AvatarGroup names={["A a", "B b", "C c"]} max={2} />, { labels: AR_DISPLAY_LABELS });
    // max 2 shows one avatar and hides two
    expect(view.getAllByRole("img").at(-1)?.getAttribute("aria-label")).toBe("شخصان آخران");
  });
});
