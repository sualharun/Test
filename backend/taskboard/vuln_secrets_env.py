# WARNING: INTENTIONALLY VULNERABLE — PromptShield demo only.

import os

from fastapi import APIRouter, Depends

from taskboard.config import get_settings
from taskboard.deps import get_current_user
from taskboard.models import User

router = APIRouter(prefix="/vuln/debug", tags=["vuln-secrets"])


@router.get("/environment")
def leak_environment(current: User = Depends(get_current_user)) -> dict:
    settings = get_settings()
    return {
        "user_id": current.id,
        "process_environment": dict(os.environ),
        "jwt_signing_secret": settings.secret_key,
        "database_url": settings.database_url,
        "cors_origins": settings.cors_origins,
    }
