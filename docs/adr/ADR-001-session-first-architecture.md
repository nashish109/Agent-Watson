# ADR-001: Session-First Architecture

**Status:** Accepted (supersedes ADR-001 Conversation-First)  
**Date:** 2026-06-30  
**Deciders:** Ashish (Product Owner), Principal Architect

---

## Context

Agent Watson is a **personal AI Mentor** — not a chatbot, not a productivity platform. The product mission is daily growth through learning from work, study, projects, and goals. The SRS defines the **Daily Growth Session** as the North Star: a daily ritual of contribution, reflection, and memory accumulation.

The previous architecture (ADR-001, Conversation-First) correctly rejected dashboards and forms, but retained the **chat paradigm** as its interaction model — messages, turns, bubbles, real-time responses. This created a product that felt like "ChatGPT with better memory" rather than a fundamentally different relationship.

Ashish's target ritual is: open Watson, contribute, reflect, close the session with clarity. The product should feel like a **companion that remembers**, not a **chatbot that responds**.

The architecture must encode this product truth: Watson is a memory companion, not a conversation partner.

## Problem Statement

A conversation-first architecture creates three product failures:

1. **Chat gravity** — Every interaction defaults to a "user says, AI responds" pattern. The user asks; Watson answers. This trains the user to *query* rather than *contribute*, undermining the mentor relationship.
2. **Linear collapse** — Conversations stack vertically. Yesterday's insights scroll off screen. The product becomes a transcript, not an accumulating memory.
3. **Response pressure** — Watson must respond to every message. This forces real-time, shallow engagement instead of thoughtful, asynchronous reflection. Watson cannot "earn the right to advise" because it must always perform.

We must decide whether the session (a bounded, reflective unit of growth) or the conversation (an unbounded, real-time exchange) is the primary interaction model.

## Decision

**The Session is the primary interaction unit. Memory is the primary artifact. Contribution is the primary user action.**

Concretely:

- Every day begins with a new **Session**. A Session is a bounded container for contributions, reflections, and memories.
- The user **contributes** — they do not "send messages." Contributions become **Memories**.
- Watson **reflects** — it does not "respond." Reflections become Memories too.
- The **Living Canvas** is the visual surface where Memories accumulate over a Session. It is not a chat log.
- After a Session closes, its Memories are archived. Watson may reference them in future sessions.
- Watson **earns the right to advise**. In early sessions, Watson only observes and remembers. Only after sufficient history (weeks of contributions) does Watson begin to suggest growth moves.
- Future architecture naturally supports: Daily Sessions → Weekly Reviews → Monthly Reviews → Quarterly Reviews → Yearly Reflections — each building on the last.

Secondary surfaces (archive browse, memory map) exist for **review and trust verification** — not for daily growth workflow.

### Terminology mapping

| Old (Conversation-First) | New (Session-First) |
|--------------------------|---------------------|
| Conversation | Session |
| Message | Contribution / Memory |
| Chat | Living Canvas / Session |
| User sends a message | User contributes a memory |
| AI responds | Watson reflects |
| Chat history | Memory archive |
| Turn | Contribution cycle |
| Input box | Contribution input |

## Alternatives Considered

### A. Pure Conversation-First (previous ADR-001)

Conversation as primary interface; messages as atomic unit.

**Superseded.** See problem statement above. The chat paradigm dominated the experience despite philosophical disclaimers.

### B. Journal-First

User writes freeform; Watson annotates in margins.

**Rejected.** Too passive. Watson cannot suggest, challenge, or guide from the margin. The mentor role requires active contribution from both sides — just not in turn-taking format.

### C. Canvas-First (whiteboard)

Infinite canvas; spatial arrangement of all thoughts.

**Rejected for MVP.** Too open-ended. V1 needs a bounded, session-based structure. Infinite canvas becomes overwhelming without session boundaries.

### D. Voice-First

Speech as primary input; transcription as memory.

**Deferred to P2.** Aligns with session-first but adds STT dependency. The contribution model works for text first.

## Pros

- **Eliminates chat gravity** — No bubbles, no turns, no real-time pressure. The user contributes; Watson reflects asynchronously.
- **Memory is the artifact** — Every interaction produces a Memory object, not a transcript line. Memories accumulate, connect, and persist across sessions.
- **Natural growth arc** — Watson observes before advising. The product feels deeper over time, not repetitive.
- **Session boundaries create rhythm** — Morning, evening, daily close, weekly review — each is a natural mode within the session model.
- **Unmistakeable identity** — The product cannot be mistaken for a chat application. Its interaction model is unique.

## Cons

- **New interaction model** — Users must learn a non-chat paradigm. Initial confusion is possible.
- **Contribution habit required** — Users must initiate. Watson cannot "ask the first question" in the chat sense.
- **No real-time dialogue** — Quick question/answer loops are less natural. (Mitigation: quick contributions are still fast — the user types and receives a reflection.)
- **Async reflection feels slower** — Watson's thoughtful pause (1-3 seconds) may feel like latency to users accustomed to instant AI responses. This is intentional but requires user education.

## Trade-offs

| We gain | We sacrifice |
|---------|--------------|
| Relationship-shaped product | Query-response speed |
| Accumulating memory artifact | Scrollable transcript |
| Watson earns trust over time | Instant "helpful assistant" |
| Distinctive product identity | Familiar chat pattern |

## Future Implications

- **Weekly reviews** are sessions that operate on archived Memories — Watson synthesizes patterns across 7 days.
- **Memory connections** appear on the Living Canvas over time — Watson links "you mentioned Kafka partitions on 30 June and again on 14 July."
- **Growth engine** (ADR-012) surfaces through reflection cards, not dashboard widgets.
- **Mobile** is a session client, not a chat client.
- **New domains** (calendar, IDE, browser) inject context as **session pre-seeded memories** — not interruptions in a chat.

## When This Decision Should Be Revisited

Revisit if:

1. **Daily engagement collapses** because the contribution model feels too passive — users wait for Watson to lead.
2. **A domain requires real-time back-and-forth** that the session model cannot serve — e.g., interactive debugging. Consider companion views that still contribute Memories to the session.
3. **The Living Canvas feels too abstract** — users want more structured guidance within a session.

Do **not** revisit because "chat is what users expect." That is the exact assumption we are rejecting.
