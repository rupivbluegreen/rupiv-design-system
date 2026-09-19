import { describe, expect, it } from "vitest";
import { renderBoth } from "../../../test/harness";
import type { Tone } from "../../lib/types";
import badgeStyles from "./badge.module.css";
import { StatusPill } from "./status-pill";

const TONES: readonly Tone[] = ["neutral", "accent", "success", "warning", "danger", "info"];

describe("StatusPill", () => {
  it("shows the text it is given and takes its colour from `tone`, in both languages", () => {
    const views = renderBoth(<StatusPill status="Closed" tone="success" />);
    for (const view of [views.en, views.ar]) {
      const pill = view.getByText("Closed").parentElement;
      expect(pill).not.toBeNull();
      expect(pill?.className).toContain(badgeStyles["success"]);
      expect(pill?.className).toContain(badgeStyles["soft"]);
      expect(pill?.className).toContain(badgeStyles["md"]);
    }
    expect(views.ar.container.dir).toBe("rtl");
  });

  it("renders Arabic text as given", () => {
    const views = renderBoth(<StatusPill status="قيد المعالجة" tone="info" />);
    for (const view of [views.en, views.ar]) {
      expect(view.getByText("قيد المعالجة").parentElement?.className).toContain(badgeStyles["info"]);
    }
  });

  it("applies every tone and only that tone", () => {
    for (const tone of TONES) {
      const { en, ar } = renderBoth(<StatusPill status={`status ${tone}`} tone={tone} />);
      for (const view of [en, ar]) {
        const className = view.getByText(`status ${tone}`).parentElement?.className ?? "";
        expect(className).toContain(badgeStyles[tone]);
        for (const other of TONES.filter((t) => t !== tone)) {
          expect(className.split(" ")).not.toContain(badgeStyles[other]);
        }
      }
    }
  });

  it("does not look the text up anywhere: the same text with another tone is another colour", () => {
    const { en } = renderBoth(<StatusPill status="Overdue" tone="neutral" />);
    const neutral = en.getByText("Overdue").parentElement?.className ?? "";
    expect(neutral).toContain(badgeStyles["neutral"]);
    expect(neutral.split(" ")).not.toContain(badgeStyles["danger"]);
  });

  it("keeps the dot, the size and a custom class", () => {
    const { en } = renderBoth(<StatusPill status="Pending" tone="warning" size="sm" className="extra" />);
    const pill = en.getByText("Pending").parentElement;
    expect(pill?.className).toContain(badgeStyles["sm"]);
    expect(pill?.className).toContain("extra");
    expect(pill?.querySelector(`.${badgeStyles["dot"]}`)).not.toBeNull();
  });
});
