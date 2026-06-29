# ADR-003: Hybrid Data Sovereignty

**Status:** Accepted  
**Date:** 2026-06-29  
**Deciders:** Ashish (Product Owner), Principal Architect

---

## Context

Ashish works at DTCC. Work learning is a primary growth signal for Agent Watson, but employer data handling policies and personal privacy concerns make **cloud-first AI** unacceptable for candid mentorship about work. The SRS requires hybrid deployment: local encrypted vault + cloud inference when policy allows (FR-PRIV-01 through FR-PRIV-05, NFR-SEC-03).

Ashish also wants cloud LLM quality for reflection and mentorship on personal study (CAT, AI/DS) where privacy risk is lower. Pure local-only sacrifices mentorship quality; pure cloud sacrifices trust for work context.

## Problem Statement

We must decide **where data lives**, **what crosses the network**, and **who can read it** — not as an afterthought but as an architectural partition that the mentor pipeline respects on every inference call.

Failure modes:

1. **Accidental exfiltration** — work paragraph in cloud LLM prompt; trust destroyed permanently.
2. **Split brain** — memories in cloud that cannot be audited locally; Ashish cannot verify what Watson "knows."
3. **Offline incapacity** — no mentorship when internet drops; habit breaks.
4. **Cloud-first lock-in** — vault is sync client to SaaS DB; contradicts single-user local sovereignty.

## Decision

**Adopt hybrid data sovereignty with a local-first encrypted vault as the system of record, policy-gated cloud inference, and optional encrypted cloud backup for disaster recovery — never cloud-primary storage.**

### Three tiers of content

| Tier | Label | Storage | Cloud LLM | Cloud backup |
|------|-------|---------|-----------|--------------|
| **T0** | Local-only | Vault only | Blocked — local model or abstain | Blocked |
| **T1** | Cloud-OK | Vault (source of truth) | Allowed in assembled context | Allowed (encrypted) |
| **T2** | Public reference | Vault + may cite URLs | Allowed | Allowed |

**Defaults:** Work/DTCC discussion → T0 unless Ashish explicitly marks cloud-OK. Personal study → T1. Pasted public URLs → T2.

### Architectural rules

1. **Vault is source of truth** — conversation events, attachments, derived memory, embeddings index metadata all originate locally.
2. **Policy router is mandatory** — every LLM call passes through sensitivity assembly (ADR-010); T0 content never in cloud prompt payload.
3. **Cloud is compute and optional backup** — not authoritative database. Deleting cloud backup does not delete Watson's memory.
4. **Inference split** — cloud LLM for T1/T2 mentorship; local LLM (or template fallback) for T0-only sessions when needed.
5. **Backup is opt-in encrypted blob** — client-side encryption before upload; cloud stores opaque blobs; keys never on server.
6. **Auditability** — Ashish can inspect vault and "what was sent to cloud" logs for any mentor turn.

## Alternatives Considered

### A. Cloud-first (ChatGPT-style)

All data in provider or our cloud DB; local is cache.

**Rejected.** Violates SRS, DTCC risk, single-user local sovereignty. Provider retention policies are opaque.

### B. Local-only everything

No cloud LLM ever; Ollama/local models only.

**Rejected for MVP quality.** Mentorship quality on reflection and cross-domain synthesis materially benefits frontier models. Ashish's AI/DS growth benefits from strong models. T0 can use local; whole product on local-only caps mentor ceiling.

### C. E2E encrypted cloud vault with cloud inference on decrypted server

Server holds keys in HSM; decrypt for inference in cloud.

**Rejected.** Server sees plaintext at inference time. Unacceptable for T0 work content. T1 might use this pattern only if Ashish accepts — still worse than local vault for source of truth.

### D. Homomorphic / confidential compute inference

Encrypt data; infer without decryption.

**Rejected.** Immature, expensive, unavailable for practical mentorship at personal scale. Revisit in 3–5 years (ADR-013).

### E. Sync without inference (cloud backup only, all LLM local)

**Partial.** Valid fallback mode. Does not solve local model quality gap for T1 mentorship.

## Pros

- **Trust enables candor** — Ashish discusses work learning without cloud exposure default.
- **Best model for personal growth** — CAT/AI/DS mentorship uses frontier cloud models.
- **Offline habit** — read history, capture messages, T0 local inference when configured.
- **Disaster recovery** — encrypted backup without giving cloud readable memory.
- **Regulatory narrative** — "work stays on device" is simple and true for T0.

## Cons

- **Policy router complexity** — every retrieval path must tag tier; bugs are critical severity.
- **Split inference paths** — cloud vs local testing matrix doubles.
- **Context assembly harder** — cannot naively dump retrieved chunks; must filter by tier before cloud call.
- **Local LLM ops** — GPU/RAM requirements if T0 mentorship desired offline at quality.
- **Backup restore** — must restore vault + index + keys coherently.

## Trade-offs

| We gain | We sacrifice |
|---------|--------------|
| Work + personal in one mentor | Simple "send all to API" pipeline |
| Local auditability | Fully managed cloud simplicity |
| Frontier model quality on T1 | Uniform inference environment |

We trade **engineering rigor on data paths** for **mentorship across all life domains without splitting into two apps** (work journal local + study chat cloud).

## Future Implications

- **IDE/calendar connectors** must classify at ingest (ADR-009).
- **Second device sync** = encrypted blob sync of vault; policy tags preserved.
- **Voice in office** — T0 default for work talk; warn if cloud STT used.
- **Compliance audit** — export "cloud transmission log" per session for Ashish's review.

**Implementation guardrails (for future engineers):**

- Never add "debug mode" that logs full prompts to cloud analytics.
- Integration tests must include: T0 chunk in retrieval → cloud call → assert absent from HTTP payload.

## When This Decision Should Be Revisited

Revisit if:

1. **Local model quality** reaches parity with cloud for mentorship tasks — may shift more to local-only default.
2. **Ashish changes employers** or policy allows cloud processing of work summaries (not raw tickets).
3. **Confidential inference offerings** mature (Azure Confidential, etc.) with acceptable cost for personal use.
4. **Ashish drops work domain** from Watson — simplifies to cloud-OK default with local vault for habit/portability only.

Do **not** revisit to "simplify dev" by sending full context to cloud. That is a security regression, not simplification.
