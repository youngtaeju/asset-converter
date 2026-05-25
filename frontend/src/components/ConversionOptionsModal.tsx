import { useEffect, useMemo, useState } from "react";
import type {
  ConversionOptions,
  ConversionPreset,
  GifMp4Options,
  GifMp4Preset,
  GifWebpOptions,
  Job,
  SourceFormat,
  TargetFormat,
} from "../types";

type EditableOptions = {
  mode: "edit";
  sourceFormat: SourceFormat;
  target: TargetFormat;
  conversionPreset: ConversionPreset;
  gifWebpOptions: GifWebpOptions;
  gifMp4Options: GifMp4Options;
  onApply: (values: {
    preset: ConversionPreset;
    gifWebpOptions: GifWebpOptions;
    gifMp4Options: GifMp4Options;
  }) => void;
  onClose: () => void;
};

type ReadonlyOptions = {
  mode: "view";
  job: Job;
  onClose: () => void;
};

type ConversionOptionsModalProps = EditableOptions | ReadonlyOptions;

type PresetOption = {
  value: ConversionPreset;
  label: string;
  description: string;
};

const presetOptions: PresetOption[] = [
  { value: "balanced", label: "균형", description: "기본 추천값" },
  {
    value: "smaller",
    label: "용량 줄이기",
    description: "fps/품질을 낮춰 작게",
  },
  { value: "quality", label: "품질 유지", description: "선명도 우선" },
  { value: "custom", label: "사용자 지정", description: "세부 값을 직접 조정" },
];

const presetLabels: Record<ConversionPreset, string> = {
  balanced: "균형",
  smaller: "용량 줄이기",
  quality: "품질 유지",
  custom: "사용자 설정",
};

const gifWebpPresets: Record<
  Exclude<ConversionPreset, "custom">,
  GifWebpOptions
> = {
  balanced: { fps: 24, quality: 75, compression_level: 6, lossless: false },
  smaller: { fps: 15, quality: 60, compression_level: 6, lossless: false },
  quality: { fps: 24, quality: 88, compression_level: 6, lossless: false },
};

const gifMp4Presets: Record<
  Exclude<ConversionPreset, "custom">,
  GifMp4Options
> = {
  balanced: { fps: 24, crf: 26, preset: "slow" },
  smaller: { fps: 15, crf: 32, preset: "slow" },
  quality: { fps: 24, crf: 20, preset: "slow" },
};

const mp4PresetOptions: Array<{ value: GifMp4Preset; label: string }> = [
  { value: "ultrafast", label: "ultrafast · 매우 빠름 / 큰 파일" },
  { value: "superfast", label: "superfast" },
  { value: "veryfast", label: "veryfast · 빠름" },
  { value: "faster", label: "faster" },
  { value: "fast", label: "fast" },
  { value: "medium", label: "medium · 보통" },
  { value: "slow", label: "slow · 기본" },
  { value: "slower", label: "slower · 작은 파일" },
  { value: "veryslow", label: "veryslow · 가장 느림" },
];

export function getConversionOptionsSummary(
  sourceFormat: SourceFormat,
  target: TargetFormat,
  preset: ConversionPreset,
) {
  if (!isGifAdvancedTarget(sourceFormat, target)) return "기본 설정";
  return presetLabels[preset];
}

export function isGifAdvancedTarget(
  sourceFormat: SourceFormat | string,
  target: TargetFormat | string,
) {
  return sourceFormat === "gif" && (target === "webp" || target === "mp4");
}

export function getPresetOptionsForTarget(target: TargetFormat) {
  if (target === "webp") return gifWebpPresets;
  if (target === "mp4") return gifMp4Presets;
  return null;
}

export function ConversionOptionsModal(props: ConversionOptionsModalProps) {
  if (props.mode === "view") {
    return <ReadonlyConversionOptionsModal {...props} />;
  }
  return <EditableConversionOptionsModal {...props} />;
}

function EditableConversionOptionsModal({
  sourceFormat,
  target,
  conversionPreset,
  gifWebpOptions,
  gifMp4Options,
  onApply,
  onClose,
}: EditableOptions) {
  const [draftPreset, setDraftPreset] = useState(conversionPreset);
  const [draftWebpOptions, setDraftWebpOptions] = useState(gifWebpOptions);
  const [draftMp4Options, setDraftMp4Options] = useState(gifMp4Options);
  const canEdit = isGifAdvancedTarget(sourceFormat, target);

  useEffect(() => {
    setDraftPreset(conversionPreset);
    setDraftWebpOptions(gifWebpOptions);
    setDraftMp4Options(gifMp4Options);
  }, [conversionPreset, gifMp4Options, gifWebpOptions]);

  function applyPreset(preset: ConversionPreset) {
    setDraftPreset(preset);
    if (preset === "custom") return;
    if (target === "webp") setDraftWebpOptions(gifWebpPresets[preset]);
    if (target === "mp4") setDraftMp4Options(gifMp4Presets[preset]);
  }

  function updateWebpOptions(options: GifWebpOptions) {
    setDraftWebpOptions(options);
    setDraftPreset("custom");
  }

  function updateMp4Options(options: GifMp4Options) {
    setDraftMp4Options(options);
    setDraftPreset("custom");
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal options-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conversion-options-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Advanced options</p>
            <h2 id="conversion-options-title">
              {sourceFormat.toUpperCase()} → {target.toUpperCase()} 설정
            </h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        {canEdit ? (
          <div className="options-modal-body">
            <div className="preset-grid" aria-label="변환 프리셋">
              {presetOptions.map((preset) => (
                <button
                  className={
                    draftPreset === preset.value
                      ? "preset-card active"
                      : "preset-card"
                  }
                  type="button"
                  key={preset.value}
                  onClick={() => applyPreset(preset.value)}
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.description}</span>
                </button>
              ))}
            </div>

            {target === "webp" ? (
              <GifWebpControls
                options={draftWebpOptions}
                onChange={updateWebpOptions}
              />
            ) : (
              <GifMp4Controls
                options={draftMp4Options}
                onChange={updateMp4Options}
              />
            )}
          </div>
        ) : (
          <p className="option-empty">
            이 변환은 현재 별도 고급 옵션 없이 기본 설정으로 처리됩니다.
          </p>
        )}

        <div className="modal-actions">
          <button className="secondary" type="button" onClick={onClose}>
            취소
          </button>
          <button
            className="primary"
            type="button"
            onClick={() => {
              onApply({
                preset: draftPreset,
                gifWebpOptions: draftWebpOptions,
                gifMp4Options: draftMp4Options,
              });
              onClose();
            }}
          >
            적용
          </button>
        </div>
      </section>
    </div>
  );
}

