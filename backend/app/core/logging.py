# HealthVault AI — Production Structured Logging & PHI Scrubbing
import json
import logging
from typing import Any, Dict

PHI_KEYS = {
    "blood_group",
    "allergies",
    "critical_allergies",
    "token",
    "session_token",
    "access_token",
    "password",
    "jwt",
    "authorization",
    "emergency_notes",
    "cnic",
    "national_id",
}


def redact_phi(data: Any) -> Any:
    """Recursively scrub PHI and sensitive credentials from log payloads."""
    if isinstance(data, dict):
        cleaned = {}
        for key, value in data.items():
            if str(key).lower() in PHI_KEYS:
                cleaned[key] = "[REDACTED_PHI]"
            else:
                cleaned[key] = redact_phi(value)
        return cleaned
    elif isinstance(data, list):
        return [redact_phi(item) for item in data]
    elif isinstance(data, str):
        if data.lower().startswith("bearer "):
            return "Bearer [REDACTED_TOKEN]"
        return data
    return data


class JSONFormatter(logging.Formatter):
    """Production JSON log formatter with PHI scrubbing."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        if hasattr(record, "extra") and isinstance(record.extra, dict):
            log_obj["extra"] = redact_phi(record.extra)

        return json.dumps(log_obj)


def setup_logging(environment: str = "development") -> logging.Logger:
    """Configures structured JSON logging for production or human-readable format for dev."""
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler()

    if environment.lower() in ("production", "prod"):
        console_handler.setFormatter(JSONFormatter())
    else:
        fmt = logging.Formatter(
            "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        console_handler.setFormatter(fmt)

    root_logger.addHandler(console_handler)
    return logging.getLogger("healthvault")
