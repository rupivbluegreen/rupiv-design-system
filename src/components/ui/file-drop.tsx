"use client";

import { useId, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { CloudUpload, FileText, X } from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./file-drop.module.css";

export interface FileDropProps {
  /** Same syntax as the native `accept` attribute, e.g. ".pdf,image/*". */
  accept?: string;
  hint?: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  id?: string;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

export function FileDrop({ accept, hint, multiple = false, onFiles, id, className }: FileDropProps) {
  const autoId = useId();
  const inputId = id ?? `file-drop-${autoId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list).filter((file) => isAccepted(file, accept));
    if (incoming.length === 0) return;
    const next = multiple ? [...files, ...incoming] : incoming.slice(0, 1);
    setFiles(next);
    onFiles?.(next);
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
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          className={styles.input}
          aria-describedby={hintId}
          onChange={handleChange}
        />
        <span className={styles.iconWrap} aria-hidden="true">
          <CloudUpload />
        </span>
        <span className={styles.prompt}>
          {dragging ? (
            "Drop to upload"
          ) : (
            <>
              Drag {multiple ? "files" : "a file"} here or <span className={styles.browse}>browse</span>
            </>
          )}
        </span>
        {hint && (
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        )}
      </label>

      {files.length > 0 && (
        <ul role="list" className={styles.files} aria-label="Selected files">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className={styles.file}>
              <FileText className={styles.fileIcon} aria-hidden="true" />
              <span className={styles.fileName} title={file.name}>
                {file.name}
              </span>
              <span className={styles.fileSize}>{formatBytes(file.size)}</span>
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove ${file.name}`}
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
