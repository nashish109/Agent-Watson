# ADR-001: Conversation-First Architecture

**Status:** Accepted  
**Date:** 2026-06-29  
**Deciders:** Ashish (Product Owner), Principal Architect

---

## Context

Agent Watson is defined in the SRS as a **personal AI Mentor**, not a productivity platform. The product's mission is daily growth through learning from work, study, projects, and goals. The SRS explicitly positions the **Daily Conversation** as the product — memory, ingestion, retrieval, and goals exist to make that conversation worth having every day.

Ashish's stated frustrations include dashboards to maintain, activity-log forms, and tools that feel like ChatGPT with amnesia. His target ritual is: open Watson, talk 5–20 minutes, leave with clarity and one growth move.

The architecture must encode this product truth at the highest level: if a capability cannot be reached or expressed through conversation for routine use, it is secondary or deferred.

## Problem Statement

Software architectures default to **CRUD-first** or **dashboard-first** patterns: entities (goals, memories, activities) get screens, APIs, and navigation. For a mentorship product, this creates three failures:

1. **Capture friction** — separate "logging" steps compete with the habit; users stop feeding the system.
2. **Insight fragmentation** — reflection and recommendations live on different screens than capture; the mentor feels like a report generator, not a relationship.
3. **Architectural drift** — every new domain (CAT, DTCC, AI/DS) spawns new UI surfaces; the product becomes a suite, not a mentor.

We must decide whether conversation is the **primary integration boundary** for user-facing behavior, or merely one client among many (dashboard + forms + chat).

## Decision

**Conversation is the primary interface and the primary integration boundary for all routine user-facing behavior.**

Concretely:

- The **Daily Conversation** is the default and sufficient surface for: capture, reflection, growth moves, goal updates, corrections, search-as-dialogue, and domain mentorship (CAT, work, AI/DS).
- All user actions that affect mentorship quality flow through **conversation events** (messages, attachments, accept/defer signals) as the canonical input stream.
- Secondary surfaces (minimal vault browse, CLI) exist for **audit, power capture, and trust verification** — not for daily growth workflow.
- Backend modules are organized to serve **one outbound path**: assemble mentor context → generate mentor response → extract memory updates — triggered by conversational turns.
- No MVP dependency on standalone dashboards, goal-management screens, or analytics pages.

Information architecture follows **dialogue state**, not **entity management screens**.

## Alternatives Considered

### A. Dashboard-first with chat assistant

Primary UI: goals board, activity timeline, recommendation inbox. Chat is a sidebar helper.

**Rejected.** Matches productivity-app mental model. Ashish explicitly rejected dashboards. Growth moves become tasks; mentorship becomes notification noise. SRS FR-SEC-05 forbids this for MVP.

### B. Multi-modal parity (conversation + forms equally weighted)

User chooses form or chat for each action.

**Rejected.** Duplicates capture paths; memory provenance diverges; habit never stabilizes. Two ways to do everything = one way nobody uses consistently.

### C. CLI-first for power user

Terminal as primary; web chat secondary.

**Rejected for MVP.** Ashish is technical but mentorship is emotional and reflective — a conversational UI fits better. CLI deferred as P1 capture channel (ADR-007, SRS FR-SEC-03).

### D. Voice-first

Speech as primary input.

**Deferred to P1.** Aligns with conversation-first but adds STT dependency and privacy considerations for work talk in open environments. Conversation-first does not require voice-first.

## Pros

- **Habit alignment** — one ritual, one surface; matches SRS North Star (Daily Growth Conversation).
- **Unified event stream** — every mentorship input is a conversation event; memory pipeline has single ingress.
- **Forces simplicity** — new features must answer "how does Watson say this in dialogue?" before "what screen do we add?"
- **Mentor coherence** — reflection and recommendation share the same turn as capture; no async "report generated elsewhere."
- **Reduced UI scope for solo builder** — one excellent chat experience vs. many mediocre screens.

## Cons

- **Structured data is messier** — goals, mastery states, and classifications are inferred from language, not validated forms. Requires robust extraction and correction loops.
- **Search/discovery is harder** — no browse-first knowledge UI in MVP; user must ask Watson or use vault audit view.
- **Testing mentorship quality** — harder to unit-test than CRUD; requires eval harnesses for dialogue quality.
- **Long sessions** — very long conversations challenge context assembly (addressed in ADR-010).
- **Accessibility of structure** — users who want spreadsheets of progress get inference-based narrative instead (by design).

## Trade-offs

| We gain | We sacrifice |
|---------|--------------|
| Relationship-shaped product | Entity-management ergonomics |
| Low daily friction | Immediate visual analytics |
| Single event pipeline | Form-validated data entry |
| Focused MVP scope | Feature parity with KM tools |

We explicitly trade **visibility** (dashboards) for **intimacy** (mentor dialogue). Growth is felt in conversation, not charts — consistent with SRS §11.

## Future Implications

- **New domains** (calendar context, IDE capture) inject **context into conversation**, not new primary screens. Calendar → Watson's opening references your day; IDE → snippet appears as attachment in chat.
- **Weekly depth sessions** are longer conversations, not PDF reports.
- **Growth Engine** (ADR-012) surfaces inferred growth **in dialogue** ("you've been applying X more consistently") rather than streak widgets.
- **API design** (future) should expose `converse` and `conversation_events` as primary operations; vault browse as secondary.
- **Mobile app** (future) is a conversation client, not a dashboard app.

**SRS alignment note (recommendation, not SRS change):** If a future feature cannot be demonstrated in a 2-minute conversation clip, flag it in ADR review before building.

## When This Decision Should Be Revisited

Revisit if:

1. **Daily engagement collapses** despite good mentorship quality — and user research shows capture friction in chat (not reminder/habit issues).
2. **A domain requires visual manipulation** that dialogue cannot serve — e.g., graph exploration at scale, mock-test answer grid analysis. Consider **companion views** that still feed conversation, not replace it.
3. **A second user is added** — conversation-first still holds, but may need conversation list / session management UI.
4. **Regulatory audit** requires immutable structured exports that conversation inference cannot produce — add export pipelines, not dashboard-first pivot.

Do **not** revisit because "other products have dashboards" or "we need charts for motivation." That violates product principles.
