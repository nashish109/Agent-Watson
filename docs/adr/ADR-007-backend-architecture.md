# ADR-007: Backend Architecture

**Status:** Accepted  
**Date:** 2026-06-29  
**Deciders:** Ashish (Product Owner), Principal Architect

---

## Context

Agent Watson runs as personal software on Ashish's Windows machine (SRS §7.1), with optional cloud LLM calls and backup. Solo builder maintains the system. Primary workload: conversation turns triggering retrieval, inference, extraction, and persistence — not high-QPS public API.

ADR-001 (conversation-first), ADR-002 (single-user), ADR-003 (hybrid), and ADR-006 (RAG pipeline) constrain backend shape.

## Problem Statement

Backend architecture choices:

1. **Framework** — async Python ecosystem vs Node vs others.
2. **Deployment shape** — monolith vs microservices.
3. **Code organization** — layer-based (controllers/services/repos) vs feature modules.
4. **Process model** — embedded in desktop vs local server vs cloud worker.

Wrong choices cause: premature distributed ops, navigation hell across 20 microservices, or FastAPI CRUD app that isn't a mentor pipeline.

## Decision

### FastAPI as the application framework

**Use FastAPI for the backend API and orchestration layer** (local server bound to localhost or LAN).

**Why FastAPI:**

- **Async I/O** — concurrent LLM calls, file ingestion, embedding jobs without blocking conversation UX.
- **Python ecosystem** — ML/NLP libraries, PDF parsing, embedding clients, local model runners (Ollama) share one language with Ashish's AI/DS skills — lowers context switch for solo maintainer.
- **Typed contracts** — Pydantic models for extraction outputs, memory updates, tier policies — critical for pipeline safety.
- **OpenAPI** — auto-documented internal API for future web UI and CLI clients.
- **Performance** — sufficient for single-user; not the bottleneck (LLM latency dominates).

**Why not alternatives:**

- **Django** — heavier ORM/admin assumptions; CRUD-first culture fights conversation-first.
- **Node/Bun** — fine for UI; splits stack for ML ingestion work.
- **Flask** — lacks modern async and validation defaults.

### Modular monolith

**One deployable application process** with clear internal module boundaries — not microservices.

Modules (feature-oriented):

- `conversation` — turn handling, session working memory
- `mentor` — context assembly + mentor inference invocation
- `memory` — episodic/semantic/procedural lifecycle
- `retrieval` — vector + relational + graph queries
- `ingestion` — attachments, chunking, embedding jobs
- `policy` — tier classification and cloud gate
- `growth` — signal computation (ADR-012)
- `vault` — filesystem artifact access
- `inference` — LLM provider abstraction (ADR-006)

**Inter-module rule:** modules communicate via explicit service interfaces in-process; no direct cross-module DB table hacks from unrelated features.

### Not microservices

Microservices rejected because:

- **Operational surface** — one human cannot run k8s, service mesh, distributed tracing for personal app.
- **Latency** — mentor turn already multi-step; network hops between services add pain without load benefit.
- **Single user** — no independent scaling units (ADR-002).
- **Data coherence** — memory pipeline needs transactional-ish updates across stores in one turn — easier in one process.

**Extract a service only when:** a component needs different runtime (GPU worker) — then **one** optional sidecar (e.g., local embedding worker), not full decomposition.

### Feature-first organization

**Organize code by user-meaningful capability** (`conversation`, `mentor`, `memory`), not technical layer (`controllers`, `repositories`).

Within each feature:

- `service` — business logic
- `ports` — interfaces outward
- `adapters` — SQLite, vector store, OpenAI client

**Avoid:** `routes/` that call `services/` that call 15 generic repos with no domain name — leads to "where does staleness live?" grep hell.

### Process model

**Local FastAPI server + separate frontend** (web UI) talking to localhost API. Optional CLI as another client.

Not embedded Python in Electron unless UI needs demand it — separation keeps mentor pipeline testable without browser.

## Alternatives Considered

### A. Microservices from day one

Conversation service, memory service, retrieval service, etc.

**Rejected.** See above. Premature for single user.

### B. Serverless (Lambda) for inference orchestration

**Rejected.** Cold starts, local vault access awkward, DTCC laptop offline use broken.

### C. All-in-one Next.js app (API routes + UI)

**Rejected for core pipeline.** UI can be Next/React; mentor pipeline in Python is stronger for ingestion/ML. **Acceptable:** Next frontend + FastAPI backend (two processes, still personal monolith).

### D. Django monolith

**Rejected.** FastAPI wins for async pipeline + typing.

### E. Pure desktop app (no server)

**Rejected.** CLI, future mobile, and test harness want HTTP API. Local server is fine for single user.

## Pros

- **One process to run** — `watson serve` starts everything.
- **Clear module map** — maps to ADRs and SRS features.
- **Testable pipeline** — integration tests hit mentor turn end-to-end.
- **Ashish-maintainable** — Python aligns with AI/DS learning goals.
- **Escape hatch** — GPU sidecar later without splitting mentor logic.

## Cons

- **Two runtimes if React frontend** — frontend + backend dev coordination.
- **Monolith scaling myth** — if wrongly judged "can't scale," pressure to split — resist until second user product (ADR-002).
- **Python GIL** — CPU-heavy embedding batch can block; use background task queue in same process (async workers) or sidecar.

## Trade-offs

| We gain | We sacrifice |
|---------|--------------|
| Ops simplicity | Independent service deploy |
| Fast feature iteration | Netflix-style architecture resume |
| End-to-end tests | Strict service isolation |

## Future Implications

- Background jobs: same codebase, `asyncio` task queue or lightweight ARQ/Celery **only if** ingestion blocks turns — start with FastAPI `BackgroundTasks`.
- Optional `embedding-worker` process if local embedding saturates CPU.
- Open-source contributors navigate by feature folder.
- Do not add `user_service` — no users (ADR-002).

## When This Decision Should Be Revisited

Revisit if:

1. **Embedding ingestion** routinely blocks mentor responses >2s — background worker or sidecar (not full microservices).
2. **Ashish prefers TypeScript full-stack** strongly enough to offset ML friction — evaluate Node orchestration + Python subprocess for ML only.
3. **Mobile client** needs sync protocol — may add sync module, still monolith.
4. **Second product (hosted)** — fork deployment layer; core modules may reuse as library.

Do not split microservices for "clean architecture" aesthetics.
