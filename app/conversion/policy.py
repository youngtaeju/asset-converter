from app.models import ConversionTarget, WarningCode

IMAGE_INPUTS = {"jpg", "jpeg", "png", "webp"}
ALL_INPUTS = IMAGE_INPUTS | {"gif"}

WARNING_MESSAGES = {
    WarningCode.transparency_flattened: (
        "Transparency was flattened onto the configured background color."
    ),
    WarningCode.first_frame_extracted: (
        "Only the first animation frame was used for this still output."
    ),
    WarningCode.lossy_output: "Output uses lossy compression.",
    WarningCode.quality_not_improved: "Changing container format does not improve source quality.",
    WarningCode.animation_dropped: "Animation was dropped for this target format.",
}


def warning(code: WarningCode) -> dict[str, str]:
    return {"code": code.value, "message": WARNING_MESSAGES[code]}


def validate_conversion(input_format: str, target: ConversionTarget) -> list[dict[str, str]]:
    target_format = target.value
    if input_format not in ALL_INPUTS:
        raise ValueError("Unsupported input media type.")
    if target_format == "mp4" and input_format != "gif":
        raise ValueError("Only GIF to MP4 is supported in the MVP.")
    if input_format == "gif" and target_format not in {"mp4", "webp", "jpg", "jpeg", "png"}:
        raise ValueError("Unsupported GIF target format.")

    warnings: list[dict[str, str]] = []
    if target_format in {"jpg", "jpeg"}:
        warnings.append(warning(WarningCode.lossy_output))
    if target_format == "webp":
        warnings.append(warning(WarningCode.lossy_output))
    if input_format in {"png", "webp"} and target_format in {"jpg", "jpeg"}:
        warnings.append(warning(WarningCode.transparency_flattened))
    if input_format in {"jpg", "jpeg"} and target_format == "png":
        warnings.append(warning(WarningCode.quality_not_improved))
    if input_format in {"gif", "webp"} and target_format in {"jpg", "jpeg", "png"}:
        warnings.append(warning(WarningCode.first_frame_extracted))
        warnings.append(warning(WarningCode.animation_dropped))
    return warnings
