"""
Reflection Engine V2 — generates structured session summaries using
Watson's internal understanding of memories, relationships, concepts, and context.

Components:
  ReflectionContext          — input data assembled from the session and its artefacts
  ReflectionSummary          — the structured output
  ReflectionEngineV2        — deterministic engine that produces the summary
  SessionReflectionService  — orchestrates data gathering and engine invocation
"""

import hashlib
from dataclasses import dataclass, field
from typing import Any, Optional

from memory.models import Memory, MemoryType, Session
from memory.relationships import Relationship, RelationshipType
from context.models import ContextQuery, RetrievalResult

# ---------------------------------------------------------------------------
# Domain models
# ---------------------------------------------------------------------------


@dataclass
class ReflectionContext:
    """All inputs the engine needs to generate a session reflection."""

    session: Session
    relationships: list[Relationship] = field(default_factory=list)
    concepts: list[Any] = field(default_factory=list)
    concept_connections: list[dict[str, str]] = field(default_factory=list)
    context: RetrievalResult = field(
        default_factory=lambda: RetrievalResult(query=ContextQuery(text=""))
    )


@dataclass
class ReflectionSummary:
    """A structured session reflection with all five sections."""

    primary_focus: str = "Generic"
    topics_explored: list[str] = field(default_factory=list)
    progress: dict[str, list[str]] = field(default_factory=dict)
    strongest_connections: list[dict[str, str]] = field(default_factory=list)
    reflection: str = ""


# ---------------------------------------------------------------------------
# Progress labels per MemoryType
# ---------------------------------------------------------------------------

_PROGRESS_LABELS: dict[MemoryType, str] = {
    MemoryType.LEARNING: "Learning Progress",
    MemoryType.PROJECT: "Project Progress",
    MemoryType.CAREER: "Career Progress",
    MemoryType.HEALTH: "Health Progress",
    MemoryType.GENERIC: "Notes",
}

_PROGRESS_TEMPLATES: dict[MemoryType, str] = {
    MemoryType.LEARNING: "Learned about {topic}",
    MemoryType.PROJECT: "Progress on {topic}",
    MemoryType.CAREER: "Career step: {topic}",
    MemoryType.HEALTH: "Health: {topic}",
    MemoryType.GENERIC: "{topic}",
}

_CONNECTION_LABELS: dict[RelationshipType, str] = {
    RelationshipType.RELATED_TOPIC: "Related Topic",
    RelationshipType.SAME_PROJECT: "Same Project",
    RelationshipType.SAME_DOMAIN: "Same Domain",
    RelationshipType.CAREER_LEARNING: "Career \u2194 Learning",
    RelationshipType.HEALTH_PATTERN: "Health Pattern",
    RelationshipType.GENERIC: "Related",
}

# ---------------------------------------------------------------------------
# Reflection templates by primary focus
# ---------------------------------------------------------------------------

_FOCUS_REFLECTION_TEMPLATES: dict[str, list[str]] = {
    "Learning": [
        "Today's session expanded your understanding of {topic}.",
        "You continued building knowledge in {topic}.",
        "Your learning journey in {topic} moved forward today.",
    ],
    "Project": [
        "You made meaningful progress on {project}.",
        "Today moved {project} closer to completion.",
        "Your work on {project} continues to take shape.",
    ],
    "Career": [
        "Today's session contributed to your professional growth.",
        "Your career journey took another step forward today.",
        "You invested in your professional development today.",
    ],
    "Health": [
        "You continued investing in your wellbeing.",
        "Today's session reflects your commitment to health.",
        "Your consistency with health activities continues to build momentum.",
    ],
    "Mixed": [
        "Today's work connected learning with practical application.",
        "Your session covered multiple areas of growth today.",
        "A well-rounded session spanning several domains.",
    ],
}


def _select_template(pool: list[str], seed: str) -> str:
    """Deterministically select a template from *pool* using *seed*."""
    h = hashlib.sha256(seed.encode()).hexdigest()
    idx = int(h[:8], 16) % len(pool)
    return pool[idx]


# ---------------------------------------------------------------------------
# Reflection Engine V2
# ---------------------------------------------------------------------------


