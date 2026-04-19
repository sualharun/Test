# TaskBoard

TaskBoard conflict lane BETA: alternate hotspot wording to force conflicts against alpha/gamma branches.

This repository is intended as a **secure baseline** for testing security tools (SAST/DAST, prompt-injection harnesses, auth flows, CORS policy, and similar work) against a deliberately boring, constrained surface area—not as a production system.

## Architecture

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy, SQLite, `passlib` (bcrypt), `python-jose` (JWT), Pydantic validation on all payloads. Extra libraries in `requirements.txt` (for example `httpx`, `orjson`, `PyYAML`, `tenacity`, `rich`) keep SBOM / dependency-graph demos realistic—`main` does not ship vulnerable routes.
- **Frontend:** React 18 + Vite, React Router, **TanStack Query** for server state, **Zod** for lightweight client validation, **date-fns** + **clsx** for formatting and styling. Centralized `fetch` helper with JSON handling and HTTP errors.

## Security properties (by design)

- **No secrets in source code.** `TASKBOARD_SECRET_KEY` and optional settings come from the environment (see `backend/.env.example`).
- **CORS is not open.** Defaults allow only local development origins (`localhost` / `127.0.0.1` on common dev ports). Override with `TASKBOARD_CORS_ORIGINS` if needed.
- **Auth:** Signup/login are public; all other routes require a valid Bearer JWT.
- **Input validation:** Pydantic models enforce lengths, allowed task statuses, and basic sanitization (trim, reject null bytes, strip dangerous control characters for prompts).
- **Agent endpoint:** Returns a fixed-pattern simulated message; it does not execute user content or call external agents.

## Prerequisites

- Python 3.11 or newer
- Node.js 20+ (for Vite)

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Add a real secret (at least 16 characters), for example:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Put the value in `.env` as `TASKBOARD_SECRET_KEY=...`.

Edit `.env` if you need a non-default database path or custom CORS list (`TASKBOARD_CORS_ORIGINS` as comma-separated URLs).

Run the API (binds to loopback only):

```bash
cd backend
source .venv/bin/activate
uvicorn taskboard.main:app --reload --host 127.0.0.1 --port 8000
```

Interactive docs: `http://127.0.0.1:8000/docs` (OpenAPI). **Do not expose this demo to the public internet without hardening** (HTTPS reverse proxy, shorter JWT lifetime, rate limits, etc.).

## Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The UI talks to `http://127.0.0.1:8000` by default (`VITE_API_BASE_URL`).

Production build:

```bash
cd frontend
npm run build
npm run preview
```

## API overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/signup` | No | Create user, returns JWT |
| `POST` | `/auth/login` | No | Login, returns JWT |
| `GET` | `/tasks` | Yes | List current user’s tasks |
| `POST` | `/tasks` | Yes | Create task |
| `GET` | `/tasks/{id}` | Yes | Fetch one task |
| `PUT` | `/tasks/{id}` | Yes | Update task |
| `DELETE` | `/tasks/{id}` | Yes | Delete task |
| `POST` | `/run-agent` | Yes | Mock agent response for `{ "prompt": "..." }` |
| `GET` | `/health` | No | Liveness JSON |
| `GET` | `/version` | No | Build / runtime metadata |

## PromptShield multi-repo demo (deterministic)

This repo includes a synthetic graph demo that mimics a PromptShield-style "single PR, multi-repo compromise context" flow.

- Backend endpoint: authenticated `GET /demo/promptshield/context`
- Frontend page: authenticated `/promptshield-demo`
- Data is fully local/synthetic and deterministic (no external network calls, no LLM path generation)

Graph nodes include:
- First-party repo (`sualharun/Test`)
- Dependencies
- Maintainers
- External vulnerable repos with CVE metadata

Attack chains are ranked with deterministic rules:
- Sum weighted edge transitions (`repo->package`, `package->maintainer`, `maintainer->vulnerable_repo`, etc.)
- Add terminal severity bonus
- Add small path-length bonus
- Cap at 100

If no qualifying chain exists, backend emits a deterministic fallback chain so playback always has at least one path.

## Vulnerability demo branches

See `docs/vulnerability-branches.md`. Named `vuln-*` branches add **intentionally unsafe** endpoints and UI for PromptShield demos; they may **conflict with each other** on shared files to exercise merge tooling.

## Disclaimer

This project is a **controlled teaching / testing baseline**. It omits many controls expected in production (refresh tokens, CSRF strategy for cookie auth, centralized logging, abuse prevention, etc.). Treat it accordingly.
