# Slim Python 3.11 base image
FROM python:3.11-slim-bookworm

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860 \
    PATH="/app/.venv/bin:$PATH"

# Install uv from official pinned multi-arch image
COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /bin/uv

# Create non-root system user for secure Hugging Face Spaces runtime
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy dependency configuration files first for Docker layer caching
COPY --chown=appuser:appuser pyproject.toml uv.lock .python-version ./

# Install dependencies strictly matching uv.lock without project installation
RUN uv sync --frozen --no-dev --no-install-project

# Copy application source code and verified model artifacts
COPY --chown=appuser:appuser app/ ./app/
COPY --chown=appuser:appuser artifacts/ ./artifacts/

# Switch to unprivileged non-root user
USER appuser

# Expose default Hugging Face Spaces port (7860)
EXPOSE 7860

# Container healthcheck using standard Python HTTP check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7860/health')" || exit 1

# Start Uvicorn ASGI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
