"""Tests for Concept domain model."""

from concept_graph.domain.concept import Concept, ConceptCategory


class TestConceptCreation:
    def test_minimal(self):
        c = Concept(name="Kafka")
        assert c.name == "Kafka"
        assert c.category == ConceptCategory.GENERAL
        assert c.id is not None
        assert c.created_at is not None
        assert c.updated_at is not None

    def test_with_category(self):
        c = Concept(name="Kafka", category=ConceptCategory.TECHNOLOGY)
        assert c.category == ConceptCategory.TECHNOLOGY

    def test_aliases_defaults_empty(self):
        c = Concept(name="Kafka")
        assert c.aliases == []

    def test_with_aliases(self):
        c = Concept(name="Kafka", aliases=["kafka", "apache kafka"])
        assert len(c.aliases) == 2

    def test_unique_ids(self):
        c1 = Concept(name="Kafka")
        c2 = Concept(name="Kafka")
        assert c1.id != c2.id
