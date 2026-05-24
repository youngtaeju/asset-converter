import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HealthModal } from "./components/HealthModal";
import { HistoryPanel } from "./components/HistoryPanel";
import { JobsPanel } from "./components/JobsPanel";
import { Topbar } from "./components/Topbar";
import { UploadPanel } from "./components/UploadPanel";
import {
  createBatchJobs,
  fetchHealth,
  fetchHistory,
  fetchJob,
} from "./lib/api";
import type { Job, TargetFormat } from "./types";

type TargetOption = {
  value: TargetFormat;
  label: string;
  hint: string;
};

const targetOptions: TargetOption[] = [
  { value: "webp", label: "WebP", hint: "웹 이미지 최적화" },
  { value: "mp4", label: "MP4", hint: "GIF 애니메이션 변환" },
  { value: "jpg", label: "JPG", hint: "공유용 정적 이미지" },
  { value: "png", label: "PNG", hint: "무손실 정적 이미지" },
];

export function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [target, setTarget] = useState<TargetFormat>("webp");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [history, setHistory] = useState<Job[]>([]);
  const [message, setMessage] = useState<string>("");
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [healthResponse, setHealthResponse] = useState<string>("");
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeJobs = useMemo(
    () =>
      jobs.filter((job) => job.status === "queued" || job.status === "running"),
    [jobs],
  );

  const refreshHistory = useCallback(async () => {
    const data = await fetchHistory(12);
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
    if (!healthModalOpen) return undefined;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setHealthModalOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [healthModalOpen]);

  function addFiles(fileList: FileList | null) {
    const selected = Array.from(fileList ?? []);
    if (selected.length === 0) return;
    setFiles((current) => {
      const next = [...current];
      selected.forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (
          !next.some(
            (item) => `${item.name}-${item.size}-${item.lastModified}` === key,
          )
        ) {
          next.push(file);
        }
      });
      return next;
    });
    setMessage("");
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
      setMessage("변환할 파일을 선택해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      const data = await createBatchJobs(files, target, backgroundColor);
      setJobs((current) => [...data.jobs, ...current]);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      const rejected = data.rejected?.length
        ? `, 거부 ${data.rejected.length}개`
        : "";
      setMessage(
        `변환 job ${data.accepted_count}개를 생성했습니다${rejected}.`,
      );
      await refreshHistory();
    } catch (error) {
      setMessage(
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
          target={target}
          targetOptions={targetOptions}
          backgroundColor={backgroundColor}
          message={message}
          isDragging={isDragging}
          isSubmitting={isSubmitting}
          fileInputRef={fileInputRef}
          onAddFiles={addFiles}
          onTargetChange={setTarget}
          onBackgroundColorChange={setBackgroundColor}
          onDraggingChange={setIsDragging}
          onSubmit={() => void submit()}
        />
        <JobsPanel jobs={jobs} />
        <HistoryPanel history={history} />
      </section>

      {healthModalOpen && (
        <HealthModal
          response={healthResponse}
          isLoading={isHealthLoading}
          onClose={() => setHealthModalOpen(false)}
        />
      )}
    </main>
  );
}
