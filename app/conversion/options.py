import json
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.models import ConversionTarget


class Mp4EncodingPreset(StrEnum):
    ultrafast = "ultrafast"
    superfast = "superfast"
    veryfast = "veryfast"
    faster = "faster"
    fast = "fast"
    medium = "medium"
    slow = "slow"
    slower = "slower"
    veryslow = "veryslow"


class GifToWebpOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fps: int = Field(default=24, ge=1, le=60)
    quality: int = Field(default=75, ge=1, le=100)
    compression_level: int = Field(default=6, ge=0, le=6)
    lossless: bool = False


class GifToMp4Options(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fps: int = Field(default=24, ge=1, le=60)
    crf: int = Field(default=26, ge=0, le=51)
    preset: Mp4EncodingPreset = Mp4EncodingPreset.slow


class ConversionOptionsError(ValueError):
    pass


def parse_conversion_options(raw: str | None) -> dict[str, Any]:
    if raw is None or raw.strip() == "":
        return {}
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ConversionOptionsError("Conversion options must be valid JSON.") from exc
    if not isinstance(value, dict):
        raise ConversionOptionsError("Conversion options must be a JSON object.")
    return value


def normalize_conversion_options(
    input_format: str,
    target: ConversionTarget,
    options: dict[str, Any],
) -> dict[str, Any]:
    if not options:
        return {}

    if input_format != "gif":
        raise ConversionOptionsError(
            "Advanced conversion options are supported for GIF inputs only."
        )

    try:
        if target == ConversionTarget.webp:
            return GifToWebpOptions.model_validate(options).model_dump(mode="json")
        if target == ConversionTarget.mp4:
            return GifToMp4Options.model_validate(options).model_dump(mode="json")
    except ValidationError as exc:
        raise ConversionOptionsError("Conversion options are outside the supported range.") from exc

    raise ConversionOptionsError(
        "Advanced conversion options are supported for GIF to WebP or MP4 only."
    )
