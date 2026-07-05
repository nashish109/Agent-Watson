from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class ReflectionContext:
    """All inputs the engine needs to generate a session reflection.

    This is the single input to ReflectionEngineV2. It bundles everything
    Watson understands about a session into one coherent snapshot.

    Attributes:
        session: The source session (from Session Engine).
        memories: Memories extracted during the session.
        concepts: Concepts discovered (from Concept Graph).
        relationships: Relationships between memories (from Relationship Engine).
        concept_connections: Strongest concept-concept links with weights.
        retrieved_context: Cross-session context (from Context Retrieval Engine).
        primary_focus: Optional pre-determined primary focus (None = auto-detect).
        dominant_intent: Optional pre-determined dominant intent (None = skip).
    """

    session: Any
    memories: list[Any] = field(default_factory=list)
    concepts: list[Any] = field(default_factory=list)
    relationships: list[Any] = field(default_factory=list)
    concept_connections: list[dict[str, Any]] = field(default_factory=list)
    retrieved_context: Any = None
    primary_focus: Optional[str] = None
    dominant_intent: Optional[str] = None
