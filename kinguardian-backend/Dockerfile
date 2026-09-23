FROM python:3.12-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY pyproject.toml ./
RUN pip install --no-cache-dir "fastapi[standard]>=0.115" "uvicorn[standard]>=0.30" "sqlalchemy>=2.0" "asyncpg>=0.30" "aiosqlite>=0.20" "alembic>=1.14" "pydantic-settings>=2.7" "pyjwt[crypto]>=2.10" "httpx>=0.28"
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