class ReflectionEngineV2:
    """Deterministic engine that produces a structured ReflectionSummary."""

    def generate(self, ctx: ReflectionContext) -> ReflectionSummary:
        memories = ctx.session.memories
        topics = self._extract_topics(memories)
        primary_focus = self._determine_primary_focus(memories)
        progress = self._build_progress(memories)
        connections = self._build_connections(
            ctx.relationships, ctx.concept_connections, memories,
        )
        reflection = self._generate_reflection(primary_focus, memories)

        return ReflectionSummary(
            primary_focus=primary_focus,
            topics_explored=topics,
            progress=progress,
            strongest_connections=connections,
            reflection=reflection,
        )

    # -- Analysis helpers ------------------------------------------------

    @staticmethod
    def _extract_topics(memories: list[Memory]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for m in memories:
            normalised = m.topic.strip().lower()
            if normalised and normalised not in seen:
                seen.add(normalised)
                result.append(m.topic)
        return result

    @staticmethod
    def _determine_primary_focus(memories: list[Memory]) -> str:
        if not memories:
            return "Generic"

        counts: dict[str, int] = {}
        for m in memories:
            counts[m.type.value] = counts.get(m.type.value, 0) + 1

        total = sum(counts.values())
        dominant_type, dominant_count = max(counts.items(), key=lambda x: x[1])

        if dominant_count / total > 0.5:
            return dominant_type
        return "Mixed"

    @staticmethod
    def _build_progress(memories: list[Memory]) -> dict[str, list[str]]:
        groups: dict[str, list[str]] = {}
        seen_topics: set[str] = set()

        for m in memories:
            key = _PROGRESS_LABELS.get(m.type, "Notes")
            template = _PROGRESS_TEMPLATES.get(m.type, "{topic}")
            normalised = m.topic.strip().lower()
            if normalised and normalised not in seen_topics:
                seen_topics.add(normalised)
                groups.setdefault(key, []).append(
                    template.format(topic=m.topic)
                )

        return groups

    @staticmethod
    def _build_connections(
        relationships: list[Relationship],
        concept_connections: list[dict[str, str]],
        memories: list[Memory],
    ) -> list[dict[str, str]]:
        connections: list[dict[str, str]] = []
        seen_pairs: set[tuple[str, str]] = set()

        mem_topics: dict[str, str] = {m.id: m.topic for m in memories}

        for rel in relationships:
            src = mem_topics.get(rel.source_memory_id, "")
            tgt = rel.label or mem_topics.get(rel.target_memory_id, "")
            if not src or not tgt:
                continue
            pair = tuple(sorted([src.lower(), tgt.lower()]))
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)

            rel_label = _CONNECTION_LABELS.get(
                rel.relationship_type, "Related"
            )
            connections.append({
                "source": src,
                "target": tgt,
                "relation": rel_label,
            })

        for cc in concept_connections:
            pair = tuple(
                sorted([cc["source"].lower(), cc["target"].lower()])
            )
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)
            connections.append(cc)

        return connections

    @staticmethod
    def _generate_reflection(
        primary_focus: str,
        memories: list[Memory],
    ) -> str:
        if not memories:
            return "No activity recorded for this session."

        if primary_focus == "Mixed":
            topic = memories[0].topic
        else:
            focus_memories = [
                m for m in memories
                if m.type.value == primary_focus
            ]
            topic = focus_memories[0].topic if focus_memories else memories[0].topic

        templates = _FOCUS_REFLECTION_TEMPLATES.get(primary_focus)
        if not templates:
            templates = _FOCUS_REFLECTION_TEMPLATES["Mixed"]

        seed = memories[0].id if memories else "default"
        template = _select_template(templates, seed)

        if primary_focus in ("Learning", "Health"):
            return template.format(topic=topic)
        if primary_focus == "Project":
            return template.format(project=topic)
        return template


# ---------------------------------------------------------------------------
# Session Reflection Service — orchestrator
# ---------------------------------------------------------------------------


class SessionReflectionService:
    """Orchestrates data gathering and delegates to ReflectionEngineV2.

    Args:
        session_service: SessionService instance for session data.
        concept_graph: ConceptGraph instance for concept/neighbour queries.
        retrieval_service: Optional RetrievalService for context queries.
    """

    def __init__(
        self,
        session_service: Any,
        concept_graph: Any,
        retrieval_service: Optional[Any] = None,
    ) -> None:
        self._session_service = session_service
        self._concept_graph = concept_graph
        self._retrieval_service = retrieval_service

    def reflect(self, session_id: str) -> ReflectionSummary:
        """Produce a ReflectionSummary for the given session."""
        session = self._session_service.get_session(session_id)
        relationships = self._session_service.get_relationships(session_id)
        concepts = self._concept_graph.get_all_concepts()
        concept_connections = self._build_concept_connections()

        ctx = ReflectionContext(
            session=session,
            relationships=relationships,
            concepts=concepts,
            concept_connections=concept_connections,
            context=self._query_context(session),
        )

        return ReflectionEngineV2().generate(ctx)

    def _build_concept_connections(self) -> list[dict[str, str]]:
        connections: list[dict[str, str]] = []
        seen: set[tuple[str, str]] = set()

        for concept in self._concept_graph.get_all_concepts():
            connected = self._concept_graph.get_connected_concepts(
                concept.id, min_weight=1,
            )
            for neighbour, weight in connected:
                pair = tuple(
                    sorted([concept.name.lower(), neighbour.name.lower()])
                )
                if pair in seen:
                    continue
                seen.add(pair)
                connections.append({
                    "source": concept.name,
                    "target": neighbour.name,
                    "relation": f"Connected (weight {weight})",
                })

        return connections

    def _query_context(self, session: Session) -> RetrievalResult:
        if not self._retrieval_service or not session.memories:
            return RetrievalResult(query=ContextQuery(text=""))

        memories = session.memories
        topics = ReflectionEngineV2._extract_topics(memories)

        if not topics:
            return RetrievalResult(query=ContextQuery(text=""))

        return self._retrieval_service.query(topics[0])
