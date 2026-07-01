"""ConceptGraph — in-memory store for concepts and their connections.

Responsibilities:
  - Store concepts by ID and by normalised name (dedup).
  - Store directed, weighted edges between concepts.
  - Retrieve neighbours (concepts reachable via one edge).
  - Retrieve all concepts connected to a given concept (with minimum weight).
  - Update edge weights when the same pair re-appears.
  - Prevent duplicate concepts (same normalised name → merge).
  - Prevent duplicate edges (same source, target, relation → increment weight).
"""

from typing import Optional

from concept_graph.domain.concept import Concept
from concept_graph.domain.concept_edge import ConceptEdge


class ConceptGraph:
    """In-memory concept graph with dedup and weighted adjacency.

    Thread-safety is NOT provided — the graph is intended to be used
    from a single-threaded session context.
    """

    def __init__(self) -> None:
        # concept_id → Concept
        self._concepts: dict[str, Concept] = {}
        # normalised name (lowercase, stripped) → concept_id
        self._name_index: dict[str, str] = {}
        # edge_id → ConceptEdge
        self._edges: dict[str, ConceptEdge] = {}
        # source_id → target_id → edge_id  (for fast lookup + weight update)
        self._adjacency: dict[str, dict[str, str]] = {}

    # ------------------------------------------------------------------
    # Concepts
    # ------------------------------------------------------------------

    def add_concept(self, concept: Concept) -> Concept:
        """Store a concept, deduplicating by normalised name.

        If a concept with the same normalised name already exists, the
        existing concept's aliases are extended with the new name and
        its updated_at timestamp is refreshed. The existing concept is
        returned (the given one is discarded).
        """
        normalised = concept.name.strip().lower()
        existing_id = self._name_index.get(normalised)
        if existing_id is not None:
            existing = self._concepts[existing_id]
            # Add new name as an alias if not already present
            alias_normalised = normalised
            if alias_normalised not in [a.strip().lower() for a in existing.aliases]:
                existing.aliases.append(concept.name.strip())
            from datetime import datetime, timezone
            existing.updated_at = datetime.now(timezone.utc)
            return existing

        self._concepts[concept.id] = concept
        self._name_index[normalised] = concept.id
        return concept

    def has_concept(self, name: str) -> bool:
        """Return True if a concept with the given normalised name exists."""
        return name.strip().lower() in self._name_index

    def get_concept(self, concept_id: str) -> Optional[Concept]:
        """Retrieve a concept by ID."""
        return self._concepts.get(concept_id)

    def get_concept_by_name(self, name: str) -> Optional[Concept]:
        """Retrieve a concept by normalised name."""
        cid = self._name_index.get(name.strip().lower())
        if cid is None:
            return None
        return self._concepts.get(cid)

    def get_all_concepts(self) -> list[Concept]:
        """Return every stored concept."""
        return list(self._concepts.values())

    def concept_count(self) -> int:
        return len(self._concepts)

    # ------------------------------------------------------------------
    # Edges
    # ------------------------------------------------------------------

    def add_edge(self, edge: ConceptEdge) -> ConceptEdge:
        """Store an edge, incrementing weight if the same pair already exists.

        Duplicate detection uses (source_id, target_id, relation).
        The edge is stored as-is from source→target. For an undirected
        lookup, callers should check both directions (this class does
        NOT auto-create reverse edges).
        """
        existing_id = self._find_edge_id(edge.source_id, edge.target_id, edge.relation)
        if existing_id is not None:
            existing = self._edges[existing_id]
            existing.weight += edge.weight
            from datetime import datetime, timezone
            existing.updated_at = datetime.now(timezone.utc)
            return existing

        self._edges[edge.id] = edge
        self._adjacency.setdefault(edge.source_id, {})[edge.target_id] = edge.id
        return edge

    def get_edge(self, edge_id: str) -> Optional[ConceptEdge]:
        return self._edges.get(edge_id)

    def get_all_edges(self) -> list[ConceptEdge]:
        return list(self._edges.values())

    def edge_count(self) -> int:
        return len(self._edges)

    # ------------------------------------------------------------------
    # Traversal
    # ------------------------------------------------------------------

    def get_neighbours(self, concept_id: str) -> list[Concept]:
        """Return all concepts directly reachable from the given concept."""
        neighbour_ids: set[str] = set()

        # Outgoing edges
        outgoing = self._adjacency.get(concept_id, {})
        neighbour_ids.update(outgoing.keys())

        # Incoming edges (scan all adjacency for edges pointing TO concept_id)
        for source_id, targets in self._adjacency.items():
            if concept_id in targets:
                neighbour_ids.add(source_id)

        return [self._concepts[nid] for nid in neighbour_ids if nid in self._concepts]

    def get_connected_concepts(
        self,
        concept_id: str,
        min_weight: int = 1,
    ) -> list[tuple[Concept, int]]:
        """Return (concept, weight) pairs connected to the given concept.

        Only edges with weight >= min_weight are included.
        Both outgoing and incoming edges are considered.
        """
        results: dict[str, int] = {}

        # Outgoing
        for target_id, edge_id in self._adjacency.get(concept_id, {}).items():
            edge = self._edges.get(edge_id)
            if edge is not None and edge.weight >= min_weight:
                results.setdefault(target_id, 0)
                results[target_id] += edge.weight

        # Incoming
        for source_id, targets in self._adjacency.items():
            if source_id == concept_id:
                continue
            edge_id = targets.get(concept_id)
            if edge_id is not None:
                edge = self._edges.get(edge_id)
                if edge is not None and edge.weight >= min_weight:
                    results.setdefault(source_id, 0)
                    results[source_id] += edge.weight

        return [
            (self._concepts[cid], weight)
            for cid, weight in sorted(results.items(), key=lambda x: -x[1])
            if cid in self._concepts
        ]

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _find_edge_id(
        self,
        source_id: str,
        target_id: str,
        relation: str,
    ) -> Optional[str]:
        """Return the edge ID for a given (source, target, relation) if it exists."""
        targets = self._adjacency.get(source_id)
        if targets is None:
            return None
        edge_id = targets.get(target_id)
        if edge_id is None:
            return None
        edge = self._edges.get(edge_id)
        if edge is not None and edge.relation == relation:
            return edge_id
        return None
