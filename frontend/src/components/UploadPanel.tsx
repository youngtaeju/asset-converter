import type { KeyboardEvent, RefObject } from "react";
import { formatBytes } from "../lib/format";
import type { SourceFormat } from "../types";

type UploadPanelProps = {
  files: File[];
  sourceFormat: SourceFormat;
  accept: string;
  isDragging: boolean;
  isSubmitting: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAddFiles: (files: FileList | null) => void;
  onRemoveFile: (file: File) => void;
  onDraggingChange: (isDragging: boolean) => void;
};

export function UploadPanel({
  files,
  sourceFormat,
  accept,
  isDragging,
  isSubmitting,
  fileInputRef,
  onAddFiles,
  onRemoveFile,
  onDraggingChange,
}: UploadPanelProps) {
  const selectedSize = files.reduce((total, file) => total + file.size, 0);
  const sourceLabel = sourceFormat.toUpperCase();

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
    <section className="panel upload-panel">
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
          accept={accept}
          onChange={(event) => onAddFiles(event.currentTarget.files)}
          hidden
        />
        <div className="drop-icon">Upload</div>
        <strong>{sourceLabel} 파일을 드롭하거나 선택</strong>
        <span>현재 원본 형식과 일치하는 파일만 추가할 수 있습니다.</span>
      </div>

      {files.length > 0 && (
        <div className="selected-files">
          <div className="selected-files-summary">
            <span>
              {sourceLabel} 파일 {files.length}개
            </span>
            <small>총 {formatBytes(selectedSize)}</small>
          </div>
          <div className="file-list">
            {files.map((file, index) => (
              <div
                className="file-item"
                key={`${file.name}-${file.size}-${file.lastModified}`}
              >
                <span className="file-index">{index + 1}</span>
                <div className="file-meta">
                  <span>{file.name}</span>
                  <small>{formatBytes(file.size)}</small>
                </div>
                <button
                  className="file-remove"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onRemoveFile(file)}
                  aria-label={`${file.name} 제거`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                    <path d="M9 3h6l1 2h4v2H4V5h4l1-2Z" />
                    <path d="M6 9h12l-1 11H7L6 9Zm4 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
