# ADR-002: Single-User Architecture

**Status:** Accepted  
**Date:** 2026-06-29  
**Deciders:** Ashish (Product Owner), Principal Architect

---

## Context

Agent Watson v1 serves exactly one person: Ashish. The SRS v2.0 removed multi-tenant SaaS, enterprise connectors, billing, team spaces, and admin consoles. Assumption A-10 states the product may never need multi-user features.

Despite this, engineering instincts push toward tenant IDs, user tables, auth middleware, and horizontal scaling patterns "for later." This ADR records why we **optimize for one rich relationship** instead of **optimize for hypothetical scale**.

## Problem Statement

Multi-user-ready architecture imposes cost on every layer:

- Auth, session management, and ACL checks on every read/write.
- `tenant_id` / `user_id` on every table and index — complicating queries and migrations.
- Isolation testing, rate limits, quota tiers, and abuse prevention.
- Deployment complexity: always-on cloud service vs. personal machine.
- Product ambiguity: features designed for "users" dilute mentorship depth (generic onboarding, empty states).

For a personal mentor running on Ashish's Windows machine with optional cloud inference, this overhead does not buy value today and slows the solo builder. We must decide where to place the **simplicity boundary**.

## Decision

**Design exclusively for a single user with no tenant model in v1. Optimize for one person's data over decades, one machine (+ optional backup), one developer operating the system.**

Concretely:

- **No user accounts, roles, or tenant isolation** in MVP or v1 personal scope.
- **No billing, quotas per tenant, or admin APIs.**
- **Process model:** single deployment bound to Ashish's environment; not a multi-customer hosted service.
- **Data model:** no `user_id` column convention; the database *is* Ashish's brain. If multi-user ever happens, it is a **fork or v2 product**, not a flag flip.
- **Security model:** OS-level access control (Ashish's login encrypts vault) rather than application-level multi-user ACLs.
- **Scaling model:** vertical — better disk, RAM, summarization — not horizontal sharding.
- **API auth (if local server):** simple local token or bind-to-localhost; not OAuth-for-SaaS.

**Explicit non-goal:** "We might need SaaS someday" is not a reason to add tenant scaffolding in v1.

## Alternatives Considered

### A. Multi-tenant-ready from day one (`user_id` everywhere)

Industry default for "serious" products.

**Rejected.** Pays 15–30% complexity on every feature for a user count of 1. Violates SRS constraints (§7.1). Creates false confidence that SaaS is planned — invites scope creep.

### B. Single-user now, light tenant scaffolding (nullable `user_id`)

"Doesn't hurt to add the column."

**Rejected.** Still affects index design, migration discipline, and mental overhead. Engineers start writing generic queries. The column becomes technical debt that never enabled a second user.

### C. Separate databases per future user (multi-tenant via isolation)

Each user gets own SQLite file if product expands.

**Deferred as v2 pattern.** Valid if Ashish ships to family/friends; not needed for Ashish-only v1. Easier migration than retrofitting row-level tenancy.

### D. Hosted single-user SaaS (one customer, cloud deployment)

Ashish's instance in cloud with login.

**Rejected for v1.** Conflicts with hybrid sovereignty (ADR-003) and DTCC privacy defaults. Ashish's data should live on his machine first.

## Pros

- **Maximum velocity** — solo builder ships conversation + memory loop without auth stories.
- **Simpler mental model** — "Watson knows Ashish" not "user 1 of N."
- **Privacy by default** — no server holding multiple people's memories.
- **Honest product** — architecture matches SRS truth; no investor-demo SaaS pretense.
- **Query performance** — no tenant filter on every index scan; personal data scale is modest.
- **Backup/restore** — copy one vault directory; no per-user export orchestration.

## Cons

- **v2 multi-user requires migration** — if product pivots to SaaS, add tenancy layer or database-per-user split. Non-trivial but bounded.
- **No "share my Watson"** — cannot grant read access to a coach without export hacks.
- **Cloud sync is device backup** — not account sync across identity providers (until designed explicitly).
- **Code reuse for SaaS** — some modules (LLM client, memory extraction) reuse; deployment and data layers do not.

## Trade-offs

| We gain | We sacrifice |
|---------|--------------|
| Speed to mentorship MVP | SaaS-ready boilerplate |
| Deep personalization | Generic onboarding patterns |
| Local-first simplicity | Built-in collaboration |
| Zero tenancy bugs | Easy pivot to B2B |

We trade **optionality for scale** for **depth for one human**. This is correct when the mission is personal growth, not market capture.

## Future Implications

- **Second machine sync** (SRS Phase 4) = encrypted blob sync between Ashish's devices, not account system.
- **Family/friends expansion** = likely **separate vault instances** or ADR-014 for database-per-user installer — not row-level multi-tenancy in one DB.
- **Open-source release** = each clone is single-user; no shared hosted service implied.
- **Modules stay portable** — conversation engine, RAG pipeline, mentor contract (ADR-011) could embed elsewhere; Ashish's vault does not.

**SRS recommendation (not SRS edit):** Document in onboarding docs: "Agent Watson is personal software, not a service."

## When This Decision Should Be Revisited

Revisit if:

1. **Ashish explicitly wants to onboard another person** with shared or separate mentorship — design ADR-014 (multi-instance vs. multi-user).
2. **Commercial distribution** as hosted product becomes a goal — expect v2 architecture, not incremental `user_id`.
3. **Legal requirement** to separate identities on same machine (unlikely for personal use).
4. **Data scale** exceeds single-machine retrieval (ADR-004, ADR-009) — address with summarization, not multi-tenant sharding.

Do **not** revisit because investors, tutorials, or frameworks assume multi-tenancy.
