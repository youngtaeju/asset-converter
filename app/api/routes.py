import os
from datetime import timedelta
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from app.config import get_settings
from app.conversion.engine import ensure_static_webp
from app.conversion.options import (
    ConversionOptionsError,
    normalize_conversion_options,
    parse_conversion_options,
)
from app.conversion.policy import validate_conversion
from app.db.database import JobStore, to_iso, utc_now
from app.jobs.tasks import convert_job
from app.models import (
    BatchResponse,
    ConversionTarget,
    ErrorBody,
    ErrorDetail,
    HistoryResponse,
    JobEnvelope,
    JobResponse,
    JobStatus,
    RejectedFile,
)
from app.session import ClientSession, apply_session_cookie, read_or_create_session
from app.storage.files import UploadRejected, detect_format, download_filename_for, save_upload

router = APIRouter(prefix="/api")


def store() -> JobStore:
    return JobStore()


def to_job_response(row: dict) -> JobResponse:
    expires_at = row.get("expires_at")
    status = row["status"]
    result_path = row.get("result_path")
    download_available = (
        status == JobStatus.succeeded.value
        and isinstance(result_path, str)
        and Path(result_path).exists()
    )
    if status == JobStatus.succeeded.value and expires_at and to_iso(utc_now()) >= expires_at:
        status = JobStatus.expired.value
        download_available = False
    return JobResponse(
        id=row["id"],
        status=status,
        source_filename=row["source_filename"],
        input_format=row["input_format"],
        target_format=row["target_format"],
        input_size_bytes=row["input_size_bytes"],
        output_size_bytes=row.get("output_size_bytes"),
        duration_ms=row.get("duration_ms"),
        warnings=row.get("warnings", []),
        error_summary=row.get("error_summary"),
        created_at=row["created_at"],
        started_at=row.get("started_at"),
        finished_at=row.get("finished_at"),
        expires_at=expires_at,
        download_available=download_available,
        conversion_options=row.get("conversion_options", {}),
    )


def error(code: str, message: str, status_code: int, details: dict | None = None) -> JSONResponse:
    body = ErrorBody(
        error=ErrorDetail(code=code, message=message, details=details or {})
    ).model_dump(mode="json")
    return JSONResponse(
        status_code=status_code,
        content=body,
    )


def upload_header_format(file: UploadFile) -> str | None:
    position = file.file.tell()
    header = file.file.read(32)
    file.file.seek(position)
    return detect_format(header)


def reject_unsupported_source_target(
    input_format: str,
    target_format: ConversionTarget,
    source_path: Path,
) -> None:
    if input_format == "webp" and target_format == ConversionTarget.webp:
        try:
            ensure_static_webp(source_path)
        except RuntimeError as exc:
            raise UploadRejected("UNSUPPORTED_CONVERSION", str(exc)) from exc


def mixed_input_format_error(files: list[UploadFile]) -> JSONResponse | None:
    formats = sorted({fmt for file in files if (fmt := upload_header_format(file))})
    if len(formats) <= 1:
        return None
    return error(
        "MIXED_INPUT_FORMATS",
        "Batch conversion requires files with the same input format.",
        400,
        {"input_formats": formats},
    )


def create_job_from_upload(
    file: UploadFile,
    target_format: ConversionTarget,
    owner_session_hash: str,
    preset: str = "default",
    background_color: str = "#ffffff",
    conversion_options: str | None = None,
) -> JobResponse:
    settings = get_settings()
    try:
        parsed_options = parse_conversion_options(conversion_options)
    except ConversionOptionsError as exc:
        raise UploadRejected("INVALID_CONVERSION_OPTIONS", str(exc)) from exc

    job_id, source_path, input_format, size = save_upload(file, settings)
    try:
        warnings = validate_conversion(input_format, target_format)
        reject_unsupported_source_target(input_format, target_format, source_path)
        normalized_options = normalize_conversion_options(
            input_format,
            target_format,
            parsed_options,
        )
    except ValueError as exc:
        source_path.unlink(missing_ok=True)
        source_path.parent.rmdir()
        code = (
            "INVALID_CONVERSION_OPTIONS"
            if isinstance(exc, ConversionOptionsError)
            else "UNSUPPORTED_CONVERSION"
        )
        raise UploadRejected(code, str(exc)) from exc

    now = utc_now()
    expires_at = now + timedelta(hours=settings.ttl_hours)
    row = store().create_job(
        {
            "id": job_id,
            "status": JobStatus.queued.value,
            "source_filename": file.filename or "upload.bin",
            "input_format": input_format,
            "target_format": target_format.value,
            "input_size_bytes": size,
            "warnings": warnings,
            "created_at": to_iso(now),
            "expires_at": to_iso(expires_at),
            "source_path": str(source_path),
            "preset": preset,
            "background_color": background_color,
            "conversion_options": normalized_options,
            "owner_session_hash": owner_session_hash,
        }
    )
    eager_env = os.getenv("ASSET_CELERY_ALWAYS_EAGER", "false").lower()
    if settings.celery_always_eager or eager_env in {"1", "true", "yes"}:
        convert_job.apply(args=(job_id,))
    else:
        convert_job.delay(job_id)
    return to_job_response(row)


