import json
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.models import ConversionTarget


class GifDither(StrEnum):
    none = "none"
    bayer = "bayer"
    floyd_steinberg = "floyd_steinberg"


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


class GifToGifOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fps: int = Field(default=15, ge=1, le=60)
    colors: int = Field(default=128, ge=2, le=256)
    dither: GifDither = GifDither.floyd_steinberg


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


class JpegOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    quality: int = Field(default=85, ge=1, le=100)
    progressive: bool = False
    optimize: bool = True


class PngOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    compress_level: int = Field(default=6, ge=0, le=9)
    optimize: bool = True


class StaticWebpOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    quality: int = Field(default=80, ge=1, le=100)
    lossless: bool = False
    method: int = Field(default=4, ge=0, le=6)


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

    try:
        if input_format == "gif" and target == ConversionTarget.gif:
            return GifToGifOptions.model_validate(options).model_dump(mode="json")
        if input_format == "gif" and target == ConversionTarget.mp4:
            return GifToMp4Options.model_validate(options).model_dump(mode="json")
        if input_format == "gif" and target == ConversionTarget.webp:
            return GifToWebpOptions.model_validate(options).model_dump(mode="json")
        if target in {ConversionTarget.jpg, ConversionTarget.jpeg}:
            return JpegOptions.model_validate(options).model_dump(mode="json")
        if target == ConversionTarget.png:
            return PngOptions.model_validate(options).model_dump(mode="json")
        if target == ConversionTarget.webp:
            return StaticWebpOptions.model_validate(options).model_dump(mode="json")
    except ValidationError as exc:
        raise ConversionOptionsError("Conversion options are outside the supported range.") from exc

    raise ConversionOptionsError(
        "Advanced conversion options are not supported for this conversion."
    )
