import pytest

from app.core.config import settings
from app.services.llm_provider import (
    BaseLLMProvider,
    DashScopeProvider,
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
    assert isinstance(provider, GeminiProvider)
    assert provider.model_name == "gemini-2.0-flash"


def test_provider_factory_switch_to_qwen():
    settings.USE_MOCK = False
    provider = get_llm_provider("qwen", model_name="qwen-max")
    assert isinstance(provider, DashScopeProvider)
    assert provider.model_name == "qwen-max"


def test_provider_factory_switch_to_dashscope():
    settings.USE_MOCK = False
    provider = get_llm_provider("dashscope")
    assert isinstance(provider, DashScopeProvider)


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
