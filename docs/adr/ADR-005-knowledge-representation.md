# ADR-005: Knowledge Representation

**Status:** Accepted  
**Date:** 2026-06-29  
**Deciders:** Ashish (Product Owner), Principal Architect

---

## Context

Memory layers (ADR-004) need a **representation** — how facts, episodes, and relationships are stored and queried. Agent Watson must support: provenance citations, cross-domain links (DTCC skill ↔ CAT quant), semantic search over paraphrases, mastery/staleness metadata, and tier tags (ADR-003).

The SRS requires hybrid retrieval (FR-SEC-02), provenance (FR-MEM-04), and cross-domain linking (FR-MEM-07). Representation choice affects every downstream ADR (embeddings, prompts, growth engine).

## Problem Statement

Each representation paradigm solves part of the problem:

- **Vectors** — similarity search, paraphrase, "what's related?"
- **Graph** — explicit relationships, prerequisites, goal→skill→concept paths
- **Relational** — structured metadata, timelines, tier tags, mastery enums, audit queries

Choosing only one leads to:

- Vector-only: relationships hallucinated; SQL audits impossible; mastery is guesswork.
- Graph-only: episode text retrieval awkward; every message as node explodes.
- Relational-only: "that thing about eigenvalues" fails without exact keywords.

We need a **hybrid representation** with clear ownership: which store answers which question.

## Decision

**Adopt a hybrid knowledge representation: relational metadata as the authoritative catalog, episodic/semantic content in searchable text stores with vector indexes, and a lightweight concept graph for relationships — unified by stable entity IDs and provenance pointers.**

### Three stores, one logical model

| Store | Answers | Holds |
|-------|---------|-------|
| **Relational catalog** | When? What tier? What mastery? What goal? | Episode IDs, timestamps, tier tags, mastery states, goal links, growth move outcomes, embedding version IDs, correction audit |
| **Vector index** | What text is semantically similar? | Chunk embeddings for episodes, attachments, semantic summaries — filtered by metadata |
| **Concept graph** | How are ideas connected? | Nodes: concepts, skills, goals, projects. Edges: prerequisite, related_to, applied_in, supports_goal — with confidence and episode evidence |

**Unified ID discipline:** Every extractable unit has a stable ID. Vector chunks point to episode IDs. Graph nodes point to semantic records. Mentor citations use IDs → resolve to text for display.

### Query patterns

| Mentor need | Primary store | Secondary |
|-------------|---------------|---------|
| "What happened Tuesday?" | Relational (time) + episodic text | Vector if vague query |
| "What do I know about X?" | Vector + semantic records | Graph neighbors |
| "What's stale for CAT?" | Relational (mastery + last_touched) | — |
| "How does X connect to career goal?" | Graph path | Vector for nuance |
| "Cite evidence for claim" | Episode IDs from semantic/graph | Episodic text |
| "Cloud-safe retrieval only" | Relational tier filter before vector | — |

### What we do NOT do

- **No RDF/OWL enterprise ontology** — too heavy for solo builder.
- **No single giant graph of every message** — messages are episodes; graph holds abstractions.
- **No duplicate truth** — mastery lives in relational catalog; graph nodes reference it.

## Alternatives Considered

### A. Vector search only

**Rejected.** See ADR-004. Cannot implement staleness, tier routing, or structured growth metrics without metadata tables.

### B. Knowledge graph only (Neo4j-style)

**Rejected as primary.** Excellent for relationships but poor as vault audit store and attachment manager. Adds ops burden. Use minimal graph layer, not all-in graph DB necessarily — adjacency in relational + graph queries for MVP may suffice.

### C. Document store only (Mongo, etc.)

**Rejected.** Loses relational integrity for timelines, tiers, corrections. Ashish's audit needs are relational.

### D. Full triple store with reasoning

**Rejected.** Overkill; reasoning via LLM + graph traversal is enough.

### E. Notebook / markdown files as source of truth

**Rejected.** Provenance, tier tags, and retrieval composition become file-grep hacks. Files live in vault as **artifacts**; catalog indexes them.

## Pros

- **Right tool per query** — fast staleness lists without embedding search.
- **Policy router integration** — tier filter in relational layer before any cloud-bound text assembly.
- **Cross-domain mentorship** — graph paths surface non-obvious connections.
- **Correction model** — update semantic record + graph edge confidence without deleting episodes.
- **Evolvable** — can add graph DB later if adjacency queries hurt; IDs stable.

## Cons

- **Consistency work** — extraction must update relational + vector + graph coherently.
- **Three indexes to rebuild** on corruption — mitigated by event-sourced episodes (immutable).
- **Mental overhead** — engineers must know which store to query.
- **Graph sparsity early** — few nodes first months; mentorship relies more on episodic + vector until graph densifies.

## Trade-offs

| We gain | We sacrifice |
|---------|--------------|
| Mentor-grade queries | Single-database simplicity |
| Audit + privacy filters | Naive "one embedding table" |
| Explicit relationships | Zero-schema flexibility |

We trade **storage purity** for **mentorship query coverage**.

## Future Implications

- ADR-009: chunks carry `entity_id`, `episode_id`, `tier`, `layer` metadata in relational sidecar.
- ADR-010: retrieval orchestrator queries relational → vector → graph in sequence with budget.
- ADR-012: growth signals read relational mastery deltas + graph connection counts.
- Vault UI: browse relational catalog; drill to episode text and graph neighborhood.

**MVP simplification:** Concept graph as **relational adjacency tables** (node, edge, confidence) — migrate to graph DB only if path queries exceed ~100ms or graph visualization ships.

**SRS alignment:** Implements FR-MEM-02, FR-MEM-07, FR-SEC-02 without SRS change.

## When This Decision Should Be Revisited

Revisit if:

1. **Adjacency queries** dominate latency — evaluate embedded graph DB (SQLite extensions, Kùzu, etc.).
2. **Graph remains empty** after 6 months — reduce extraction to relational + vector; graph deferred.
3. **Managed RAG product** offers hybrid with export — compare total cost vs own hybrid.
4. **Ashish needs visual graph browse** (SRS P1) — graph representation must support UI export.

Do not collapse to vector-only when relational queries are "working fine" — that's the catalog doing its job, not redundancy.
