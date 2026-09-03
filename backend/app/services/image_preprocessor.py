# HealthVault AI — Clinical Handwriting Image Preprocessor
# Enhances doctor prescriptions: Deskewing, CLAHE Contrast Enhancement, and Unsharp Masking.
# Fully resilient to missing optional dependencies (numpy, cv2, PIL) with graceful fallbacks.

from __future__ import annotations

import io
import logging
from typing import Any, Tuple

logger = logging.getLogger("healthvault")

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    np = None
    HAS_NUMPY = False

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    cv2 = None
    HAS_CV2 = False

try:
    from PIL import Image, ImageEnhance, ImageFilter, ImageOps
    HAS_PIL = True
except ImportError:
    Image = None
    HAS_PIL = False


def deskew_image(image: Any) -> Any:
    """Detect text line angle using Otsu threshold + minAreaRect, then rotate to straighten."""
    if not HAS_CV2 or not HAS_NUMPY or image is None or getattr(image, "size", 0) == 0:
        return image

    try:
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Invert colors so text is foreground (white)
        # Using Otsu thresholding for robust binarization
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Morphological dilation to connect text contours into coherent lines
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (30, 3))
        dilated = cv2.dilate(thresh, kernel, iterations=1)

        contours, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

        angles = []
        for c in contours:
            if cv2.contourArea(c) < 150:
                continue
            rect = cv2.minAreaRect(c)
            angle = rect[-1]

            # Normalize angle to [-45, 45] degrees
            if angle < -45:
                angle = 90 + angle
            elif angle > 45:
                angle = angle - 90

            # Filter extreme non-text angles
            if abs(angle) <= 25:
                angles.append(angle)

        if not angles:
            return image

        median_angle = float(np.median(angles))

        # Only deskew if skew is perceptible (> 0.5 degrees)
        if abs(median_angle) < 0.5:
            return image

        h, w = image.shape[:2]
        center = (w // 2, h // 2)
        rot_mat = cv2.getRotationMatrix2D(center, median_angle, 1.0)

        # Compute new bounding dimensions to avoid clipping
        cos_val = abs(rot_mat[0, 0])
        sin_val = abs(rot_mat[0, 1])
        new_w = int((h * sin_val) + (w * cos_val))
        new_h = int((h * cos_val) + (w * sin_val))

        rot_mat[0, 2] += (new_w / 2) - center[0]
        rot_mat[1, 2] += (new_h / 2) - center[1]

        deskewed = cv2.warpAffine(
            image,
            rot_mat,
            (new_w, new_h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(255, 255, 255) if len(image.shape) == 3 else 255,
        )
        return deskewed

    except Exception as exc:
        logger.debug("Deskew failed (%s); returning original image", exc)
        return image


def enhance_contrast_clahe(image: Any) -> Any:
    """Apply Contrast Limited Adaptive Histogram Equalization (CLAHE) to boost faint ink."""
    if not HAS_CV2 or not HAS_NUMPY or image is None:
        return image

    try:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

        if len(image.shape) == 3:
            # Convert to LAB to equalize only lightness (L channel) without color distortion
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)
            l_enhanced = clahe.apply(l_channel)
            merged_lab = cv2.merge((l_enhanced, a_channel, b_channel))
            return cv2.cvtColor(merged_lab, cv2.COLOR_LAB2BGR)
        else:
            return clahe.apply(image)

    except Exception as exc:
        logger.debug("CLAHE enhancement failed (%s); returning original", exc)
        return image


def unsharp_mask(image: Any, sigma: float = 1.0, strength: float = 1.5) -> Any:
    """Apply unsharp masking to sharpen doctor handwriting strokes."""
    if not HAS_CV2 or not HAS_NUMPY or image is None:
        return image

    try:
        blurred = cv2.GaussianBlur(image, (0, 0), sigma)
        sharpened = cv2.addWeighted(image, 1.0 + strength, blurred, -strength, 0)
        return sharpened
    except Exception as exc:
        logger.debug("Unsharp mask failed (%s); returning original", exc)
        return image


def preprocess_with_pil(image_bytes: bytes) -> bytes:
    """Fallback PIL-based contrast, auto-level, and sharpness pipeline."""
    if not HAS_PIL:
        return image_bytes

    try:
        img = Image.open(io.BytesIO(image_bytes))

        # Auto-orient EXIF
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Boost contrast for faint handwriting
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.4)

        # Enhance edge sharpness
        sharpness_enhancer = ImageEnhance.Sharpness(img)
        img = sharpness_enhancer.enhance(1.6)

        output = io.BytesIO()
        format_name = "PNG" if (img.format or "").upper() == "PNG" else "JPEG"
        img.save(output, format=format_name, quality=92)
        return output.getvalue()
    except Exception as exc:
        logger.debug("PIL preprocessing failed: %s", exc)
        return image_bytes


def preprocess_clinical_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> bytes:
    """
    Main entry point for handwriting OCR preprocessing.
    Processes: Deskew -> CLAHE Contrast Enhancement -> Unsharp Masking.
    Returns processed image bytes in matching format.
    """
    if not image_bytes or len(image_bytes) < 32:
        return image_bytes

    # Do not attempt CV2 decode on raw PDF bytes
    if "pdf" in mime_type.lower():
        return image_bytes

    if not HAS_CV2 or not HAS_NUMPY:
        return preprocess_with_pil(image_bytes)

    try:
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            return preprocess_with_pil(image_bytes)

        # Step 1: Deskew slight hand-slanted tilts
        deskewed = deskew_image(img)

        # Step 2: Adaptive contrast enhancement for faint doctor ink
        contrasted = enhance_contrast_clahe(deskewed)

        # Step 3: Unsharp mask to define character edges
        sharpened = unsharp_mask(contrasted, sigma=1.2, strength=1.3)

        # Encode back to matching format
        ext = ".png" if "png" in mime_type.lower() else ".jpg"
        params = [int(cv2.IMWRITE_JPEG_QUALITY), 92] if ext == ".jpg" else [int(cv2.IMWRITE_PNG_COMPRESSION), 4]
        success, encoded = cv2.imencode(ext, sharpened, params)

        if success and encoded is not None:
            return encoded.tobytes()

        return preprocess_with_pil(image_bytes)
    except Exception as exc:
        logger.warning("Clinical image preprocessor encountered error: %s; using original bytes", exc)
        return preprocess_with_pil(image_bytes)
