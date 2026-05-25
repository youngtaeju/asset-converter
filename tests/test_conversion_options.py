import pytest

from app.conversion.options import ConversionOptionsError, normalize_conversion_options
from app.models import ConversionTarget


def test_normalizes_static_webp_options_for_png_input():
    assert normalize_conversion_options(
        "png",
        ConversionTarget.webp,
        {"quality": 72, "lossless": False, "method": 6},
    ) == {"quality": 72, "lossless": False, "method": 6}


def test_normalizes_jpeg_options_for_webp_input():
    assert normalize_conversion_options(
        "webp",
        ConversionTarget.jpg,
        {"quality": 82, "progressive": True, "optimize": True},
    ) == {"quality": 82, "progressive": True, "optimize": True}


def test_normalizes_png_options_for_jpg_input():
    assert normalize_conversion_options(
        "jpg",
        ConversionTarget.png,
        {"compress_level": 9, "optimize": True},
    ) == {"compress_level": 9, "optimize": True}


def test_rejects_unknown_static_option():
    with pytest.raises(ConversionOptionsError):
        normalize_conversion_options(
            "png",
            ConversionTarget.webp,
            {"quality": 72, "fps": 24},
        )


def test_rejects_out_of_range_static_option():
    with pytest.raises(ConversionOptionsError):
        normalize_conversion_options(
            "jpg",
            ConversionTarget.png,
            {"compress_level": 10},
        )


def test_normalizes_gif_to_gif_options():
    assert normalize_conversion_options(
        "gif",
        ConversionTarget.gif,
        {"fps": 12, "colors": 96, "dither": "bayer"},
    ) == {"fps": 12, "colors": 96, "dither": "bayer"}


def test_rejects_out_of_range_gif_to_gif_options():
    with pytest.raises(ConversionOptionsError):
        normalize_conversion_options(
            "gif",
            ConversionTarget.gif,
            {"fps": 12, "colors": 300, "dither": "bayer"},
        )
