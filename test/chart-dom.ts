// Small helpers for reading a chart's SVG in jsdom. jsdom has no layout, so a chart under test gets a fixed measure
// (six px per character) and the default width of 600; positions can then be read back from the markup.
import { fireEvent } from "@testing-library/react";

/** A text measurer for the `measureText` prop: six px for every character. */
export const SIX_PER_CHARACTER = (text: string): number => Array.from(text).length * 6;

/** The text of an SVG <text> element without its <title> child (which holds the full text of a shortened label). */
export function ownText(element: Element): string {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join("");
}

export interface DrawnText {
  x: number;
  y: number;
  text: string;
  title: string | null;
  anchor: string | null;
  element: SVGTextElement;
}

/** Every visible <text> of the chart, in document order: the two hidden measuring probes are left out. */
export function drawnTexts(svg: Element): DrawnText[] {
  return Array.from(svg.querySelectorAll<SVGTextElement>("text"))
    .filter((element) => element.getAttribute("aria-hidden") !== "true")
    .map((element) => ({
      x: Number(element.getAttribute("x")),
      y: Number(element.getAttribute("y")),
      text: ownText(element),
      title: element.querySelector("title")?.textContent ?? null,
      anchor: element.getAttribute("text-anchor"),
      element,
    }));
}

export function svgOf(container: Element): SVGSVGElement {
  const svg = container.querySelector("svg[role='img']");
  if (!(svg instanceof SVGSVGElement)) throw new Error("no chart svg");
  return svg;
}

/** Puts the pointer over x px from the left edge of the svg (jsdom's rectangle starts at 0). */
export function pointerAt(svg: Element, clientX: number): void {
  fireEvent.pointerMove(svg, { clientX });
}
