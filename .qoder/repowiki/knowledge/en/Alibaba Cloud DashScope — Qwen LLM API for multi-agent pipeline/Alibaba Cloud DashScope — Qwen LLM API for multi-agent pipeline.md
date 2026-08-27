---
kind: external_dependency
name: Alibaba Cloud DashScope — Qwen LLM API for multi-agent pipeline
slug: alibaba-cloud-dashscope
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
---

DashScope is the Alibaba Cloud managed LLM gateway used to call Qwen models (Qwen-Plus for entity parsing and drug-interaction guard, Qwen-Max for clinical summary generation). The project integrates via the `dashscope` Python SDK; authentication is through the `DASHSCOPE_API_KEY` environment variable loaded by pydantic-settings. Agents in `app/agents/` are orchestrated by LangGraph and invoke DashScope endpoints to parse medical records, generate summaries, check drug interactions, and resolve bilingual Urdu/English voice intent.