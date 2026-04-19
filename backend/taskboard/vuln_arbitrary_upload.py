# WARNING: INTENTIONALLY VULNERABLE — PromptShield demo only.

from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile

from taskboard.deps import get_current_user
from taskboard.models import User

router = APIRouter(prefix="/vuln/upload", tags=["vuln-upload"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"


@router.post("/insecure")
async def insecure_upload(file: UploadFile = File(...), current: User = Depends(get_current_user)) -> dict:
    """No MIME/size checks; trusts client filename (path traversal risk)."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOAD_DIR / file.filename
    raw = await file.read()
    dest.write_bytes(raw)
    return {"saved_path": str(dest.resolve()), "bytes": len(raw), "user_id": current.id}
