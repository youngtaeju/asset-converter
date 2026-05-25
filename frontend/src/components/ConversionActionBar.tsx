import { useEffect, useState } from "react";
import type { SourceFormat, TargetFormat } from "../types";

type FormatOption<T extends string> = {
  value: T;
  label: string;
};

type ConversionActionBarProps = {
  filesCount: number;
  sourceFormat: SourceFormat;
  sourceOptions: Array<FormatOption<SourceFormat>>;
  target: TargetFormat;
  targetOptions: Array<FormatOption<TargetFormat>>;
  backgroundColor: string;
  isSubmitting: boolean;
  advancedAvailable: boolean;
  optionsSummary: string;
  onSourceFormatChange: (sourceFormat: SourceFormat) => void;
  onTargetChange: (target: TargetFormat) => void;
  onBackgroundColorChange: (color: string) => void;
  onOpenOptions: () => void;
  onSubmit: () => void;
};

export function ConversionActionBar({
  filesCount,
  sourceFormat,
  sourceOptions,
  target,
  targetOptions,
  backgroundColor,
  isSubmitting,
  advancedAvailable,
  optionsSummary,
  onSourceFormatChange,
  onTargetChange,
  onBackgroundColorChange,
  onOpenOptions,
  onSubmit,
}: ConversionActionBarProps) {
  const showsBackgroundColor = target === "jpg" || target === "jpeg";
  const [backgroundColorDraft, setBackgroundColorDraft] =
    useState(backgroundColor);

  useEffect(() => {
    setBackgroundColorDraft(backgroundColor);
  }, [backgroundColor]);

  function normalizeHexColor(value: string) {
    const trimmed = value.trim();
    const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : null;
  }

  function updateBackgroundColorDraft(value: string) {
    setBackgroundColorDraft(value);
    const normalized = normalizeHexColor(value);
    if (normalized) {
      onBackgroundColorChange(normalized);
    }
  }

  return (
    <footer className="conversion-footer" aria-label="변환 설정">
      <div className="conversion-panel compact-panel">
        <div className="conversion-flow" aria-label="변환 형식 선택">
          <label className="action-field format-select-group">
            <span className="action-field-label">원본</span>
            <select
              className="format-select"
              value={sourceFormat}
              onChange={(event) =>
                onSourceFormatChange(event.currentTarget.value as SourceFormat)
              }
            >
              {sourceOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <span className="flow-arrow" aria-hidden="true">
            →
          </span>

          <label className="action-field format-select-group">
            <span className="action-field-label">대상</span>
            <select
              className="format-select"
              value={target}
              onChange={(event) =>
                onTargetChange(event.currentTarget.value as TargetFormat)
              }
            >
              {targetOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="action-field options-button"
            type="button"
            disabled={!advancedAvailable}
            onClick={onOpenOptions}
          >
            <span className="action-field-label">고급 옵션</span>
            <strong>{advancedAvailable ? optionsSummary : "기본 설정"}</strong>
          </button>
        </div>

        <div className="conversion-controls compact-controls">
          {showsBackgroundColor && (
            <label className="action-field color-row compact">
              <span className="action-field-label">JPG 배경색</span>
              <div className="color-fields">
                <input
                  className="color-picker-input"
                  type="color"
                  value={backgroundColor}
                  onChange={(event) =>
                    updateBackgroundColorDraft(event.currentTarget.value)
                  }
                />
                <input
                  className="color-hex-input"
                  type="text"
                  value={backgroundColorDraft}
                  inputMode="text"
                  maxLength={7}
                  spellCheck={false}
                  aria-label="JPG 배경색 HEX 코드"
                  onChange={(event) =>
                    updateBackgroundColorDraft(event.currentTarget.value)
                  }
                  onBlur={() => setBackgroundColorDraft(backgroundColor)}
                />
              </div>
            </label>
          )}

          <button
            className="primary convert-submit"
            type="button"
            disabled={isSubmitting || filesCount === 0}
            onClick={onSubmit}
          >
            {isSubmitting
              ? "요청 중..."
              : filesCount > 0
                ? `변환 시작 · ${filesCount}개`
                : "파일 선택 필요"}
          </button>
        </div>
      </div>
    </footer>
  );
}
