"""FastAPI application factory for AI CyberShield ML Microservice."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.predictor import predictor
from app.routes import limiter, router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context: load model artifacts once at startup."""
    print("Starting ML Microservice...")
    try:
        predictor.load_artifacts()
    except Exception as e:
        print(f"[FATAL] Failed to load model artifacts: {e}")
    yield
    print("Shutting down ML Microservice...")


def create_app() -> FastAPI:
    """Create and configure FastAPI application instance."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.VERSION,
        docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.ENVIRONMENT == "development" else None,
        lifespan=lifespan,
    )

    # Attach rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Include routes
    app.include_router(router)

    return app


app = create_app()
