import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityPanel, type ActivityTab } from "./components/ActivityPanel";
import { ConversionActionBar } from "./components/ConversionActionBar";
import {
  ConversionOptionsModal,
  getConversionOptionsSummary,
  isGifAdvancedTarget,
} from "./components/ConversionOptionsModal";
import { HealthModal } from "./components/HealthModal";
import { Toast, type ToastState, type ToastTone } from "./components/Toast";
import { Topbar } from "./components/Topbar";
import { UploadPanel } from "./components/UploadPanel";
import {
  createBatchJobs,
  DEFAULT_HISTORY_LIMIT,
  fetchHealth,
  fetchHistory,
  fetchJob,
} from "./lib/api";
import type {
  ConversionOptions,
  ConversionPreset,
  GifMp4Options,
  GifWebpOptions,
  Job,
  SourceFormat,
  TargetFormat,
} from "./types";

type FormatOption<T extends string> = {
  value: T;
  label: string;
};

const sourceOptions: Array<FormatOption<SourceFormat>> = [
  { value: "gif", label: "GIF" },
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
];

const targetOptionsBySource: Record<
  SourceFormat,
  Array<FormatOption<TargetFormat>>
> = {
  gif: [
    { value: "webp", label: "WebP" },
    { value: "mp4", label: "MP4" },
    { value: "png", label: "PNG" },
    { value: "jpg", label: "JPG" },
  ],
  jpg: [
    { value: "webp", label: "WebP" },
    { value: "png", label: "PNG" },
  ],
  png: [
    { value: "webp", label: "WebP" },
    { value: "jpg", label: "JPG" },
  ],
  webp: [
    { value: "png", label: "PNG" },
    { value: "jpg", label: "JPG" },
  ],
};

const acceptedMimeBySource: Record<SourceFormat, string> = {
  gif: "image/gif,.gif",
  jpg: "image/jpeg,.jpg,.jpeg",
  png: "image/png,.png",
  webp: "image/webp,.webp",
};

const gifWebpDefaults: GifWebpOptions = {
  fps: 24,
  quality: 75,
  compression_level: 6,
  lossless: false,
};

const gifMp4Defaults: GifMp4Options = {
  fps: 24,
  crf: 26,
  preset: "slow",
};

function normalizeSourceFormat(filename: string) {
  const extension = filename.split(".").pop()?.trim().toLowerCase();
  if (!extension || extension === filename.toLowerCase()) return null;
  return extension === "jpeg" ? "jpg" : extension;
}

function formatLabel(format: SourceFormat | TargetFormat | string) {
  return format.toUpperCase() === "JPG" ? "JPG" : format.toUpperCase();
}

