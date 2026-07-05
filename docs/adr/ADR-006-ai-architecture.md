# ADR-006: AI Architecture

**Status:** Accepted  
**Date:** 2026-06-29  
**Deciders:** Ashish (Product Owner), Principal Architect

---

## Context

Agent Watson's mentorship is LLM-mediated: grounded openings, reflection, growth moves, memory extraction, and correction handling all use language models. ADR-003 splits cloud vs local inference by tier. ADR-004 requires extraction and compression pipelines. ADR-001 requires every capability to survive in conversation.

We must decide the **AI strategy**: fine-tune vs retrieve, monolithic prompts vs assembled context, single provider vs portable.

## Problem Statement

### Fine-tuning temptation

"Train Watson on Ashish's data so it knows him."

Problems:

- Ashish's life changes weekly — fine-tuned weights stale; expensive refresh cycle.
- Work data (T0) cannot enter cloud fine-tuning pipelines without policy violation.
- Solo builder cannot operate training infra, eval, and regression for personal model.
- Merges memory into opaque weights — loses provenance ("why does Watson think this?").
- Provider lock-in deepens — weights tied to one vendor format.

### Naive RAG temptation

"Retrieve top-5 chunks; paste into prompt."

Problems:

- No layer-aware retrieval (ADR-004).
- No tier filtering (ADR-003) — security bug.
- Context overload (ADR-010).
- Mentorship becomes "summarize my notes" not mentor behavior (ADR-011).

### Single-provider temptation

"Just use OpenAI everywhere."

Problems:

- Memory outlives model; Ashish's vault is decades — vendor may change terms, pricing, or capability.
- Local fallback for T0 requires second path anyway.

## Decision

**Use Retrieval-Augmented Generation (RAG) with structured context assembly as the core AI pattern. Do not fine-tune foundation models for MVP or v1. Keep LLM providers interchangeable behind a thin inference abstraction. Separate inference roles: mentor, extractor, compressor — each with tuned assembly, possibly different models.**

### RAG, not fine-tuning

| Aspect | RAG + memory layers | Fine-tuning |
|--------|---------------------|-------------|
| Freshness | New conversation updates retrieval immediately | Retrain or adapter refresh |
| Provenance | Citations from episodes | Black box |
| T0 work data | Stay local; never in training | Policy nightmare |
| Cost | Pay per turn | Pay per training + inference |
| Solo builder | Pipeline engineering | ML ops |

**Exception path (future):** Optional **local LoRA** on open models for **mentor tone** only — not for storing facts. Facts stay in vault (ADR-013). Never fine-tune on T0 without explicit air-gapped pipeline.

### Context assembly (not monolithic prompt)

Mentor inference receives **assembled packages** built by orchestrator (ADR-010):

1. Mentor behavioural contract (ADR-011) — stable system layer.
2. Working memory — recent turns.
3. Retrieved episodic evidence — cited IDs.
4. Semantic snapshot — active goals, stale list, relevant mastery.
5. Procedural hints — if coaching study process.
6. Long-term/wisdom snippets — only in depth mode.
7. User message.

Assembly is **policy-filtered** (tier), **budget-limited** (tokens), and **logged** for audit.

### Interchangeable LLM providers

**Inference abstraction** exposes:

- `complete(messages, model_hint, tier_policy, max_tokens)` 
- Provider plugins: OpenAI, Anthropic, local Ollama, etc.
- **Model hints per role:** mentor (quality), extractor (cheap/fast), compressor (long context).

Switching provider changes inference, **not** vault schema or memory IDs.

**Configuration, not code forks:** provider + model names in config Ashish controls.

### Three inference roles

| Role | When | Model bias |
|------|------|------------|
| **Mentor** | User-facing response | Quality, nuance |
| **Extractor** | Post-turn memory update | Fast, structured output |
| **Compressor** | Weekly/monthly summaries | Long context, cheap |

Roles may share provider; different models acceptable.

## Alternatives Considered

### A. Fine-tune GPT on conversation export

**Rejected** for reasons above. Revisit only for local tone adapter (ADR-013).

### B. No RAG — huge context window only ("just send everything")

**Rejected.** 5 years of dialogue exceeds windows; expensive every turn; tier filtering still needed; latency unacceptable.

### C. Agentic tool loop (ReAct) as primary

Model decides what to retrieve each step.

**Partial.** Useful for complex research questions. **Rejected as default** for daily mentorship — slower, costlier, harder to audit. Daily conversation uses **deterministic retrieval plan** (ADR-010) with optional agentic mode for "deep research" P1.

### D. Single model for all roles

**Rejected for cost/latency.** Extractor on frontier model every message wastes money.

### E. Rules-based mentor (no LLM)

**Rejected.** Cannot deliver SRS mentorship quality — synthesis, connection, tone.

## Pros

- **Memory is inspectable** — Ashish sees what Watson retrieved.
- **Immediate updates** — correction changes next retrieval, not next training run.
- **Privacy tiers enforceable** — assembly layer blocks T0 from cloud payload.
- **Vendor mobility** — swap Claude for GPT without vault migration.
- **Incremental cost** — pay for mentorship turns, not continuous training.

## Cons

- **Retrieval quality is the product** — bad retrieval = bad mentor even with GPT-4.
- **Latency stack** — retrieve + assemble + generate > single generate.
- **Extraction errors** — wrong entity in semantic layer hurts until corrected.
- **No "magic knowing"** — Watson must cite; feels less omniscient than fine-tune fantasy.

## Trade-offs

| We gain | We sacrifice |
|---------|--------------|
| Auditable mentorship | Illusion of innate knowledge |
| Local T0 path | Single inference endpoint |
| Long-term vault value | Custom model moat |

We trade **opaque personalization** for **transparent memory** — correct for trust-based mentorship.

## Future Implications

- Eval harness: retrieval precision, citation accuracy, tier leak tests — CI gates.
- Caching: assembled context for multi-turn within session if goals unchanged.
- Local model path grows as open weights improve — cloud becomes optional for T1 too.
- Compressor role critical at year 2+ data scale.

**SRS recommendation:** Add non-functional "mentor eval suite" when P1 — not SRS change, engineering practice.

## When This Decision Should Be Revisited

Revisit if:

1. **Frontier context windows** reach full vault size at low cost — still keep catalog for staleness/tiers; may reduce retrieval complexity.
2. **On-device models** match cloud mentor quality for Ashish's tasks — shift default inference local.
3. **Fine-tuning APIs** offer private, no-retention, per-user adapters with local trigger — evaluate for tone only.
4. **Retrieval ceiling** — mentor quality plateaus despite good prompts — invest in graph + rerankers before fine-tuning facts.

Never fine-tune facts into weights while provenance remains an SRS requirement.
