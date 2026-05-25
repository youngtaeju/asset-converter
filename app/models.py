from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class JobStatus(StrEnum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    expired = "expired"


class ConversionTarget(StrEnum):
    mp4 = "mp4"
    webp = "webp"
    jpg = "jpg"
    jpeg = "jpeg"
    png = "png"
    gif = "gif"


class WarningCode(StrEnum):
    transparency_flattened = "TRANSPARENCY_FLATTENED"
    first_frame_extracted = "FIRST_FRAME_EXTRACTED"
    lossy_output = "LOSSY_OUTPUT"
    quality_not_improved = "QUALITY_NOT_IMPROVED"
    animation_dropped = "ANIMATION_DROPPED"


class WarningNote(BaseModel):
    code: WarningCode
    message: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorBody(BaseModel):
    error: ErrorDetail


class JobResponse(BaseModel):
    id: str
    status: JobStatus
    source_filename: str
    input_format: str
    target_format: ConversionTarget
    input_size_bytes: int
    output_size_bytes: int | None = None
    duration_ms: int | None = None
    warnings: list[WarningNote] = Field(default_factory=list)
    error_summary: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    expires_at: datetime | None = None
    download_available: bool = False
    conversion_options: dict[str, Any] = Field(default_factory=dict)


class JobEnvelope(BaseModel):
    job: JobResponse


class RejectedFile(BaseModel):
    source_filename: str
    error: ErrorDetail


class BatchResponse(BaseModel):
    jobs: list[JobResponse]
    accepted_count: int
    rejected: list[RejectedFile] = Field(default_factory=list)


class HistoryResponse(BaseModel):
    jobs: list[JobResponse]
    limit: int
    offset: int