export function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [sourceFormat, setSourceFormat] = useState<SourceFormat>("gif");
  const [target, setTarget] = useState<TargetFormat>("webp");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [history, setHistory] = useState<Job[]>([]);
  const [activityTab, setActivityTab] = useState<ActivityTab>("jobs");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [healthResponse, setHealthResponse] = useState<string>("");
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [settingsJob, setSettingsJob] = useState<Job | null>(null);
  const [conversionPreset, setConversionPreset] =
    useState<ConversionPreset>("balanced");
  const [gifWebpOptions, setGifWebpOptions] =
    useState<GifWebpOptions>(gifWebpDefaults);
  const [gifMp4Options, setGifMp4Options] =
    useState<GifMp4Options>(gifMp4Defaults);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const targetOptions = targetOptionsBySource[sourceFormat];
  const advancedAvailable = isGifAdvancedTarget(sourceFormat, target);
  const optionsSummary = getConversionOptionsSummary(
    sourceFormat,
    target,
    conversionPreset,
  );

  function showToast(tone: ToastTone, message: string) {
    setToast({ id: Date.now(), tone, message });
  }

  function fileKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  const activeConversionOptions = useMemo<ConversionOptions | undefined>(() => {
    if (sourceFormat !== "gif") return undefined;
    if (target === "webp") return gifWebpOptions;
    if (target === "mp4") return gifMp4Options;
    return undefined;
  }, [gifMp4Options, gifWebpOptions, sourceFormat, target]);

  const activeJobs = useMemo(
    () =>
      jobs.filter((job) => job.status === "queued" || job.status === "running"),
    [jobs],
  );

  const refreshHistory = useCallback(async () => {
    const data = await fetchHistory(DEFAULT_HISTORY_LIMIT);
    setHistory(data.jobs ?? []);
  }, []);

  const refreshJob = useCallback(async (id: string) => {
    const job = await fetchJob(id);
    setJobs((current) => current.map((item) => (item.id === id ? job : item)));
  }, []);

  useEffect(() => {
    refreshHistory().catch(() => undefined);
    const timer = window.setInterval(() => {
      refreshHistory().catch(() => undefined);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [refreshHistory]);

  useEffect(() => {
    if (activeJobs.length === 0) return undefined;
    const timer = window.setInterval(() => {
      activeJobs.forEach((job) => {
        refreshJob(job.id).catch(() => undefined);
      });
      refreshHistory().catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [activeJobs, refreshHistory, refreshJob]);

  useEffect(() => {
    if (!healthModalOpen && !optionsModalOpen && !settingsJob) return undefined;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setHealthModalOpen(false);
      setOptionsModalOpen(false);
      setSettingsJob(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [healthModalOpen, optionsModalOpen, settingsJob]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addFiles(fileList: FileList | null) {
    const selected = Array.from(fileList ?? []);
    if (selected.length === 0) return;

    const invalidFile = selected.find(
      (file) => normalizeSourceFormat(file.name) !== sourceFormat,
    );

    if (invalidFile) {
      showToast(
        "error",
        `현재 원본 형식은 ${formatLabel(sourceFormat)}입니다. ${formatLabel(sourceFormat)} 파일만 추가할 수 있습니다.`,
      );
      resetFileInput();
      return;
    }

    const knownKeys = new Set(files.map(fileKey));
    const nextFiles = selected.filter((file) => {
      const key = fileKey(file);
      if (knownKeys.has(key)) return false;
      knownKeys.add(key);
      return true;
    });

    if (nextFiles.length > 0) {
      setFiles((current) => [...current, ...nextFiles]);
    }
    resetFileInput();
  }

  function removeFile(targetFile: File) {
    setFiles((current) => current.filter((file) => file !== targetFile));
    resetFileInput();
  }

  function changeSourceFormat(nextSourceFormat: SourceFormat) {
    if (nextSourceFormat === sourceFormat) return;
    setSourceFormat(nextSourceFormat);
    setTarget(targetOptionsBySource[nextSourceFormat][0].value);
    setFiles([]);
    resetFileInput();
    setOptionsModalOpen(false);
    setConversionPreset("balanced");
    setGifWebpOptions(gifWebpDefaults);
    setGifMp4Options(gifMp4Defaults);
    if (files.length > 0) {
      showToast(
        "success",
        `원본 형식이 ${formatLabel(nextSourceFormat)}로 변경되어 선택된 파일을 초기화했습니다.`,
      );
    }
  }

  function changeTarget(nextTarget: TargetFormat) {
    setTarget(nextTarget);
    setOptionsModalOpen(false);
    setConversionPreset("balanced");
    setGifWebpOptions(gifWebpDefaults);
    setGifMp4Options(gifMp4Defaults);
  }

  function applyConversionOptions(values: {
    preset: ConversionPreset;
    gifWebpOptions: GifWebpOptions;
    gifMp4Options: GifMp4Options;
  }) {
    setConversionPreset(values.preset);
    setGifWebpOptions(values.gifWebpOptions);
    setGifMp4Options(values.gifMp4Options);
  }

  async function openHealthModal() {
    setHealthModalOpen(true);
    setIsHealthLoading(true);
    setHealthResponse("");
    try {
      const data = await fetchHealth();
      setHealthResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "API 상태를 확인하지 못했습니다.";
      setHealthResponse(JSON.stringify({ error: message }, null, 2));
    } finally {
      setIsHealthLoading(false);
    }
  }

  async function submit() {
    if (files.length === 0) {
      showToast("error", "변환할 파일을 선택해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await createBatchJobs(
        files,
        target,
        backgroundColor,
        activeConversionOptions,
      );
      setJobs((current) => [...data.jobs, ...current]);
      setActivityTab("jobs");
      setFiles([]);
      resetFileInput();
      const rejected = data.rejected?.length
        ? `, 거부 ${data.rejected.length}개`
        : "";
      showToast(
        "success",
        `변환 job ${data.accepted_count}개를 생성했습니다${rejected}.`,
      );
      await refreshHistory();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "업로드 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <Topbar onOpenHealth={() => void openHealthModal()} />

      <section className="workspace">
        <UploadPanel
          files={files}
          sourceFormat={sourceFormat}
          accept={acceptedMimeBySource[sourceFormat]}
          isDragging={isDragging}
          isSubmitting={isSubmitting}
          fileInputRef={fileInputRef}
          onAddFiles={addFiles}
          onRemoveFile={removeFile}
          onDraggingChange={setIsDragging}
        />
        <ActivityPanel
          activeTab={activityTab}
          jobs={jobs}
          history={history}
          historyLimit={DEFAULT_HISTORY_LIMIT}
          onTabChange={setActivityTab}
          onViewSettings={setSettingsJob}
        />
      </section>

      <ConversionActionBar
        filesCount={files.length}
        sourceFormat={sourceFormat}
        sourceOptions={sourceOptions}
        target={target}
        targetOptions={targetOptions}
        backgroundColor={backgroundColor}
        isSubmitting={isSubmitting}
        advancedAvailable={advancedAvailable}
        optionsSummary={optionsSummary}
        onSourceFormatChange={changeSourceFormat}
        onTargetChange={changeTarget}
        onBackgroundColorChange={setBackgroundColor}
        onOpenOptions={() => setOptionsModalOpen(true)}
        onSubmit={() => void submit()}
      />

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {healthModalOpen && (
        <HealthModal
          response={healthResponse}
          isLoading={isHealthLoading}
          onClose={() => setHealthModalOpen(false)}
        />
      )}

      {optionsModalOpen && (
        <ConversionOptionsModal
          mode="edit"
          sourceFormat={sourceFormat}
          target={target}
          conversionPreset={conversionPreset}
          gifWebpOptions={gifWebpOptions}
          gifMp4Options={gifMp4Options}
          onApply={applyConversionOptions}
          onClose={() => setOptionsModalOpen(false)}
        />
      )}

      {settingsJob && (
        <ConversionOptionsModal
          mode="view"
          job={settingsJob}
          onClose={() => setSettingsJob(null)}
        />
      )}
    </main>
  );
}
