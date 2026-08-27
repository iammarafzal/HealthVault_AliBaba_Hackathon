# HealthVault AI — Pluggable Multi-LLM Provider Engine
# Seamless switching between Alibaba Cloud Qwen (DashScope), Google Gemini, and Mock providers

import asyncio
import json
import logging
import re
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings
from app.core.mock_data import MOCK_LAB_EXTRACTION, MOCK_PRESCRIPTION_EXTRACTION

logger = logging.getLogger("healthvault")


class BaseLLMProvider(ABC):
    """Abstract base class establishing the contract for all LLM providers."""

    @abstractmethod
    async def generate_json(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        """Generate structured JSON from the LLM.

        Args:
            prompt: Input text (e.g., OCR text, patient profile)
            system_prompt: System prompt instructing extraction schema & constraints

        Returns:
            Parsed JSON dictionary
        """
        pass

    @staticmethod
    def _extract_json(text: str) -> Dict[str, Any]:
        """Sanitize and parse JSON response from LLM output with multi-stage fallback."""
        if not text or not text.strip():
            return {}

        # 1. Extract content inside markdown code fences ```json ... ``` or ``` ... ```
        fence_match = re.search(
            r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE
        )
        candidate = fence_match.group(1).strip() if fence_match else text.strip()

        # 2. Attempt direct JSON parse
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        # 3. Secondary search for the outermost JSON object { ... }
        obj_match = re.search(r"(\{.*\})", candidate, re.DOTALL)
        if obj_match:
            try:
                parsed = json.loads(obj_match.group(1))
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass

        logger.warning("Failed to parse JSON from LLM output: %s", text[:200])
        return {}


class DashScopeProvider(BaseLLMProvider):
    """Alibaba Cloud DashScope provider for Qwen models (Qwen-Plus, Qwen-Max, Qwen-Turbo)."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> None:
        self.api_key = api_key or settings.DASHSCOPE_API_KEY
        self.model_name = (
            model_name or settings.LLM_MODEL_NAME or settings.DASHSCOPE_MODEL_NAME
        )

    async def generate_json(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        """Invoke DashScope Generation API asynchronously."""
        try:
            import dashscope
            from dashscope import Generation

            if self.api_key:
                dashscope.api_key = self.api_key

            response = await asyncio.to_thread(
                Generation.call,
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                result_format="message",
            )

            if response.status_code != 200:
                logger.error(
                    "DashScope API error [%s]: %s",
                    response.status_code,
                    response.message,
                )
                return {}

            content = response.output.choices[0].message.content
            return self._extract_json(content)

        except Exception as exc:
            logger.exception("DashScope Qwen generation failed: %s", exc)
            return {}


class GeminiProvider(BaseLLMProvider):
    """Google Gemini provider via native async REST API (gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash)."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = (
            model_name or settings.LLM_MODEL_NAME or settings.GEMINI_MODEL_NAME
        )
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def generate_json(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        """Invoke Google Gemini generateContent endpoint with JSON response mode."""
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not configured; check .env")

        endpoint = f"{self.base_url}/{self.model_name}:generateContent"
        params = {"key": self.api_key}

        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(endpoint, params=params, json=payload)

            if response.status_code != 200:
                logger.error(
                    "Gemini API error [%s]: %s",
                    response.status_code,
                    response.text[:300],
                )
                return {}

            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                logger.warning("Gemini returned empty candidates")
                return {}

            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                return {}

            raw_text = parts[0].get("text", "")
            return self._extract_json(raw_text)

        except Exception as exc:
            logger.exception("Gemini generation failed: %s", exc)
            return {}


class MockLLMProvider(BaseLLMProvider):
    """Resilient mock provider returning deterministic medical schema data for testing."""

    async def generate_json(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        prompt_lower = prompt.lower()
        if "lab_report" in prompt_lower or "lab" in prompt_lower:
            return MOCK_LAB_EXTRACTION.model_dump(mode="json")
        return MOCK_PRESCRIPTION_EXTRACTION.model_dump(mode="json")


# Registry of supported providers and common aliases
PROVIDER_REGISTRY = {
    "dashscope": DashScopeProvider,
    "qwen": DashScopeProvider,
    "gemini": GeminiProvider,
    "google": GeminiProvider,
    "mock": MockLLMProvider,
}


def get_llm_provider(
    provider_name: Optional[str] = None,
    model_name: Optional[str] = None,
) -> BaseLLMProvider:
    """Factory function to instantiate the active LLM provider.

    Resolution order:
    1. If `USE_MOCK=True` in settings -> returns `MockLLMProvider`
    2. Explicit `provider_name` passed to function
    3. `settings.LLM_PROVIDER` loaded from environment (.env)
    4. Defaults to `DashScopeProvider` (Qwen) with fallback to `MockLLMProvider` on error

    Usage:
        # Uses default provider configured in .env (e.g., LLM_PROVIDER=gemini or qwen)
        provider = get_llm_provider()

        # Explicit on-the-fly switch to Gemini:
        gemini_provider = get_llm_provider("gemini", model_name="gemini-2.0-flash")

        # Explicit on-the-fly switch to Qwen:
        qwen_provider = get_llm_provider("qwen", model_name="qwen-max")
    """
    if settings.USE_MOCK:
        logger.info("USE_MOCK=True -> Using MockLLMProvider")
        return MockLLMProvider()

    selected = (provider_name or settings.LLM_PROVIDER).strip().lower()

    provider_class = PROVIDER_REGISTRY.get(selected)
    if provider_class is None:
        logger.warning(
            "Unknown LLM_PROVIDER '%s'. Available: %s. Falling back to MockLLMProvider.",
            selected,
            list(PROVIDER_REGISTRY.keys()),
        )
        return MockLLMProvider()

    logger.info("Initializing LLM provider '%s' (model=%s)", selected, model_name)
    if provider_class == MockLLMProvider:
        return MockLLMProvider()

    return provider_class(model_name=model_name)
