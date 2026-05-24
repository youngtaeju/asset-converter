import type { JobStatus } from "../types";

export const statusLabels: Record<JobStatus, string> = {
  queued: "대기 중",
  running: "변환 중",
  succeeded: "완료",
  failed: "실패",
  expired: "만료",
};
