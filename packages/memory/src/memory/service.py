"""
MemoryService — top-level orchestrator for the memory extraction pipeline.

Pipeline:
  Contribution
    → IntentClassifier (determines intent)
      → Coach (generates structured coach response)
        → MemoryExtractor (extracts memories, guided by intent)
          → ReflectionGenerator (generates reflections from memories)
            → Coach response attached to result

Returns all generated artefacts together.
"""

from dataclasses import dataclass, field
from typing import Optional

from memory.coach import CoachResponse, CoachService
from memory.extractor import extract as extract_memories
from memory.generator import generate as generate_reflection
from memory.intent import IntentResult, IntentType, classify as classify_intent
from memory.knowledge import get_response as get_knowledge_response
from memory.models import Contribution, Memory, Reflection
from memory.relationships import Relationship, RelationshipEngine


@dataclass
class MemoryResult:
    contribution: Contribution
    intent: IntentResult
    response: Optional[str] = None
    memories: list[Memory] = field(default_factory=list)
    reflections: list[Reflection] = field(default_factory=list)
    new_relationships: list[Relationship] = field(default_factory=list)
    coach: Optional[CoachResponse] = None


class MemoryService:
    def __init__(self, relationship_engine: Optional[RelationshipEngine] = None,
                 coach_service: Optional[CoachService] = None) -> None:
        self._relationship_engine = relationship_engine or RelationshipEngine()
        self._coach_service = coach_service or CoachService()

    def process(
        self,
        contribution: Contribution,
        existing_memories: Optional[list[Memory]] = None,
        existing_relationships: Optional[list[Relationship]] = None,
    ) -> MemoryResult:
        # 1. Classify intent
        intent = classify_intent(contribution.text)

        # 2. Generate coach response (always, even for questions)
        coach = self._coach_service.generate(contribution.text, intent)

        # 3. Handle Question intent — no memories, conversational response
        if intent.intent == IntentType.QUESTION:
            response = get_knowledge_response(contribution.text)
            return MemoryResult(
                contribution=contribution,
                intent=intent,
                response=response,
                coach=coach,
            )

        # 4. Extract memories (guided by intent)
        memories = extract_memories(contribution, intent=intent)

        # 5. Detect relationships
        relationships_by_memory: dict[str, list[Relationship]] = {}
        all_new_relationships: list[Relationship] = []
        if existing_memories and self._relationship_engine:
            all_new_relationships = self._relationship_engine.find(existing_memories, memories)
            for rel in all_new_relationships:
                relationships_by_memory.setdefault(rel.source_memory_id, []).append(rel)

        # 6. Generate reflections
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
            coach=coach,
        )
