import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

MAX_PROMPT_LEN = 2000
MAX_TITLE_LEN = 200
MAX_DESC_LEN = 5000
ALLOWED_TASK_STATUSES = frozenset({"open", "in_progress", "done"})


def _strip_and_limit(value: str, max_len: int) -> str:
    cleaned = value.strip()
    if len(cleaned) > max_len:
        raise ValueError(f"Input exceeds maximum length of {max_len}")
    if "\x00" in cleaned:
        raise ValueError("Invalid characters in input")
    return cleaned


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if "\x00" in v:
            raise ValueError("Invalid password")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class Token(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_TITLE_LEN)
    description: str | None = Field(default=None, max_length=MAX_DESC_LEN)
    status: str = Field(default="open", max_length=32)

    @field_validator("title")
    @classmethod
    def sanitize_title(cls, v: str) -> str:
        return _strip_and_limit(v, MAX_TITLE_LEN)

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        return _strip_and_limit(s, MAX_DESC_LEN)

    @field_validator("status")
    @classmethod
    def sanitize_status(cls, v: str) -> str:
        s = v.strip().lower()
        if s not in ALLOWED_TASK_STATUSES:
            raise ValueError("status must be one of: open, in_progress, done")
        return s


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=MAX_TITLE_LEN)
    description: str | None = Field(default=None, max_length=MAX_DESC_LEN)
    status: str | None = Field(default=None, max_length=32)

    @field_validator("title")
    @classmethod
    def sanitize_title(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return _strip_and_limit(v, MAX_TITLE_LEN)

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        return _strip_and_limit(s, MAX_DESC_LEN)

    @field_validator("status")
    @classmethod
    def sanitize_status(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip().lower()
        if s not in ALLOWED_TASK_STATUSES:
            raise ValueError("status must be one of: open, in_progress, done")
        return s


class TaskRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    title: str
    description: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class AgentPrompt(BaseModel):
    prompt: str = Field(min_length=1, max_length=MAX_PROMPT_LEN)

    @field_validator("prompt")
    @classmethod
    def sanitize_prompt(cls, v: str) -> str:
        s = _strip_and_limit(v, MAX_PROMPT_LEN)
        # Remove control characters except common whitespace
        s = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", s)
        return s.strip()


class AgentResponse(BaseModel):
    response: str
    simulated: bool = True


class PromptShieldPrMeta(BaseModel):
    repo_full_name: str
    pr_number: int
    commit_sha: str
    author_login: str
    pr_title: str


class PromptShieldNode(BaseModel):
    id: str
    label: str
    node_type: str
    x: float
    y: float
    risk: int = Field(ge=0, le=100)
    metadata: dict = Field(default_factory=dict)


class PromptShieldEdge(BaseModel):
    id: str
    source: str
    target: str


class PromptShieldChain(BaseModel):
    path: list[str]
    node_ids: list[str]
    edge_ids: list[str]
    risk_score: int = Field(ge=0, le=100)
    terminal_type: str
    fallback: bool = False


class PromptShieldContextResponse(BaseModel):
    pr: PromptShieldPrMeta
    nodes: list[PromptShieldNode]
    edges: list[PromptShieldEdge]
    chains: list[PromptShieldChain]
