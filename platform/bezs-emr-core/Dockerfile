# ── Stage 1: dependency builder ───────────────────────────────────────────────
FROM python:3.12-slim AS builder

# uv is copied directly from the official image — no curl, no shell script
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Install dependencies into .venv before copying app code so this layer
# is cached as long as pyproject.toml / uv.lock don't change.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-cache

# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Non-root user — containers should never run as root in production
RUN groupadd --gid 1001 appgroup \
    && useradd --uid 1001 --gid appgroup --no-create-home --shell /sbin/nologin appuser

WORKDIR /app

# Copy only the pre-built venv from the builder — no compilers or build tools
# land in the final image.
COPY --from=builder --chown=appuser:appgroup /app/.venv /app/.venv

# Copy application source
COPY --chown=appuser:appgroup app ./app

# Alembic migrations — baked in so the container can apply schema on first boot
COPY --chown=appuser:appgroup alembic.ini ./
COPY --chown=appuser:appgroup migrations ./migrations

# Entrypoint runs migrations then hands off to uvicorn
COPY --chown=appuser:appgroup entrypoint.sh ./
COPY --chown=appuser:appgroup seed-all.sh ./
RUN chmod +x ./entrypoint.sh ./seed-all.sh

USER appuser

# Activate venv
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Liveness probe used by Docker / container runtimes that don't support
# HTTP healthchecks natively.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

ENTRYPOINT ["./entrypoint.sh"]
