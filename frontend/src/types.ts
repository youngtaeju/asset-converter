export type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "expired";
export type SourceFormat = "gif" | "jpg" | "png" | "webp";
export type TargetFormat = "webp" | "mp4" | "jpg" | "jpeg" | "png";

export type ConversionPreset = "balanced" | "smaller" | "quality" | "custom";

export type GifWebpOptions = {
  fps: number;
  quality: number;
  compression_level: number;
  lossless: boolean;
};

export type GifMp4Preset =
  | "ultrafast"
  | "superfast"
  | "veryfast"
  | "faster"
  | "fast"
  | "medium"
  | "slow"
  | "slower"
  | "veryslow";

export type GifMp4Options = {
  fps: number;
  crf: number;
  preset: GifMp4Preset;
};

export type ConversionOptions = GifWebpOptions | GifMp4Options;

export type WarningNote = {
  code: string;
  message: string;
};

export type Job = {
  id: string;
  status: JobStatus;
  source_filename: string;
  input_format: string;
  target_format: TargetFormat;
  input_size_bytes: number;
  output_size_bytes?: number | null;
  duration_ms?: number | null;
  conversion_options?: ConversionOptions | null;
  warnings: WarningNote[];
  error_summary?: string | null;
  created_at: string;
  expires_at?: string | null;
  download_available: boolean;
};

export type BatchResponse = {
  jobs: Job[];
  accepted_count: number;
  rejected: Array<{
    source_filename: string;
    error: { code: string; message: string };
  }>;
};
