# WARNING: INTENTIONALLY VULNERABLE — PromptShield demo only. Do not merge to production.

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from taskboard.deps import get_current_user
from taskboard.models import User

router = APIRouter(prefix="/vuln/llm07", tags=["vuln-llm07"])


class EvalBody(BaseModel):
    expression: str


@router.post("/agent-eval")
def llm07_agent_eval(body: EvalBody, current: User = Depends(get_current_user)) -> dict:
    """LLM07-style: user-controlled string passed to eval()."""
    result = eval(body.expression)  # noqa: S307
    return {"user_id": current.id, "result": result}
