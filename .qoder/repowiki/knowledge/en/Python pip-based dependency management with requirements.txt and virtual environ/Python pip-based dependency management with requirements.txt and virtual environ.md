---
kind: dependency_management
name: Python pip-based dependency management with requirements.txt and virtual environment
category: dependency_management
scope:
    - '**'
source_files:
    - backend/requirements.txt
    - backend/Dockerfile
    - backend/.venv/pyvenv.cfg
---

## Dependency Management Approach

This repository uses a straightforward Python dependency management setup based on `pip` and a flat `requirements.txt` file, without lockfiles or advanced tooling.

### System/Tools Used
- **Package manager**: `pip` (invoked via `pip install -r requirements.txt`)
- **Dependency declaration**: single `backend/requirements.txt` listing all runtime dependencies
- **Virtual environment**: `backend/.venv/` is present (created via `python -m venv`) and tracked by `.gitignore`, indicating local per-developer isolation
- **Containerization**: `backend/Dockerfile` installs dependencies from `requirements.txt` using `pip install --no-cache-dir -r requirements.txt` during image build

### Key Files
- `backend/requirements.txt` — the sole source of truth for third-party packages. It groups imports by category (Web Framework, Database, Pydantic & Validation, Authentication, Alibaba Cloud, AI / OCR, Utilities) with inline comments.
- `backend/.venv/` — local virtual environment directory; contains `pyvenv.cfg` and standard venv layout but no committed package snapshots.
- `backend/Dockerfile` — copies `requirements.txt` into the image and runs `pip install` at build time; does not use `--require-hashes` or any pinned versions.

### Architecture and Conventions
- **Flat dependency list**: All dependencies are declared in one file under `backend/`; there is no per-package or per-subproject separation.
- **Optional extras used**: Several packages declare optional extras to enable specific features:
  - `uvicorn[standard]` for ASGI server extras
  - `sqlalchemy[asyncio]` for async database support
  - `pydantic[email]` for email validation
  - `python-jose[cryptography]` for cryptographic signing
  - `passlib[bcrypt]` for bcrypt hashing
- **No version pinning**: Dependencies are listed as bare package names (e.g., `fastapi`, `paddleocr`, `langchain-core`) with no `==`, `>=`, or `~=` constraints. This means builds resolve to the latest available version at install time.
- **No lockfile**: There is no `requirements.lock`, `poetry.lock`, `Pipfile.lock`, or equivalent. Reproducibility across environments relies on matching Python/pip versions rather than exact package versions.
- **No vendoring**: No `vendor/` directory or vendored third-party code is present.
- **No private registry**: No custom index URL (`--index-url`, `-i`) or `pip.conf` configuration was found; packages are resolved from the default PyPI index plus any Alibaba Cloud-specific packages like `dashscope` and `oss2` that publish to PyPI.
- **Environment variables**: Configuration is loaded via `python-dotenv` and `pydantic-settings` (see `backend/.env.example`), keeping secrets out of dependency manifests.

### Constraints and Enforcement
- The Dockerfile enforces installation strictly from `requirements.txt` at build time, so any change to dependencies must go through that file to be reflected in container images.
- Because no version pins exist, CI or deployment pipelines would need to add their own pinning strategy (e.g., `pip freeze > requirements.lock`) if reproducibility is required.
- The `.venv/` directory is excluded from version control (via `.gitignore` inside `.venv`), which is the standard convention to avoid committing installed artifacts.

### Observed Gaps
- Lack of version pinning makes builds non-deterministic; upgrading a transitive dependency can silently change behavior.
- No dependency auditing tool (e.g., `pip-audit`, `safety`) is referenced in the repo.
- No split between `requirements-dev.txt` / `requirements-test.txt`; test-only dependencies are not separated.