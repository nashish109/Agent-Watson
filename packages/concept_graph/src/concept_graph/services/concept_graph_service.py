"""ConceptGraphService — stateless operations over a ConceptGraph instance.

Responsibilities:
  - Create or retrieve concepts (dedup by normalised name).
  - Create or update edges between concepts (increment weight on repeat).
  - Retrieve neighbours and connected concepts.
  - Merge duplicate concepts (same name, different IDs).

All methods accept a ConceptGraph instance (injected) — the service itself
holds no state.
"""

from typing import Optional

from concept_graph.domain.concept import Concept, ConceptCategory
from concept_graph.domain.concept_edge import ConceptEdge
from concept_graph.domain.concept_graph import ConceptGraph


class ConceptGraphService:
    """Stateless service that operates on a ConceptGraph instance."""

    # ------------------------------------------------------------------
    # Concepts
    # ------------------------------------------------------------------

    def create_concept(
        self,
        graph: ConceptGraph,
        name: str,
        category: ConceptCategory = ConceptCategory.GENERAL,
    ) -> Concept:
        """Create a new concept or return the existing one with the same name.

        If a concept with the same normalised name already exists, the
        existing concept is returned (its aliases are extended and its
        updated_at is refreshed inside ConceptGraph.add_concept).
        """
        concept = Concept(name=name.strip(), category=category)
        return graph.add_concept(concept)

    def find_by_name(self, graph: ConceptGraph, name: str) -> Optional[Concept]:
        """Look up a concept by its normalised name."""
        return graph.get_concept_by_name(name)

    def merge_duplicates(self, graph: ConceptGraph) -> int:
        """Merge concepts that share the same normalised name.

        When multiple concepts with the same name exist, the first one
        (by creation order) is kept and all edges pointing to the others
        are re-pointed to the survivor.

        This is a maintenance operation; under normal conditions the
        dedup in add_concept prevents duplicates from forming.

        Returns:
            The number of concepts that were merged (removed).
        """
        # Build name → [concept_id] mapping
        name_groups: dict[str, list[str]] = {}
        for cid, concept in graph._concepts.items():
            key = concept.name.strip().lower()
            name_groups.setdefault(key, []).append(cid)

        merged_count = 0
        for key, cids in name_groups.items():
            if len(cids) <= 1:
                continue
            survivor_id = cids[0]
            for victim_id in cids[1:]:
                self._merge_concept(graph, survivor_id, victim_id)
                merged_count += 1

        return merged_count

    @staticmethod
    def _merge_concept(graph: ConceptGraph, survivor_id: str, victim_id: str) -> None:
        """Redirect all edges from victim_id to survivor_id, then remove the victim."""
        victim = graph.get_concept(victim_id)
        survivor = graph.get_concept(survivor_id)
        if victim is None or survivor is None:
            return

        # Collect edge IDs where victim is source or target
        edges_to_rewire: list[str] = []

        for edge_id, edge in list(graph._edges.items()):
            if edge.source_id == victim_id or edge.target_id == victim_id:
                edges_to_rewire.append(edge_id)

        for edge_id in edges_to_rewire:
            edge = graph._edges[edge_id]
            new_source = survivor_id if edge.source_id == victim_id else edge.source_id
            new_target = survivor_id if edge.target_id == victim_id else edge.target_id

            # Skip self-loops
            if new_source == new_target:
                del graph._edges[edge_id]
                continue

            # Remove old adjacency entries
            if edge.source_id in graph._adjacency:
                graph._adjacency[edge.source_id].pop(edge.target_id, None)
                if not graph._adjacency[edge.source_id]:
                    del graph._adjacency[edge.source_id]

            # Update edge
            edge.source_id = new_source
            edge.target_id = new_target

            # Add new adjacency entry (increment weight if already exists)
            existing = graph._find_edge_id(new_source, new_target, edge.relation)
            if existing is not None:
                graph._edges[existing].weight += edge.weight
                del graph._edges[edge_id]
            else:
                graph._adjacency.setdefault(new_source, {})[new_target] = edge_id

        # Merge aliases
        for alias in victim.aliases:
            if alias not in survivor.aliases:
                survivor.aliases.append(alias)

        # Remove victim
        graph._concepts.pop(victim_id, None)
        nkey = victim.name.strip().lower()
        if graph._name_index.get(nkey) == victim_id:
            graph._name_index[nkey] = survivor_id

    # ------------------------------------------------------------------
    # Edges
    # ------------------------------------------------------------------

    def create_edge(
        self,
        graph: ConceptGraph,
        source_id: str,
        target_id: str,
        relation: str = "related_to",
        weight: int = 1,
    ) -> ConceptEdge:
        """Create an edge between two concepts, or increment weight if it exists.

        Args:
            graph: The concept graph instance.
            source_id: Source concept ID.
            target_id: Target concept ID.
            relation: Edge label (default "related_to").
            weight: Weight to add (default 1).

        Returns:
            The (possibly pre-existing, weight-incremented) edge.
        """
        # Create edges in both directions so lookups are symmetric
        edge = ConceptEdge(
            source_id=source_id,
            target_id=target_id,
            relation=relation,
            weight=weight,
        )
        return graph.add_edge(edge)

    def get_neighbours(
        self,
        graph: ConceptGraph,
        concept_id: str,
    ) -> list[Concept]:
        """Retrieve all concepts directly connected to the given concept."""
        return graph.get_neighbours(concept_id)

    def get_connected_concepts(
        self,
        graph: ConceptGraph,
        concept_id: str,
        min_weight: int = 1,
    ) -> list[tuple[Concept, int]]:
        """Retrieve (concept, weight) for all concepts connected with at least min_weight.

        Results are sorted by descending total weight.
        """
        return graph.get_connected_concepts(concept_id, min_weight=min_weight)

    # ------------------------------------------------------------------
    # Bulk: extract concepts + link from memories
    # ------------------------------------------------------------------

    def extract_and_link(
        self,
        graph: ConceptGraph,
        memory_type: str,
        topic: str,
    ) -> tuple[list[Concept], list[ConceptEdge]]:
        """Extract concepts from a memory and link them in the graph.

        This is a convenience method that runs the ConceptExtractor and
        immediately stores the results in the graph. Because a single memory
        currently yields at most one concept, no intra-contribution edges
        are created here — edges are formed across memories within a session.

        Args:
            graph: The concept graph instance.
            memory_type: MemoryType value (e.g. \"Learning\").
            topic: Memory topic string.

        Returns:
            (list of created/retrieved concepts, list of created/updated edges).
            Edges list is currently empty; reserved for future multi-concept
            extraction.
        """
        from concept_graph.services.concept_extractor import ConceptExtractor

        raw = ConceptExtractor.extract(memory_type, topic)
        stored: list[Concept] = []
        edges: list[ConceptEdge] = []

        for concept in raw:
            stored.append(graph.add_concept(concept))

        return stored, edges

    def link_concepts(
        self,
        graph: ConceptGraph,
        concept_ids: list[str],
        relation: str = "related_to",
    ) -> list[ConceptEdge]:
        """Create edges between all pairs of concepts in the list.

        This is used to link all concepts that appeared together in the
        same contribution or session.

        Args:
            graph: The concept graph instance.
            concept_ids: List of concept IDs that co-occurred.
            relation: Edge label for all pairs.

        Returns:
            List of all created/updated edges.
        """
        edges: list[ConceptEdge] = []
        for i in range(len(concept_ids)):
            for j in range(i + 1, len(concept_ids)):
                edge = self.create_edge(graph, concept_ids[i], concept_ids[j], relation)
                edges.append(edge)
        return edges
