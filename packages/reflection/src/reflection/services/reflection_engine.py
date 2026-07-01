import hashlib
from typing import Any, Optional

from reflection.domain.reflection_context import ReflectionContext
from reflection.domain.reflection_summary import ReflectionSummary

_PROGRESS_LABELS: dict[str, str] = {
    "Learning": "Learning",
    "Project": "Project",
    "Career": "Career",
    "Health": "Health",
    "Generic": "Notes",
}

_RELATIONSHIP_WEIGHTS: dict[str, int] = {
    "SAME_PROJECT": 3,
    "CAREER_LEARNING": 3,
    "SAME_DOMAIN": 2,
    "RELATED_TOPIC": 2,
    "HEALTH_PATTERN": 2,
    "GENERIC": 1,
}

_FOCUS_REFLECTION_TEMPLATES: dict[str, list[str]] = {
    "Learning": [
        "Today's session strengthened your understanding of {topic}.",
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
        "Today's work contributed to your professional journey.",
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
        "Today's session combined learning with practical progress.",
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


class ReflectionEngineV2:
    """Deterministic engine that produces a structured ReflectionSummary.

    The engine is stateless. All inputs arrive via ReflectionContext.
    All outputs are returned via ReflectionSummary.

    The engine NEVER invents facts, hallucinates, or infers non-existent data.
    Every piece of output is derived deterministically from the input context.
    """

    def generate(self, ctx: ReflectionContext) -> ReflectionSummary:
        memories = ctx.memories
        topics = self._extract_topics(memories, ctx.concepts)
        primary_focus = (
            ctx.primary_focus
            if ctx.primary_focus
            else self._determine_primary_focus(memories)
        )
        progress = self._build_progress(memories)
        connections = self._build_connections(
            ctx.relationships,
            ctx.concept_connections,
            memories,
        )
        reflection = self._generate_reflection(primary_focus, memories)

        return ReflectionSummary(
            primary_focus=primary_focus,
            topics_explored=topics,
            progress=progress,
            strongest_connections=connections,
            reflection=reflection,
        )

    @staticmethod
    def _extract_topics(
        memories: list[Any],
        concepts: list[Any],
    ) -> list[str]:
        """Collect unique topics from memories and concepts.

        Topics are sorted alphabetically. Concepts supplement the topic
        list when they provide additional distinct entries.
        """
        seen: set[str] = set()
        result: list[str] = []

        for m in memories:
            topic = getattr(m, "topic", "")
            if not topic:
                continue
            normalised = topic.strip().lower()
            if normalised and normalised not in seen:
                seen.add(normalised)
                result.append(topic.strip())

        for c in concepts:
            name = getattr(c, "name", "")
            if not name:
                continue
            normalised = name.strip().lower()
            if normalised and normalised not in seen:
                seen.add(normalised)
                result.append(name.strip())

        result.sort(key=str.casefold)
        return result

    @staticmethod
    def _determine_primary_focus(memories: list[Any]) -> str:
        """Determine the dominant focus using deterministic scoring.

        If a single memory type exceeds 50% of all memories, that type
        is the primary focus. Otherwise the session is considered Mixed.
        """
        if not memories:
            return "Generic"

        counts: dict[str, int] = {}
        for m in memories:
            type_val = m.type.value if hasattr(m.type, "value") else str(m.type)
            counts[type_val] = counts.get(type_val, 0) + 1

        total = sum(counts.values())
        dominant_type, dominant_count = max(counts.items(), key=lambda x: x[1])

        if dominant_count / total > 0.5:
            return dominant_type
        return "Mixed"

    @staticmethod
    def _build_progress(memories: list[Any]) -> dict[str, list[str]]:
        """Generate structured progress grouped by memory type.

        Each group maps a label (e.g. "Learning", "Project") to a list
        of topic names. Topics are deduplicated within each group.
        """
        groups: dict[str, list[str]] = {}
        seen: set[tuple[str, str]] = set()

        for m in memories:
            type_val = m.type.value if hasattr(m.type, "value") else str(m.type)
            label = _PROGRESS_LABELS.get(type_val, "Notes")
            topic = m.topic.strip() if hasattr(m, "topic") else ""
            if not topic:
                continue
            key = (label, topic.lower())
            if key in seen:
                continue
            seen.add(key)
            groups.setdefault(label, []).append(topic)

        return groups

    @staticmethod
    def _build_connections(
        relationships: list[Any],
        concept_connections: list[dict[str, Any]],
        memories: list[Any],
    ) -> list[dict[str, str]]:
        """Build sorted list of strongest connections.

        Each connection is scored:
        - Concept connections use their explicit weight.
        - Relationships use a type-based weight.

        Results are sorted by descending score.
        """
        scored: list[tuple[dict[str, str], int]] = []
        seen_pairs: set[tuple[str, str]] = set()

        # Build a topic lookup from memories
        mem_topics: dict[str, str] = {}
        for m in memories:
            mid = getattr(m, "id", "")
            topic = getattr(m, "topic", "")
            if mid and topic:
                mem_topics[mid] = topic

        # Score concept connections (highest weight first)
        for cc in concept_connections:
            source = cc.get("source", "")
            target = cc.get("target", "")
            weight = cc.get("weight", 1)
            if not source or not target:
                continue
            pair = tuple(sorted([source.lower(), target.lower()]))
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)
            label = cc.get("relation", f"Connected (weight {weight})")
            scored.append((
                {"source": source, "target": target, "relation": label},
                int(weight),
            ))

        # Score relationships (type-based weight)
        for rel in relationships:
            src_id = getattr(rel, "source_memory_id", "")
            tgt_id = getattr(rel, "target_memory_id", "")
            src_topic = mem_topics.get(src_id, "")
            tgt_topic = getattr(rel, "label", "") or mem_topics.get(tgt_id, "")
            if not src_topic or not tgt_topic:
                continue
            pair = tuple(sorted([src_topic.lower(), tgt_topic.lower()]))
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)

            rel_type = getattr(rel, "relationship_type", None)
            type_str = rel_type.value if hasattr(rel_type, "value") else str(rel_type) if rel_type else ""
            weight = _RELATIONSHIP_WEIGHTS.get(type_str, 1)
            scored.append((
                {"source": src_topic, "target": tgt_topic, "relation": type_str},
                weight,
            ))

        scored.sort(key=lambda x: -x[1])
        return [item for item, _ in scored]

    @staticmethod
    def _generate_reflection(
        primary_focus: str,
        memories: list[Any],
    ) -> str:
        """Generate a single reflection sentence using deterministic templates."""
        if not memories:
            return "No activity recorded for this session."

        topic: Optional[str] = None
        if primary_focus == "Mixed":
            if memories:
                topic = getattr(memories[0], "topic", "").strip() or None
        else:
            focus_memories = [
                m for m in memories
                if (m.type.value if hasattr(m.type, "value") else str(m.type)) == primary_focus
            ]
            if focus_memories:
                topic = getattr(focus_memories[0], "topic", "").strip() or None
            elif memories:
                topic = getattr(memories[0], "topic", "").strip() or None

        templates = _FOCUS_REFLECTION_TEMPLATES.get(primary_focus)
        if not templates:
            templates = _FOCUS_REFLECTION_TEMPLATES["Mixed"]

        seed = getattr(memories[0], "id", "default") if memories else "default"
        template = _select_template(templates, seed)

        if primary_focus in ("Learning", "Health"):
            return template.format(topic=topic or "a topic")
        if primary_focus == "Project":
            return template.format(project=topic or "a project")
        return template
