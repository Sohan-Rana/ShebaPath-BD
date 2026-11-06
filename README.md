# ShebaPath BD — Bangladesh Citizen Service Navigator

Bangla/English government-service guide with a source-grounded AI assistant.

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind, shadcn-style UI, Lucide
- **Backend:** FastAPI, SQLAlchemy 2, Pydantic 2, Alembic
- **DB:** PostgreSQL + pgvector (HNSW cosine index)
- **Auth:** JWT + Argon2, role-based access (`user`, `admin`)
- **AI:** RAG over *verified* service data; refuses to guess

## Local setup (step by step)

### 1. Database
```bash
docker compose up -d db          # pgvector/pgvector:pg16
```

### 2. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # JWT_SECRET, ADMIN_PASSWORD, API keys edit korun
alembic upgrade head
python -m scripts.seed           # admin user + categories + sample services (UNVERIFIED)
uvicorn app.main:app --reload    # http://localhost:8000/docs
```
For a local demo only: `python -m scripts.seed --demo-verify` marks the sample services as verified so the AI can answer.

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local       # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                      # http://localhost:3000
```

Admin login: the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (default `admin@shebapath.local`). **Change it before deploying.**

## Tests
```bash
cd backend && pytest -q                     # 25 tests (needs a shebapath_test DB, see conftest.py)
cd frontend && npx playwright install chromium && npm run build && npm run test:e2e
```
E2E expects the API on :8000 seeded with `--demo-verify`.

## How the "no fabricated information" rule works
1. Seed/sample services contain **no fee amounts** — a fee is shown only if an admin enters it.
2. A service enters the AI knowledge base **only when published AND verified** (admin presses *Verify* in the dashboard after checking the official source).
3. **Editing a service clears its verification** and removes it from the AI index until re-verified.
4. The AI retrieves top-k chunks from pgvector; with no relevant chunk it returns a fixed refusal pointing to official authorities, without calling the LLM.
5. Answers carry source titles, official links and verification dates. The system prompt is the one from the spec.
6. Without `ANTHROPIC_API_KEY`, the assistant quotes verified text directly (no generated prose).

## AI configuration
| Variable | Notes |
|---|---|
| `ANTHROPIC_API_KEY`, `LLM_MODEL` | LLM for answer generation |
| `EMBEDDING_PROVIDER=openai` + `EMBEDDING_API_KEY` | production embeddings (OpenAI-compatible, 1536 dims) |
| `EMBEDDING_PROVIDER=hash` | local deterministic embeddings for dev/tests only; weak for semantic Bangla search |

After changing the embedding provider, run `POST /api/admin/knowledge/reindex` (and note embeddings from different providers are not comparable).

## Deployment
- **Frontend → Vercel:** root `frontend/`, env `NEXT_PUBLIC_API_URL=https://<your-api>`.
- **Backend → Render:** `render.yaml` (Docker). Set `DATABASE_URL` as `postgresql+psycopg://…`, `CORS_ORIGINS=https://<your-vercel-app>`, `JWT_SECRET`, API keys. The managed Postgres must allow `CREATE EXTENSION vector`.
- Migrations run automatically on container start.

## API overview
Auth `/api/auth/*` · Services `/api/services`, `/api/services/search`, `/api/categories` · User `/api/users/*` · Applications `/api/applications` · AI `/api/ai/chat|sessions` · Admin `/api/admin/*` (services, categories, users, sources/verify, knowledge, analytics, logs). Interactive docs at `/docs`.

## Known limits / next steps
- Rate limiter is in-memory (single instance); use Redis behind multiple instances.
- JWT is stored in `localStorage`; for stricter security move to httpOnly cookies.
- Sample services are placeholders: **verify all content against official sites before launch.**
- `frontend/src/app/contact/page.tsx`: replace the placeholder contact email.
- No real-time government tracking: the Application Tracker holds user-entered records only.
