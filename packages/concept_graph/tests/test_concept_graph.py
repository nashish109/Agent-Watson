"""Tests for ConceptGraph (in-memory store)."""

from concept_graph.domain.concept import Concept, ConceptCategory
from concept_graph.domain.concept_edge import ConceptEdge
from concept_graph.domain.concept_graph import ConceptGraph


# ===================================================================
# Concepts
# ===================================================================

class TestConcepts:
    def test_add_and_retrieve_by_id(self):
        g = ConceptGraph()
        c = Concept(name="Kafka")
        g.add_concept(c)
        assert g.get_concept(c.id) is c

    def test_add_and_retrieve_by_name(self):
        g = ConceptGraph()
        g.add_concept(Concept(name="Kafka"))
        found = g.get_concept_by_name("Kafka")
        assert found is not None
        assert found.name == "Kafka"

    def test_duplicate_name_returns_existing(self):
        g = ConceptGraph()
        c1 = g.add_concept(Concept(name="Kafka"))
        c2 = Concept(name="Kafka")
        result = g.add_concept(c2)
        assert result.id == c1.id
        assert g.concept_count() == 1

    def test_case_insensitive_dedup(self):
        g = ConceptGraph()
        c1 = g.add_concept(Concept(name="Kafka"))
        result = g.add_concept(Concept(name="kafka"))
        assert result.id == c1.id

    def test_duplicate_adds_alias(self):
        g = ConceptGraph()
        g.add_concept(Concept(name="Kafka"))
        # Same normalised name with different casing — triggers alias addition
        g.add_concept(Concept(name="kafka"))
        c = g.get_concept_by_name("Kafka")
        assert c is not None
        assert "kafka" in c.aliases

    def test_has_concept(self):
        g = ConceptGraph()
        g.add_concept(Concept(name="Kafka"))
        assert g.has_concept("Kafka") is True
        assert g.has_concept("kafka") is True
        assert g.has_concept("Rust") is False

    def test_get_all_concepts(self):
        g = ConceptGraph()
        g.add_concept(Concept(name="Kafka"))
        g.add_concept(Concept(name="Rust"))
        assert len(g.get_all_concepts()) == 2

    def test_concept_count(self):
        g = ConceptGraph()
        assert g.concept_count() == 0
        g.add_concept(Concept(name="Kafka"))
        assert g.concept_count() == 1


# ===================================================================
# Edges
# ===================================================================

class TestEdges:
    def test_add_and_retrieve(self):
        g = ConceptGraph()
        e = ConceptEdge(source_id="a", target_id="b")
        g.add_edge(e)
        assert g.get_edge(e.id) is e

    def test_duplicate_edge_increments_weight(self):
        g = ConceptGraph()
        e1 = g.add_edge(ConceptEdge(source_id="a", target_id="b"))
        e2 = g.add_edge(ConceptEdge(source_id="a", target_id="b"))
        assert e1.id == e2.id
        assert e2.weight == 2  # incremented

    def test_different_relation_not_duplicate(self):
        g = ConceptGraph()
        e1 = g.add_edge(ConceptEdge(source_id="a", target_id="b", relation="related_to"))
        e2 = g.add_edge(ConceptEdge(source_id="a", target_id="b", relation="part_of"))
        assert e1.id != e2.id
        assert g.edge_count() == 2

    def test_get_all_edges(self):
        g = ConceptGraph()
        g.add_edge(ConceptEdge(source_id="a", target_id="b"))
        g.add_edge(ConceptEdge(source_id="c", target_id="d"))
        assert len(g.get_all_edges()) == 2

    def test_edge_count(self):
        g = ConceptGraph()
        assert g.edge_count() == 0
        g.add_edge(ConceptEdge(source_id="a", target_id="b"))
        assert g.edge_count() == 1


# ===================================================================
# Traversal
# ===================================================================

class TestTraversal:
    def test_get_neighbours_outgoing(self):
        g = ConceptGraph()
        ca = g.add_concept(Concept(name="A"))
        cb = g.add_concept(Concept(name="B"))
        g.add_edge(ConceptEdge(source_id=ca.id, target_id=cb.id))
        neighbours = g.get_neighbours(ca.id)
        assert len(neighbours) == 1
        assert neighbours[0].id == cb.id

    def test_get_neighbours_incoming(self):
        g = ConceptGraph()
        ca = g.add_concept(Concept(name="A"))
        cb = g.add_concept(Concept(name="B"))
        g.add_edge(ConceptEdge(source_id=ca.id, target_id=cb.id))
        neighbours = g.get_neighbours(cb.id)  # incoming
        assert len(neighbours) == 1
        assert neighbours[0].id == ca.id

    def test_get_neighbours_no_edges(self):
        g = ConceptGraph()
        ca = g.add_concept(Concept(name="A"))
        assert g.get_neighbours(ca.id) == []

    def test_get_neighbours_unknown_id(self):
        g = ConceptGraph()
        assert g.get_neighbours("nonexistent") == []

    def test_connected_concepts(self):
        g = ConceptGraph()
        ca = g.add_concept(Concept(name="A"))
        cb = g.add_concept(Concept(name="B"))
        g.add_edge(ConceptEdge(source_id=ca.id, target_id=cb.id))
        connected = g.get_connected_concepts(ca.id)
        assert len(connected) == 1
        assert connected[0][0].id == cb.id
        assert connected[0][1] == 1

    def test_connected_concepts_min_weight(self):
        g = ConceptGraph()
        ca = g.add_concept(Concept(name="A"))
        cb = g.add_concept(Concept(name="B"))
        g.add_edge(ConceptEdge(source_id=ca.id, target_id=cb.id, weight=1))
        assert len(g.get_connected_concepts(ca.id, min_weight=2)) == 0
        assert len(g.get_connected_concepts(ca.id, min_weight=1)) == 1

    def test_connected_concepts_descending_weight(self):
        g = ConceptGraph()
        ca = g.add_concept(Concept(name="A"))
        cb = g.add_concept(Concept(name="B"))
        cc = g.add_concept(Concept(name="C"))
        g.add_edge(ConceptEdge(source_id=ca.id, target_id=cb.id, weight=3))
        g.add_edge(ConceptEdge(source_id=ca.id, target_id=cc.id, weight=1))
        connected = g.get_connected_concepts(ca.id)
        assert connected[0][0].id == cb.id  # weight 3 first
        assert connected[1][0].id == cc.id  # weight 1 second
