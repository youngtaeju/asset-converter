import { useEffect, useState } from "react";
import type { TargetFormat } from "../types";

type TargetOption = {
  value: TargetFormat;
  label: string;
  hint: string;
};

type ConversionActionBarProps = {
  filesCount: number;
  target: TargetFormat;
  targetOptions: TargetOption[];
  backgroundColor: string;
  isSubmitting: boolean;
  onTargetChange: (target: TargetFormat) => void;
  onBackgroundColorChange: (color: string) => void;
  onSubmit: () => void;
};

export function ConversionActionBar({
  filesCount,
  target,
  targetOptions,
  backgroundColor,
  isSubmitting,
  onTargetChange,
  onBackgroundColorChange,
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
      <div className="conversion-panel">
        <div className="conversion-targets">
          <div className="section-label">대상 선택</div>
          <div className="format-grid compact">
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
        </div>

        <div className="conversion-controls">
          {showsBackgroundColor && (
            <label className="color-row compact">
              <span>JPG 배경색</span>
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
