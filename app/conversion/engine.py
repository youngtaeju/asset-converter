import subprocess
from dataclasses import dataclass
from pathlib import Path
from time import monotonic

from PIL import Image, ImageSequence, UnidentifiedImageError

from app.config import Settings, get_settings
from app.conversion.options import GifToMp4Options, GifToWebpOptions
from app.conversion.policy import validate_conversion
from app.models import ConversionTarget


@dataclass(frozen=True)
class ConversionResult:
    output_path: Path
    output_size_bytes: int
    duration_ms: int
    warnings: list[dict[str, str]]


def sanitize_stderr(stderr: str, max_len: int = 1000) -> str:
    cleaned = " ".join(stderr.replace("\x00", "").split())
    return cleaned[:max_len]


def gif_to_mp4_command(
    source: Path,
    dest: Path,
    options: dict | None = None,
) -> list[str]:
    if not options:
        fps = 24
        crf = 26
        preset = "slow"
    else:
        normalized = GifToMp4Options.model_validate(options)
        fps = normalized.fps
        crf = normalized.crf
        preset = normalized.preset.value

    return [
        "ffmpeg",
        "-y",
        "-i",
        str(source),
        "-vf",
        f"fps={fps},scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v",
        "libx264",
        "-crf",
        str(crf),
        "-preset",
        preset,
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(dest),
    ]


def gif_to_webp_command(
    source: Path,
    dest: Path,
    options: dict | None = None,
) -> list[str]:
    if not options:
        return [
            "ffmpeg",
            "-y",
            "-i",
            str(source),
            "-vf",
            "fps=24,scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-c:v",
            "libwebp",
            "-quality",
            "75",
            "-pix_fmt",
            "yuva420p",
            "-loop",
            "0",
            str(dest),
        ]

    normalized = GifToWebpOptions.model_validate(options)
    return [
        "ffmpeg",
        "-y",
        "-i",
        str(source),
        "-vf",
        f"scale=trunc(iw/2)*2:trunc(ih/2)*2,fps={normalized.fps},format=yuva420p",
        "-loop",
        "0",
        "-c:v",
        "libwebp",
        "-lossless",
        "1" if normalized.lossless else "0",
        "-compression_level",
        str(normalized.compression_level),
        "-q:v",
        str(normalized.quality),
        "-an",
        str(dest),
    ]


def convert_asset(
    source: Path,
    dest: Path,
    input_format: str,
    target: ConversionTarget,
    background_color: str = "#ffffff",
    settings: Settings | None = None,
    conversion_options: dict | None = None,
) -> ConversionResult:
    settings = settings or get_settings()
    warnings = validate_conversion(input_format, target)
    start = monotonic()
    if input_format == "gif" and target == ConversionTarget.mp4:
        _run_ffmpeg(
            gif_to_mp4_command(source, dest, conversion_options),
            settings.ffmpeg_timeout_seconds,
        )
    elif input_format == "gif" and target == ConversionTarget.webp:
        _run_ffmpeg(
            gif_to_webp_command(source, dest, conversion_options),
            settings.ffmpeg_timeout_seconds,
        )
    else:
        _convert_with_pillow(source, dest, target, background_color)
    duration_ms = int((monotonic() - start) * 1000)
    return ConversionResult(dest, dest.stat().st_size, duration_ms, warnings)


def _run_ffmpeg(command: list[str], timeout_seconds: int) -> None:
    try:
        proc = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("FFmpeg timed out before conversion completed.") from exc
    except FileNotFoundError as exc:
        raise RuntimeError("FFmpeg is not installed or not available on PATH.") from exc
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg conversion failed: {sanitize_stderr(proc.stderr)}")


def _convert_with_pillow(
    source: Path,
    dest: Path,
    target: ConversionTarget,
    background_color: str,
) -> None:
    try:
        with Image.open(source) as img:
            frame = next(ImageSequence.Iterator(img)).copy()
    except (UnidentifiedImageError, OSError) as exc:
        raise RuntimeError("Input image is corrupt or unreadable.") from exc

    if target in {ConversionTarget.jpg, ConversionTarget.jpeg}:
        output_format = "JPEG"
    else:
        output_format = target.value.upper()
    if output_format == "JPG":
        output_format = "JPEG"

    if output_format == "JPEG":
        if frame.mode in {"RGBA", "LA", "P"}:
            frame = frame.convert("RGBA")
            background = Image.new("RGBA", frame.size, background_color)
            background.alpha_composite(frame)
            frame = background.convert("RGB")
        else:
            frame = frame.convert("RGB")
        frame.save(dest, output_format, quality=85, optimize=True)
    else:
        if frame.mode == "P":
            frame = frame.convert("RGBA")
        frame.save(dest, output_format, optimize=True)
