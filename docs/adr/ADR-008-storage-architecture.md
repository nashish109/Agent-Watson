# ADR-008: Storage Architecture

**Status:** Accepted  
**Date:** 2026-06-29  
**Deciders:** Ashish (Product Owner), Principal Architect

---

## Context

ADR-003 establishes local-first vault as source of truth. ADR-005 defines hybrid relational + vector + graph representation. ADR-002 removes cloud-primary multi-user DB. Ashish runs Windows 10; data must survive years, support offline use, and optional encrypted disaster recovery.

## Problem Statement

Storage decisions:

1. **Structured metadata** — episodes, tiers, mastery, goals, audit logs.
2. **Raw artifacts** — PDFs, images, code files, exports.
3. **Vector indexes** — embeddings with metadata filters.
4. **Backup** — without readable cloud copy of T0 data.
5. **Avoid** — cloud-primary (Notion-like), managed DB dependency for daily use, opaque proprietary vault.

## Decision

### SQLite for local structured data

**Use SQLite as the local relational catalog** — episodes, semantic records, graph edges, growth signals, embedding registry, policy logs, configuration.

**Why SQLite:**

- **Single file** — backs up with vault copy; Ashish can see `watson.db` in vault folder.
- **Zero ops** — no Postgres install on Windows for personal app.
- **Sufficient scale** — millions of rows for one user's lifetime is fine with indexes.
- **Relational integrity** — FKs for provenance, tier tags, mastery enums (ADR-005).
- **Full-text search (FTS5)** — supplementary keyword retrieval without second engine.
- **Portable** — ADR-002 single-user; SQLite is the right default.

**When SQLite strains:** vector search at scale — vectors in separate index (below), not SQLite blobs at volume.

### Filesystem vault for raw artifacts

**Store raw attachments and exports as files under a vault directory tree** with content-addressed or UUID paths; SQLite holds pointers + metadata.

**Why filesystem:**

- **Transparency** — Ashish can open `vault/attachments/` in Explorer.
- **Large binaries** — PDFs, notebooks don't belong in DB blobs.
- **Tool interoperability** — symlink, grep files, antivirus scan.
- **Encryption option** — encrypt vault folder or sensitive subtrees at OS or application level (ADR-003).

**Layout principle:** `vault/` contains `db/`, `attachments/`, `indexes/`, `logs/` — one root Ashish backs up.

### Vector index separate from SQLite (embedded)

**Use an embedded vector store** (e.g., LanceDB, Chroma, sqlite-vec) colocated in vault `indexes/` — not a cloud vector SaaS.

Vectors reference `chunk_id` → relational catalog. Rebuild index from catalog + files if corrupted.

### Optional encrypted cloud backup

**Opt-in:** periodic upload of encrypted vault snapshot (or `db + attachments` tarball) to object storage (S3, B2, personal Drive via rclone).

- **Client-side encryption** — key derived from Ashish's passphrase or OS keychain; cloud sees noise.
- **Not sync** — backup is snapshot/restore, not live cloud DB master.
- **T0 included** in backup blob — Ashish owns encrypted blob; cloud cannot read.
- **Restore tested** quarterly — personal ops discipline.

### Avoid cloud-first storage

**Do not** use:

- Cloud DB as source of truth (Supabase/Firebase primary).
- Provider-hosted "memory APIs" as authoritative store.
- iCloud-only implicit sync without encryption control.

Cloud object storage for **encrypted backup only** is acceptable.

## Alternatives Considered

### A. PostgreSQL local

**Rejected for MVP.** More ops than SQLite for zero benefit at single-user scale. Revisit if concurrent writers or advanced graph SQL needed.

### B. All-in SQLite including vectors as BLOBs

**Rejected at scale.** Embedding dimensions × millions of chunks hurts; dedicated ANN index performs better.

### C. Markdown files as primary memory

**Rejected.** ADR-005 — catalog + provenance need relational layer.

### D. Cloud vector DB (Pinecone, etc.)

**Rejected.** Network dependency, cost, tier data residency concerns, vendor lock for core retrieval.

### E. Single encrypted SQLite + no file vault

Store PDFs as blobs.

**Rejected.** Poor tooling, huge DB, hard manual audit.

## Pros

- **Inspectable vault** — trust through transparency.
- **Offline-first** — SQLite + local index + files work disconnected.
- **Simple backup** — copy folder + optional encrypted offsite.
- **Low cost** — no managed DB bills.
- **Aligns with hybrid sovereignty** — cloud optional, not required.

## Cons

- **Windows path/backup discipline** — Ashish must not delete vault casually.
- **SQLite write concurrency** — one writer; fine for single user, batch ingestion carefully.
- **Index consistency** — vector index can drift from catalog; need rebuild tooling.
- **No multi-device live sync in MVP** — backup restore is manual or scripted.

## Trade-offs

| We gain | We sacrifice |
|---------|--------------|
| Sovereignty | Real-time multi-device sync |
| Zero DB ops | Managed DB convenience |
| File transparency | Single-file simplicity |

## Future Implications

- WAL mode + backup API for hot snapshots.
- `sqlite-vec` may collapse vector into SQLite — evaluate if ANN performance adequate.
- Second device: encrypted blob sync + restore on other machine — not live replication (ADR-013).
- Vault export for migration: entire `vault/` directory is the portability unit.

**Encryption detail (deferred to implementation ADR):** OS-level (BitLocker) + app-level sensitive fields vs full-vault encryption — minimum app-level for cloud backup keys.

## When This Decision Should Be Revisited

Revisit if:

1. **SQLite file >50GB** or write latency hurts — evaluate Postgres local or SQLite sharding by year.
2. **Real-time two-device sync** required — add sync protocol; still local-first, not cloud-primary.
3. **Embedded vector index** fails recall benchmarks — swap index engine; catalog IDs unchanged.
4. **Ashish moves vault to NAS** — path config + latency testing.

Do not move to cloud-primary because "SQLite feels amateur" — it is correct for personal scale.
