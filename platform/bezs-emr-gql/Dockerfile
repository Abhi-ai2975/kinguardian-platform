# ── Stage 1: dependency builder ───────────────────────────────────────────────
FROM python:3.14-slim AS builder

# Install uv via pip — avoids needing ghcr.io registry access during the build.
RUN pip install --no-cache-dir uv

WORKDIR /app

# Copy manifests first — this layer is cached until pyproject.toml/uv.lock change,
# so routine app-code edits don't trigger a full dependency reinstall.
COPY pyproject.toml uv.lock ./

# Install production dependencies into .venv (uv default).
# --frozen: fail if uv.lock is out of sync with pyproject.toml.
# --no-dev: skip linters, test runners, and other dev-only packages.
# --no-cache: keeps the builder layer lean.
RUN uv sync --frozen --no-dev --no-cache

# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM python:3.14-slim AS runtime

# Non-root user — containers should never run as root in production.
RUN groupadd --gid 1001 appgroup \
    && useradd --uid 1001 --gid appgroup --no-create-home --shell /sbin/nologin appuser

WORKDIR /app

# Copy only the pre-built venv from the builder — no pip, uv, or build tools
# land in the final image, keeping it lean.
COPY --from=builder --chown=appuser:appgroup /app/.venv /app/.venv

# Copy application source.
COPY --chown=appuser:appgroup app ./app

USER appuser

# Activate the venv by prepending its bin directory to PATH.
# This makes uvicorn, python, etc. resolve from .venv without sourcing activate.
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Required env vars at runtime (supply via .env or docker-compose environment:):
#   FHIR_SERVER_URL, TERMINOLOGY_SERVER_URL, IAM_JWKS_URL, IAM_ISSUER,
#   REDIS_URL, ENVIRONMENT
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
