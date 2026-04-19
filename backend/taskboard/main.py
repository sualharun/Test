from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from taskboard.auth_utils import create_access_token, create_user, get_user_by_email, verify_password
from taskboard.config import get_settings
from taskboard.database import Base, engine, get_db
from taskboard.deps import get_current_user
from taskboard.health_routes import router as health_router
from taskboard.models import Task, User
from taskboard.vuln_llm02_prompt import router as vuln_llm02_router
from taskboard.schemas import (
    AgentPrompt,
    AgentResponse,
    TaskCreate,
    TaskRead,
    TaskUpdate,
    Token,
    UserCreate,
    UserLogin,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TaskBoard API", version="1.0.0")
app.include_router(health_router)
app.include_router(vuln_llm02_router)

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.post("/auth/signup", response_model=Token)
def signup(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    if get_user_by_email(db, str(payload.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = create_user(db, payload)
    token = create_access_token(subject=user.email, user_id=user.id)
    return Token(access_token=token)


@app.post("/auth/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    user = get_user_by_email(db, str(payload.email))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(subject=user.email, user_id=user.id)
    return Token(access_token=token)


@app.get("/tasks", response_model=list[TaskRead])
def list_tasks(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Task]:
    return db.query(Task).filter(Task.user_id == current.id).order_by(Task.id.desc()).all()


@app.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Task:
    task = Task(
        user_id=current.id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@app.get("/tasks/{task_id}", response_model=TaskRead)
def read_task(
    task_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Task:
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@app.put("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Task:
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    for key, value in data.items():
        setattr(task, key, value)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    db.delete(task)
    db.commit()


@app.post("/run-agent", response_model=AgentResponse)
def run_agent(
    payload: AgentPrompt,
    current: User = Depends(get_current_user),
) -> AgentResponse:
    """
    Simulated agent: never executes user input; returns a safe canned-style summary.
    """
    preview = payload.prompt[:280]
    if len(payload.prompt) > 280:
        preview += "…"
    text = (
        f"[Simulated agent] Received a prompt of {len(payload.prompt)} characters. "
        f"Preview: {preview!r}. No external tools were invoked; "
        "this response is fixed logic for security testing baselines."
    )
    return AgentResponse(response=text, simulated=True)
