# HealthVault AI — Pluggable Multi-LLM Provider Engine
# Seamless switching between Alibaba Cloud Qwen (DashScope), Google Gemini, and Mock providers
# Features: timeout enforcement, auto-fallback to mock on failure, token-optimised generation

import asyncio
import json
import logging
import re
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings
from app.core.mock_data import (
    MOCK_INTERACTION_NO_CONFLICT,
    MOCK_LAB_EXTRACTION,
    MOCK_PRESCRIPTION_EXTRACTION,
    MOCK_VOICE_INTENT_MAP,
)

logger = logging.getLogger("healthvault")


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# DashScope (Qwen) Provider
# ---------------------------------------------------------------------------

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
        """Invoke DashScope Generation API asynchronously with timeout enforcement."""
        try:
            import dashscope
            from dashscope import Generation

            if self.api_key:
                dashscope.api_key = self.api_key

            response = await asyncio.wait_for(
                asyncio.to_thread(
                    Generation.call,
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    result_format="message",
                ),
                timeout=settings.LLM_TIMEOUT_SECONDS,
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

        except asyncio.TimeoutError:
            logger.warning(
                "DashScope request timed out after %.1fs",
                settings.LLM_TIMEOUT_SECONDS,
            )
            raise  # Let the fallback wrapper handle it
        except Exception as exc:
            logger.exception("DashScope Qwen generation failed: %s", exc)
            raise  # Let the fallback wrapper handle it


# ---------------------------------------------------------------------------
# Gemini Provider
# ---------------------------------------------------------------------------

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
        """Invoke Google Gemini generateContent endpoint with JSON response mode and timeout."""
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
            async with httpx.AsyncClient(
                timeout=settings.LLM_TIMEOUT_SECONDS
            ) as client:
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

        except asyncio.TimeoutError:
            logger.warning(
                "Gemini request timed out after %.1fs",
                settings.LLM_TIMEOUT_SECONDS,
            )
            raise  # Let the fallback wrapper handle it
        except httpx.ConnectError as exc:
            logger.warning("Gemini connection error: %s", exc)
            raise  # Let the fallback wrapper handle it
        except Exception as exc:
            logger.exception("Gemini generation failed: %s", exc)
            raise  # Let the fallback wrapper handle it


# ---------------------------------------------------------------------------
# Mock Provider — deterministic, domain-aware routing
# ---------------------------------------------------------------------------

class MockLLMProvider(BaseLLMProvider):
    """Resilient mock provider returning deterministic medical schema data.

    Routes to the appropriate mock dictionary based on prompt keywords so that
    every agent domain (extraction, summary, interactions, voice intent) receives
    a high-fidelity response without any external API call.
    """

    async def generate_json(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        prompt_lower = prompt.lower()

        # --- Voice intent resolution ---
        if "voice query" in prompt_lower or "patient context" in prompt_lower:
            # Detect specific intent from query text
            if any(kw in prompt_lower for kw in ("chest pain", "emergency", "سانس نہیں", "دل کا دورہ")):
                return MOCK_VOICE_INTENT_MAP["emergency_sos"]
            if any(kw in prompt_lower for kw in ("کب", "when", "schedule", "timing", "routine")):
                return MOCK_VOICE_INTENT_MAP["medication_schedule"]
            if any(kw in prompt_lower for kw in ("dosage", "dose", "how much", "خوراک", "کتنا")):
                return MOCK_VOICE_INTENT_MAP["dosage_inquiry"]
            if any(kw in prompt_lower for kw in ("symptom", "pain", "headache", "dizz", "علامت", "درد")):
                return MOCK_VOICE_INTENT_MAP["symptom_triage"]
            return MOCK_VOICE_INTENT_MAP["general_inquiry"]

        # --- Drug interaction check ---
        if "interaction" in prompt_lower or "newly prescribed" in prompt_lower or "cross-reference" in prompt_lower:
            return MOCK_INTERACTION_NO_CONFLICT

        # --- Clinical summary ---
        if "summary" in prompt_lower or "summarize" in prompt_lower or "clinical briefing" in prompt_lower:
            # Return empty to trigger the agent's own DB-based fallback summary
            return {}

        # --- Lab report extraction ---
        if "lab_report" in prompt_lower or "lab" in prompt_lower:
            return MOCK_LAB_EXTRACTION.model_dump(mode="json")

        # --- RAG Chatbot queries ---
        if any(kw in prompt_lower for kw in ("question", "chat", "rag", "patient history", "patient question", "when should i take")):
            return {}

        # --- Prescription / default extraction ---
        return MOCK_PRESCRIPTION_EXTRACTION.model_dump(mode="json")


# ---------------------------------------------------------------------------
# Fallback Wrapper — auto-routes to MockLLMProvider on any live-provider failure
# ---------------------------------------------------------------------------

class FallbackLLMProvider(BaseLLMProvider):
    """Wraps a live LLM provider with automatic fallback to MockLLMProvider.

    On timeout, connection error, API error, or any exception during
    generate_json(), logs a warning and delegates to the mock provider so
    downstream agent workflows never fail with HTTP 500.
    """

    def __init__(self, live_provider: BaseLLMProvider) -> None:
        self._live = live_provider
        self._mock = MockLLMProvider()

    async def generate_json(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        try:
            result = await self._live.generate_json(prompt, system_prompt)
            if result:
                return result
            # Live provider returned empty — fallback to mock
            logger.warning(
                "Live provider returned empty result; falling back to mock data"
            )
            return await self._mock.generate_json(prompt, system_prompt)
        except asyncio.TimeoutError:
            logger.warning(
                "LLM timeout after %.1fs — falling back to mock data",
                settings.LLM_TIMEOUT_SECONDS,
            )
            return await self._mock.generate_json(prompt, system_prompt)
        except (httpx.ConnectError, httpx.RemoteProtocolError) as exc:
            logger.warning("LLM connection error (%s) — falling back to mock data", exc)
            return await self._mock.generate_json(prompt, system_prompt)
        except Exception as exc:
            logger.warning(
                "LLM unexpected error (%s: %s) — falling back to mock data",
                type(exc).__name__,
                exc,
            )
            return await self._mock.generate_json(prompt, system_prompt)


# ---------------------------------------------------------------------------
# Registry & Factory
# ---------------------------------------------------------------------------

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
    1. If `USE_MOCK=True` in settings -> returns `MockLLMProvider` instantly.
    2. Explicit `provider_name` passed to function.
    3. `settings.LLM_PROVIDER` loaded from environment (.env).
    4. Defaults to `DashScopeProvider` (Qwen).

    All live providers are automatically wrapped in `FallbackLLMProvider` which
    catches timeouts, connection errors, and API failures — routing execution
    to `MockLLMProvider` so downstream workflows never fail.

    Usage:
        provider = get_llm_provider()                       # default from .env
        gemini = get_llm_provider("gemini", "gemini-2.0-flash")
        qwen   = get_llm_provider("qwen", "qwen-max")
    """
    # 1. Master mock switch
    if settings.USE_MOCK:
        logger.info("USE_MOCK=True -> Using MockLLMProvider")
        return MockLLMProvider()

    selected = (provider_name or settings.LLM_PROVIDER).strip().lower()

    # 2. Unknown provider -> mock
    provider_class = PROVIDER_REGISTRY.get(selected)
    if provider_class is None:
        logger.warning(
            "Unknown LLM_PROVIDER '%s'. Available: %s. Falling back to MockLLMProvider.",
            selected,
            list(PROVIDER_REGISTRY.keys()),
        )
        return MockLLMProvider()

    # 3. Explicit mock
    if provider_class == MockLLMProvider:
        return MockLLMProvider()

    # 4. Instantiate live provider and wrap with fallback
    logger.info("Initializing LLM provider '%s' (model=%s)", selected, model_name)
    live_provider = provider_class(model_name=model_name)
    return FallbackLLMProvider(live_provider)
