# Agent Watson — Architecture Review Report

**Author:** Principal Software Architect
**Scope:** Sprint 3 completion review
**Status:** Draft — ready for Sprint 4 planning

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Package Structure](#2-package-structure)
3. [Dependency Architecture](#3-dependency-architecture)
4. [Domain Model Analysis](#4-domain-model-analysis)
5. [Service Responsibility Map](#5-service-responsibility-map)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Event and Data Flow](#7-event-and-data-flow)
8. [Database Schema Proposal](#8-database-schema-proposal)
9. [REST API Contract Proposal](#9-rest-api-contract-proposal)
10. [Repository Interface Design](#10-repository-interface-design)
11. [Technical Debt Register](#11-technical-debt-register)
12. [Refactoring Opportunities](#12-refactoring-opportunities)
13. [Proposed Folder Structure](#13-proposed-folder-structure)
14. [Sprint 4 Readiness Checklist](#14-sprint-4-readiness-checklist)

---

## 1. Executive Summary

Agent Watson is a **session-first, single-user, local-only** personal AI mentor. Sprint 3 delivered the Reflection Engine V2 as the final deterministic layer. The architecture is internally consistent and well-aligned with its ADRs. Three systemic risks must be addressed before Sprint 4.

### Critical Risks (must fix before Sprint 4)

| # | Risk | Impact | Fix |
|---|------|--------|-----|
| R1 | **No persistence layer** — all state is in-memory Python dicts and React `useState` | Browser refresh or bridge restart destroys all sessions, memories, and context | Define repository interfaces now; implement SQLite in Sprint 4 |
| R2 | **SessionService is a God Object** — creates and owns every engine, graph, and service | Impossible to test, swap, or scale individual engines; violates Single Responsibility | Extract orchestration into a `SessionOrchestrator`; inject engines via constructor |
| R3 | **Python package dependency graph is implicit** — no `pyproject.toml` declares intra-monorepo dependencies; runtime relies on editable `.pth` installs | Will break in any CI/CD or packaging pipeline that doesn't replicate the same sys.path manipulation | Add explicit intra-package dependencies to all `pyproject.toml` files |

### Summary Assessment

```
ARCHITECTURE MATURITY: Pre-production prototype
COUPLING: Moderate (SessionService coupling everything)
TESTABILITY: Good at unit level, poor at integration level
PERSISTENCE: None
API CONTRACT: Implicit (no OpenAPI/schema)
SCALABILITY: N/A (single-user, in-memory, local-only)
```

---

## 2. Package Structure

### 2.1 Current Structure

```
packages/
├── memory/                # Memory Engine (Python)
│   └── src/memory/
│       ├── models.py          # Pydantic: Session, Memory, Contribution, Reflection
│       ├── intent.py          # Intent classifier (deterministic)
│       ├── extractor.py       # Memory extractor
│       ├── generator.py       # Per-memory reflection generator
│       ├── relationships.py   # Relationship engine + repository
│       ├── service.py         # MemoryService orchestrator
│       ├── session.py         # SessionService — THE GOD OBJECT
│       ├── summarizer.py      # Session summary (text)
│       ├── knowledge.py       # Knowledge base responses
│       └── reflection_v2.py   # Legacy — duplicates reflection/ package
│
├── concept_graph/         # Concept Graph Engine (Python)
│   └── src/concept_graph/
│       ├── domain/
│       │   ├── concept.py         # Concept model
│       │   ├── concept_edge.py    # Edge model
│       │   └── concept_graph.py   # In-memory graph store
│       └── services/
│           ├── concept_extractor.py     # Concept extraction
│           └── concept_graph_service.py # Graph operations
│
├── context/               # Context Retrieval Engine (Python)
│   └── src/context/
│       ├── models.py             # Dataclasses (MemoryEntry, SessionEntry, etc.)
│       └── services/
│           ├── retrieval_service.py  # Cross-session search
│           └── ranking_service.py    # Deterministic scoring
│
├── reflection/            # Reflection Engine V2 (Python)  ← NEW Sprint 3
│   └── src/reflection/
│       ├── domain/
│       │   ├── reflection_context.py
│       │   └── reflection_summary.py
│       └── services/
│           ├── reflection_engine.py
│           └── session_reflection_service.py
│
├── shared/                # TS shared types — EMPTY (export {})
├── ui/                    # TS UI components — EMPTY (export {})
├── config/                # TS config presets — EMPTY (export {})
├── database/              # Drizzle ORM — PLACEHOLDER (lists planned models)

services/
└── api/                   # FastAPI — PLACEHOLDER (/health only)

apps/
├── web/                   # Next.js frontend
└── cli/                   # CLI — PLACEHOLDER
```

### 2.2 Issues

1. **`memory/reflection_v2.py` is dead code** — `bridge.py` now imports from `reflection/` package directly, but `memory/reflection_v2.py` still exists with its own copy of `ReflectionContext`, `ReflectionSummary`, `ReflectionEngineV2`, and `SessionReflectionService`. This is a maintenance trap — the two copies will diverge.

2. **`context/__init__.py` is empty** — all other packages export public API via `__init__.py`. Context requires consumers to know its internal module structure.

3. **`memory/` has too many responsibilities** — models, extraction, generation, relationships, sessions, summarization, and legacy reflection all in one package.

4. **`services/api/` is disconnected** — the FastAPI app coexists with the Next.js API route but neither communicates with the other. There are two potential API surfaces with no documented relationship.

5. **3 empty TS packages** — `shared`, `ui`, `config` are `export {}` stubs, yet `next.config.js` references them as `transpilePackages`.

### 2.3 Recommended Structure (Sprint 4)

```
packages/
├── engine-session/          # SessionService + ContributionResult (refactored from memory/)
│   └── src/engine_session/
│       ├── models.py            # Session Pydantic model only
│       ├── session_service.py   # Pure session lifecycle (no engine wiring)
│       └── repositories/
│           └── session_repository.py  # Interface + InMemorySessionRepository
│
├── engine-memory/           # Memory extraction + reflection generation
│   └── src/engine_memory/
│       ├── models.py            # Memory, Contribution, Reflection, MemoryType
│       ├── intent.py            # Intent classifier (unchanged)
│       ├── extractor.py         # Memory extractor (unchanged)
│       ├── generator.py         # Per-memory reflection generator (unchanged)
│       ├── relationships.py     # Relationship engine (unchanged)
│       └── service.py           # MemoryService (unchanged)
│
├── engine-concept-graph/    # Concept Graph (renamed from concept_graph/)
│   └── src/engine_concept_graph/
│       ├── domain/             # Unchanged
│       └── services/           # Unchanged
│
├── engine-context/          # Context Retrieval (renamed from context/)
│   └── src/engine_context/
│       ├── models.py           # Unchanged
│       └── services/           # Unchanged
│
├── engine-reflection/       # Reflection Engine V2 (renamed from reflection/)
│   └── src/engine_reflection/
│       ├── domain/             # Unchanged
│       └── services/           # Unchanged
│
├── orchestrator/            # NEW — replaces SessionService's god-object role
│   └── src/orchestrator/
│       ├── session_orchestrator.py  # Composes all engines
│       └── pipeline.py             # Contribution → Intent → Extract → Reflect → Graph
│
├── shared/                  # Python shared models (no longer empty)
│   └── src/agent_watson_shared/
│       ├── models/              # MemoryEntry, SessionEntry (moved from context/)
│       └── interfaces/          # Repository interfaces, service protocols
│
├── database/                # SQLite persistence (Sprint 4 implementation)
│   └── src/database/
│       ├── connection.py        # SQLite connection management
│       ├── migrations/          # Alembic
│       ├── repositories/        # SQL implementations of interfaces
│       └── models.py            # SQLAlchemy/Drizzle ORM models
│
├── shared/                  # TS — populated with shared types
├── ui/                      # TS — populated or removed
└── config/                  # TS — populated or removed
```

**Renaming rationale:** The `engine-` prefix makes discoverability unambiguous in shells and file trees. Flat listing sorts all engines together.

---

## 3. Dependency Architecture

### 3.1 Current Dependency Graph (Source-Level)

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                         memory                                  │
 │  session.py: ConceptGraph, ConceptGraphService, ConceptExtractor│
 │  session.py: MemoryEntry, RetrievalResult, SessionEntry,        │
 │              RetrievalService                                   │
 │  reflection_v2.py: ContextQuery, RetrievalResult                │
 │  bridge.py: SessionReflectionService (from reflection/)         │
 └──────┬────────────────────┬───────────────────────┬─────────────┘
        │                    │                       │
        ▼                    ▼                       ▼
 ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
 │ concept_graph │   │   context    │   │   reflection     │
 │  (leaf)       │   │              │   │                  │
 │               │◄──│ retrieval:   │   │  (DI-based,      │
 │               │   │  Concept     │   │   no hard deps)  │
 └──────────────┘   └──────────────┘   └──────────────────┘
```

### 3.2 Problems

| Issue | Severity | Detail |
|-------|----------|--------|
| **No declared dependencies** | CRITICAL | `pyproject.toml` for every package lists only `pydantic>=2.10.0`. Cross-package imports work via `.pth` files from editable installs. This is fragile and non-portable. |
| **Cyclic potential** | MODERATE | `memory` → `reflection` (via bridge.py). If `reflection` ever imports from `memory`, a cycle forms. Currently avoided by DI in reflection. |
| **Context depends on concept_graph** | MINOR | `RetrievalService` imports `Concept` for type hints. This makes context non-portable without concept_graph. Consider moving `Concept` to a shared models package. |
| **Implicit bridge dependency** | MODERATE | `bridge.py` is in the `memory/` directory but acts as the integration point for ALL engines. It uses `reflection`, `memory`, and transitively `concept_graph` and `context`. Its location doesn't match its scope. |

### 3.3 Target Dependency Graph (Sprint 4)

```
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │ engine-      │   │ engine-      │   │ engine-      │   │ engine-      │
 │ memory       │   │ concept-graph│   │ context      │   │ reflection   │
 │  (leaf)      │   │  (leaf)      │   │              │   │  (leaf)      │
 └──────┬───────┘   └──────┬───────┘   │ depends on   │   └──────┬───────┘
        │                  │           │ concept-graph│          │
        │                  │           └──────┬───────┘          │
        │                  │                  │                  │
        └──────────────────┴──────────────────┴──────────────────┘
                                   │
                           ┌───────▼────────┐
                           │  orchestrator  │  ← NEW: composes engines
                           │                │     owns no domain state
                           │ depends on all │     pure orchestration
                           └───────┬────────┘
                                   │
                           ┌───────▼────────┐      ┌──────────────────┐
                           │  session-      │──────│    database      │
                           │  engine        │      │  (SQLite repo    │
                           │  (lifecycle)   │      │   implementations│
                           └────────────────┘      └──────────────────┘
```

---

## 4. Domain Model Analysis

### 4.1 Current Domain Model Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Domain Objects                                  │
├─────────────────┬─────────────────┬──────────────────┬──────────────────┤
│    memory/      │  concept_graph/ │   context/       │   reflection/   │
│    models.py    │  domain/        │   models.py      │   domain/       │
├─────────────────┼─────────────────┼──────────────────┼──────────────────┤
│ MemoryType(Enum)│ Concept(Pydantic)│ MemoryEntry(dc)  │ ReflectionContext│
│ Contribution    │ ConceptCategory  │ SessionEntry(dc) │ ReflectionSummary│
│ Memory          │ ConceptEdge      │ ContextQuery(dc) │                 │
│ Reflection      │ ConceptGraph     │ ContextItem(dc)  │                 │
│ Session         │                  │ RetrievalResult  │                 │
└─────────────────┴─────────────────┴──────────────────┴──────────────────┘

(dc = dataclass)
```

### 4.2 Duplication Analysis

| Concept | Appears In | Problem |
|---------|-----------|---------|
| `Session` | `memory/models.py` (Pydantic) | Primary definition. But `context/models.py` has `SessionEntry` which is a subset. Two representations of the same entity. |
| `Memory` | `memory/models.py` (Pydantic) | Primary. `context/models.py` has `MemoryEntry` which is a flattening. This is acceptable only if a documented mapping exists — it doesn't. |
| `ReflectionContext` | `memory/reflection_v2.py` + `reflection/domain/reflection_context.py` | Two independent implementations. `memory` version has `concept_connections` and `context` fields; `reflection` version has the same. These WILL diverge. |
| `ReflectionSummary` | `memory/reflection_v2.py` + `reflection/domain/reflection_summary.py` | Same fields (`primary_focus`, `topics_explored`, `progress`, `strongest_connections`, `reflection`). Identical structure. |
| `ReflectionEngineV2` | `memory/reflection_v2.py` + `reflection/services/reflection_engine.py` | Different implementations. The `memory` version is the original; the `reflection` version is the enhanced Sprint 3 version. |
| `SessionReflectionService` | `memory/reflection_v2.py` + `reflection/services/session_reflection_service.py` | Same constructor signature, same `reflect()` method. Different import paths. |

### 4.3 Naming Inconsistencies

| Term | Used In | Issue |
|------|---------|-------|
| `ReflectionEngineV2` | Code | Suggests there is/was a V1. There isn't. The "V2" suffix will become confusing in Sprint 5 when AI enhancement is added. |
| `strongest_connections` | `ReflectionSummary` | "Strongest" is a superlative that implies ranking. The field contains ALL connections, not just the strongest. `connections` or `connection_rankings` would be more accurate. |
| `primary_focus` | `ReflectionSummary` | Good name. But the values are memory types ("Learning", "Project", etc.) or "Mixed"/"Generic". These are not "focuses" — they are `dominant_intent` or `session_category`. |
| `progress` | `ReflectionSummary` | The key `progress` returns a `dict[str, list[str]]`. Each value is a list of topic strings. But "progress" implies measurement or advancement. These are just topic lists. `activity_groups` or `topic_groups` would be more precise. |
| `topics_explored` | `ReflectionSummary` | Acceptable, but "explored" implies active discovery. These are simply topics that appeared in memories. |
| `MemoryType` | `memory/models.py` | Enum values `LEARNING`, `PROJECT`, `CAREER`, `HEALTH`, `GENERIC`. These overlap with `IntentType` values in `intent.py` which adds `REFLECTION` and `QUESTION`. The overlap is intentional but undocumented. |
| `RetrievalResult` | `context/models.py` | Contains `items: list[ContextItem]` and `query: ContextQuery`. The `total_count` property derives from `len(items)`. This is reasonable but the dataclass mixes a query reference with its results. |

### 4.4 Type Quality Assessment

| Model | Framework | Strengths | Weaknesses |
|-------|-----------|-----------|------------|
| `Session` | Pydantic | UUID ids, datetime fields, type validation | Embeds full `contributions[]`, `memories[]`, `reflections[]` — large payloads; no pagination support; no `user_id` (by design, ADR-002) |
| `Memory` | Pydantic | Clean, minimal | `display_label: Optional[str]` is a UI concern leaking into the domain |
| `Contribution` | Pydantic | Clean | `source: str = "unknown"` with no enum, no validation |
| `Relationship` | Pydantic | Clean | No weight field — all relationships are equally "strong". The reflection engine needs weights but can't get them from this model. |
| `Concept` | Pydantic | Good | `aliases: list[str]` is useful but unused by any consumer |
| `MemoryEntry` | dataclass | Lightweight | Duplicates `Memory` without the relationship. No cross-reference to original Memory id. |
| `SessionEntry` | dataclass | Good for its purpose | No cross-reference to original Session id (uses same id). Flat structure is good for search. |
| `ReflectionContext` | dataclass | Flexible (Any types) | Overly permissive — `Any` types disable IDE support and validation. |
| `ReflectionSummary` | dataclass | Clean, reusable | `progress: dict[str, list[str]]` — the value type is untyped. Should be `dict[str, list[ProgressItem]]`. |

### 4.5 Recommendation: Unified Model Layer for Sprint 4

```
packages/shared/src/agent_watson_shared/models/
├── __init__.py
├── session.py          # Session (core, without embedded contributions/memories)
├── memory.py           # Memory, MemoryType, Contribution
├── reflection.py       # Reflection (per-memory), ReflectionSummary
├── relationship.py     # Relationship, RelationshipType
├── concept.py          # Concept, ConceptCategory, ConceptEdge
└── context.py          # ContextQuery, ContextItem, RetrievalResult
```

**Single source of truth for all domain models.** Each engine package imports from `agent_watson_shared.models` rather than defining its own. The `pyproject.toml` of every engine declares `agent-watson-shared` as a dependency.

---

## 5. Service Responsibility Map

### 5.1 Current Service Responsibilities

```
SessionService (memory/session.py) ← GOD OBJECT
├── Session lifecycle (create, end, retrieve)
├── Contribution ingestion
│   ├── Creates MemoryService internally (or accepts via constructor)
│   ├── Creates RelationshipEngine internally (or accepts via constructor)
│   ├── Creates ConceptGraph internally (always — no injection)
│   ├── Creates ConceptGraphService internally (always — no injection)
│   ├── Creates ConceptExtractor internally (always — no injection)
│   ├── Creates RetrievalService internally (always — no injection)
│   └── Creates RelationshipRepository internally (always — no injection)
├── Concept graph operations (exposed as property)
├── Retrieval service operations (exposed as property)
├── Relationship repository access
├── Summary generation
└── Cross-engine data orchestration

MemoryService (memory/service.py) ← Clean orchestrator
├── Intent classification
├── Memory extraction
├── Relationship detection
└── Reflection generation

RelationshipEngine (memory/relationships.py) ← Single responsibility ✓
└── Relationship detection between memories

ConceptGraph (concept_graph/) ← Single responsibility ✓
└── In-memory concept storage and traversal

RetrievalService (context/) ← Single responsibility ✓
└── Cross-session search and ranking

ReflectionEngineV2 (reflection/) ← Single responsibility ✓
└── Structured session reflection generation
```

### 5.2 Problem: `SessionService` Does Everything

`SessionService` is responsible for **15 distinct responsibilities**:

| # | Responsibility | Should live in |
|---|---------------|---------------|
| 1 | Session CRUD | `SessionService` (yes) |
| 2 | Session state validation | `SessionService` |
| 3 | Contribution → memory pipeline | `MemoryService` (delegated — OK) |
| 4 | Relationship storage | `RelationshipRepository` (delegated — OK) |
| 5 | Concept extraction | `ConceptExtractor` (delegated — OK) |
| 6 | Concept graph updates | `ConceptGraphService` (delegated — OK) |
| 7 | Cross-contribution concept linking | `ConceptGraphService` (delegated — OK) |
| 8 | Retrieval service sync | `RetrievalService` (delegated — OK) |
| 9 | Session entry sync (for context engine) | This method — leaky abstraction |
| 10 | Exposing concept graph as property | `SessionOrchestrator` |
| 11 | Exposing retrieval service as property | `SessionOrchestrator` |
| 12 | Bridge dependency injection | Constructor — instantiates everything |
| 13 | Relationship repository access | Extracted method |
| 14 | Summary generation | `summarizer.py` (OK) |
| 15 | Context query passthrough | `RetrievalService` (OK) |

### 5.3 Target: SessionOrchestrator Pattern

```
SessionOrchestrator (new)
├── Owns no domain state
├── Receives all engines via constructor injection
├── Orchestrates the contribution pipeline
│   └── contribution → MemoryService → RelationshipEngine → ConceptGraphService → SessionRepository
├── Provides facade methods for reflect(), query(), summarize()
└── Bridge between API layer and domain

SessionService (refactored)
├── Owns session lifecycle ONLY
├── create(), end(), get(), list()
└── Delegates persistence to SessionRepository

MemoryService (unchanged)
├── Intent → Extract → Reflect → Relate
└── Pure pipeline, no state

[All engines remain single-responsibility]
```

---

## 6. Frontend Architecture

### 6.1 Component Tree

```
RootLayout
└── ThemeProvider (next-themes, forced dark)
    └── HomePage ("use client")
        ├── MainLayout
        │   ├── Sidebar (hidden <md)
        │   └── MobileHeader (visible <md only)
        └── [children]
            └── LivingCanvas (forwardRef, scrollable)
                ├── SessionHeader
                ├── [empty state] "Tap to contribute"
                ├── MemoryCard[] (4 types: contribution|memory|reflection|response)
                └── [Processing indicator]

        └── ContributionInput (modal, conditional)

        └── [DEV_MODE] ─── ContextQueryPanel
                        └── TodayReflection
```

### 6.2 State Architecture

```
useSession() hook (single instance, called once in page.tsx)
│
├── sessionIdRef (useRef<string|null>)  ← persists across renders, survives re-renders
├── session (useState<Session|null>)    ← the entire session tree
│
├── contribute(text) → POST /api/memory → parse → setSession(append items)
├── reflect()        → POST /api/memory → return ReflectionData
├── query(text)      → POST /api/memory → return QueryItem[]
└── getSession()     → return session (trivial wrapper)
```

### 6.3 Frontend-Backend Boundary

```
Browser                        Next.js Server              Python Process
┌─────────┐   HTTP POST       ┌──────────────┐  stdin/     ┌──────────────┐
│ React   │ ───────────────►  │ /api/memory  │  stdout     │ bridge.py    │
│ App     │                   │  route.ts    │ ──────────► │  (persistent)│
│         │ ◄───────────────  │  spawn/python│ ◄────────── │              │
└─────────┘   JSON response   │  sendCommand │  JSON line  │  SessionSvc  │
                              └──────────────┘             └──────────────┘
```

### 6.4 Frontend Issues

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| F1 | `DEV_MODE` hardcoded `true` | HIGH | Line 13 of `page.tsx`: `const DEV_MODE = true`. Dev-only panels always render. Must use `process.env.NODE_ENV` or a feature flag. |
| F2 | No error feedback on contribution failure | HIGH | `handleContribute` catches errors but only `console.error`s. User sees nothing. |
| F3 | Type duplication | MODERATE | `BridgeResponse` in `use-session.ts` duplicates shapes in `data/memories.ts`. `TodayReflectionData` duplicates `BridgeReflectResponse`. |
| F4 | `end_session` never called | MODERATE | Bridge supports it; UI never invokes it. Sessions leak indefinitely. |
| F5 | No session persistence | MODERATE | Browser refresh destroys all state. No localStorage, no IndexedDB. |
| F6 | Protocol inconsistency | MODERATE | `isStr()` type guard exists because Python bridge sometimes serializes memories/reflections as JSON strings instead of arrays. This is a serialization bug in the bridge. |
| F7 | Bridge process lifecycle | LOW | `ensureBridge()` spawns once but never kills. No health-check polling. Process could zombie. |
| F8 | Unused Radix dependencies | LOW | `@radix-ui/react-avatar`, `@radix-ui/react-dialog`, `@radix-ui/react-scroll-area` in package.json but never imported. |
| F9 | Unused `Button` component | LOW | `components/ui/button.tsx` is well-built but no component imports it. Raw `<button>` everywhere. |
| F10 | Mobile sidebar missing | LOW | Sidebar is `hidden md:flex`. No mobile nav drawer. |

### 6.5 Frontend Recommendations

1. **Feature-flag `DEV_MODE`** via environment variable: `process.env.NEXT_PUBLIC_DEV_MODE === 'true'`
2. **Add error toast/state** for contribution failures in `page.tsx`
3. **Consolidate types**: move `BridgeResponse` into `data/memories.ts`; replace `TodayReflectionData` with `BridgeReflectResponse`
4. **Call `end_session`** on `beforeunload` event
5. **Fix bridge serialization** so `memories`/`reflections` are always arrays
6. **Remove unused dependencies** or implement the planned Radix components

---

## 7. Event and Data Flow

### 7.1 Contribution Flow (Current)

```
User types text
    │
    ▼
ContributionInput.onSubmit(text)
    │
    ▼
page.tsx: handleContribute(text)
    │
    ├─ setIsProcessing(true)
    ├─ scrollToBottom()
    │
    ▼
useSession().contribute(text)
    │
    ├─ ensureSession()
    │   ├─ POST /api/memory { cmd: "create_session" }
    │   │   └─ Python: SessionService.create_session()
    │   │       ├─ Session.__init__() → UUID, timestamp
    │   │       ├─ _sessions[id] = session
    │   │       └─ _sync_session_entry(session) → SessionEntry for context engine
    │   └─ return session_id
    │
    ├─ POST /api/memory { cmd: "contribute", session_id, text }
    │   └─ Python: SessionService.add_contribution(session_id, text)
    │       ├─ Validate session exists and not ended
    │       ├─ Contribution.__init__(text, source)
    │       │
    │       ├─ MemoryService.process(contribution, existing_memories)
    │       │   ├─ classify_intent(text) → IntentResult
    │       │   │   └─ IntentType: Question | Learning | Project | Career | Health | Reflection | Generic
    │       │   │
    │       │   ├─ [if Question] get_knowledge_response(text) → return early
    │       │   │
    │       │   ├─ extract_memories(contribution, intent) → Memory[]
    │       │   │   └─ Per keyword match, create Memory(typed, topic, summary)
    │       │   │
    │       │   ├─ RelationshipEngine.find(existing_memories, new_memories) → Relationship[]
    │       │   │   └─ Rule-based: topic overlap, type matching → RelationshipType
    │       │   │
    │       │   └─ generate_reflection(memory, relationships?) → Reflection[]
    │       │       └─ Template-based, hash-selected, enriched with relationship labels
    │       │
    │       ├─ Store artefacts:
    │       │   ├─ session.contributions.append(contribution)
    │       │   ├─ session.memories.extend(memories)
    │       │   ├─ session.reflections.extend(reflections)
    │       │   ├─ _sync_session_entry(session)  ← Context engine sync
    │       │   └─ _relationship_repo.add_all(new_relationships)
    │       │
    │       ├─ Concept Graph update:
    │       │   └─ For each memory:
    │       │       ├─ ConceptExtractor.extract(memory_type, topic) → Concept[]
    │       │       ├─ ConceptGraph.add_concept(concept)  ← dedup by name
    │       │       └─ [if >=2 concepts] ConceptGraphService.link_concepts(ids)
    │       │           └─ create_edge(a, b) for all pairs → increment weight on repeat
    │       │
    │       └─ Return ContributionResult(contribution, intent, memories, reflections, relationships, concepts, connections)
    │
    ├─ Parse response into TimelineItem[]
    │   ├─ 1. Contribution card
    │   ├─ 2. Response card (if Question intent)
    │   ├─ 3. Memory cards (from memories[] or session.memories[] — defensive isStr check)
    │   └─ 4. Reflection cards (from reflections[] or session.reflections[])
    │
    ├─ setSession(prev => { items: [...prev.items, ...newItems] })
    │
    └─ return items
```

### 7.2 Reflection Flow (Current)

```
User clicks "Generate Reflection" (dev panel)
    │
    ▼
useSession().reflect()
    │
    ├─ POST /api/memory { cmd: "reflect", session_id }
    │   └─ Python: SessionReflectionService.reflect(session_id)
    │       ├─ session = SessionService.get_session(session_id)
    │       ├─ relationships = SessionService.get_relationships(session_id)
    │       ├─ concepts = ConceptGraph.get_all_concepts()
    │       ├─ concept_connections = _build_concept_connections()
    │       │   └─ For each concept: graph.get_connected_concepts(id, min_weight=1)
    │       │       └─ → [(neighbour, weight), ...] sorted desc
    │       ├─ context = _query_context(session)
    │       │   └─ Extract topics → retrieval_service.query(topics[0])
    │       │
    │       ├─ Assemble ReflectionContext(session, memories, concepts, relationships,
    │       │                                concept_connections, context)
    │       │
    │       └─ ReflectionEngineV2.generate(ctx) → ReflectionSummary
    │           ├─ _determine_primary_focus(memories)
    │           │   └─ Count types → if any > 50% → that type, else "Mixed"
    │           ├─ _extract_topics(memories, concepts) → list[str]
    │           │   └─ Unique topics + concept names, sorted A-Z
    │           ├─ _build_progress(memories) → dict[label → [topics]]
    │           │   └─ Group by memory type, deduplicate topics
    │           ├─ _build_connections(relationships, concept_connections, memories)
    │           │   └─ Score + sort by weight desc
    │           └─ _generate_reflection(primary_focus, memories) → str
    │               └─ Hash-based template selection, deterministic
    │
    └─ Return { primary_focus, topics_explored, progress, strongest_connections, reflection }
```

### 7.3 Flow Issues

| Step | Issue |
|------|-------|
| Contribution → Concept Graph | Concept graph is updated per-contribution by `SessionService` directly. This is business logic embedded in the service layer. Should be a pipeline step. |
| Memory → Context sync | `_sync_session_entry()` is a private method called after every mutation. This tightly couples session lifecycle to context engine internals. |
| Reflection → Context query | `_query_context()` queries the retrieval service with `topics[0]` only. A session with 10 topics only gets context on the first one. |
| No rollback | If concept graph update fails after memories are stored, the session is inconsistent. No transaction boundary. |
| No event emission | Each step (memory created, concept linked, reflection generated) has no observable event. Future features (growth engine, notifications) will need events. |

---

## 8. Database Schema Proposal

### 8.1 Design Principles (from ADR-008)

- **SQLite** for local structured data
- **Filesystem vault** for raw artifacts (content-addressed UUID paths)
- **Embedded vector store** (sqlite-vec / LanceDB) for embeddings
- **No cloud-primary storage**
- **Stable entity IDs** unify all stores
- **Immutable event log** for all contributions

### 8.2 Proposed Schema

```sql
-- =============================================================
-- Core: Session
-- =============================================================
CREATE TABLE sessions (
    id              TEXT PRIMARY KEY,          -- UUID hex
    session_date    TEXT NOT NULL,             -- ISO date (YYYY-MM-DD)
    started_at      TEXT NOT NULL,             -- ISO datetime
    ended_at        TEXT,                      -- ISO datetime (NULL if active)
    summary         TEXT,                      -- Generated session summary
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================
-- Core: Contribution (immutable event log)
-- =============================================================
CREATE TABLE contributions (
    id              TEXT PRIMARY KEY,          -- UUID hex
    session_id      TEXT NOT NULL REFERENCES sessions(id),
    text            TEXT NOT NULL,
    source          TEXT NOT NULL DEFAULT 'user',  -- 'user', 'api', 'cli'
    tags            TEXT,                      -- JSON array
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_contributions_session ON contributions(session_id);

-- =============================================================
-- Core: Memory (extracted knowledge)
-- =============================================================
CREATE TABLE memories (
    id              TEXT PRIMARY KEY,          -- UUID hex
    session_id      TEXT NOT NULL REFERENCES sessions(id),
    contribution_id TEXT NOT NULL REFERENCES contributions(id),
    type            TEXT NOT NULL,             -- 'Learning','Project','Career','Health','Generic'
    topic           TEXT NOT NULL,
    summary         TEXT NOT NULL,
    confidence      REAL NOT NULL DEFAULT 0.5,
    display_label   TEXT,                      -- UI override for MemoryType display
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_memories_session ON memories(session_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_topic ON memories(topic);

-- =============================================================
-- Core: Reflection (per-memory generated statements)
-- =============================================================
CREATE TABLE reflections (
    id              TEXT PRIMARY KEY,          -- UUID hex
    memory_id       TEXT NOT NULL REFERENCES memories(id),
    text            TEXT NOT NULL,
    related_to      TEXT,                      -- JSON array of topic strings
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_reflections_memory ON reflections(memory_id);

-- =============================================================
-- Relationships between memories
-- =============================================================
CREATE TABLE relationships (
    id                  TEXT PRIMARY KEY,      -- UUID hex
    source_memory_id    TEXT NOT NULL REFERENCES memories(id),
    target_memory_id    TEXT NOT NULL REFERENCES memories(id),
    relationship_type   TEXT NOT NULL,          -- 'RELATED_TOPIC','SAME_PROJECT', etc.
    label               TEXT,                   -- Human-readable label
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(source_memory_id, target_memory_id, relationship_type)
);
CREATE INDEX idx_relationships_source ON relationships(source_memory_id);
CREATE INDEX idx_relationships_target ON relationships(target_memory_id);

-- =============================================================
-- Concept Graph
-- =============================================================
CREATE TABLE concepts (
    id              TEXT PRIMARY KEY,          -- UUID hex
    name            TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'General',
    aliases         TEXT,                      -- JSON array
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(name COLLATE NOCASE)
);

CREATE TABLE concept_edges (
    id              TEXT PRIMARY KEY,          -- UUID hex
    source_id       TEXT NOT NULL REFERENCES concepts(id),
    target_id       TEXT NOT NULL REFERENCES concepts(id),
    relation        TEXT NOT NULL DEFAULT 'related_to',
    weight          INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(source_id, target_id, relation)
);
CREATE INDEX idx_edges_source ON concept_edges(source_id);
CREATE INDEX idx_edges_target ON concept_edges(target_id);

-- Memory-to-concept mapping (many-to-many)
CREATE TABLE memory_concepts (
    memory_id       TEXT NOT NULL REFERENCES memories(id),
    concept_id      TEXT NOT NULL REFERENCES concepts(id),
    PRIMARY KEY (memory_id, concept_id)
);

-- =============================================================
-- Session Reflection Summary (cached output of Reflection Engine)
-- =============================================================
CREATE TABLE session_reflections (
    id                  TEXT PRIMARY KEY,       -- UUID hex
    session_id          TEXT NOT NULL REFERENCES sessions(id),
    primary_focus       TEXT NOT NULL,
    topics_explored     TEXT NOT NULL,           -- JSON array
    progress            TEXT NOT NULL,           -- JSON object
    strongest_connections TEXT NOT NULL,         -- JSON array
    reflection          TEXT NOT NULL,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_id)                          -- One per session
);

-- =============================================================
-- Context Retrieval Index (denormalized for search)
-- =============================================================
CREATE TABLE context_index (
    id              TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL REFERENCES sessions(id),
    memory_id       TEXT REFERENCES memories(id),
    entity_type     TEXT NOT NULL,              -- 'memory', 'session'
    topic           TEXT,
    summary         TEXT,
    memory_type     TEXT,
    matched_terms   TEXT,                       -- JSON array of searchable terms
    session_date    TEXT NOT NULL
);
CREATE INDEX idx_context_session ON context_index(session_id);
CREATE INDEX idx_context_topic ON context_index(topic);
```

### 8.3 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **TEXT for all timestamps** (ISO 8601) | SQLite has no native datetime type. ISO text is sortable, portable, and human-readable. |
| **JSON columns for arrays/objects** | `topics_explored`, `progress`, `strongest_connections`, `aliases`, `related_to` are stored as JSON. SQLite has native `json_extract()` support. Avoids join explosion for simple list fields. |
| **No `user_id` columns** | ADR-002: single-user architecture. If multi-user is ever needed, every table gets a `user_id` and composite PKs. |
| **`memory_concepts` junction table** | Enables many-to-many queries: "which memories contributed to this concept?" and "which concepts appear in this memory?" |
| **`context_index` denormalization** | Cross-session search queries need fast topic/term matching. A denormalized index avoids joining 4+ tables per query. Updated on each contribution. |
| **`session_reflections` cache** | Reflection generation is deterministic but involves graph traversal. Caching the latest reflection per session avoids recomputation on page load. |
| **No vector columns** | Embeddings will live in a separate vector store (sqlite-vec extension or LanceDB), not in the relational schema. Entity IDs cross-reference. |

---

## 9. REST API Contract Proposal

### 9.1 Design Principles

- **RESTful resource-oriented** — sessions, contributions, memories, reflections are resources
- **The bridge IS the API** — the current Next.js route → Python subprocess bridge should be replaced by a proper FastAPI service
- **JSON:API-style** — consistent `{ data, meta, errors }` envelope
- **Async-first** — FastAPI async handlers for all endpoints
- **Versioned** — `/api/v1/sessions/...`

### 9.2 Proposed Endpoints

```
BASE: /api/v1

── Session ───────────────────────────────────────────────────

GET    /sessions                    → List all sessions
GET    /sessions/{session_id}       → Get session (with items)
POST   /sessions                    → Create new session
PATCH  /sessions/{session_id}       → Update session (end it)
DELETE /sessions/{session_id}       → Delete session

── Contribution ──────────────────────────────────────────────

POST   /sessions/{session_id}/contributions
       Body: { text, source? }
       → Process contribution, return all artefacts

── Memory ────────────────────────────────────────────────────

GET    /sessions/{session_id}/memories          → List memories for session
GET    /sessions/{session_id}/memories/{id}     → Get single memory

── Reflection ────────────────────────────────────────────────

POST   /sessions/{session_id}/reflection     → Generate + return ReflectionSummary
GET    /sessions/{session_id}/reflection     → Get cached reflection (if exists)

── Concept Graph ─────────────────────────────────────────────

GET    /concepts                           → List all concepts
GET    /concepts/{concept_id}              → Get concept + neighbours
GET    /concepts/{concept_id}/neighbours   → Get graph neighbours

── Context ───────────────────────────────────────────────────

GET    /context/query?text=...             → Cross-session search

── Health ────────────────────────────────────────────────────

GET    /health                             → Bridge health
```

### 9.3 Response Envelope

```json
{
    "data": { ... },
    "meta": {
        "session_id": "...",
        "generated_at": "2026-07-01T12:00:00Z",
        "version": "1.0"
    },
    "errors": []
}
```

### 9.4 Bridge Migration Path

```
Phase 1 (Sprint 4): FastAPI runs alongside Next.js route
  - FastAPI starts as separate process on port 8000
  - Next.js route becomes thin proxy to FastAPI (no Python bridge)
  - Both coexist until frontend is migrated

Phase 2 (Sprint 5): FastAPI becomes primary API
  - Next.js route removed
  - Frontend calls FastAPI directly
  - Bridge process retired
```

---

## 10. Repository Interface Design

### 10.1 Protocol/Interface Definitions

```python
# agent_watson_shared/interfaces/repositories.py
from abc import ABC, abstractmethod
from typing import Optional, Protocol


class SessionRepository(Protocol):
    def create(self, session: "Session") -> "Session": ...
    def get(self, session_id: str) -> Optional["Session"]: ...
    def update(self, session: "Session") -> "Session": ...
    def delete(self, session_id: str) -> None: ...
    def list(self) -> list["Session"]: ...
    def get_active(self) -> Optional["Session"]: ...


class ContributionRepository(Protocol):
    def add(self, contribution: "Contribution") -> "Contribution": ...
    def list_by_session(self, session_id: str) -> list["Contribution"]: ...


class MemoryRepository(Protocol):
    def add(self, memory: "Memory") -> "Memory": ...
    def add_all(self, memories: list["Memory"]) -> list["Memory"]: ...
    def list_by_session(self, session_id: str) -> list["Memory"]: ...
    def list_by_type(self, memory_type: str) -> list["Memory"]: ...


class ConceptRepository(Protocol):
    def add(self, concept: "Concept") -> "Concept": ...
    def get(self, concept_id: str) -> Optional["Concept"]: ...
    def get_by_name(self, name: str) -> Optional["Concept"]: ...
    def list_all(self) -> list["Concept"]: ...
    def add_edge(self, edge: "ConceptEdge") -> "ConceptEdge": ...
    def get_connected(
        self, concept_id: str, min_weight: int = 1
    ) -> list[tuple["Concept", int]]: ...
    def get_neighbours(self, concept_id: str) -> list["Concept"]: ...


class ReflectionRepository(Protocol):
    def save_summary(
        self, session_id: str, summary: "ReflectionSummary"
    ) -> "ReflectionSummary": ...
    def get_summary(self, session_id: str) -> Optional["ReflectionSummary"]: ...


class ContextIndexRepository(Protocol):
    def index_memory(self, memory: "Memory", session_id: str, session_date: str) -> None: ...
    def search(self, query: str) -> list["ContextItem"]: ...
```

### 10.2 Implementation Strategy

```
Repository implementations:
├── InMemorySessionRepository         ← Current (move from SessionService._sessions dict)
├── InMemoryConceptRepository         ← Current (wrap ConceptGraph)
├── InMemoryRelationshipRepository    ← Current (wrap RelationshipRepository)
├── InMemoryContextIndexRepository    ← Current (wrap RetrievalService internals)
│
├── SqliteSessionRepository           ← Sprint 4
├── SqliteMemoryRepository            ← Sprint 4
├── SqliteConceptRepository           ← Sprint 4
├── SqliteReflectionRepository        ← Sprint 4
└── SqliteContextIndexRepository      ← Sprint 4
```

The in-memory implementations are **not thrown away** — they become the test doubles, making all engine tests fast and deterministic without database setup.

---

## 11. Technical Debt Register

### 11.1 Must Fix (Sprint 4)

| ID | Debt | Location | Effort | Impact |
|----|------|----------|--------|--------|
| TD-1 | **Duplicate reflection classes** | `memory/reflection_v2.py` + `reflection/` package | 1d | Two implementations will diverge. Remove `memory/reflection_v2.py` after confirming nothing imports it. |
| TD-2 | **No persistence** | All in-memory | 5d | Cannot ship without data survival. Implement SQLite repositories. |
| TD-3 | **`SessionService` instantiates all engines** | `memory/session.py` `__init__` | 2d | Impossible to unit test SessionService without testing all engines. Move instantiations to constructor params. |
| TD-4 | **No declared intra-package dependencies** | All `pyproject.toml` | 1d | Silent breakage in CI. Add `agent-watson-concept-graph`, `agent-watson-context`, etc. as explicit dependencies. |
| TD-5 | **`context/__init__.py` is empty** | `packages/context/` | 0.5d | Inconsistent with other packages. Add explicit exports. |
| TD-6 | **`DEV_MODE` hardcoded `true`** | `apps/web/src/app/page.tsx:13` | 0.5d | Dev panels visible in production. Use `process.env.NEXT_PUBLIC_DEV_MODE`. |
| TD-7 | **Bridge serialization inconsistency** | `packages/memory/bridge.py` + `use-session.ts` | 1d | `memories` and `reflections` sometimes serialized as JSON strings. Fix the bridge to always emit arrays. |
| TD-8 | **`BridgeResponse` and `TodayReflectionData` type duplication** | Frontend | 0.5d | Consolidate into `data/memories.ts`. |

### 11.2 Should Fix (Sprint 4 if time permits)

| ID | Debt | Location | Effort |
|----|------|----------|--------|
| TD-9 | **No error feedback on contribution failure** | `page.tsx` | 0.5d |
| TD-10 | **`end_session` never called** | Frontend | 0.5d |
| TD-11 | **`Any` types in `ReflectionContext`** | `reflection/domain/reflection_context.py` | 0.5d |
| TD-12 | **Unused Radix dependencies** | `apps/web/package.json` | 0.25d |
| TD-13 | **Unused `Button` component** | `components/ui/button.tsx` | 0.25d |
| TD-14 | **Empty `features/` directories** | Frontend | 0.25d |
| TD-15 | **Hardcoded "Ashish" in sidebar** | `sidebar.tsx` | 0.25d |

### 11.3 Deferred (Post-Sprint 4)

| ID | Debt | Reason |
|----|------|--------|
| TD-16 | **No error boundary** | Low risk for single-user app |
| TD-17 | **MemoryType enum overlaps with IntentType** | Intentional — they describe different things |
| TD-18 | **No observability/logging** | ADR-006 mentions audit logging — defer to AI integration |
| TD-19 | **Empty TS packages (`shared`, `ui`, `config`)** | Not causing harm; fill them when needed |
| TD-20 | **No mobile sidebar nav** | Single-user desktop-first MVP |
| TD-21 | **`getSession()` wrapper is unnecessary** | Harmless; fix during next frontend refactor |

---

## 12. Refactoring Opportunities

### 12.1 Extract `SessionOrchestrator` from `SessionService`

**Problem:** `SessionService` (215 lines) creates 6 internal services and handles 15 responsibilities.

**Solution:**

```python
# Before
class SessionService:
    def __init__(self, memory_service=None, relationship_engine=None):
        self._memory_service = memory_service or MemoryService(...)
        self._relationship_repo = RelationshipRepository()
        self._concept_graph = ConceptGraph()
        self._concept_graph_service = ConceptGraphService()
        self._concept_extractor = ConceptExtractor()
        self._sessions: dict[str, Session] = {}
        self._session_entries: dict[str, SessionEntry] = {}
        self._retrieval_service = RetrievalService(...)

# After
class SessionOrchestrator:
    def __init__(
        self,
        session_repo: SessionRepository,
        memory_service: MemoryService,
        relationship_engine: RelationshipEngine,
        relationship_repo: RelationshipRepository,
        concept_graph_service: ConceptGraphService,
        retrieval_service: RetrievalService,
        reflection_service: SessionReflectionService,
    ):
        ...

    def add_contribution(self, session_id: str, text: str) -> ContributionResult:
        # Pure orchestration — coordinates engines, owns no state
        ...
```

### 12.2 Extract Domain Models to Shared Package

**Problem:** Same entity types exist in multiple packages with different shapes (`Memory` vs `MemoryEntry`, `Session` vs `SessionEntry`).

**Solution:** Single `agent-watson-shared` package with all domain models. Each engine imports from shared.

### 12.3 Replace `Any` Types with Protocols

**Problem:** `SessionReflectionService` takes `Any` for `session_service`, `concept_graph`, `retrieval_service`.

**Solution:** Define `Protocol` classes:

```python
# agent_watson_shared/interfaces/services.py
class SessionServiceProtocol(Protocol):
    def get_session(self, session_id: str) -> "Session": ...
    def get_relationships(self, session_id: str) -> list["Relationship"]: ...

class ConceptGraphProtocol(Protocol):
    def get_all_concepts(self) -> list["Concept"]: ...
    def get_connected_concepts(self, concept_id: str, min_weight: int = 1) -> list[tuple["Concept", int]]: ...
```

### 12.4 Standardize on One Model Framework

**Problem:** Mixed use of Pydantic (`memory`, `concept_graph`) and dataclasses (`context`, `reflection`).

**Solution:** Standardize on Pydantic V2 across all packages. Pydantic provides:
- Runtime type validation
- JSON schema generation (for OpenAPI)
- `model_dump(mode="json")` serialization (already used by bridge)
- Future FastAPI integration

Sprint 4 should convert `context/models.py` and `reflection/domain/*.py` from dataclasses to Pydantic.

### 12.5 Consolidate Template Selection

**Problem:** Two independent template selection systems:
1. `memory/generator.py` — per-memory reflections (template + hash selection)
2. `reflection/services/reflection_engine.py` — session-level reflections (template + hash selection)

**Solution:** Keep both. They serve different purposes (per-memory vs per-session). But extract the hash selection logic into a shared utility.

### 12.6 Event Bus for Internal Communication

**Problem:** No observable events when memories are created, concepts linked, or reflections generated.

**Solution (optional, Sprint 5):**

```python
class EventBus:
    def emit(self, event: str, data: dict): ...
    def subscribe(self, event: str, handler: Callable): ...

# Events:
# "memory.created" → Growth engine, notification system
# "concept.linked" → Concept graph visualization
# "reflection.generated" → UI update, notification
# "session.ended" → Weekly review trigger
```

---

## 13. Proposed Folder Structure

### 13.1 Target: After Sprint 4

```
agent-watson/
├── apps/
│   ├── web/                     # Next.js frontend (unchanged)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── api/v1/      # Proxy to FastAPI (was /api/memory)
│   │       │   └── page.tsx     # Unchanged
│   │       ├── components/      # Unchanged
│   │       ├── data/memories.ts # Consolidated types
│   │       └── hooks/use-session.ts  # Updated to call FastAPI
│   │
│   └── cli/                     # CLI (populate in later sprint)
│
├── services/
│   └── api/                     # FastAPI service (promoted from placeholder)
│       └── src/
│           ├── main.py              # App factory, middleware, CORS
│           ├── routers/
│           │   ├── sessions.py      # /api/v1/sessions
│           │   ├── contributions.py # /api/v1/sessions/{id}/contributions
│           │   ├── memories.py      # /api/v1/sessions/{id}/memories
│           │   ├── reflections.py   # /api/v1/sessions/{id}/reflection
│           │   ├── concepts.py      # /api/v1/concepts
│           │   └── context.py       # /api/v1/context
│           ├── dependencies.py      # Dependency injection (get_orchestrator, get_repos)
│           ├── models.py            # Pydantic request/response schemas
│           └── exceptions.py        # Error handlers
│
├── packages/
│   ├── engine-memory/           # Memory extraction (renamed)
│   ├── engine-concept-graph/    # Concept graph (renamed)
│   ├── engine-context/          # Context retrieval (renamed)
│   ├── engine-reflection/       # Reflection V2 (renamed)
│   ├── engine-session/          # Session lifecycle (extracted)
│   │
│   ├── orchestrator/            # SessionOrchestrator (NEW)
│   │
│   ├── database/                # SQLite + repositories (promoted)
│   │   ├── migrations/          # Alembic
│   │   └── src/database/
│   │       ├── connection.py
│   │       ├── repositories/
│   │       │   ├── sqlite_session.py
│   │       │   ├── sqlite_memory.py
│   │       │   └── sqlite_concept.py
│   │       └── models.py        # SQLAlchemy ORM models
│   │
│   ├── shared-python/           # Shared Python models (promoted)
│   │   └── src/agent_watson_shared/
│   │       ├── models/
│   │       │   ├── session.py
│   │       │   ├── memory.py
│   │       │   ├── reflection.py
│   │       │   ├── relationship.py
│   │       │   ├── concept.py
│   │       │   └── context.py
│   │       └── interfaces/
│   │           ├── repositories.py
│   │           └── services.py
│   │
│   └── ...existing TS packages...
│
├── tests/
│   ├── e2e/                     # End-to-end tests
│   └── integration/             # Integration tests (orchestrator + repos)
│
└── docs/
    ├── adr/                     # Existing ADRs
    ├── api/                     # OpenAPI spec (generated)
    └── architecture/            # Architecture diagrams
```

### 13.2 Key Changes from Current Structure

| Change | Rationale |
|--------|-----------|
| `engine-` prefix for all engine packages | Consistent naming, flat listing groups engines together |
| `orchestrator/` package | Extracts god-object responsibilities from `SessionService` |
| `database/` promoted to full package | Sprint 4 needs persistence; it was a placeholder |
| `shared-python/` (was `shared/`) | Actually contains shared Python models, not empty stubs |
| Rename `shared/` (TS) to `shared-ts/` | Avoids confusion with Python shared package |
| `services/api/` promoted from placeholder | Becomes the primary API layer |
| Remove `packages/memory/src/memory/reflection_v2.py` | Dead code after Sprint 3 migration |

---

## 14. Sprint 4 Readiness Checklist

### 14.1 Must Do Before Sprint 4 Code Begins

- [ ] Remove `memory/reflection_v2.py` (or verify it is dead code)
- [ ] Add intra-package dependencies to all `pyproject.toml` files
- [ ] Populate `context/__init__.py` with explicit exports
- [ ] Replace `DEV_MODE` hardcoded flag with environment variable
- [ ] Fix bridge serialization inconsistency (memories as arrays always)
- [ ] Consolidate `BridgeResponse` and `TodayReflectionData` type definitions

### 14.2 Sprint 4 Deliverables

| Item | Priority | Description |
|------|----------|-------------|
| Database schema | P0 | Implement SQLite schema matching Section 8 |
| Repository interfaces | P0 | Define Protocol classes in shared package |
| InMemory → Sqlite repositories | P0 | Replace in-memory dicts with SQLite |
| SessionOrchestrator | P0 | Extract from SessionService |
| FastAPI service | P0 | Promot `services/api/` to functional API |
| REST endpoints | P0 | Implement per Section 9 |
| Frontend migration | P1 | Update `use-session.ts` to call FastAPI |
| Error handling | P1 | Contribution failure feedback in UI |
| `end_session` lifecycle | P1 | Call on `beforeunload` |
| Type consolidation | P1 | Fix duplicated types |
| Shared models package | P2 | Extract common domain models |
| Protocol types | P2 | Replace `Any` in reflection service |

### 14.3 Stretch Goals

- Event bus for cross-engine communication
- `session_reflections` cache table
- `context_index` denormalized search table
- Alembic migration framework setup
- Test doubles from in-memory repository implementations

---

## Appendix A: ADR Compliance Matrix

| ADR | Requirement | Current State | Compliant? |
|-----|-------------|---------------|------------|
| 001 | Session-first architecture | Sessions are primary unit | ✓ |
| 002 | Single-user | No `user_id` anywhere | ✓ |
| 003 | Hybrid data sovereignty | Not implemented (no persistence) | ⚠ Deferred |
| 004 | 6-layer memory | Working + Episodic implemented | ✓ (MVP scope) |
| 005 | Hybrid knowledge | Concept graph + relational catalog | ✓ (MVP scope) |
| 006 | AI architecture | Not implemented (Sprint 5) | ⚠ Deferred |
| 007 | Backend architecture | Next.js route + Python subprocess (not FastAPI monolith) | ❌ Needs migration |
| 008 | Storage architecture | SQLite not implemented | ❌ Sprint 4 |
| 009 | Embedding strategy | Not implemented | ⚠ Sprint 5 |
| 010 | Prompt architecture | Not implemented | ⚠ Sprint 5 |
| 011 | Mentor personality | Not implemented | ⚠ Sprint 5 |
| 012 | Growth engine | Not implemented | ⚠ Sprint 5 |
| 013 | Future evolution | Immutable event log not implemented | ⚠ Deferred |

---

*End of Architecture Review Report — prepared for Sprint 4 planning.*
