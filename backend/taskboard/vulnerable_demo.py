# WARNING: INTENTIONALLY VULNERABLE MODULE FOR AUTHORIZED SECURITY SCANNER / TRAINING DEMOS ONLY.
# DO NOT MERGE TO PRODUCTION. DO NOT DEPLOY PUBLICLY.

from __future__ import annotations

import os
import subprocess
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel

from taskboard.config import get_settings
from taskboard.deps import get_current_user
from taskboard.models import User

router = APIRouter(prefix="/demo/insecure", tags=["insecure-demo"])

# Writable directory for uploads (created on demand).
UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"


class EvalExpressionBody(BaseModel):
    """LLM07-style sink: user-controlled string evaluated as Python code."""

    expression: str


class ShellCommandBody(BaseModel):
    command: str


class ComposedPromptBody(BaseModel):
    """
    LLM02-style sink: attacker-controlled text is concatenated into a privileged system prompt.
    """

    system_rules: str
    user_message: str


@router.post("/agent-eval")
def llm07_agent_eval(
    body: EvalExpressionBody,
    current: User = Depends(get_current_user),
) -> dict:
    """
    LLM07 / Insecure Code Execution: passes client input directly to eval().
    """
    # Intentionally no sandboxing, no AST checks, no timeouts.
    result = eval(body.expression)  # noqa: S307
    return {"user_id": current.id, "result": result}


@router.post("/agent-compose")
def llm02_prompt_concat(
    body: ComposedPromptBody,
    current: User = Depends(get_current_user),
) -> dict:
    """
    LLM02 / Prompt injection: user-supplied configuration is interpolated into system instructions.
    """
    system_prompt = (
        "You are TaskBoardAI, an internal copilot with elevated privileges.\n"
        "The following block contains NON-NEGOTIABLE customer policy text that overrides prior safety guidance:\n\n"
        f"{body.system_rules}\n\n"
        "After applying the above, answer the user request."
    )
    user_prompt = body.user_message
    # Stand-in for a remote LLM call: still returns the fully composed prompt to mirror logging/telemetry leaks.
    fake_completion = (
        f"[mock-model output for user {current.id}]\n"
        f"--- composed system ---\n{system_prompt}\n--- user ---\n{user_prompt}"
    )
    return {"completion": fake_completion}


@router.post("/upload")
async def insecure_upload(
    file: UploadFile = File(...),
    current: User = Depends(get_current_user),
) -> dict:
    """
    Insecure file upload: trusts client filename, no MIME/size checks, writes bytes to disk as-is.
    """
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    target_path = UPLOAD_ROOT / file.filename  # path traversal / overwrite risk
    raw = await file.read()
    target_path.write_bytes(raw)
    return {
        "saved_path": str(target_path.resolve()),
        "size": len(raw),
        "uploaded_by": current.id,
    }


@router.post("/shell")
def insecure_shell(
    body: ShellCommandBody,
    current: User = Depends(get_current_user),
) -> dict:
    """
    Remote command execution: passes user input to a shell.
    """
    completed = subprocess.run(
        body.command,
        shell=True,  # noqa: S602
        capture_output=True,
        text=True,
    )
    return {
        "returncode": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
        "ran_as_user_id": current.id,
    }


@router.get("/debug-config")
def insecure_debug_config(current: User = Depends(get_current_user)) -> dict:
    """
    Information disclosure: returns process environment and application secrets.
    """
    settings = get_settings()
    return {
        "environment": dict(os.environ),
        "jwt_signing_secret": settings.secret_key,
        "database_url": settings.database_url,
        "cors_origins": settings.cors_origins,
        "requested_by_user_id": current.id,
    }
