---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### HealthVault AI
- Definition：The internal product name of this hackathon project — an AI-powered medical health vault that ingests documents, extracts clinical entities, checks drug interactions, generates doctor summaries, and supports bilingual Urdu/English voice queries.
- Aliases：HealthVault、healthvault

### MedicalAgentState
- Definition：The typed state object shared across the LangGraph multi-agent workflow; it carries the parsed medical entities, extracted medications/allergies, interaction alerts, and generated summary between the extraction, summary, interaction-check, and voice agents.
- Aliases：agent state、state

### USE_MOCK
- Definition：Feature flag that togges external service calls (OSS, OCR, ASR) to mock implementations, enabling local development and tests without live Alibaba Cloud credentials or GPU resources.
- Aliases：mock flag、feature flag
