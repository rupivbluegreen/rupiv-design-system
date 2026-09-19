import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AR_DATA_LABELS, expectNoDefaultEnglish } from "../../../test/data-labels";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { FileDrop } from "./file-drop";

// jsdom has no layout and no real drag and drop: the drag events below are dispatched by hand. These tests prove the
// labels, sizes, accepted types, list and keyboard reach, not how the drop zone looks.

function file(name: string, bytes: number, type = "application/octet-stream"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function dropZone(view: { container: HTMLElement }): HTMLElement {
  const zone = view.container.querySelector("label");
  if (!zone) throw new Error("no drop zone");
  return zone;
}

function fileInput(view: { container: HTMLElement }): HTMLInputElement {
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no file input");
  return input;
}

describe("FileDrop", () => {
  it("renders a native file input with the prompt and hint, for one file or many", () => {
    const views = renderBoth(<FileDrop accept=".pdf,image/*" hint="PDF or image" />);
    for (const view of [views.en, views.ar]) {
      const input = fileInput(view);
      expect(input.multiple).toBe(false);
      expect(input.accept).toBe(".pdf,image/*");
      expect(view.getByText("Drag a file here or")).toBeTruthy();
      expect(view.getByText("browse")).toBeTruthy();
      expect(view.getByText("PDF or image").id).toBe(input.getAttribute("aria-describedby"));
    }
    const many = renderIn("en", <FileDrop multiple />);
    expect(many.getByText("Drag files here or")).toBeTruthy();
    expect(fileInput(many).multiple).toBe(true);
  });

  it("names the input through its label and gives it no hint reference without a hint", () => {
    const view = renderIn("en", <FileDrop />);
    expect(fileInput(view).hasAttribute("aria-describedby")).toBe(false);
    expect(dropZone(view).contains(fileInput(view))).toBe(true);
  });

  it.each(LOCALE_CASES)("lists a chosen file with its size, reports it and removes it ($locale)", async ({ locale }) => {
    const user = userEvent.setup();
    const onFiles = vi.fn();
    const view = renderIn(locale, <FileDrop onFiles={onFiles} />);
    const report = file("report.pdf", 1536);
    await user.upload(fileInput(view), report);
    expect(onFiles).toHaveBeenLastCalledWith([report]);
    const list = view.getByRole("list", { name: "Selected files" });
    expect(list.textContent).toContain("report.pdf");
    expect(list.textContent).toContain("1.5 KB");
    await user.click(view.getByRole("button", { name: "Remove report.pdf" }));
    expect(onFiles).toHaveBeenLastCalledWith([]);
    expect(view.queryByRole("list")).toBeNull();
  });

  it("replaces the file in single mode and adds to the list in multiple mode", async () => {
    const user = userEvent.setup();
    const single = renderIn("en", <FileDrop />);
    await user.upload(fileInput(single), file("one.txt", 10, "text/plain"));
    await user.upload(fileInput(single), file("two.txt", 10, "text/plain"));
    expect(single.getAllByRole("listitem").map((li) => li.textContent)).toEqual([expect.stringContaining("two.txt")]);
    single.unmount();
    const multi = renderIn("en", <FileDrop multiple />);
    await user.upload(fileInput(multi), file("one.txt", 10, "text/plain"));
    await user.upload(fileInput(multi), file("two.txt", 10, "text/plain"));
    expect(multi.getAllByRole("listitem")).toHaveLength(2);
  });

  it("writes sizes with Western digits and the unit from the labels", async () => {
    const user = userEvent.setup();
    const view = renderIn("ar", <FileDrop multiple />);
    await user.upload(fileInput(view), [file("a", 500), file("b", 1536), file("c", 20 * 1024), file("d", 3 * 1024 * 1024)]);
    const sizes = view.getAllByRole("listitem").map((li) => li.textContent);
    expect(sizes[0]).toContain("500 B");
    expect(sizes[1]).toContain("1.5 KB");
    expect(sizes[2]).toContain("20 KB");
    expect(sizes[3]).toContain("3.0 MB");
    expect(view.container.textContent).not.toMatch(/[٠-٩]/);
  });

  it("keeps only the files whose type is accepted when files are dropped", () => {
    const onFiles = vi.fn();
    const view = renderIn("en", <FileDrop multiple accept=".pdf,image/*" onFiles={onFiles} />);
    const pdf = file("a.PDF", 10, "application/pdf");
    const png = file("b.png", 10, "image/png");
    const exe = file("c.exe", 10, "application/x-msdownload");
    fireEvent.drop(dropZone(view), { dataTransfer: { files: [pdf, png, exe] } });
    expect(onFiles).toHaveBeenLastCalledWith([pdf, png]);
    fireEvent.drop(dropZone(view), { dataTransfer: { files: [exe] } });
    expect(onFiles).toHaveBeenCalledTimes(1); // nothing accepted: no report, the list stays
  });

  it("shows the dragging prompt while a drag is over the zone and restores it on leave or drop", () => {
    const view = renderIn("en", <FileDrop />);
    const zone = dropZone(view);
    fireEvent.dragOver(zone, { dataTransfer: { files: [], dropEffect: "none" } });
    expect(view.getByText("Drop to upload")).toBeTruthy();
    fireEvent.dragLeave(zone, { relatedTarget: null });
    expect(view.getByText("Drag a file here or")).toBeTruthy();
    fireEvent.dragEnter(zone, { dataTransfer: { files: [], dropEffect: "none" } });
    expect(view.getByText("Drop to upload")).toBeTruthy();
    fireEvent.drop(zone, { dataTransfer: { files: [file("x.txt", 1, "text/plain")] } });
    expect(view.getByText("Drag a file here or")).toBeTruthy();
    expect(view.getAllByRole("listitem")).toHaveLength(1);
  });

  it("can be reached with Tab and removed with the keyboard", async () => {
    const user = userEvent.setup();
    const onFiles = vi.fn();
    const view = renderIn("en", <FileDrop onFiles={onFiles} />);
    await user.tab();
    expect(document.activeElement).toBe(fileInput(view));
    await user.upload(fileInput(view), file("keep.txt", 5, "text/plain"));
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("button", { name: "Remove keep.txt" }));
    await user.keyboard("{Enter}");
    expect(onFiles).toHaveBeenLastCalledWith([]);
  });

  it("renders no default English string when Arabic labels are given", async () => {
    const user = userEvent.setup();
    const view = renderIn("ar", <FileDrop multiple hint="ملفات PDF فقط" />, { labels: AR_DATA_LABELS });
    expect(view.getByText("اسحب الملفات إلى هنا أو")).toBeTruthy();
    expect(view.getByText("تصفّح")).toBeTruthy();
    fireEvent.dragOver(dropZone(view), { dataTransfer: { files: [], dropEffect: "none" } });
    expect(view.getByText("أفلت الملف للرفع")).toBeTruthy();
    fireEvent.dragLeave(dropZone(view), { relatedTarget: null });
    await user.upload(fileInput(view), file("تقرير.pdf", 2048));
    expect(view.getByRole("list", { name: "الملفات المحددة" })).toBeTruthy();
    expect(view.getByRole("button", { name: "إزالة تقرير.pdf" })).toBeTruthy();
    expect(view.getByText("2.0 كيلوبايت")).toBeTruthy();
    expectNoDefaultEnglish(view.container);
  });
});
