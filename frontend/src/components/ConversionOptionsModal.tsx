import { useEffect, useMemo, useState } from "react";
import type {
  ConversionOptions,
  ConversionPreset,
  GifDither,
  GifMp4Options,
  GifMp4Preset,
  GifToGifOptions,
  GifWebpOptions,
  JpegOptions,
  Job,
  PngOptions,
  SourceFormat,
  StaticWebpOptions,
  TargetFormat,
} from "../types";

export type ConversionOptionState = {
  preset: ConversionPreset;
  gifWebpOptions: GifWebpOptions;
  gifMp4Options: GifMp4Options;
  gifToGifOptions: GifToGifOptions;
  jpegOptions: JpegOptions;
  pngOptions: PngOptions;
  staticWebpOptions: StaticWebpOptions;
};

type EditableOptions = {
  mode: "edit";
  sourceFormat: SourceFormat;
  target: TargetFormat;
  optionState: ConversionOptionState;
  onApply: (values: ConversionOptionState) => void;
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
    description: "품질/압축을 조정해 작게",
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

const gifToGifPresets: Record<
  Exclude<ConversionPreset, "custom">,
  GifToGifOptions
> = {
  balanced: { fps: 15, colors: 128, dither: "floyd_steinberg" },
  smaller: { fps: 12, colors: 96, dither: "bayer" },
  quality: { fps: 24, colors: 256, dither: "floyd_steinberg" },
};

const jpegPresets: Record<Exclude<ConversionPreset, "custom">, JpegOptions> = {
  balanced: { quality: 85, progressive: false, optimize: true },
  smaller: { quality: 70, progressive: true, optimize: true },
  quality: { quality: 95, progressive: false, optimize: true },
};

const pngPresets: Record<Exclude<ConversionPreset, "custom">, PngOptions> = {
  balanced: { compress_level: 6, optimize: true },
  smaller: { compress_level: 9, optimize: true },
  quality: { compress_level: 6, optimize: true },
};

const staticWebpPresets: Record<
  Exclude<ConversionPreset, "custom">,
  StaticWebpOptions
> = {
  balanced: { quality: 80, lossless: false, method: 4 },
  smaller: { quality: 65, lossless: false, method: 6 },
  quality: { quality: 92, lossless: false, method: 4 },
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

const gifDitherOptions: Array<{ value: GifDither; label: string }> = [
  { value: "none", label: "none · 패턴 없음" },
  { value: "bayer", label: "bayer · 작은 파일" },
  { value: "floyd_steinberg", label: "floyd_steinberg · 자연스러운 색" },
];

export const defaultOptionState: ConversionOptionState = {
  preset: "balanced",
  gifWebpOptions: gifWebpPresets.balanced,
  gifMp4Options: gifMp4Presets.balanced,
  gifToGifOptions: gifToGifPresets.balanced,
  jpegOptions: jpegPresets.balanced,
  pngOptions: pngPresets.balanced,
  staticWebpOptions: staticWebpPresets.balanced,
};

export function getConversionOptionsSummary(
  sourceFormat: SourceFormat,
  target: TargetFormat,
  preset: ConversionPreset,
) {
  if (!isAdvancedConversion(sourceFormat, target)) return "기본 설정";
  return presetLabels[preset];
}

export function isAdvancedConversion(
  sourceFormat: SourceFormat | string,
  target: TargetFormat | string,
) {
  if (sourceFormat === "gif" && target === "gif") return true;
  if (sourceFormat === "gif" && target === "mp4") return true;
  return (
    target === "webp" ||
    target === "jpg" ||
    target === "jpeg" ||
    target === "png"
  );
}

export function getActiveConversionOptions(
  sourceFormat: SourceFormat,
  target: TargetFormat,
  state: ConversionOptionState,
): ConversionOptions | undefined {
  if (!isAdvancedConversion(sourceFormat, target)) return undefined;
  if (sourceFormat === "gif" && target === "webp") return state.gifWebpOptions;
  if (sourceFormat === "gif" && target === "mp4") return state.gifMp4Options;
  if (sourceFormat === "gif" && target === "gif") return state.gifToGifOptions;
  if (target === "webp") return state.staticWebpOptions;
  if (target === "png") return state.pngOptions;
  if (target === "jpg" || target === "jpeg") return state.jpegOptions;
  return undefined;
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
  optionState,
  onApply,
  onClose,
}: EditableOptions) {
  const [draft, setDraft] = useState<ConversionOptionState>(optionState);
  const canEdit = isAdvancedConversion(sourceFormat, target);

  useEffect(() => {
    setDraft(optionState);
  }, [optionState]);

  function applyPreset(preset: ConversionPreset) {
    if (preset === "custom") {
      setDraft((current) => ({ ...current, preset }));
      return;
    }
    setDraft((current) => ({
      ...current,
      preset,
      gifWebpOptions:
        sourceFormat === "gif" && target === "webp"
          ? gifWebpPresets[preset]
          : current.gifWebpOptions,
      gifMp4Options:
        sourceFormat === "gif" && target === "mp4"
          ? gifMp4Presets[preset]
          : current.gifMp4Options,
      gifToGifOptions:
        sourceFormat === "gif" && target === "gif"
          ? gifToGifPresets[preset]
          : current.gifToGifOptions,
      jpegOptions:
        target === "jpg" || target === "jpeg"
          ? jpegPresets[preset]
          : current.jpegOptions,
      pngOptions: target === "png" ? pngPresets[preset] : current.pngOptions,
      staticWebpOptions:
        sourceFormat !== "gif" && target === "webp"
          ? staticWebpPresets[preset]
          : current.staticWebpOptions,
    }));
  }

  function updateDraft(patch: Partial<ConversionOptionState>) {
    setDraft((current) => ({ ...current, ...patch, preset: "custom" }));
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
                    draft.preset === preset.value
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

            {renderControls(sourceFormat, target, draft, updateDraft)}
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
              onApply(draft);
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
  const rows = useMemo(() => getReadonlyOptionRows(job), [job]);

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

function renderControls(
  sourceFormat: SourceFormat,
  target: TargetFormat,
  draft: ConversionOptionState,
  updateDraft: (patch: Partial<ConversionOptionState>) => void,
) {
  if (sourceFormat === "gif" && target === "webp") {
    return (
      <GifWebpControls
        options={draft.gifWebpOptions}
        onChange={(gifWebpOptions) => updateDraft({ gifWebpOptions })}
      />
    );
  }
  if (sourceFormat === "gif" && target === "mp4") {
    return (
      <GifMp4Controls
        options={draft.gifMp4Options}
        onChange={(gifMp4Options) => updateDraft({ gifMp4Options })}
      />
    );
  }
  if (sourceFormat === "gif" && target === "gif") {
    return (
      <GifToGifControls
        options={draft.gifToGifOptions}
        onChange={(gifToGifOptions) => updateDraft({ gifToGifOptions })}
      />
    );
  }
  if (target === "webp") {
    return (
      <StaticWebpControls
        options={draft.staticWebpOptions}
        onChange={(staticWebpOptions) => updateDraft({ staticWebpOptions })}
      />
    );
  }
  if (target === "png") {
    return (
      <PngControls
        options={draft.pngOptions}
        onChange={(pngOptions) => updateDraft({ pngOptions })}
      />
    );
  }
  return (
    <JpegControls
      options={draft.jpegOptions}
      onChange={(jpegOptions) => updateDraft({ jpegOptions })}
    />
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
      <SwitchControl
        label="Lossless"
        checked={options.lossless}
        hint="품질 손실은 줄지만 용량이 커질 수 있습니다."
        onChange={(lossless) => onChange({ ...options, lossless })}
      />
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

function GifToGifControls({
  options,
  onChange,
}: {
  options: GifToGifOptions;
  onChange: (options: GifToGifOptions) => void;
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
        label="Colors"
        value={options.colors}
        min={2}
        max={256}
        unit=""
        hint="낮추면 용량은 줄지만 색 표현이 단순해질 수 있습니다."
        lowLabel="작게"
        highLabel="풍부하게"
        onChange={(value) => onChange({ ...options, colors: value })}
      />
      <label className="select-control option-card">
        <span>Dither</span>
        <select
          value={options.dither}
          onChange={(event) =>
            onChange({
              ...options,
              dither: event.currentTarget.value as GifDither,
            })
          }
        >
          {gifDitherOptions.map((dither) => (
            <option value={dither.value} key={dither.value}>
              {dither.label}
            </option>
          ))}
        </select>
        <small>제한된 색상으로 바꿀 때 계단 현상을 줄이는 방식입니다.</small>
      </label>
    </div>
  );
}

function StaticWebpControls({
  options,
  onChange,
}: {
  options: StaticWebpOptions;
  onChange: (options: StaticWebpOptions) => void;
}) {
  return (
    <div className="advanced-control-grid">
      <RangeControl
        label="Quality"
        value={options.quality}
        min={1}
        max={100}
        unit=""
        hint="높을수록 선명하지만 파일 크기가 커질 수 있습니다."
        lowLabel="작게"
        highLabel="선명하게"
        onChange={(quality) => onChange({ ...options, quality })}
      />
      <RangeControl
        label="Method"
        value={options.method}
        min={0}
        max={6}
        unit=""
        hint="높을수록 처리 시간은 늘고 파일 크기는 줄어들 수 있습니다."
        lowLabel="빠르게"
        highLabel="작게"
        onChange={(method) => onChange({ ...options, method })}
      />
      <SwitchControl
        label="Lossless"
        checked={options.lossless}
        hint="품질 손실은 줄지만 용량이 커질 수 있습니다."
        onChange={(lossless) => onChange({ ...options, lossless })}
      />
    </div>
  );
}

function JpegControls({
  options,
  onChange,
}: {
  options: JpegOptions;
  onChange: (options: JpegOptions) => void;
}) {
  return (
    <div className="advanced-control-grid">
      <RangeControl
        label="Quality"
        value={options.quality}
        min={1}
        max={100}
        unit=""
        hint="높을수록 선명하지만 파일 크기가 커질 수 있습니다."
        lowLabel="작게"
        highLabel="선명하게"
        onChange={(quality) => onChange({ ...options, quality })}
      />
      <SwitchControl
        label="Progressive"
        checked={options.progressive}
        hint="이미지가 점진적으로 표시되도록 저장합니다."
        onChange={(progressive) => onChange({ ...options, progressive })}
      />
      <SwitchControl
        label="Optimize"
        checked={options.optimize}
        hint="추가 최적화를 적용해 파일 크기를 줄입니다."
        onChange={(optimize) => onChange({ ...options, optimize })}
      />
    </div>
  );
}

function PngControls({
  options,
  onChange,
}: {
  options: PngOptions;
  onChange: (options: PngOptions) => void;
}) {
  return (
    <div className="advanced-control-grid">
      <RangeControl
        label="Compress Level"
        value={options.compress_level}
        min={0}
        max={9}
        unit=""
        hint="높을수록 처리 시간은 늘고 파일 크기는 줄어들 수 있습니다."
        lowLabel="빠르게"
        highLabel="작게"
        onChange={(compress_level) => onChange({ ...options, compress_level })}
      />
      <SwitchControl
        label="Optimize"
        checked={options.optimize}
        hint="추가 최적화를 적용해 파일 크기를 줄입니다."
        onChange={(optimize) => onChange({ ...options, optimize })}
      />
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

function SwitchControl({
  label,
  checked,
  hint,
  onChange,
}: {
  label: string;
  checked: boolean;
  hint: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="switch-control option-card">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
    </label>
  );
}

function getReadonlyOptionRows(job: Job) {
  const options = job.conversion_options;
  if (!options) return [];

  if ("crf" in options) {
    return [
      { label: "FPS", value: `${options.fps}` },
      { label: "CRF", value: `${options.crf}` },
      { label: "Preset", value: options.preset },
    ];
  }
  if (
    job.input_format === "gif" &&
    job.target_format === "gif" &&
    "colors" in options
  ) {
    return [
      { label: "FPS", value: `${options.fps}` },
      { label: "Colors", value: `${options.colors}` },
      { label: "Dither", value: options.dither },
    ];
  }
  if (
    job.input_format === "gif" &&
    job.target_format === "webp" &&
    "compression_level" in options
  ) {
    return [
      { label: "FPS", value: `${options.fps}` },
      { label: "Quality", value: `${options.quality}` },
      { label: "Compression Level", value: `${options.compression_level}` },
      { label: "Lossless", value: options.lossless ? "On" : "Off" },
    ];
  }
  if (
    (job.target_format === "jpg" || job.target_format === "jpeg") &&
    "progressive" in options
  ) {
    return [
      { label: "Quality", value: `${options.quality}` },
      { label: "Progressive", value: options.progressive ? "On" : "Off" },
      { label: "Optimize", value: options.optimize ? "On" : "Off" },
    ];
  }
  if (job.target_format === "png" && "compress_level" in options) {
    return [
      { label: "Compress Level", value: `${options.compress_level}` },
      { label: "Optimize", value: options.optimize ? "On" : "Off" },
    ];
  }
  if (job.target_format === "webp" && "method" in options) {
    return [
      { label: "Quality", value: `${options.quality}` },
      { label: "Method", value: `${options.method}` },
      { label: "Lossless", value: options.lossless ? "On" : "Off" },
    ];
  }
  return [];
}
