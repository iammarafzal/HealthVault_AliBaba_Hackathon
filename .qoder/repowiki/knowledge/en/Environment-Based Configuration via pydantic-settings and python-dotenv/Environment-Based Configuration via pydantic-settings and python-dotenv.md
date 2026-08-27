---
kind: configuration_system
name: Environment-Based Configuration via pydantic-settings and python-dotenv
category: configuration_system
scope:
    - '**'
source_files:
    - backend/app/core/config.py
    - backend/.env.example
    - backend/requirements.txt
    - backend/app/main.py
    - backend/app/core/database.py
    - backend/app/core/security.py
---

## What system/approach is used

The backend uses an **environment-variable-driven configuration system** built on top of `pydantic-settings` (declared in `requirements.txt`) and `python-dotenv`. The intended design, as documented in the header comment of `backend/app/core/config.py`, is to load all secrets and settings from a `.env` file into typed Pydantic models. A template `.env.example` at `backend/.env.example` enumerates every expected environment variable with placeholder values.

## Key files and packages

- `backend/app/core/config.py` — Declares the configuration loading module; its header explicitly states it "Loads all secrets and settings from .env via pydantic-settings". The file currently contains only the docstring/header comment, indicating the implementation is either stubbed or not yet committed.
- `backend/.env.example` — Source-of-truth for required environment variables. It documents the full set of configuration keys grouped by concern: database (`DATABASE_URL`), authentication (`SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`), Alibaba Cloud services (`DASHSCOPE_API_KEY`, `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`, `OSS_BUCKET_NAME`, `OSS_ENDPOINT`), and feature flags (`USE_MOCK`).
- `backend/requirements.txt` — Declares both `pydantic-settings` and `python-dotenv` as dependencies, confirming the chosen stack.
- `backend/app/main.py` — Application entry point; its header describes where app factory, CORS middleware, lifespan events, and router registration live, which is the natural place to consume the config once implemented.
- `backend/app/core/database.py`, `backend/app/core/security.py` — Core modules that will consume configuration values (database URL, JWT secret/algorithm/token expiry) once the config layer is wired up.

## Architecture and conventions

1. **Single source of truth is the `.env` file.** All runtime configuration is expected to be provided through environment variables loaded from `.env`; no YAML/JSON/TOML config files are used.
2. **Typed configuration via Pydantic.** The plan (per `config.py` header) is to define a Pydantic `BaseSettings` model so each setting gets automatic type coercion and validation when loaded from the environment.
3. **Grouping by concern in `.env.example`.** Variables are organized into logical sections (Database, Authentication, Alibaba Cloud, Feature Flags), making it clear what categories of configuration exist.
4. **Feature flag support.** `USE_MOCK=False` in `.env.example` indicates a boolean feature-flag pattern for toggling behavior (e.g., mock vs real external services).
5. **Secrets separation.** Sensitive values (`SECRET_KEY`, `DASHSCOPE_API_KEY`, `OSS_*` credentials) are kept out of version control; only the template `.env.example` is tracked.
6. **External service configuration via env vars.** Alibaba Cloud DashScope (Qwen LLM) and OSS (Object Storage Service) credentials are configured entirely through environment variables rather than SDK default profiles.

## Conventions and constraints

- **All configuration must be supplied as environment variables** — there is no fallback to hardcoded defaults visible in the codebase; the `.env.example` template implies every listed key is required.
- **Database connection string format** follows `postgresql+asyncpg://user:password@host:port/dbname`, matching the async SQLAlchemy/asyncpg stack declared in requirements.
- **JWT configuration** is split across three variables: `SECRET_KEY` (signing key), `ALGORITHM` (defaulted to `HS256`), and `ACCESS_TOKEN_EXPIRE_MINUTES` (token lifetime).
- **Alibaba Cloud integration** requires five variables: API key for DashScope, plus access key ID, access key secret, bucket name, and endpoint for OSS.
- **Boolean feature flags** use uppercase `True`/`False` strings in `.env.example`, relying on Pydantic's boolean parsing.
- **No per-environment config files** (no `.env.dev`, `.env.prod`, etc.) are present; environment selection is expected to be handled outside the application (e.g., container orchestration injecting different env vars).

### Enforcement status

The actual Pydantic `BaseSettings` model referenced in `config.py` is not yet implemented in the repository (the file contains only a header comment). Therefore, while the *intended* architecture is clearly defined and the dependency stack is installed, the runtime enforcement of configuration types and presence checks is not yet active in this snapshot. Consumers should treat the current state as a planned configuration layer backed by `pydantic-settings` and `python-dotenv`.