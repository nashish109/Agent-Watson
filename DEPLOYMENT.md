# Deployment Guide

## Architecture

```
┌─────────────┐     HTTP/JSON      ┌──────────────┐
│   Vercel    │ ──────────────────→ │   Railway    │
│  (Frontend) │                     │  (Backend)   │
│  Next.js 15 │                     │  FastAPI     │
└─────────────┘                     └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │   Supabase   │
                                    │  (Database)  │
                                    └──────────────┘
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Python >= 3.12
- Git

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

See `.env.example` for all required variables and descriptions.

## Frontend — Vercel Deployment

### Settings

| Setting          | Value            |
|------------------|------------------|
| Framework        | Next.js          |
| Build Command    | `pnpm build`     |
| Install Command  | `pnpm install`   |
| Output Directory | `apps/web/.next` |
| Root Directory   | `./`             |

### Required Environment Variables (Vercel)

| Variable               | Value                                     |
|------------------------|-------------------------------------------|
| `NEXT_PUBLIC_API_URL`  | Your Railway backend URL (e.g. `https://agent-watson-api.up.railway.app`) |

### Steps

1. Push the repository to GitHub.
2. In Vercel, import the repository.
3. Set **Root Directory** to `./`.
4. Vercel automatically detects the Next.js framework and uses `vercel.json`.
5. Add `NEXT_PUBLIC_API_URL` pointing to your Railway backend.
6. Deploy.

## Backend — Railway Deployment

### Settings

| Setting        | Value                                                  |
|----------------|--------------------------------------------------------|
| Builder        | Nixpacks                                               |
| Build Command  | `cd services/api && pip install -r requirements.txt`   |
| Start Command  | `cd services/api && uvicorn src.main:app --host 0.0.0.0 --port $PORT` |
| Health Path    | `/health`                                              |

### Steps

1. In Railway, create a new project from the repository.
2. Railway detects `railway.json` and auto-configures.
3. Set **Root Directory** to `services/api` (or rely on `railway.json` overrides).
4. Deploy.

The backend listens on `$PORT` (set by Railway) and exposes:
- `GET /health` — Health check (used by Railway)
- `POST /api/memory` — Bridge-compatible memory endpoint

### Python Package Dependencies

The backend requires:
- `fastapi>=0.115.0`
- `uvicorn>=0.34.0`
- `pydantic>=2.10.0`

Installed via `services/api/requirements.txt`.

## Database — Supabase

1. Create a Supabase project.
2. Configure the database connection string.
3. Set `DATABASE_URL` on the Railway backend.

## Local Development

```bash
# Install dependencies
pnpm install

# Start the frontend (with Python bridge for memory engine)
pnpm dev

# Start the backend (standalone FastAPI)
cd services/api
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

The frontend runs at `http://localhost:3000`.
The backend runs at `http://localhost:8000`.

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` to use the FastAPI backend instead of the local bridge.

## Build Verification

```bash
# Full monorepo build
pnpm build

# TypeScript type checking
pnpm typecheck

# The Next.js build should produce static pages + API routes
# The FastAPI backend should start and respond on /health
```

## Known Production Limitations

1. **Python Bridge**: The local development workflow spawns a Python process (`bridge.py`) via Next.js API routes. This does NOT work in Vercel's serverless environment. In production, the frontend calls the Railway backend via `NEXT_PUBLIC_API_URL`.

2. **In-Memory Storage**: The memory engine currently stores all data in-memory (Python dicts). For production, a persistent database (Supabase PostgreSQL) needs to be connected via the `@agent-watson/database` package.

3. **AI Features**: AI provider integrations (OpenAI, Anthropic) are not wired. They require API keys set in environment variables and feature implementation.

4. **Authentication**: No authentication layer is implemented. The application currently operates in single-user mode.
