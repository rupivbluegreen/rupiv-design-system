"use client";

import { useId, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { CircleAlert, CloudUpload, FileText, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { useFormat, type Formatters } from "../../lib/use-format";
import { useLabels } from "../../provider";
import type { LabelFn } from "../../provider";
import styles from "./file-drop.module.css";

/** Why a file was not taken: its type does not match `accept`, or it is larger than `maxSize`. */
export type FileRejectReason = "type" | "size";

/** A file that was offered and not taken. A file that fails both checks is reported as `"type"`. */
export interface FileRejection {
  file: File;
  reason: FileRejectReason;
}

export interface FileDropProps {
  /** Same syntax as the native `accept` attribute, e.g. ".pdf,image/*". A file that does not match is rejected. */
  accept?: string | undefined;
  /** The largest file taken, in bytes (1 KB is 1024 bytes). A larger file is rejected. No limit when omitted. */
  maxSize?: number | undefined;
  hint?: string | undefined;
  multiple?: boolean | undefined;
  /** The whole current list, after an add or a remove. Rejected files are never in it. */
  onFiles?: ((files: File[]) => void) | undefined;
  /**
   * Called with the files that were not taken, from a drop or from the file picker; the others still reach
   * `onFiles`. Without it the component shows its own message under the drop area. With it the application decides
   * what to show and the component shows nothing.
   */
  onReject?: ((rejected: FileRejection[]) => void) | undefined;
  id?: string | undefined;
  className?: string | undefined;
}

/** 812 B, 1.5 KB, 48 KB, 2.3 MB: units from the provider's labels, digits Western, one decimal below 10 KB and for MB. */
function formatBytes(bytes: number, format: Pick<Formatters, "int" | "num">, label: LabelFn): string {
  if (bytes < 1024) return label("fileDrop.sizeBytes", { size: format.int(bytes) });
  if (bytes < 1024 * 1024) return label("fileDrop.sizeKb", { size: format.num(bytes / 1024, bytes < 10 * 1024 ? 1 : 0) });
  return label("fileDrop.sizeMb", { size: format.num(bytes / (1024 * 1024), 1) });
}

/** The limit as "20 MB" or "1.5 KB": at most one decimal, rounded down so "larger than 1.5 MB" is never untrue. */
function formatLimit(bytes: number, format: Pick<Formatters, "int" | "num">, label: LabelFn): string {
  const down = (value: number) => format.num(Math.floor(value * 10 + 1e-9) / 10);
  if (bytes < 1024) return label("fileDrop.sizeBytes", { size: format.int(bytes) });
  if (bytes < 1024 * 1024) return label("fileDrop.sizeKb", { size: down(bytes / 1024) });
  return label("fileDrop.sizeMb", { size: down(bytes / (1024 * 1024)) });
}

function isAccepted(file: File, accept?: string): boolean {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .some((token) => {
      if (token.startsWith(".")) return name.endsWith(token);
      if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
      return type === token;
    });
}

export function FileDrop({ accept, maxSize, hint, multiple = false, onFiles, onReject, id, className }: FileDropProps) {
  const label = useLabels();
  const format = useFormat();
  const autoId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = id ?? `file-drop-${autoId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const rejectId = `${inputId}-reject`;
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  // The message shown when the application gives no `onReject`. `round` changes with every new rejection, so the
  // alert is inserted again and a screen reader says it again, also for the same file dropped twice.
  const [rejection, setRejection] = useState<{ round: number; lines: string[] } | null>(null);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const accepted: File[] = [];
    const rejected: FileRejection[] = [];
    const lines: string[] = [];
    for (const file of Array.from(list)) {
      if (!isAccepted(file, accept)) {
        rejected.push({ file, reason: "type" });
        lines.push(label("fileDrop.rejectType", { name: file.name }));
      } else if (maxSize !== undefined && file.size > maxSize) {
        rejected.push({ file, reason: "size" });
        lines.push(label("fileDrop.rejectSize", { name: file.name, max: formatLimit(maxSize, format, label) }));
      } else {
        accepted.push(file);
      }
    }
    if (rejected.length > 0) onReject?.(rejected);
    setRejection((previous) => (rejected.length > 0 && !onReject ? { round: (previous?.round ?? 0) + 1, lines } : null));
    if (accepted.length === 0) return;
    const next = multiple ? [...files, ...accepted] : accepted.slice(0, 1);
    setFiles(next);
    onFiles?.(next);
  }

  function dismissRejection() {
    setRejection(null);
    inputRef.current?.focus();
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onFiles?.(next);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!dragging) setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files);
    event.target.value = "";
  }

  return (
    <div className={cn(styles.root, className)}>
      <label
        htmlFor={inputId}
        className={cn(styles.zone, dragging && styles.dragging)}
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          className={styles.input}
          aria-describedby={[hintId, rejection ? rejectId : undefined].filter(Boolean).join(" ") || undefined}
          onChange={handleChange}
        />
        <span className={styles.iconWrap} aria-hidden="true">
          <CloudUpload />
        </span>
        <span className={styles.prompt}>
          {dragging ? (
            label("fileDrop.dropToUpload")
          ) : (
            <>
              {label(multiple ? "fileDrop.promptMany" : "fileDrop.promptOne")}{" "}
              <span className={styles.browse}>{label("fileDrop.browse")}</span>
            </>
          )}
        </span>
        {hint && (
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        )}
      </label>

      {rejection && (
        <div className={styles.reject}>
          <CircleAlert className={styles.rejectIcon} aria-hidden="true" />
          <div key={rejection.round} id={rejectId} role="alert" className={styles.rejectText}>
            {rejection.lines.map((line, index) => (
              <p key={`${index}-${line}`} className={styles.rejectLine}>
                {line}
              </p>
            ))}
          </div>
          <button type="button" className={styles.dismiss} aria-label={label("fileDrop.dismiss")} onClick={dismissRejection}>
            <X aria-hidden="true" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <ul role="list" className={styles.files} aria-label={label("fileDrop.selectedFiles")}>
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className={styles.file}>
              <FileText className={styles.fileIcon} aria-hidden="true" />
              <span className={styles.fileName} title={file.name}>
                {file.name}
              </span>
              <span className={styles.fileSize}>{formatBytes(file.size, format, label)}</span>
              <button
                type="button"
                className={styles.remove}
                aria-label={label("fileDrop.remove", { name: file.name })}
                onClick={() => removeFile(index)}
              >
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