def owned_job_or_not_found(job_id: str, session: ClientSession) -> dict | None:
    row = store().get_job(job_id)
    if not row or row.get("owner_session_hash") != session.token_hash:
        return None
    return row


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/jobs", response_model=JobEnvelope, status_code=202)
def create_job(
    request: Request,
    response: Response,
    file: Annotated[UploadFile, File()],
    target_format: Annotated[ConversionTarget, Form()],
    preset: Annotated[str, Form()] = "default",
    background_color: Annotated[str, Form()] = "#ffffff",
    conversion_options: Annotated[str, Form()] = "",
) -> JobEnvelope | JSONResponse:
    settings = get_settings()
    session = read_or_create_session(request, settings)
    apply_session_cookie(response, session, settings)
    try:
        job = create_job_from_upload(
            file,
            target_format,
            session.token_hash,
            preset,
            background_color,
            conversion_options,
        )
        return JobEnvelope(job=job)
    except UploadRejected as exc:
        error_response = error(exc.code, exc.message, 400)
        apply_session_cookie(error_response, session, settings)
        return error_response


@router.post("/jobs/batch", response_model=BatchResponse, status_code=202)
def create_batch_jobs(
    request: Request,
    response: Response,
    files: Annotated[list[UploadFile], File(alias="files[]")],
    target_format: Annotated[ConversionTarget, Form()],
    preset: Annotated[str, Form()] = "default",
    background_color: Annotated[str, Form()] = "#ffffff",
    conversion_options: Annotated[str, Form()] = "",
) -> BatchResponse | JSONResponse:
    settings = get_settings()
    session = read_or_create_session(request, settings)
    apply_session_cookie(response, session, settings)
    if len(files) > settings.max_batch_files:
        raise HTTPException(status_code=413, detail="Too many files in batch.")
    format_error = mixed_input_format_error(files)
    if format_error:
        apply_session_cookie(format_error, session, settings)
        return format_error
    jobs: list[JobResponse] = []
    rejected: list[RejectedFile] = []
    for file in files:
        try:
            jobs.append(
                create_job_from_upload(
                    file,
                    target_format,
                    session.token_hash,
                    preset,
                    background_color,
                    conversion_options,
                )
            )
        except UploadRejected as exc:
            rejected.append(
                RejectedFile(
                    source_filename=file.filename or "upload.bin",
                    error=ErrorDetail(code=exc.code, message=exc.message),
                )
            )
    return BatchResponse(jobs=jobs, accepted_count=len(jobs), rejected=rejected)


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str, request: Request, response: Response) -> JobResponse:
    settings = get_settings()
    session = read_or_create_session(request, settings)
    apply_session_cookie(response, session, settings)
    row = owned_job_or_not_found(job_id, session)
    if not row:
        raise HTTPException(status_code=404, detail="Job not found.")
    return to_job_response(row)


@router.get("/jobs/{job_id}/download")
def download_job(job_id: str, request: Request):
    settings = get_settings()
    session = read_or_create_session(request, settings)
    row = owned_job_or_not_found(job_id, session)
    if not row:
        error_response = error("NOT_FOUND", "Job not found.", 404)
        apply_session_cookie(error_response, session, settings)
        return error_response
    response = to_job_response(row)
    if response.status == JobStatus.expired:
        expired_at = response.expires_at.isoformat() if response.expires_at else None
        error_response = error(
            "RESULT_EXPIRED",
            "The converted file is no longer available.",
            410,
            {"expired_at": expired_at},
        )
        apply_session_cookie(error_response, session, settings)
        return error_response
    if response.status != JobStatus.succeeded:
        error_response = error(
            "RESULT_NOT_READY",
            "The converted file is not ready for download.",
            409,
        )
        apply_session_cookie(error_response, session, settings)
        return error_response
    result_path = row.get("result_path")
    if not result_path or not Path(result_path).exists():
        error_response = error(
            "RESULT_EXPIRED",
            "The converted file is no longer available.",
            410,
            {"expired_at": row.get("expires_at")},
        )
        apply_session_cookie(error_response, session, settings)
        return error_response
    file_response = FileResponse(
        result_path,
        filename=download_filename_for(row.get("source_filename"), row["target_format"]),
    )
    apply_session_cookie(file_response, session, settings)
    return file_response


@router.get("/history", response_model=HistoryResponse)
def history(
    request: Request,
    response: Response,
    limit: int = 50,
    offset: int = 0,
    status: JobStatus | None = None,
) -> HistoryResponse:
    settings = get_settings()
    session = read_or_create_session(request, settings)
    apply_session_cookie(response, session, settings)
    rows = store().list_jobs(
        limit=limit,
        offset=offset,
        status=status.value if status else None,
        owner_session_hash=session.token_hash,
    )
    return HistoryResponse(
        jobs=[to_job_response(row) for row in rows],
        limit=max(1, min(limit, 100)),
        offset=max(0, offset),
    )
