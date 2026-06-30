"""
Relationship Engine — deterministically links memories by topic and type.

Components:
  RelationshipType    — enum of connection categories
  Relationship       — a link between two memories
  RelationshipRepository — in-memory storage
  RelationshipEngine — rule-based detector (no AI)
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from memory.models import Memory, MemoryType


# ---------------------------------------------------------------------------
# Relationship type
# ---------------------------------------------------------------------------

class RelationshipType(str, Enum):
    RELATED_TOPIC = "RELATED_TOPIC"
    SAME_PROJECT = "SAME_PROJECT"
    SAME_DOMAIN = "SAME_DOMAIN"
    CAREER_LEARNING = "CAREER_LEARNING"
    HEALTH_PATTERN = "HEALTH_PATTERN"
    GENERIC = "GENERIC"


# ---------------------------------------------------------------------------
# Relationship model
# ---------------------------------------------------------------------------

class Relationship(BaseModel):
    """A directed link from source_memory to target_memory.

    Attributes:
        source_memory_id: The newer (triggering) memory.
        target_memory_id: The pre-existing memory being linked to.
        relationship_type: How the two memories connect.
        label: Human-readable topic label of the target memory.
        id: Unique identifier.
        created_at: When the relationship was detected.
    """

    source_memory_id: str
    target_memory_id: str
    relationship_type: RelationshipType
    label: str
    id: str = Field(default_factory=lambda: uuid4().hex)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# In-memory repository
# ---------------------------------------------------------------------------

class RelationshipRepository:
    """Stores and retrieves relationships in memory."""

    def __init__(self) -> None:
        self._relationships: dict[str, Relationship] = {}
        self._by_source: dict[str, list[str]] = {}  # memory_id → [rel_id, ...]

    def add(self, relationship: Relationship) -> Relationship:
        """Store a relationship. Duplicate (same source + target + type) is skipped."""
        for existing in self._by_source.get(relationship.source_memory_id, []):
            rel = self._relationships[existing]
            if (rel.target_memory_id == relationship.target_memory_id
                    and rel.relationship_type == relationship.relationship_type):
                return rel
        self._relationships[relationship.id] = relationship
        self._by_source.setdefault(relationship.source_memory_id, []).append(relationship.id)
        return relationship

    def add_all(self, relationships: list[Relationship]) -> list[Relationship]:
        return [self.add(r) for r in relationships]

    def get_by_memory(self, memory_id: str) -> list[Relationship]:
        return [self._relationships[rid] for rid in self._by_source.get(memory_id, [])]

    def get_all(self) -> list[Relationship]:
        return list(self._relationships.values())

    def clear(self) -> None:
        self._relationships.clear()
        self._by_source.clear()


# ---------------------------------------------------------------------------
# Topic helpers
# ---------------------------------------------------------------------------

_STOP_WORDS: set[str] = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "up", "about", "into", "over", "after",
    "before", "between", "under", "this", "that", "it", "its", "is", "was",
}


def _topic_words(topic: str) -> set[str]:
    """Split a topic into meaningful lowercase keywords."""
    return {w.lower().rstrip(".,!?;:") for w in topic.split()
            if w.lower().rstrip(".,!?;:") not in _STOP_WORDS
            and len(w.rstrip(".,!?;:")) > 1}


def _topics_related(t1: str, t2: str) -> bool:
    """Return True if two topics share at least one meaningful word."""
    return bool(_topic_words(t1) & _topic_words(t2))


# ---------------------------------------------------------------------------
# Relationship Engine
# ---------------------------------------------------------------------------

class RelationshipEngine:
    """Deterministically detects relationships between memories."""

    def find(
        self,
        existing_memories: list[Memory],
        new_memories: list[Memory],
    ) -> list[Relationship]:
        """Compare every new memory against every existing memory.

        Args:
            existing_memories: Previously stored memories (from the session).
            new_memories: Memories just created from the current contribution.

        Returns:
            A list of new Relationship objects (not yet stored).
        """
        relationships: list[Relationship] = []

        for new_mem in new_memories:
            for existing in existing_memories:
                if new_mem.id == existing.id:
                    continue
                rel = self._classify(new_mem, existing)
                if rel is not None:
                    relationships.append(rel)

        return relationships

    def _classify(
        self,
        new_mem: Memory,
        existing: Memory,
    ) -> Optional[Relationship]:
        """Classify the relationship between two memories, or None if unrelated."""
        rel_type = self._determine_type(new_mem, existing)
        if rel_type is None:
            return None
        return Relationship(
            source_memory_id=new_mem.id,
            target_memory_id=existing.id,
            relationship_type=rel_type,
            label=existing.topic,
        )

    @staticmethod
    def _determine_type(
        new_mem: Memory,
        existing: Memory,
    ) -> Optional[RelationshipType]:
        # RELATED_TOPIC — same or overlapping topic, regardless of type
        if _topics_related(new_mem.topic, existing.topic):
            # Specific sub-types take priority
            if (new_mem.type == MemoryType.PROJECT
                    and existing.type == MemoryType.PROJECT):
                return RelationshipType.SAME_PROJECT
            if (new_mem.type == MemoryType.HEALTH
                    and existing.type == MemoryType.HEALTH):
                return RelationshipType.HEALTH_PATTERN
            # Career ↔ Learning cross-link
            if ((new_mem.type == MemoryType.CAREER and existing.type == MemoryType.LEARNING)
                    or (new_mem.type == MemoryType.LEARNING and existing.type == MemoryType.CAREER)):
                return RelationshipType.CAREER_LEARNING
            # Same category, related topic
            if new_mem.type == existing.type:
                return RelationshipType.SAME_DOMAIN
            return RelationshipType.RELATED_TOPIC

        # CAREER_LEARNING even without direct topic overlap
        if ((new_mem.type == MemoryType.CAREER and existing.type == MemoryType.LEARNING)
                or (new_mem.type == MemoryType.LEARNING and existing.type == MemoryType.CAREER)):
            return RelationshipType.CAREER_LEARNING

        return None
