"""Tests for ConceptGraphService."""

from concept_graph.domain.concept import Concept, ConceptCategory
from concept_graph.domain.concept_graph import ConceptGraph
from concept_graph.services.concept_graph_service import ConceptGraphService


# ===================================================================
# Concepts
# ===================================================================

class TestCreateConcept:
    def test_creates_new_concept(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        c = svc.create_concept(g, "Kafka", ConceptCategory.TECHNOLOGY)
        assert c.name == "Kafka"
        assert c.category == ConceptCategory.TECHNOLOGY
        assert g.concept_count() == 1

    def test_dedup_returns_existing(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        c1 = svc.create_concept(g, "Kafka")
        c2 = svc.create_concept(g, "Kafka")
        assert c1.id == c2.id
        assert g.concept_count() == 1

    def test_case_insensitive_dedup(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        c1 = svc.create_concept(g, "Kafka")
        c2 = svc.create_concept(g, "kafka")
        assert c1.id == c2.id


class TestFindByName:
    def test_found(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        svc.create_concept(g, "Kafka")
        found = svc.find_by_name(g, "Kafka")
        assert found is not None
        assert found.name == "Kafka"

    def test_not_found(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        assert svc.find_by_name(g, "Nonexistent") is None


class TestMergeDuplicates:
    def test_no_duplicates(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        svc.create_concept(g, "Kafka")
        svc.create_concept(g, "Rust")
        assert svc.merge_duplicates(g) == 0

    def test_duplicates_merged(self):
        g = ConceptGraph()
        svc = ConceptGraphService()

        # Manually add two concepts with same name (bypass dedup)
        c1 = Concept(name="Kafka", category=ConceptCategory.TECHNOLOGY)
        c2 = Concept(name="Kafka", category=ConceptCategory.LEARNING)
        g._concepts[c1.id] = c1
        g._concepts[c2.id] = c2
        g._name_index["kafka"] = c1.id

        assert g.concept_count() == 2
        merged = svc.merge_duplicates(g)
        assert merged == 1
        assert g.concept_count() == 1


# ===================================================================
# Edges
# ===================================================================

class TestCreateEdge:
    def test_creates_edge(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        ca = svc.create_concept(g, "A")
        cb = svc.create_concept(g, "B")
        edge = svc.create_edge(g, ca.id, cb.id)
        assert edge.source_id == ca.id
        assert edge.target_id == cb.id
        assert edge.weight == 1
        assert g.edge_count() == 1

    def test_duplicate_edge_increments_weight(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        ca = svc.create_concept(g, "A")
        cb = svc.create_concept(g, "B")
        e1 = svc.create_edge(g, ca.id, cb.id)
        e2 = svc.create_edge(g, ca.id, cb.id)
        assert e1.id == e2.id
        assert e2.weight == 2

    def test_custom_relation(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        ca = svc.create_concept(g, "A")
        cb = svc.create_concept(g, "B")
        edge = svc.create_edge(g, ca.id, cb.id, relation="part_of")
        assert edge.relation == "part_of"


# ===================================================================
# Traversal
# ===================================================================

class TestNeighbours:
    def test_get_neighbours(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        ca = svc.create_concept(g, "A")
        cb = svc.create_concept(g, "B")
        svc.create_edge(g, ca.id, cb.id)
        neighbours = svc.get_neighbours(g, ca.id)
        assert len(neighbours) == 1
        assert neighbours[0].id == cb.id

    def test_no_neighbours(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        ca = svc.create_concept(g, "A")
        assert svc.get_neighbours(g, ca.id) == []


class TestConnectedConcepts:
    def test_connected_concepts(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        ca = svc.create_concept(g, "A")
        cb = svc.create_concept(g, "B")
        svc.create_edge(g, ca.id, cb.id)
        connected = svc.get_connected_concepts(g, ca.id)
        assert len(connected) == 1
        assert connected[0][0].id == cb.id
        assert connected[0][1] >= 1

    def test_min_weight_filter(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        ca = svc.create_concept(g, "A")
        cb = svc.create_concept(g, "B")
        svc.create_edge(g, ca.id, cb.id, weight=1)
        assert len(svc.get_connected_concepts(g, ca.id, min_weight=2)) == 0


# ===================================================================
# Bulk: extract and link
# ===================================================================

class TestExtractAndLink:
    def test_extract_and_link_stores_concept(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        concepts, edges = svc.extract_and_link(g, "Learning", "Kafka partitions")
        assert len(concepts) == 1
        assert concepts[0].name == "Kafka partitions"
        assert g.has_concept("Kafka partitions")
        assert len(edges) == 0

    def test_extract_and_link_dedup(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        c1, _ = svc.extract_and_link(g, "Learning", "Kafka partitions")
        c2, _ = svc.extract_and_link(g, "Project", "Kafka partitions")
        assert c1[0].id == c2[0].id  # same concept
        assert g.concept_count() == 1


class TestLinkConcepts:
    def test_link_two_concepts(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        ca = svc.create_concept(g, "A")
        cb = svc.create_concept(g, "B")
        edges = svc.link_concepts(g, [ca.id, cb.id])
        assert len(edges) == 1
        assert g.edge_count() == 1

    def test_link_three_concepts_all_pairs(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        ca = svc.create_concept(g, "A")
        cb = svc.create_concept(g, "B")
        cc = svc.create_concept(g, "C")
        edges = svc.link_concepts(g, [ca.id, cb.id, cc.id])
        assert len(edges) == 3  # A-B, A-C, B-C
        assert g.edge_count() == 3

    def test_link_concepts_repeat_increments_weight(self):
        g = ConceptGraph()
        svc = ConceptGraphService()
        ca = svc.create_concept(g, "A")
        cb = svc.create_concept(g, "B")
        svc.link_concepts(g, [ca.id, cb.id])
        svc.link_concepts(g, [ca.id, cb.id])
        edges = g.get_all_edges()
        assert len(edges) == 1
        assert edges[0].weight == 2
