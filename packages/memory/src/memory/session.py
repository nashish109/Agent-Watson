"""
SessionService — manages the full session lifecycle.

Coordinates:
  1. Session creation and lifecycle (start, add, end)
  2. Contribution ingestion through MemoryService
  3. Relationship detection between memories
  4. Concept extraction and graph updates
  5. Session summary generation

Sessions are stored in-memory (no persistence).
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

from concept_graph.domain.concept_graph import ConceptGraph
from concept_graph.services.concept_graph_service import ConceptGraphService
from concept_graph.services.concept_extractor import ConceptExtractor
from context.models import MemoryEntry, RetrievalResult, SessionEntry
from context.services.retrieval_service import RetrievalService
from memory.intent import IntentResult
from memory.models import Contribution, Memory, Reflection, Session
from memory.relationships import (
    Relationship,
    RelationshipEngine,
    RelationshipRepository,
)
from memory.service import MemoryService


@dataclass
class ContributionResult:
    """Result of adding a single contribution to a session.

    Attributes:
        contribution: The created contribution.
        intent: The classified intent.
        response: Conversational response (for Question intents).
        memories: Memories extracted (empty for Question intents).
        reflections: Reflections generated (empty for Question intents).
        relationships: New relationships detected.
        concept_names: Concept names extracted from this contribution.
        connections: Formatted connection strings (e.g. "Kafka ↔ Agent Watson").
    """

    contribution: Contribution
    intent: IntentResult
    response: Optional[str] = None
    memories: list[Memory] = None  # type: ignore[assignment]
    reflections: list[Reflection] = None  # type: ignore[assignment]
    relationships: list[Relationship] = None  # type: ignore[assignment]
    concept_names: list[str] = None  # type: ignore[assignment]
    connections: list[str] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.memories is None:
            self.memories = []
        if self.reflections is None:
            self.reflections = []
        if self.relationships is None:
            self.relationships = []
        if self.concept_names is None:
            self.concept_names = []
        if self.connections is None:
            self.connections = []


class SessionService:
    """In-memory session manager that owns the contribution→memory→reflection→summary pipeline."""

    def __init__(
        self,
        memory_service: MemoryService | None = None,
        relationship_engine: RelationshipEngine | None = None,
    ) -> None:
        self._memory_service = memory_service or MemoryService(
            relationship_engine=relationship_engine or RelationshipEngine(),
        )
        self._relationship_repo = RelationshipRepository()
        self._concept_graph = ConceptGraph()
        self._concept_graph_service = ConceptGraphService()
        self._concept_extractor = ConceptExtractor()
        self._sessions: dict[str, Session] = {}
        self._session_entries: dict[str, SessionEntry] = {}
        self._retrieval_service = RetrievalService(
            sessions=self._session_entries,
            concept_graph_get_all_concepts=self._concept_graph.get_all_concepts,
            concept_graph_get_concept_by_name=self._concept_graph.get_concept_by_name,
            concept_graph_get_neighbours=self._concept_graph.get_neighbours,
        )

    def _sync_session_entry(self, session: Session) -> None:
        self._session_entries[session.id] = SessionEntry(
            id=session.id,
            session_date=session.session_date,
            memories=[MemoryEntry(id=m.id, topic=m.topic, summary=m.summary, memory_type=m.type.value)
                       for m in session.memories],
            contributions=session.contributions,
        )

    def create_session(self) -> Session:
        """Create and store a new session.

        Returns:
            The newly created Session.
        """
        session = Session()
        self._sessions[session.id] = session
        self._sync_session_entry(session)
        return session

    def add_contribution(
        self,
        session_id: str,
        text: str,
        source: str = "user",
    ) -> ContributionResult:
        """Add a contribution to a session, classify intent, extract memories,
        detect relationships, extract concepts, update the concept graph, and
        generate reflections.

        All artefacts are stored on the session in-memory.

        Args:
            session_id: ID of the target session.
            text: Raw contribution text.
            source: Origin label for the contribution.

        Returns:
            A ContributionResult containing the contribution, intent, response,
            memories, reflections, relationships, concepts, and connections.

        Raises:
            KeyError: If session_id does not exist.
            ValueError: If the session has already ended.
        """
        session = self._get_session(session_id)

        if session.ended_at is not None:
            raise ValueError("Cannot add to an ended session.")

        contribution = Contribution(text=text, source=source)
        result = self._memory_service.process(
            contribution,
            existing_memories=list(session.memories),
        )

        # Store new artefacts
        session.contributions.append(contribution)
        session.memories.extend(result.memories)
        session.reflections.extend(result.reflections)
        self._sync_session_entry(session)

        # Store new relationships
        stored_rels = self._relationship_repo.add_all(result.new_relationships)

        # --- Concept Graph ---
        new_concept_ids: list[str] = []
        concept_names: list[str] = []

        for m in result.memories:
            concepts, _ = self._concept_graph_service.extract_and_link(
                self._concept_graph,
                m.type.value,
                m.topic,
            )
            for c in concepts:
                if c.id not in new_concept_ids:
                    new_concept_ids.append(c.id)
                    concept_names.append(c.name)

        # Link all concepts from this contribution together
        connections: list[str] = []
        if len(new_concept_ids) >= 2:
            self._concept_graph_service.link_concepts(
                self._concept_graph, new_concept_ids,
            )
            # Build human-readable connection strings for new-concept pairs
            name_by_id = dict(zip(new_concept_ids, concept_names))
            seen: set[tuple[str, str]] = set()
            for cid in new_concept_ids:
                connected = self._concept_graph_service.get_connected_concepts(
                    self._concept_graph, cid, min_weight=1,
                )
                for other, _ in connected:
                    if other.id not in name_by_id:
                        continue
                    pair = tuple(sorted([name_by_id[cid], other.name]))
                    if pair not in seen:
                        seen.add(pair)
                        connections.append(f"{pair[0]} \u2194 {pair[1]}")

        return ContributionResult(
            contribution=contribution,
            intent=result.intent,
            response=result.response,
            memories=result.memories,
            reflections=result.reflections,
            relationships=stored_rels,
            concept_names=concept_names,
            connections=connections,
        )

    def end_session(self, session_id: str) -> Session:
        """Mark a session as ended.

        Args:
            session_id: ID of the session to end.

        Returns:
            The updated Session.
        """
        session = self._get_session(session_id)
        session.ended_at = datetime.now(timezone.utc)
        return session

    def generate_summary(self, session_id: str) -> str:
        """Generate and store the session summary.

        Args:
            session_id: ID of the target session.

        Returns:
            The generated summary string.
        """
        from memory.summarizer import summarize

        session = self._get_session(session_id)
        summary = summarize(session.memories)
        session.summary = summary
        return summary

    def get_session(self, session_id: str) -> Session:
        """Retrieve a session by ID.

        Args:
            session_id: ID of the session.

        Returns:
            The Session object.
        """
        return self._get_session(session_id)

    def get_contributions(self, session_id: str) -> list[Contribution]:
        """Retrieve all contributions in a session."""
        return list(self._get_session(session_id).contributions)

    def get_memories(self, session_id: str) -> list[Memory]:
        """Retrieve all memories in a session."""
        return list(self._get_session(session_id).memories)

    def get_reflections(self, session_id: str) -> list[Reflection]:
        """Retrieve all reflections in a session."""
        return list(self._get_session(session_id).reflections)

    def get_relationships(self, session_id: str) -> list[Relationship]:
        """Retrieve all relationships in the repository."""
        return self._relationship_repo.get_all()

    def query_context(self, text: str) -> RetrievalResult:
        return self._retrieval_service.query(text)

    def get_all_sessions(self) -> list[Session]:
        return list(self._sessions.values())

    @property
    def concept_graph(self) -> Any:
        """Expose the internal ConceptGraph for reflection / analysis."""
        return self._concept_graph

    @property
    def retrieval_service(self) -> Any:
        """Expose the internal RetrievalService for reflection / analysis."""
        return self._retrieval_service

    def _get_session(self, session_id: str) -> Session:
        if session_id not in self._sessions:
            raise KeyError(f"Session not found: {session_id}")
        return self._sessions[session_id]
