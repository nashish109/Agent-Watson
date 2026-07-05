# ADR-009: Embedding Strategy

**Status:** Accepted  
**Date:** 2026-06-29  
**Deciders:** Ashish (Product Owner), Principal Architect

---

## Context

RAG (ADR-006) depends on retrieval quality. Knowledge is hybrid (ADR-005); memory is layered (ADR-004); content enters via conversation and attachments (ADR-001). Embeddings must respect tier tags (ADR-003) and support years of personal data with version discipline.

Poor chunking causes: wrong citations, missed connections, and mentor hallucination from irrelevant chunks.

## Problem Statement

Embedding strategy must answer:

1. **What gets embedded?** — raw messages, summaries, both?
2. **How are documents chunked?** — size, boundaries, overlap.
3. **When are embeddings created?** — inline vs background.
4. **When regenerated?** — model change, content edit, correction.
5. **How are versions managed?** — multiple embedding models over 5 years.

## Decision

### Dual-index embedding: episode chunks + semantic summaries

| Object | Source layer | Purpose |
|--------|--------------|---------|
| **Episode chunks** | Episodic | Cite what was said; narrative retrieval |
| **Semantic summaries** | Semantic extraction | Concept/skill retrieval; stabler than raw chat |
| **Attachment chunks** | Episodic (files) | PDF/code retrieval |

Do not embed wisdom/long-term layers directly at first — they are short; inject via relational lookup. Revisit if retrieval misses.

### Chunking rules

**Conversation messages:**

- Embed **per message** for short messages (<400 tokens).
- **Merge adjacent same-speaker turns** only when single message is fragmentary ("yes", "ok").
- Store full message text in catalog; chunk is retrieval unit.
- Attach `episode_id`, `speaker`, `timestamp`, `tier`, `session_id` metadata — never embed without metadata.

**Attachments (PDF, markdown, code):**

- **Structure-aware chunking** — headings, functions, pages as soft boundaries.
- Target chunk size: **400–800 tokens** with **10–15% overlap** between adjacent chunks.
- **Minimum chunk:** 100 tokens unless whole doc smaller — merge tiny tail into previous.
- **Code:** chunk by function/class or logical cell; include file path in metadata.
- **Tables:** prefer whole table or row groups — never split mid-row without header repeat.

**Do not chunk:**

- Binary images without OCR — OCR first or skip embed until text extracted.
- Encrypted T0 blobs without decrypted text path for cloud embedder — local embed only.

### Embedding generation timing

| Event | Action |
|-------|--------|
| User message persisted | Queue episode chunk embed (background) |
| Attachment ingested | Parse → chunk → queue embeds |
| Semantic extraction completes | Embed new/updated semantic summary |
| User correction changes semantic | Re-embed affected semantic summary only |
| Model version change | Background re-embed migration job |

**MVP:** Background embedding acceptable 5–30s delay; mentor turn retrieves last-known index + recent unembedded text from working memory if index lags.

### Regeneration triggers

Re-embed when:

1. **Embedding model version changes** (registry bump).
2. **Chunk text changes** (correction, re-extraction).
3. **Tier tag changes** — metadata update; re-embed if embedder path differs (local vs cloud embed API).
4. **Attachment re-parsed** (better parser version).

Do **not** re-embed entire vault on every app upgrade — only affected chunks via registry diff.

### Embedding version management

**Embedding registry** (relational catalog):

- `model_id` — e.g., `text-embedding-3-small@v1`, `nomic-embed-local@v1`
- `dimensions`, `provider`, `local_only` flag
- `active_for_tier_T0`, `active_for_tier_T1`

Each chunk record stores: `chunk_id`, `content_hash`, `embedding_model_id`, `embedded_at`.

**Migration policy:**

- New model → mark active; background job re-embeds; dual-query during transition (old + new) with merge rerank — or freeze old index read-only until migration % complete.
- Never delete old vectors until migration validated on sample queries.
- Ashish config: choose embed provider; defaults local for T0 paths.

**Cloud embed API:** only for T1/T2 text if Ashish accepts text leaving device for embedding — alternative: **all embeddings local** (preferred for consistency with ADR-003). **Decision:** **default local embedding** for all tiers; cloud embed optional convenience only.

## Alternatives Considered

### A. Embed only summaries (no raw episodes)

**Rejected.** Citations need verbatim episode retrieval; summaries lose nuance for mentorship evidence.

### B. Fixed 512-token blind split

**Rejected.** Splits mid-thought, breaks code and PDF structure; hurts citation quality.

### C. Embed on every mentor turn (no persistence)

**Rejected.** Cost and latency; no stable index for growth metrics.

### D. Single embedding model forever

**Rejected.** Models improve; registry required for 5-year horizon (ADR-013).

### E. Cloud-only embedding service

**Rejected as default.** T0 text would need local embed path regardless.

## Pros

- **Citation fidelity** — episode chunks map to exact turns.
- **Tier-safe** — metadata filters before cloud mentor assembly.
- **Controlled migrations** — version registry prevents silent recall collapse.
- **Structure-aware** — better for Ashish's PDFs and code learning.

## Cons

- **Storage growth** — dual index + overlap + version transition duplicates.
- **Background job complexity** — queue, retry, lag handling.
- **Local embed CPU** — batch during idle or accept delay on laptop.
- **Parser quality dependency** — bad PDF parse → bad chunks.

## Trade-offs

| We gain | We sacrifice |
|---------|--------------|
| Retrieval precision | Storage and CPU |
| Safe tier filtering | Instant embed on send |
| Model upgradability | Migration periods |

## Future Implications

- Reranker model (cross-encoder) as second stage — ADR-006 retrieval upgrade without re-embed.
- Chunk quality eval: sample mentor turns, measure citation accuracy.
- IDE plugin sends code with path metadata — chunk rules extend automatically.
- Graph nodes link to semantic summary IDs — retrieval expands to neighbors.

**SRS note:** Supports FR-MEM-04 provenance and FR-SEC-02 search without SRS change.

## When This Decision Should Be Revisited

Revisit if:

1. **Local embed latency** unacceptable on Ashish's hardware — cloud embed for T1 only with explicit opt-in.
2. **Multimodal** (images, diagrams) become primary — image embedding model + ADR-014.
3. **Chunk eval** shows structure-aware rules insufficient — domain-specific chunkers (CAT problems vs code).
4. **Single embedding model** achieves such dominance that migration rare — simplify registry but keep `content_hash`.

Do not skip versioning because "we only have one model today."