function ReadonlyConversionOptionsModal({ job, onClose }: ReadonlyOptions) {
  const rows = useMemo(
    () => getReadonlyOptionRows(job.conversion_options),
    [job.conversion_options],
  );

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal options-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="readonly-options-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Conversion settings</p>
            <h2 id="readonly-options-title">
              {job.input_format.toUpperCase()} →{" "}
              {job.target_format.toUpperCase()} 설정
            </h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        {rows.length > 0 ? (
          <dl className="settings-list">
            {rows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="option-empty">
            이 변환은 별도 고급 옵션 없이 기본 설정으로 처리되었습니다.
          </p>
        )}
      </section>
    </div>
  );
}

function GifWebpControls({
  options,
  onChange,
}: {
  options: GifWebpOptions;
  onChange: (options: GifWebpOptions) => void;
}) {
  return (
    <div className="advanced-control-grid">
      <RangeControl
        label="FPS"
        value={options.fps}
        min={1}
        max={60}
        unit="fps"
        hint="낮추면 움직임은 덜 부드럽지만 용량이 줄어듭니다."
        lowLabel="가볍게"
        highLabel="부드럽게"
        onChange={(value) => onChange({ ...options, fps: value })}
      />
      <RangeControl
        label="Quality"
        value={options.quality}
        min={1}
        max={100}
        unit=""
        hint="높을수록 선명하지만 파일 크기가 커질 수 있습니다."
        lowLabel="작게"
        highLabel="선명하게"
        onChange={(value) => onChange({ ...options, quality: value })}
      />
      <RangeControl
        label="Compression Level"
        value={options.compression_level}
        min={0}
        max={6}
        unit=""
        hint="높을수록 처리 시간은 늘고 파일 크기는 줄어들 수 있습니다."
        lowLabel="빠르게"
        highLabel="작게"
        onChange={(value) => onChange({ ...options, compression_level: value })}
      />
      <label className="switch-control">
        <input
          type="checkbox"
          checked={options.lossless}
          onChange={(event) =>
            onChange({ ...options, lossless: event.currentTarget.checked })
          }
        />
        <span>
          <strong>Lossless</strong>
          <small>품질 손실은 줄지만 용량이 커질 수 있습니다.</small>
        </span>
      </label>
    </div>
  );
}

function GifMp4Controls({
  options,
  onChange,
}: {
  options: GifMp4Options;
  onChange: (options: GifMp4Options) => void;
}) {
  return (
    <div className="advanced-control-grid">
      <RangeControl
        label="FPS"
        value={options.fps}
        min={1}
        max={60}
        unit="fps"
        hint="낮추면 움직임은 덜 부드럽지만 용량이 줄어듭니다."
        lowLabel="가볍게"
        highLabel="부드럽게"
        onChange={(value) => onChange({ ...options, fps: value })}
      />
      <RangeControl
        label="CRF"
        value={options.crf}
        min={0}
        max={51}
        unit=""
        hint="낮을수록 고품질/큰 파일, 높을수록 작은 파일입니다."
        lowLabel="높은 품질"
        highLabel="작은 파일"
        onChange={(value) => onChange({ ...options, crf: value })}
      />
      <label className="select-control option-card">
        <span>Preset</span>
        <select
          value={options.preset}
          onChange={(event) =>
            onChange({
              ...options,
              preset: event.currentTarget.value as GifMp4Preset,
            })
          }
        >
          {mp4PresetOptions.map((preset) => (
            <option value={preset.value} key={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
        <small>
          느린 설정일수록 처리 시간은 늘고 파일 크기는 줄어들 수 있습니다.
        </small>
      </label>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  unit,
  hint,
  lowLabel,
  highLabel,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  hint: string;
  lowLabel: string;
  highLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-control option-card">
      <span>
        <strong>{label}</strong>
        <em>
          {value}
          {unit ? ` ${unit}` : ""}
        </em>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <div className="range-scale" aria-hidden="true">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
      <small>{hint}</small>
    </label>
  );
}

function getReadonlyOptionRows(options?: ConversionOptions | null) {
  if (!options) return [];
  if ("quality" in options) {
    return [
      { label: "FPS", value: `${options.fps}` },
      { label: "Quality", value: `${options.quality}` },
      { label: "Compression Level", value: `${options.compression_level}` },
      { label: "Lossless", value: options.lossless ? "On" : "Off" },
    ];
  }
  if ("crf" in options) {
    return [
      { label: "FPS", value: `${options.fps}` },
      { label: "CRF", value: `${options.crf}` },
      { label: "Preset", value: options.preset },
    ];
  }
  return [];
}
