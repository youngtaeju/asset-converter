import pytest

from app.conversion.engine import gif_to_mp4_command, gif_to_webp_command, sanitize_stderr
from app.conversion.policy import validate_conversion
from app.models import ConversionTarget


def codes(notes):
    return {note["code"] for note in notes}


def test_still_image_to_mp4_rejected():
    with pytest.raises(ValueError):
        validate_conversion("png", ConversionTarget.mp4)


def test_transparency_to_jpg_warns():
    assert "TRANSPARENCY_FLATTENED" in codes(validate_conversion("png", ConversionTarget.jpg))


def test_jpg_to_png_quality_warning():
    assert "QUALITY_NOT_IMPROVED" in codes(validate_conversion("jpg", ConversionTarget.png))


def test_gif_to_still_warns_animation_dropped():
    notes = codes(validate_conversion("gif", ConversionTarget.png))
    assert {"FIRST_FRAME_EXTRACTED", "ANIMATION_DROPPED"} <= notes


def test_ffmpeg_mp4_command_contains_required_flags(tmp_path):
    cmd = gif_to_mp4_command(tmp_path / "in.gif", tmp_path / "out.mp4")
    joined = " ".join(cmd)
    assert "libx264" in cmd
    assert "yuv420p" in cmd
    assert "+faststart" in cmd
    assert "fps=24" in joined
    assert "trunc(iw/2)*2" in joined


def test_ffmpeg_webp_command_contains_required_flags(tmp_path):
    cmd = gif_to_webp_command(tmp_path / "in.gif", tmp_path / "out.webp")
    joined = " ".join(cmd)
    assert "libwebp" in cmd
    assert "75" in cmd
    assert "yuva420p" in cmd
    assert "fps=24" in joined


def test_ffmpeg_mp4_command_uses_custom_options(tmp_path):
    cmd = gif_to_mp4_command(
        tmp_path / "in.gif",
        tmp_path / "out.mp4",
        {"fps": 12, "crf": 32, "preset": "medium"},
    )
    joined = " ".join(cmd)

    assert "fps=12" in joined
    assert cmd[cmd.index("-crf") + 1] == "32"
    assert cmd[cmd.index("-preset") + 1] == "medium"


def test_ffmpeg_webp_command_uses_custom_options(tmp_path):
    cmd = gif_to_webp_command(
        tmp_path / "in.gif",
        tmp_path / "out.webp",
        {"fps": 12, "quality": 62, "compression_level": 5, "lossless": True},
    )
    joined = " ".join(cmd)

    assert "fps=12" in joined
    assert "format=yuva420p" in joined
    assert cmd[cmd.index("-lossless") + 1] == "1"
    assert cmd[cmd.index("-compression_level") + 1] == "5"
    assert cmd[cmd.index("-q:v") + 1] == "62"
    assert "-an" in cmd


def test_stderr_sanitized():
    assert "\x00" not in sanitize_stderr("bad\x00\n error")
