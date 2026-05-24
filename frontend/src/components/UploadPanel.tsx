import type { KeyboardEvent, RefObject } from "react";
import type { TargetFormat } from "../types";
import { formatBytes } from "../lib/format";

type TargetOption = {
  value: TargetFormat;
  label: string;
  hint: string;
};

type UploadPanelProps = {
  files: File[];
  target: TargetFormat;
  targetOptions: TargetOption[];
  backgroundColor: string;
  message: string;
  isDragging: boolean;
  isSubmitting: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAddFiles: (files: FileList | null) => void;
  onTargetChange: (target: TargetFormat) => void;
  onBackgroundColorChange: (color: string) => void;
  onDraggingChange: (isDragging: boolean) => void;
  onSubmit: () => void;
};

export function UploadPanel({
  files,
  target,
  targetOptions,
  backgroundColor,
  message,
  isDragging,
  isSubmitting,
  fileInputRef,
  onAddFiles,
  onTargetChange,
  onBackgroundColorChange,
  onDraggingChange,
  onSubmit,
}: UploadPanelProps) {
  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleDropzoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  }

  return (
    <form
      className="panel upload-panel"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="panel-header">
        <div>
          <p className="eyebrow">Convert</p>
          <h2>파일 업로드</h2>
        </div>
        <span className="badge">Batch</span>
      </div>

      <div
        className={`dropzone ${isDragging ? "dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          onDraggingChange(true);
        }}
        onDragLeave={() => onDraggingChange(false)}
        onDrop={(event) => {
          event.preventDefault();
          onDraggingChange(false);
          onAddFiles(event.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={handleDropzoneKeyDown}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(event) => onAddFiles(event.currentTarget.files)}
          hidden
        />
        <div className="drop-icon">Upload</div>
        <strong>파일을 드롭하거나 선택</strong>
        <span>GIF, JPG, PNG, WebP를 지원합니다.</span>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((file) => (
            <div
              className="file-item"
              key={`${file.name}-${file.size}-${file.lastModified}`}
            >
              <span>{file.name}</span>
              <small>{formatBytes(file.size)}</small>
            </div>
          ))}
        </div>
      )}

      <div className="format-grid">
        {targetOptions.map((option) => (
          <label
            className={target === option.value ? "format active" : "format"}
            key={option.value}
          >
            <input
              type="radio"
              name="target_format"
              value={option.value}
              checked={target === option.value}
              onChange={() => onTargetChange(option.value)}
            />
            <strong>{option.label}</strong>
            <span>{option.hint}</span>
          </label>
        ))}
      </div>

      <label className="color-row">
        <span>JPG 배경색</span>
        <input
          type="color"
          value={backgroundColor}
          onChange={(event) =>
            onBackgroundColorChange(event.currentTarget.value)
          }
        />
        <code>{backgroundColor}</code>
      </label>

      <button className="primary full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "요청 중..." : "변환 시작"}
      </button>
      {message && <p className="notice">{message}</p>}
    </form>
  );
}
