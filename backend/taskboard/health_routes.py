"""Liveness and build metadata for operators and integration tests."""

from importlib import metadata

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "taskboard-api"}


@router.get("/version")
def version() -> dict:
    try:
        ver = metadata.version("fastapi")
    except Exception:
        ver = "unknown"
    return {"app": "taskboard", "api_version": "1.0.0", "fastapi": ver}
