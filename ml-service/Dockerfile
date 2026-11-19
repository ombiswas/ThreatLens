# Slim Python 3.11 base image
FROM python:3.11-slim-bookworm

# Install uv from official pinned multi-arch image
COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /bin/uv

# Create non-root system user (UID 1000 required by Hugging Face Spaces)
RUN useradd -m -u 1000 user

ENV HOME=/home/user \
    PATH="/home/user/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860

WORKDIR $HOME/app

# Copy dependency configuration files
COPY --chown=user:user pyproject.toml uv.lock .python-version ./

# Switch to non-root user before installation so venv and caches are user-owned
USER user

# Install dependencies strictly matching uv.lock without project installation
RUN uv sync --frozen --no-dev --no-install-project

# Copy application source code and verified model artifacts
COPY --chown=user:user app/ ./app/
COPY --chown=user:user artifacts/ ./artifacts/

# Expose default Hugging Face Spaces port (7860)
EXPOSE 7860

# Container healthcheck using standard Python HTTP check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7860/health')" || exit 1

# Start Uvicorn ASGI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
