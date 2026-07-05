from typing import Any, Optional

from reflection.domain.reflection_context import ReflectionContext
from reflection.domain.reflection_summary import ReflectionSummary
from reflection.services.reflection_engine import ReflectionEngineV2


class SessionReflectionService:
    """Orchestrates data gathering and delegates to ReflectionEngineV2.

    This service:
    1. Gathers session data from SessionService
    2. Gathers relationships from SessionService
    3. Gathers concepts and connections from ConceptGraph
    4. Gathers context from RetrievalService
    5. Assembles a ReflectionContext
    6. Delegates to ReflectionEngineV2 for processing

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
        """Produce a ReflectionSummary for the given session.

        Args:
            session_id: ID of the session to reflect on.

        Returns:
            A ReflectionSummary with primary_focus, topics_explored,
            progress, strongest_connections, and reflection.
        """
        session = self._session_service.get_session(session_id)

        ctx = ReflectionContext(
            session=session,
            memories=list(session.memories),
            concepts=self._concept_graph.get_all_concepts(),
            relationships=self._session_service.get_relationships(session_id),
            concept_connections=self._build_concept_connections(),
            retrieved_context=self._query_context(session),
        )

        return ReflectionEngineV2().generate(ctx)

    def _build_concept_connections(
        self,
    ) -> list[dict[str, Any]]:
        """Build a list of concept connections with weights.

        Each connection dict contains:
            source: Concept name
            target: Connected concept name
            relation: Human-readable relation label
            weight: Edge weight
        """
        connections: list[dict[str, Any]] = []
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
                    "weight": weight,
                })

        connections.sort(key=lambda x: -x["weight"])
        return connections

    def _query_context(self, session: Any) -> Any:
        """Query the context retrieval engine for the session's primary topic."""
        if not self._retrieval_service or not session.memories:
            return None

        memories = session.memories
        topics = ReflectionEngineV2._extract_topics(
            memories, self._concept_graph.get_all_concepts(),
        )

        if not topics:
            return None

        return self._retrieval_service.query(topics[0])
