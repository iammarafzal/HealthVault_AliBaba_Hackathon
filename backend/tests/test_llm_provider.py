import pytest

from app.core.config import settings
from app.services.llm_provider import (
    BaseLLMProvider,
    DashScopeProvider,
    FallbackLLMProvider,
    GeminiProvider,
    MockLLMProvider,
    get_llm_provider,
)


def test_provider_factory_mock_when_use_mock_true():
    settings.USE_MOCK = True
    provider = get_llm_provider()
    assert isinstance(provider, MockLLMProvider)


def test_provider_factory_switch_to_gemini():
    settings.USE_MOCK = False
    provider = get_llm_provider("gemini", model_name="gemini-2.0-flash")
    # Live providers are wrapped in FallbackLLMProvider
    assert isinstance(provider, FallbackLLMProvider)
    assert isinstance(provider._live, GeminiProvider)
    assert provider._live.model_name == "gemini-2.0-flash"


def test_provider_factory_switch_to_qwen():
    settings.USE_MOCK = False
    provider = get_llm_provider("qwen", model_name="qwen-max")
    assert isinstance(provider, FallbackLLMProvider)
    assert isinstance(provider._live, DashScopeProvider)
    assert provider._live.model_name == "qwen-max"


def test_provider_factory_switch_to_dashscope():
    settings.USE_MOCK = False
    provider = get_llm_provider("dashscope")
    assert isinstance(provider, FallbackLLMProvider)
    assert isinstance(provider._live, DashScopeProvider)


def test_provider_factory_unknown_fallback():
    settings.USE_MOCK = False
    provider = get_llm_provider("non_existent_provider_xyz")
    assert isinstance(provider, MockLLMProvider)


def test_base_provider_json_extraction():
    # Valid markdown block
    raw_markdown = "```json\n{\"diagnoses\": [\"Type 2 Diabetes\"]}\n```"
    parsed = BaseLLMProvider._extract_json(raw_markdown)
    assert parsed == {"diagnoses": ["Type 2 Diabetes"]}

    # Raw JSON without markdown
    raw_json = "{\"diagnoses\": [\"Essential Hypertension\"]}"
    parsed_json = BaseLLMProvider._extract_json(raw_json)
    assert parsed_json == {"diagnoses": ["Essential Hypertension"]}

    # Text wrapping JSON
    wrapped_text = "Here is the JSON result:\n```json\n{\"medications\": []}\n```\nHope this helps."
    parsed_wrapped = BaseLLMProvider._extract_json(wrapped_text)
    assert parsed_wrapped == {"medications": []}

    # Conversational text surrounding raw JSON without backticks
    conversational = "Extraction complete: {\"doctor_name\": \"Dr. Tariq\"} - please review."
    parsed_conv = BaseLLMProvider._extract_json(conversational)
    assert parsed_conv == {"doctor_name": "Dr. Tariq"}

    # Empty string
    assert BaseLLMProvider._extract_json("") == {}
    assert BaseLLMProvider._extract_json("   \n\t") == {}

    # Corrupted text
    assert BaseLLMProvider._extract_json("Not a JSON at all") == {}


@pytest.mark.asyncio
async def test_mock_provider_generation():
    provider = MockLLMProvider()
    rx_result = await provider.generate_json(
        prompt="Document type: prescription", system_prompt="Extract data"
    )
    assert rx_result["document_type"] == "prescription"

    lab_result = await provider.generate_json(
        prompt="Document type: lab_report", system_prompt="Extract data"
    )
    assert lab_result["document_type"] == "lab_report"


@pytest.mark.asyncio
async def test_mock_provider_voice_intent_routing():
    """MockLLMProvider routes voice-intent prompts to correct mock dictionary."""
    provider = MockLLMProvider()

    # Medication schedule
    result = await provider.generate_json(
        prompt="Patient Context: {...}\nVoice Query: \"when to take metformin\"",
        system_prompt="intent agent",
    )
    assert result["intent"] == "medication_schedule"

    # Dosage inquiry
    result = await provider.generate_json(
        prompt="Patient Context: {...}\nVoice Query: \"how much metformin\"",
        system_prompt="intent agent",
    )
    assert result["intent"] == "dosage_inquiry"

    # Symptom triage
    result = await provider.generate_json(
        prompt="Patient Context: {...}\nVoice Query: \"I have headache and dizziness\"",
        system_prompt="intent agent",
    )
    assert result["intent"] == "symptom_triage"

    # Emergency SOS
    result = await provider.generate_json(
        prompt="Patient Context: {...}\nVoice Query: \"chest pain emergency\"",
        system_prompt="intent agent",
    )
    assert result["intent"] == "emergency_sos"
    assert result["requires_emergency_care"] is True

    # General inquiry
    result = await provider.generate_json(
        prompt="Patient Context: {...}\nVoice Query: \"general question\"",
        system_prompt="intent agent",
    )
    assert result["intent"] == "general_inquiry"


@pytest.mark.asyncio
async def test_mock_provider_interaction_routing():
    """MockLLMProvider routes interaction prompts to no-conflict mock."""
    provider = MockLLMProvider()
    result = await provider.generate_json(
        prompt="Cross-reference newly prescribed medications",
        system_prompt="interaction check",
    )
    assert result["has_conflicts"] is False
    assert result["alerts"] == []


@pytest.mark.asyncio
async def test_fallback_provider_on_timeout():
    """FallbackLLMProvider catches timeout and returns mock data."""
    import asyncio

    class TimeoutProvider(BaseLLMProvider):
        async def generate_json(self, prompt: str, system_prompt: str):
            raise asyncio.TimeoutError("Simulated timeout")

    fallback = FallbackLLMProvider(TimeoutProvider())
    result = await fallback.generate_json(
        prompt="Document type: prescription", system_prompt="test"
    )
    # Should get mock data instead of crashing
    assert isinstance(result, dict)
    assert result.get("document_type") == "prescription"


@pytest.mark.asyncio
async def test_fallback_provider_on_connection_error():
    """FallbackLLMProvider catches connection errors and returns mock data."""
    import httpx

    class ConnectionErrorProvider(BaseLLMProvider):
        async def generate_json(self, prompt: str, system_prompt: str):
            raise httpx.ConnectError("Simulated connection failure")

    fallback = FallbackLLMProvider(ConnectionErrorProvider())
    result = await fallback.generate_json(
        prompt="Document type: lab_report", system_prompt="test"
    )
    assert isinstance(result, dict)
    assert result.get("document_type") == "lab_report"


@pytest.mark.asyncio
async def test_fallback_provider_on_empty_result():
    """FallbackLLMProvider falls back to mock when live provider returns empty."""

    class EmptyResultProvider(BaseLLMProvider):
        async def generate_json(self, prompt: str, system_prompt: str):
            return {}

    fallback = FallbackLLMProvider(EmptyResultProvider())
    result = await fallback.generate_json(
        prompt="Document type: prescription", system_prompt="test"
    )
    assert isinstance(result, dict)
    assert result.get("document_type") == "prescription"


def test_config_has_timeout_setting():
    """Verify LLM_TIMEOUT_SECONDS exists in settings."""
    assert hasattr(settings, "LLM_TIMEOUT_SECONDS")
    assert settings.LLM_TIMEOUT_SECONDS == 15.0
