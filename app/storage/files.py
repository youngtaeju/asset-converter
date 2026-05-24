import re
import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import Settings, ensure_runtime_dirs, get_settings

SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")
UNSAFE_DOWNLOAD_NAME_RE = re.compile(r"[\x00-\x1f\x7f/\\]+")

SIGNATURES = {
    "gif": (b"GIF87a", b"GIF89a"),
    "png": (b"\x89PNG\r\n\x1a\n",),
    "jpg": (b"\xff\xd8\xff",),
    "jpeg": (b"\xff\xd8\xff",),
    "webp": (b"RIFF",),
}


class UploadRejected(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def sanitize_filename(filename: str | None) -> str:
    name = Path(filename or "upload.bin").name
    name = SAFE_NAME_RE.sub("_", name).strip("._")
    return name or "upload.bin"


def download_filename_for(source_filename: str | None, target_format: str) -> str:
    raw_name = (source_filename or "upload").replace("\\", "/")
    base_name = Path(raw_name).name
    safe_name = UNSAFE_DOWNLOAD_NAME_RE.sub("_", base_name).strip()
    stem = Path(safe_name).stem.strip() or "upload"
    extension = target_format.lower().lstrip(".") or "bin"
    return f"{stem}.{extension}"


def detect_format(header: bytes) -> str | None:
    if any(header.startswith(sig) for sig in SIGNATURES["gif"]):
        return "gif"
    if header.startswith(SIGNATURES["png"][0]):
        return "png"
    if header.startswith(SIGNATURES["jpg"][0]):
        return "jpg"
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "webp"
    return None


def ensure_under_root(path: Path, root: Path) -> Path:
    resolved = path.resolve()
    root_resolved = root.resolve()
    if root_resolved != resolved and root_resolved not in resolved.parents:
        raise UploadRejected("INVALID_PATH", "Managed file path escaped the temp root.")
    return resolved


def new_job_dir(job_id: str, settings: Settings | None = None) -> Path:
    settings = settings or get_settings()
    ensure_runtime_dirs(settings)
    job_dir = settings.temp_root / job_id
    job_dir.mkdir(parents=True, exist_ok=False)
    return ensure_under_root(job_dir, settings.temp_root)


def output_path_for(job_id: str, target_format: str, settings: Settings | None = None) -> Path:
    settings = settings or get_settings()
    return ensure_under_root(
        settings.temp_root / job_id / f"result.{target_format}",
        settings.temp_root,
    )


def save_upload(file: UploadFile, settings: Settings | None = None) -> tuple[str, Path, str, int]:
    settings = settings or get_settings()
    job_id = str(uuid.uuid4())
    safe_name = sanitize_filename(file.filename)
    job_dir = new_job_dir(job_id, settings)
    source_path = ensure_under_root(job_dir / safe_name, settings.temp_root)

    size = 0
    header = b""
    with source_path.open("wb") as out:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            if not header:
                header = chunk[:32]
            size += len(chunk)
            if size > settings.max_upload_bytes:
                shutil.rmtree(job_dir, ignore_errors=True)
                raise UploadRejected(
                    "FILE_TOO_LARGE",
                    "Uploaded file exceeds configured size limit.",
                )
            out.write(chunk)

    detected = detect_format(header)
    if detected is None:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise UploadRejected("UNSUPPORTED_MEDIA_TYPE", "Unsupported input media type.")
    if size == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise UploadRejected("EMPTY_FILE", "Uploaded file is empty.")
    return job_id, source_path, detected, size


def remove_tree(path: Path) -> None:
    shutil.rmtree(path, ignore_errors=True)
