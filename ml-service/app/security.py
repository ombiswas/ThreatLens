"""Security and authentication middleware for AI CyberShield ML Microservice."""

import hmac

from fastapi import HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader

from app.config import settings

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key_header: str = Security(API_KEY_HEADER)) -> str:
    """Verify incoming X-API-Key using constant-time string comparison.

    Prevents timing attacks.
    """
    if not api_key_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required authentication header: X-API-Key",
        )

    # Constant-time comparison
    is_valid = hmac.compare_digest(
        api_key_header.encode("utf-8"),
        settings.ML_API_KEY.encode("utf-8"),
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
        )

    return api_key_header
