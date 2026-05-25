import type {
  BatchResponse,
  ConversionOptions,
  Job,
  TargetFormat,
} from "../types";

export const DEFAULT_HISTORY_LIMIT = 50;

async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const errorCode = data?.error?.code;
    const message =
      errorCode === "MIXED_INPUT_FORMATS"
        ? "동일한 확장자의 파일만 함께 변환할 수 있습니다."
        : (data?.error?.message ??
          data?.detail ??
          "요청을 처리하지 못했습니다.");
    throw new Error(
      Array.isArray(message) ? "입력값을 확인해 주세요." : message,
    );
  }
  return data as T;
}

export async function fetchHistory(limit = DEFAULT_HISTORY_LIMIT) {
  return fetchJson<{ jobs: Job[] }>(`/api/history?limit=${limit}`);
}

export async function fetchJob(id: string) {
  return fetchJson<Job>(`/api/jobs/${id}`);
}

export async function fetchHealth() {
  return fetchJson<Record<string, unknown>>("/api/health");
}

export async function createBatchJobs(
  files: File[],
  target: TargetFormat,
  backgroundColor: string,
  conversionOptions?: ConversionOptions,
) {
  const form = new FormData();
  files.forEach((file) => form.append("files[]", file));
  form.append("target_format", target);
  form.append("background_color", backgroundColor);
  if (conversionOptions) {
    form.append("conversion_options", JSON.stringify(conversionOptions));
  }

  return fetchJson<BatchResponse>("/api/jobs/batch", {
    method: "POST",
    body: form,
  });
}
