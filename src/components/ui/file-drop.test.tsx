import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AR_DATA_LABELS, expectNoDefaultEnglish } from "../../../test/data-labels";
import { LOCALE_CASES, renderBoth, renderIn } from "../../../test/harness";
import { FileDrop } from "./file-drop";
import type { FileRejection, FileRejectReason } from "./index";

// jsdom has no layout and no real drag and drop: the drag events below are dispatched by hand. These tests prove the
// labels, sizes, accepted types, size limit, the rejection message and its announcement roles, the list and keyboard
// reach. They cannot prove how the drop zone or the message looks (in either direction), and they cannot prove what a
// screen reader says: a live region's role and its re-insertion are checked, not the speech.

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
    expect(onFiles).toHaveBeenCalledTimes(1); // nothing accepted: no report to onFiles, the list stays
    expect(view.getByRole("alert").textContent).toBe("c.exe is not an accepted file type."); // and it is no longer silent
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

// ---------------------------------------------------------------------------------------------------------------
// Limits and rejection
// ---------------------------------------------------------------------------------------------------------------

const MB = 1024 * 1024;

function drop(view: { container: HTMLElement }, files: File[]): void {
  fireEvent.drop(dropZone(view), { dataTransfer: { files } });
}

/** What the component reported to onReject, as "name:reason" so a test reads in one line. */
function summary(rejected: FileRejection[] | undefined): string[] {
  return (rejected ?? []).map(({ file, reason }) => `${file.name}:${reason}`);
}

