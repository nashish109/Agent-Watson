"""Tests for ConceptEdge domain model."""

from concept_graph.domain.concept_edge import ConceptEdge


class TestConceptEdgeCreation:
    def test_minimal(self):
        e = ConceptEdge(source_id="a", target_id="b")
        assert e.source_id == "a"
        assert e.target_id == "b"
        assert e.relation == "related_to"
        assert e.weight == 1
        assert e.id is not None

    def test_custom_relation(self):
        e = ConceptEdge(source_id="a", target_id="b", relation="part_of")
        assert e.relation == "part_of"

    def test_custom_weight(self):
        e = ConceptEdge(source_id="a", target_id="b", weight=5)
        assert e.weight == 5

    def test_unique_ids(self):
        e1 = ConceptEdge(source_id="a", target_id="b")
        e2 = ConceptEdge(source_id="a", target_id="b")
        assert e1.id != e2.id
