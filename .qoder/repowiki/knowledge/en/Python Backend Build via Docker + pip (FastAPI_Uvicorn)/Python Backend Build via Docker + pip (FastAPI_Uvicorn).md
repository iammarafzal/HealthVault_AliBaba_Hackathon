---
kind: build_system
name: Python Backend Build via Docker + pip (FastAPI/Uvicorn)
category: build_system
scope:
    - '**'
source_files:
    - backend/Dockerfile
    - backend/requirements.txt
    - backend/tests/conftest.py
    - backend/.env.example
---

## What system/approach is used

The repository uses a minimal Python build and packaging setup centered on `pip` for dependency resolution and a single-stage `Dockerfile` for containerized deployment of the FastAPI backend. There are no Makefiles, shell build scripts, CI pipelines, or project-level packaging manifests (no `setup.py`, `setup.cfg`, `pyproject.toml`, `tox.ini`).

## Key files and packages

- `backend/requirements.txt` — pinned-free dependency manifest listing all runtime packages (FastAPI, Uvicorn, SQLAlchemy+asyncpg, Alembic, Pydantic v2 with email extras, python-jose/passlib for auth, Alibaba Cloud SDKs `dashscope`/`oss2`, PaddleOCR/PaddlePaddle, LangGraph/LangChain, plus utilities like `python-dotenv`, `httpx`, `aiofiles`).
- `backend/Dockerfile` — single-stage image based on `python:3.11-slim`; installs dependencies from `requirements.txt` into `/app`, copies source, exposes port 8000, and runs `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- `backend/tests/conftest.py` — shared pytest fixtures and async database session setup; tests are discovered by pytest but there is no top-level test runner script.
- `backend/.env.example` — environment variable template consumed at runtime (via `python-dotenv` / `pydantic-settings`); not part of the build itself but required for the image to start.

## Architecture and conventions

- **Container-first deployment**: The only defined artifact is the Docker image produced by `docker build -t healthvault-backend backend/`. The image is intended to be run directly; there is no multi-stage build, no separate dev/prod image, and no build cache optimization beyond `COPY requirements.txt . && RUN pip install ...` before copying source.
- **Runtime entrypoint**: The application is launched through Uvicorn as a WSGI/ASGI server (`CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`), so the built image expects `app/main.py` to expose a FastAPI `app` instance.
- **Dependency pinning strategy**: `requirements.txt` lists package names without version pins (e.g. `fastapi`, `sqlalchemy[asyncio]`, `paddleocr`), meaning builds are reproducible only within a narrow window of available PyPI versions unless an external lock file (not present) is used.
- **No virtual environment in image**: Dependencies are installed globally inside the container image rather than into a per-project `.venv`; this matches the standard Docker Python best practice of using the image's site-packages.
- **Configuration**: Runtime configuration is loaded from environment variables (see `backend/.env.example`); no build-time configuration flags exist.

## Conventions and constraints

- **Image base**: Must use `python:3.11-slim` (hardcoded in the Dockerfile). Changing the Python version requires updating both the Dockerfile and any local development environment expectations.
- **Port exposure**: The image exposes TCP port 8000; orchestrators must map this port to reach the API.
- **Host binding**: Uvicorn binds to `0.0.0.0` so it is reachable from outside the container; binding to `localhost` would break container networking.
- **Dependency installation**: `pip install --no-cache-dir -r requirements.txt` is used to avoid caching wheels inside the image layer, keeping image size smaller.
- **Testing invocation**: Tests live under `backend/tests/` and rely on pytest discovery; there is no documented command to run them, so the conventional approach is `pytest` executed from within the container or a matching Python environment.
- **No cross-compilation or platform-specific builds**: The Dockerfile targets Linux containers on the host architecture; there is no `--platform` flag or multi-arch build step.