"""
SessionService — manages the full session lifecycle.

Coordinates:
  1. Session creation and lifecycle (start, add, end)
  2. Contribution ingestion through MemoryService
  3. Relationship detection between memories
  4. Session summary generation

Sessions are stored in-memory (no persistence).
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

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
    """

    contribution: Contribution
    intent: IntentResult
    response: Optional[str] = None
    memories: list[Memory] = None  # type: ignore[assignment]
    reflections: list[Reflection] = None  # type: ignore[assignment]
    relationships: list[Relationship] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.memories is None:
            self.memories = []
        if self.reflections is None:
            self.reflections = []
        if self.relationships is None:
            self.relationships = []


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
        self._sessions: dict[str, Session] = {}

    def create_session(self) -> Session:
        """Create and store a new session.

        Returns:
            The newly created Session.
        """
        session = Session()
        self._sessions[session.id] = session
        return session

    def add_contribution(
        self,
        session_id: str,
        text: str,
        source: str = "user",
    ) -> ContributionResult:
        """Add a contribution to a session, classify intent, extract memories,
        detect relationships, and generate reflections.

        All artefacts are stored on the session in-memory.

        Args:
            session_id: ID of the target session.
            text: Raw contribution text.
            source: Origin label for the contribution.

        Returns:
            A ContributionResult containing the contribution, intent, response,
            memories, reflections, and new relationships.

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

        # Store new relationships
        stored_rels = self._relationship_repo.add_all(result.new_relationships)

        return ContributionResult(
            contribution=contribution,
            intent=result.intent,
            response=result.response,
            memories=result.memories,
            reflections=result.reflections,
            relationships=stored_rels,
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

    def _get_session(self, session_id: str) -> Session:
        if session_id not in self._sessions:
            raise KeyError(f"Session not found: {session_id}")
        return self._sessions[session_id]
