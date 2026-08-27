# HealthVault AI — Local Disk Storage Service
# Async file persistence via aiofiles, served through FastAPI StaticFiles

import asyncio
import re
import uuid
from pathlib import Path
from typing import Tuple

import aiofiles
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

# Only medical document image / PDF formats are accepted
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
CHUNK_SIZE = 1024 * 1024  # 1 MiB streaming chunks


class LocalStorageService:
    """Stores uploaded documents on local disk under settings.UPLOAD_DIR
    and exposes them via the /uploads static mount."""

    def __init__(self, base_dir: str = settings.UPLOAD_DIR) -> None:
        self.base_dir = Path(base_dir)

    async def ensure_directory(self, subfolder: str = "") -> Path:
        """Create the target directory tree asynchronously (idempotent)."""
        target = self.base_dir / subfolder if subfolder else self.base_dir
        await asyncio.to_thread(target.mkdir, parents=True, exist_ok=True)
        return target

    @staticmethod
    def _validate_extension(filename: str) -> str:
        """Return the validated lower-case extension or reject the upload."""
        ext = Path(filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=(
                    f"Unsupported file extension '{ext}'. "
                    f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
                ),
            )
        return ext

    @staticmethod
    def _safe_filename(filename: str, ext: str) -> str:
        """Build a collision-free filename: <uuid>_<sanitized_original>."""
        stem = Path(filename).stem
        sanitized = re.sub(r"[^A-Za-z0-9._-]", "_", stem)[:80] or "document"
        return f"{uuid.uuid4()}_{sanitized}{ext}"

    async def save_file(
        self, file: UploadFile, subfolder: str = "documents"
    ) -> Tuple[str, str]:
        """Persist an UploadFile to disk asynchronously.

        Returns:
            Tuple of (relative_path, public_url):
            - relative_path: e.g. "uploads/documents/<filename>"
            - public_url: fully qualified HTTP URL served by the static mount
        """
        ext = self._validate_extension(file.filename or "")
        safe_name = self._safe_filename(file.filename or "", ext)

        target_dir = await self.ensure_directory(subfolder)
        target_path = target_dir / safe_name

        # Stream bytes to disk asynchronously to avoid blocking the event loop
        async with aiofiles.open(target_path, "wb") as out_file:
            while chunk := await file.read(CHUNK_SIZE):
                await out_file.write(chunk)
        await file.seek(0)  # Reset stream for any downstream consumers

        relative_path = f"{self.base_dir.as_posix()}/{subfolder}/{safe_name}"
        public_url = (
            f"{settings.SERVER_BASE_URL.rstrip('/')}"
            f"/{self.base_dir.as_posix()}/{subfolder}/{safe_name}"
        )
        return relative_path, public_url


storage_service = LocalStorageService()
