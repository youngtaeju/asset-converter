import subprocess
from dataclasses import dataclass
from pathlib import Path
from time import monotonic

from PIL import Image, ImageSequence, UnidentifiedImageError

from app.config import Settings, get_settings
from app.conversion.options import (
    GifToGifOptions,
    GifToMp4Options,
    GifToWebpOptions,
    JpegOptions,
    PngOptions,
    StaticWebpOptions,
)
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


def gif_to_gif_command(
    source: Path,
    dest: Path,
    options: dict | None = None,
) -> list[str]:
    normalized = GifToGifOptions.model_validate(options or {})
    filter_complex = (
        f"fps={normalized.fps},"
        "scale=trunc(iw/2)*2:trunc(ih/2)*2,"
        "split[s0][s1];"
        f"[s0]palettegen=max_colors={normalized.colors}[p];"
        f"[s1][p]paletteuse=dither={normalized.dither.value}"
    )
    return [
        "ffmpeg",
        "-y",
        "-i",
        str(source),
        "-filter_complex",
        filter_complex,
        "-loop",
        "0",
        str(dest),
    ]


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
    if input_format == "gif" and target == ConversionTarget.gif:
        _run_ffmpeg(
            gif_to_gif_command(source, dest, conversion_options),
            settings.ffmpeg_timeout_seconds,
        )
    elif input_format == "gif" and target == ConversionTarget.mp4:
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
        if input_format == "webp" and target == ConversionTarget.webp:
            ensure_static_webp(source)
        _convert_with_pillow(source, dest, target, background_color, conversion_options)
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


def ensure_static_webp(source: Path) -> None:
    try:
        with Image.open(source) as img:
            if getattr(img, "is_animated", False) or getattr(img, "n_frames", 1) > 1:
                raise RuntimeError("Animated WebP optimization is not supported yet.")
    except RuntimeError:
        raise
    except (UnidentifiedImageError, OSError) as exc:
        raise RuntimeError("Input image is corrupt or unreadable.") from exc


def _convert_with_pillow(
    source: Path,
    dest: Path,
    target: ConversionTarget,
    background_color: str,
    conversion_options: dict | None = None,
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
        jpeg_options = JpegOptions.model_validate(conversion_options or {})
        if frame.mode in {"RGBA", "LA", "P"}:
            frame = frame.convert("RGBA")
            background = Image.new("RGBA", frame.size, background_color)
            background.alpha_composite(frame)
            frame = background.convert("RGB")
        else:
            frame = frame.convert("RGB")
        frame.save(
            dest,
            output_format,
            quality=jpeg_options.quality,
            progressive=jpeg_options.progressive,
            optimize=jpeg_options.optimize,
        )
    elif output_format == "PNG":
        png_options = PngOptions.model_validate(conversion_options or {})
        if frame.mode == "P":
            frame = frame.convert("RGBA")
        frame.save(
            dest,
            output_format,
            compress_level=png_options.compress_level,
            optimize=png_options.optimize,
        )
    elif output_format == "WEBP":
        webp_options = StaticWebpOptions.model_validate(conversion_options or {})
        if frame.mode == "P":
            frame = frame.convert("RGBA")
        frame.save(
            dest,
            output_format,
            quality=webp_options.quality,
            lossless=webp_options.lossless,
            method=webp_options.method,
        )
    else:
        if frame.mode == "P":
            frame = frame.convert("RGBA")
        frame.save(dest, output_format, optimize=True)