describe("FileDrop rejection: type and size", () => {
  it.each(LOCALE_CASES)("does not pass a file of the wrong type on, and reports it as a type rejection ($locale)", ({ locale }) => {
    const onFiles = vi.fn();
    const onReject = vi.fn<(rejected: FileRejection[]) => void>();
    const view = renderIn(locale, <FileDrop accept=".pdf,image/*" onFiles={onFiles} onReject={onReject} />);
    const exe = file("setup.exe", 10, "application/x-msdownload");
    drop(view, [exe]);
    expect(onFiles).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenLastCalledWith([{ file: exe, reason: "type" }]);
    expect(view.queryByRole("list")).toBeNull();
  });

  it.each(LOCALE_CASES)("does not pass a file over maxSize on, and reports it as a size rejection ($locale)", ({ locale }) => {
    const onFiles = vi.fn();
    const onReject = vi.fn<(rejected: FileRejection[]) => void>();
    const view = renderIn(locale, <FileDrop maxSize={1024} onFiles={onFiles} onReject={onReject} />);
    const big = file("big.bin", 1025);
    drop(view, [big]);
    expect(onFiles).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenLastCalledWith([{ file: big, reason: "size" }]);
  });

  it("takes a file that is exactly maxSize, and a file of 0 bytes", () => {
    const onFiles = vi.fn();
    const onReject = vi.fn();
    const view = renderIn("en", <FileDrop multiple maxSize={1024} onFiles={onFiles} onReject={onReject} />);
    const exact = file("exact.bin", 1024);
    const empty = file("empty.bin", 0);
    drop(view, [exact, empty]);
    expect(onFiles).toHaveBeenLastCalledWith([exact, empty]);
    expect(onReject).not.toHaveBeenCalled();
  });

  it("reports a file that is both the wrong type and too large as a type rejection", () => {
    const onReject = vi.fn<(rejected: FileRejection[]) => void>();
    const view = renderIn("en", <FileDrop accept=".csv" maxSize={10} onReject={onReject} />);
    drop(view, [file("huge.exe", 5000, "application/x-msdownload")]);
    expect(summary(onReject.mock.lastCall?.[0])).toEqual(["huge.exe:type"]);
  });

  it("lets the valid files of a mixed batch through and reports each other one with its own reason", () => {
    const onFiles = vi.fn();
    const onReject = vi.fn<(rejected: FileRejection[]) => void>();
    const view = renderIn("en", <FileDrop multiple accept=".csv,text/csv" maxSize={2048} onFiles={onFiles} onReject={onReject} />);
    const good = file("a.csv", 100, "text/csv");
    const wrong = file("b.exe", 100, "application/x-msdownload");
    const big = file("c.csv", 4096, "text/csv");
    const alsoGood = file("d.CSV", 2048, "text/csv");
    drop(view, [good, wrong, big, alsoGood]);
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles).toHaveBeenLastCalledWith([good, alsoGood]);
    expect(summary(onReject.mock.lastCall?.[0])).toEqual(["b.exe:type", "c.csv:size"]);
    expect(view.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      expect.stringContaining("a.csv"),
      expect.stringContaining("d.CSV"),
    ]);
  });

  it("takes the first valid file of a mixed batch when only one file is allowed, and still reports the others", () => {
    const onFiles = vi.fn();
    const onReject = vi.fn<(rejected: FileRejection[]) => void>();
    const view = renderIn("en", <FileDrop maxSize={100} onFiles={onFiles} onReject={onReject} />);
    const big = file("big.bin", 500);
    const small = file("small.bin", 50);
    drop(view, [big, small]);
    expect(onFiles).toHaveBeenLastCalledWith([small]);
    expect(summary(onReject.mock.lastCall?.[0])).toEqual(["big.bin:size"]);
  });

  it("keeps the files already in the list when a later drop is rejected", () => {
    const onFiles = vi.fn();
    const view = renderIn("en", <FileDrop multiple maxSize={100} onFiles={onFiles} onReject={() => undefined} />);
    const first = file("first.bin", 10);
    drop(view, [first]);
    drop(view, [file("big.bin", 500)]);
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(view.getAllByRole("listitem")).toHaveLength(1);
    drop(view, [file("second.bin", 20)]);
    expect(onFiles).toHaveBeenLastCalledWith([first, expect.objectContaining({ name: "second.bin" })]);
  });

  it("checks files from the file picker the same way (the picker's own accept filter can be switched off by the person)", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onFiles = vi.fn();
    const onReject = vi.fn<(rejected: FileRejection[]) => void>();
    const view = renderIn("en", <FileDrop multiple accept=".csv" maxSize={1000} onFiles={onFiles} onReject={onReject} />);
    const good = file("ok.csv", 500, "text/csv");
    const wrong = file("no.txt", 10, "text/plain");
    const big = file("big.csv", 2000, "text/csv");
    await user.upload(fileInput(view), [good, wrong, big]);
    expect(onFiles).toHaveBeenLastCalledWith([good]);
    expect(summary(onReject.mock.lastCall?.[0])).toEqual(["no.txt:type", "big.csv:size"]);
    expect(fileInput(view).value).toBe(""); // reset, so the same file can be chosen again
  });

  it("reports only a rejected file from the picker as a reason of its own, and never calls onFiles", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onFiles = vi.fn();
    const onReject = vi.fn<(rejected: FileRejection[]) => void>();
    const view = renderIn("en", <FileDrop accept=".csv" onFiles={onFiles} onReject={onReject} />);
    await user.upload(fileInput(view), file("no.txt", 10, "text/plain"));
    expect(onFiles).not.toHaveBeenCalled();
    expect(summary(onReject.mock.lastCall?.[0])).toEqual(["no.txt:type"]);
  });

  it("does not call onReject when every file is taken", () => {
    const onReject = vi.fn();
    const view = renderIn("en", <FileDrop multiple accept=".pdf" maxSize={1000} onReject={onReject} />);
    drop(view, [file("a.pdf", 999, "application/pdf"), file("b.pdf", 1000, "application/pdf")]);
    expect(onReject).not.toHaveBeenCalled();
    expect(view.queryByRole("alert")).toBeNull();
  });

  it("keeps the old behaviour when neither maxSize nor onReject is given, and accepts a file of any size", () => {
    const onFiles = vi.fn();
    const view = renderIn("en", <FileDrop onFiles={onFiles} />);
    const huge = file("huge.bin", 50 * MB);
    drop(view, [huge]);
    expect(onFiles).toHaveBeenLastCalledWith([huge]);
    expect(view.queryByRole("alert")).toBeNull();
  });

  it("has the types FileRejection and FileRejectReason, exported from the package entry", () => {
    const reasons: FileRejectReason[] = ["type", "size"];
    const rejection: FileRejection = { file: file("a", 1), reason: "size" };
    expect(reasons).toContain(rejection.reason);
  });
});

