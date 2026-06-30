"""
MemoryService — top-level orchestrator for the memory extraction flow.

Pipeline:
  Contribution
    → IntentClassifier (determines intent)
      → MemoryExtractor (extracts memories, guided by intent)
        → ReflectionGenerator (generates reflections from memories)

Returns all generated artefacts together.
"""

from dataclasses import dataclass
from typing import Optional

from memory.extractor import extract as extract_memories
from memory.generator import generate as generate_reflection
from memory.intent import IntentResult, IntentType, classify as classify_intent
from memory.knowledge import get_response as get_knowledge_response
from memory.models import Contribution, Memory, Reflection
from memory.relationships import Relationship, RelationshipEngine


@dataclass
class MemoryResult:
    """Result of running the full memory extraction pipeline.

    Attributes:
        contribution: The original input.
        intent: The classified intent.
        response: A conversational response (for Question intents); None otherwise.
        memories: Memories extracted from the contribution.
        reflections: Reflections generated from each memory.
        new_relationships: New relationships detected (not yet stored).
    """

    contribution: Contribution
    intent: IntentResult
    response: Optional[str] = None
    memories: list[Memory] = None  # type: ignore[assignment]
    reflections: list[Reflection] = None  # type: ignore[assignment]
    new_relationships: list[Relationship] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.memories is None:
            self.memories = []
        if self.reflections is None:
            self.reflections = []
        if self.new_relationships is None:
            self.new_relationships = []


class MemoryService:
    """Orchestrates the intent classification and memory extraction pipeline."""

    def __init__(self, relationship_engine: Optional[RelationshipEngine] = None) -> None:
        self._relationship_engine = relationship_engine or RelationshipEngine()

    def process(
        self,
        contribution: Contribution,
        existing_memories: Optional[list[Memory]] = None,
        existing_relationships: Optional[list[Relationship]] = None,
    ) -> MemoryResult:
        """Run the full pipeline for a single Contribution.

        Args:
            contribution: The raw user input.
            existing_memories: Previously stored memories for relationship detection.
            existing_relationships: Previously stored relationships to pass
                to the generator (for multi-relationship enrichment).

        Returns:
            A MemoryResult containing the classified intent, optional
            conversational response, extracted memories, and reflections.
        """
        # 1. Classify intent
        intent = classify_intent(contribution.text)

        # 2. Handle Question intent — no memories, conversational response
        if intent.intent == IntentType.QUESTION:
            response = get_knowledge_response(contribution.text)
            return MemoryResult(
                contribution=contribution,
                intent=intent,
                response=response,
            )

        # 3. Extract memories (guided by intent)
        memories = extract_memories(contribution, intent=intent)

        # 4. Detect relationships (if existing memories and engine available)
        relationships_by_memory: dict[str, list[Relationship]] = {}
        all_new_relationships: list[Relationship] = []
        if existing_memories and self._relationship_engine:
            all_new_relationships = self._relationship_engine.find(existing_memories, memories)
            for rel in all_new_relationships:
                relationships_by_memory.setdefault(rel.source_memory_id, []).append(rel)

        # 5. Generate reflections (enriched when relationships exist)
        reflections = []
        for m in memories:
            rels = relationships_by_memory.get(m.id)
            if rels:
                reflections.append(generate_reflection(m, relationships=rels))
            else:
                reflections.append(generate_reflection(m))

        return MemoryResult(
            contribution=contribution,
            intent=intent,
            memories=memories,
            reflections=reflections,
            new_relationships=all_new_relationships,
        )
