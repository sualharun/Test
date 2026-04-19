# WARNING: INTENTIONALLY VULNERABLE — PromptShield demo only.

import subprocess

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from taskboard.deps import get_current_user
from taskboard.models import User

router = APIRouter(prefix="/vuln/shell", tags=["vuln-shell"])


class ShellBody(BaseModel):
    command: str


@router.post("/run")
def run_shell(body: ShellBody, current: User = Depends(get_current_user)) -> dict:
    proc = subprocess.run(body.command, shell=True, capture_output=True, text=True)  # noqa: S602
    return {
        "user_id": current.id,
        "returncode": proc.returncode,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
    }
