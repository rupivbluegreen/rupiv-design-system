import userEvent from "@testing-library/user-event";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALE_CASES, renderIn } from "../../../test/harness";
import {
  emulateDirectionInheritance,
  mockRects,
  rect,
  restoreClock,
  setViewport,
  useFakeClock,
} from "../../../test/overlay-dom";
import { Button } from "./button";
import { Tooltip, type TooltipSide } from "./tooltip";

beforeEach(() => {
  useFakeClock();
  emulateDirectionInheritance();
});

afterEach(() => {
  restoreClock();
});

/** A user whose timers run on the fake clock. */
const setup = () => userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe.each(LOCALE_CASES)("Tooltip ($locale)", ({ locale }) => {
  describe("hover and keyboard", () => {
    it("appears after a short delay on hover, describes the trigger, and goes away when the pointer leaves", async () => {
      const user = setup();
      const view = renderIn(
        locale,
        <Tooltip content="Save the draft">
          <Button>Save</Button>
        </Tooltip>,
      );
      const button = view.getByRole("button", { name: "Save" });
      await user.hover(button);
      wait(299);
      expect(screen.queryByRole("tooltip")).toBeNull();
      wait(1);
      const tip = screen.getByRole("tooltip");
      expect(tip.textContent).toBe("Save the draft");
      expect(button.getAttribute("aria-describedby")).toBe(tip.id);

      await user.unhover(button);
      expect(screen.queryByRole("tooltip")).toBeNull();
      expect(button.hasAttribute("aria-describedby")).toBe(false);
    });

    it("keeps the trigger's own aria-describedby and adds its own while open", async () => {
      const user = setup();
      const view = renderIn(
        locale,
        <Tooltip content="Why">
          <Button aria-describedby="hint">Save</Button>
        </Tooltip>,
      );
      const button = view.getByRole("button", { name: "Save" });
      expect(button.getAttribute("aria-describedby")).toBe("hint");
      await user.hover(button);
      wait(300);
      expect(button.getAttribute("aria-describedby")).toBe(`hint ${screen.getByRole("tooltip").id}`);
    });

    it("appears when the trigger gets keyboard focus, and goes away when focus leaves", async () => {
      const user = setup();
      renderIn(
        locale,
        <>
          <Tooltip content="Save the draft">
            <Button>Save</Button>
          </Tooltip>
          <button type="button">Next</button>
        </>,
      );
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Save" }));
      wait(300);
      expect(screen.getByRole("tooltip").textContent).toBe("Save the draft");

      await user.tab();
      expect(screen.queryByRole("tooltip")).toBeNull();
    });

    it("is dismissed by Escape while the trigger keeps focus", async () => {
      const user = setup();
      const view = renderIn(
        locale,
        <Tooltip content="Save the draft">
          <Button>Save</Button>
        </Tooltip>,
      );
      await user.tab();
      wait(300);
      expect(screen.getByRole("tooltip")).toBeTruthy();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("tooltip")).toBeNull();
      expect(document.activeElement).toBe(view.getByRole("button", { name: "Save" }));
    });

    it("goes away when the trigger is pressed, and the press still reaches the control", async () => {
      const user = setup();
      const onClick = vi.fn();
      const view = renderIn(
        locale,
        <Tooltip content="Save the draft">
          <Button onClick={onClick}>Save</Button>
        </Tooltip>,
      );
      const button = view.getByRole("button", { name: "Save" });
      await user.hover(button);
      wait(300);
      expect(screen.getByRole("tooltip")).toBeTruthy();
      await user.click(button);
      expect(screen.queryByRole("tooltip")).toBeNull();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("renders only its child when there is no content", async () => {
      const user = setup();
      const view = renderIn(
        locale,
        <Tooltip content="">
          <Button>Save</Button>
        </Tooltip>,
      );
      await user.hover(view.getByRole("button", { name: "Save" }));
      wait(1000);
      expect(screen.queryByRole("tooltip")).toBeNull();
    });
  });

  describe("tap on an aria-disabled control", () => {
    it("shows the reason at once, without waiting, and never lets the click act", async () => {
      const user = setup();
      const onClick = vi.fn();
      const view = renderIn(
        locale,
        <Tooltip content="Only a planner can approve">
          <Button aria-disabled="true" onClick={onClick}>
            Approve
          </Button>
        </Tooltip>,
      );
      await user.click(view.getByRole("button", { name: "Approve" }));
      expect(screen.getByRole("tooltip").textContent).toBe("Only a planner can approve");
      expect(onClick).not.toHaveBeenCalled();
    });

    it("keeps the reason on screen after the press, then hides it after a few seconds", async () => {
      const user = setup();
      const view = renderIn(
        locale,
        <Tooltip content="Only a planner can approve">
          <Button aria-disabled="true">Approve</Button>
        </Tooltip>,
      );
      const button = view.getByRole("button", { name: "Approve" });
      fireEvent.pointerDown(button);
      expect(screen.queryByRole("tooltip")).toBeNull(); // nothing yet: the tap has not finished
      await user.click(button);
      wait(2599);
      expect(screen.getByRole("tooltip")).toBeTruthy();
      wait(1);
      expect(screen.queryByRole("tooltip")).toBeNull();
    });

    it("does not hide an open reason when the disabled control is pressed", () => {
      const view = renderIn(
        locale,
        <Tooltip content="Only a planner can approve">
          <Button aria-disabled="true">Approve</Button>
        </Tooltip>,
      );
      const button = view.getByRole("button", { name: "Approve" });
      fireEvent.mouseEnter(button);
      wait(300);
      expect(screen.getByRole("tooltip")).toBeTruthy();
      fireEvent.pointerDown(button);
      expect(screen.getByRole("tooltip")).toBeTruthy();
    });

    it("also works when the tap lands on something inside the control", async () => {
      const user = setup();
      const onClick = vi.fn();
      const view = renderIn(
        locale,
        <Tooltip content="Only a planner can approve">
          <Button aria-disabled="true" onClick={onClick}>
            <span data-testid="inner">Approve</span>
          </Button>
        </Tooltip>,
      );
      await user.click(view.getByTestId("inner"));
      expect(screen.getByRole("tooltip")).toBeTruthy();
      expect(onClick).not.toHaveBeenCalled();
    });

    it("cancels the default action of a disabled link and stops the click at once", async () => {
      const user = setup();
      const view = renderIn(
        locale,
        <Tooltip content="Not available">
          <a href="#elsewhere" aria-disabled="true">
            Open
          </a>
        </Tooltip>,
      );
      const link = view.getByRole("link", { name: "Open" });
      const seen: Event[] = [];
      const record = (event: Event) => seen.push(event);
      document.addEventListener("click", record, true); // before React's own listener on the root
      const reachedTarget = vi.fn();
      const bubbled = vi.fn();
      link.addEventListener("click", reachedTarget);
      document.addEventListener("click", bubbled);
      await user.click(link);
      document.removeEventListener("click", record, true);
      document.removeEventListener("click", bubbled);

      expect(seen).toHaveLength(1);
      expect(seen[0]?.defaultPrevented).toBe(true);
      expect(reachedTarget).not.toHaveBeenCalled();
      expect(bubbled).not.toHaveBeenCalled();
      expect(screen.getByRole("tooltip")).toBeTruthy();
    });

    it("is reachable by keyboard: focus shows the reason, Enter shows it at once again", async () => {
      const user = setup();
      const onClick = vi.fn();
      renderIn(
        locale,
        <Tooltip content="Only a planner can approve">
          <Button aria-disabled="true" onClick={onClick}>
            Approve
          </Button>
        </Tooltip>,
      );
      await user.tab();
      wait(300);
      expect(screen.getByRole("tooltip")).toBeTruthy();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("tooltip")).toBeNull();
      await user.keyboard("{Enter}");
      expect(screen.getByRole("tooltip")).toBeTruthy();
      expect(onClick).not.toHaveBeenCalled();
    });

    it("does not touch a control that is not aria-disabled: no immediate tooltip on click", async () => {
      const user = setup();
      const onClick = vi.fn();
      const view = renderIn(
        locale,
        <Tooltip content="Save the draft">
          <Button onClick={onClick}>Save</Button>
        </Tooltip>,
      );
      await user.click(view.getByRole("button", { name: "Save" }));
      expect(screen.queryByRole("tooltip")).toBeNull();
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("placement (rectangles are mocked; jsdom has no layout)", () => {
    // anchor 100 x 30 at (400, 300); tooltip 120 x 24; page 1024 x 768
    const TIP = rect(0, 0, 120, 24);

    function open(side: TooltipSide, anchorRect: DOMRect = rect(400, 300, 100, 30)): HTMLElement {
      setViewport(1024, 768);
      mockRects((el) => {
        if (el.getAttribute("role") === "tooltip") return TIP;
        if (el.tagName === "BUTTON" && el.textContent === "Save") return anchorRect;
        return undefined;
      });
      const view = renderIn(
        locale,
        <Tooltip content="Save the draft" side={side}>
          <Button>Save</Button>
        </Tooltip>,
      );
      fireEvent.mouseEnter(view.getByRole("button", { name: "Save" }));
      wait(300);
      return screen.getByRole("tooltip");
    }

    it("top: centred above the trigger, in both directions", () => {
      const tip = open("top");
      expect([tip.style.left, tip.style.top, tip.dataset["side"]]).toEqual(["390px", "270px", "top"]);
    });

    it("bottom: centred below the trigger, in both directions", () => {
      const tip = open("bottom");
      expect([tip.style.left, tip.style.top, tip.dataset["side"]]).toEqual(["390px", "336px", "bottom"]);
    });

    it("start: at the inline start of the trigger, left in English and right in Arabic", () => {
      const tip = open("start");
      expect(tip.style.left).toBe(locale === "en" ? "274px" : "506px");
      expect(tip.style.top).toBe("303px");
      expect(tip.dataset["side"]).toBe("start");
    });

    it("end: at the inline end of the trigger, right in English and left in Arabic", () => {
      const tip = open("end");
      expect(tip.style.left).toBe(locale === "en" ? "506px" : "274px");
      expect(tip.dataset["side"]).toBe("end");
    });

    it("flips a top tooltip below the trigger when there is no room above, and says so in data-side", () => {
      const tip = open("top", rect(400, 10, 100, 30));
      expect(tip.dataset["side"]).toBe("bottom");
      expect(tip.style.top).toBe("46px");
    });

    it("flips a start tooltip to the other side when the trigger is against the page edge it points to", () => {
      // English: start is left. Arabic: start is right. Put the trigger against that edge.
      const against = locale === "en" ? rect(10, 300, 40, 30) : rect(974, 300, 40, 30);
      const tip = open("start", against);
      expect(tip.dataset["side"]).toBe("end");
    });

    it("only ever reports top, bottom, start or end", () => {
      for (const side of ["top", "bottom", "start", "end"] as const) {
        const tip = open(side);
        expect(["top", "bottom", "start", "end"]).toContain(tip.dataset["side"]);
        cleanup();
      }
    });
  });
});