describe("FileDrop rejection: the message it shows itself", () => {
  it.each(LOCALE_CASES)("shows an announced message in the component when the file has the wrong type, with no onReject ($locale)", ({ locale }) => {
    const view = renderIn(locale, <FileDrop accept=".csv" hint="CSV" />);
    drop(view, [file("photo.png", 10, "image/png")]);
    const alert = view.getByRole("alert");
    expect(alert.textContent).toBe("photo.png is not an accepted file type.");
    expect(dropZone(view).parentElement?.contains(alert)).toBe(true); // inside the FileDrop, under the drop area
    expect(view.queryByRole("list")).toBeNull();
  });

  it.each(LOCALE_CASES)("names the limit in KB or MB with Western digits when a file is too large ($locale)", ({ locale }) => {
    const cases: [number, string][] = [
      [500, "500 B"],
      [1536, "1.5 KB"],
      [512 * 1024, "512 KB"],
      [20 * MB, "20 MB"],
      [10 * MB, "10 MB"],
      [1.55 * MB, "1.5 MB"], // rounded down: a file of 1.53 MB is not rejected, so "larger than 1.6 MB" would be untrue
    ];
    for (const [max, written] of cases) {
      const view = renderIn(locale, <FileDrop maxSize={max} />);
      drop(view, [file("f.bin", Math.ceil(max) + 1)]);
      expect(view.getByRole("alert").textContent).toBe(`f.bin is larger than ${written}.`);
      expect(view.container.textContent).not.toMatch(/[٠-٩]/);
      view.unmount();
    }
  });

  it("lists every rejected file of a drop, one line each, while the valid files go through", () => {
    const onFiles = vi.fn();
    const view = renderIn("en", <FileDrop multiple accept=".csv" maxSize={100} onFiles={onFiles} />);
    drop(view, [file("ok.csv", 10), file("a.exe", 10), file("b.csv", 500), file("c.zip", 10)]);
    const lines = Array.from(view.getByRole("alert").querySelectorAll("p")).map((p) => p.textContent);
    expect(lines).toEqual([
      "a.exe is not an accepted file type.",
      "b.csv is larger than 100 B.",
      "c.zip is not an accepted file type.",
    ]);
    expect(onFiles).toHaveBeenLastCalledWith([expect.objectContaining({ name: "ok.csv" })]);
    expect(view.getAllByRole("listitem")).toHaveLength(1);
  });

  it("shows no message when the application gives onReject, and calls it instead", () => {
    const onReject = vi.fn();
    const view = renderIn("en", <FileDrop accept=".csv" onReject={onReject} />);
    drop(view, [file("a.exe", 10)]);
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(view.queryByRole("alert")).toBeNull();
    expect(view.container.textContent).not.toContain("not an accepted");
  });

  it("shows the message for a file from the picker too", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const view = renderIn("en", <FileDrop maxSize={100} />);
    await user.upload(fileInput(view), file("big.bin", 200));
    expect(view.getByRole("alert").textContent).toBe("big.bin is larger than 100 B.");
  });

  it("writes the message with the labels the application gives, and no default English is left (Arabic)", () => {
    const view = renderIn("ar", <FileDrop multiple accept=".csv" maxSize={20 * MB} hint="ملفات CSV فقط" />, {
      labels: AR_DATA_LABELS,
    });
    drop(view, [file("قائمة.exe", 10), file("تقرير.csv", 21 * MB)]);
    const alert = view.getByRole("alert");
    expect(alert.textContent).toBe("قائمة.exe ليس نوع ملف مقبولاً.حجم تقرير.csv يتجاوز 20 ميغابايت.");
    expect(view.getByRole("button", { name: "إغلاق الرسالة" })).toBeTruthy();
    expect(view.container.textContent).not.toMatch(/[٠-٩]/);
    expectNoDefaultEnglish(view.container);
  });

  it("uses a label function for the message, so an application can write its own plural or gender forms", () => {
    const view = renderIn("en", <FileDrop maxSize={MB} />, {
      labels: { "fileDrop.rejectSize": ({ name, max }) => `Too big: ${name} (limit ${max})` },
    });
    drop(view, [file("x.bin", 2 * MB)]);
    expect(view.getByRole("alert").textContent).toBe("Too big: x.bin (limit 1 MB)");
  });

  it("inserts the alert again for every rejection, so the same file dropped twice is announced twice", () => {
    const view = renderIn("en", <FileDrop accept=".csv" />);
    drop(view, [file("a.exe", 10)]);
    const first = view.getByRole("alert");
    drop(view, [file("a.exe", 10)]);
    const second = view.getByRole("alert");
    expect(second).not.toBe(first);
    expect(first.isConnected).toBe(false);
    expect(second.textContent).toBe(first.textContent);
    drop(view, [file("b.exe", 10)]);
    expect(view.getByRole("alert").textContent).toBe("b.exe is not an accepted file type.");
  });

  it("points the input at the message and at the hint while the message is shown", () => {
    const view = renderIn("en", <FileDrop accept=".csv" hint="CSV only" />);
    const hint = view.getByText("CSV only");
    expect(fileInput(view).getAttribute("aria-describedby")).toBe(hint.id);
    drop(view, [file("a.exe", 10)]);
    expect(fileInput(view).getAttribute("aria-describedby")).toBe(`${hint.id} ${view.getByRole("alert").id}`);
    fireEvent.click(view.getByRole("button", { name: "Dismiss message" }));
    expect(fileInput(view).getAttribute("aria-describedby")).toBe(hint.id);
  });

  it("clears the message when the next drop is taken, and replaces it when the next drop is rejected too", () => {
    const view = renderIn("en", <FileDrop multiple accept=".csv" />);
    drop(view, [file("a.exe", 10)]);
    expect(view.getByRole("alert").textContent).toContain("a.exe");
    drop(view, [file("b.zip", 10)]);
    expect(view.getByRole("alert").textContent).toBe("b.zip is not an accepted file type.");
    drop(view, [file("ok.csv", 10)]);
    expect(view.queryByRole("alert")).toBeNull();
    expect(view.getAllByRole("listitem")).toHaveLength(1);
  });

  it("shows the message about the rejected files of a mixed drop, next to the files that were taken", () => {
    const view = renderIn("en", <FileDrop multiple accept=".csv" />);
    drop(view, [file("ok.csv", 10), file("a.exe", 10)]);
    expect(view.getByRole("alert").textContent).toBe("a.exe is not an accepted file type.");
    expect(view.getAllByRole("listitem")).toHaveLength(1);
  });

  it("dismisses the message with its button and puts focus back on the file input", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <FileDrop accept=".csv" />);
    drop(view, [file("a.exe", 10)]);
    const dismiss = view.getByRole("button", { name: "Dismiss message" });
    await user.click(dismiss);
    expect(view.queryByRole("alert")).toBeNull();
    expect(document.activeElement).toBe(fileInput(view));
  });

  it("can be operated with the keyboard after a rejection: Tab to the input, Tab to Dismiss, Enter dismisses, then a valid file is taken", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onFiles = vi.fn();
    const view = renderIn("en", <FileDrop accept=".csv" onFiles={onFiles} />);
    drop(view, [file("a.exe", 10, "application/x-msdownload")]);
    expect(view.getByRole("alert")).toBeTruthy();
    await user.tab();
    expect(document.activeElement).toBe(fileInput(view)); // still reachable, and not disabled
    expect(fileInput(view).disabled).toBe(false);
    await user.tab();
    expect(document.activeElement).toBe(view.getByRole("button", { name: "Dismiss message" }));
    await user.keyboard("{Enter}");
    expect(view.queryByRole("alert")).toBeNull();
    expect(document.activeElement).toBe(fileInput(view));
    await user.upload(fileInput(view), file("ok.csv", 10, "text/csv"));
    expect(onFiles).toHaveBeenLastCalledWith([expect.objectContaining({ name: "ok.csv" })]);
  });

  it("dismisses the message with Space as well", async () => {
    const user = userEvent.setup();
    const view = renderIn("en", <FileDrop accept=".csv" />);
    drop(view, [file("a.exe", 10)]);
    await user.tab();
    await user.tab();
    await user.keyboard(" ");
    expect(view.queryByRole("alert")).toBeNull();
  });

  it("leaves the drop area usable for a second try right after a rejection, without any dismissing", () => {
    const onFiles = vi.fn();
    const view = renderIn("en", <FileDrop maxSize={100} onFiles={onFiles} />);
    drop(view, [file("big.bin", 500)]);
    drop(view, [file("small.bin", 5)]);
    expect(onFiles).toHaveBeenLastCalledWith([expect.objectContaining({ name: "small.bin" })]);
    expect(view.queryByRole("alert")).toBeNull();
  });

  it("keeps the message out of the input's name (it is beside the drop area, not inside its label)", () => {
    const view = renderIn("en", <FileDrop accept=".csv" />);
    drop(view, [file("a.exe", 10)]);
    expect(dropZone(view).contains(view.getByRole("alert"))).toBe(false);
    expect(dropZone(view).textContent).not.toContain("a.exe");
  });
});

