"""Tests for ConceptExtractor."""

from concept_graph.domain.concept import ConceptCategory
from concept_graph.services.concept_extractor import ConceptExtractor, _clean_topic


class TestCleanTopic:
    def test_simple_topic(self):
        assert _clean_topic("Kafka partitions") == "Kafka partitions"

    def test_strips_stop_words(self):
        # "about" is a stop word and gets removed; "Learned" is content
        result = _clean_topic("Learned about Kafka")
        assert "about" not in result
        assert "Learned" in result
        assert "Kafka" in result

    def test_strips_punctuation(self):
        assert _clean_topic("Kafka!") == "Kafka"

    def test_empty_result(self):
        assert _clean_topic("a an the") == ""

    def test_all_stop_words(self):
        assert _clean_topic("my today i") == ""


class TestExtract:
    def test_learning_memory(self):
        concepts = ConceptExtractor.extract("Learning", "Kafka partitions")
        assert len(concepts) == 1
        assert concepts[0].name == "Kafka partitions"
        assert concepts[0].category == ConceptCategory.LEARNING

    def test_project_memory(self):
        concepts = ConceptExtractor.extract("Project", "Agent Watson")
        assert len(concepts) == 1
        assert concepts[0].name == "Agent Watson"
        assert concepts[0].category == ConceptCategory.PROJECT

    def test_career_memory(self):
        concepts = ConceptExtractor.extract("Career", "DTCC")
        assert len(concepts) == 1
        assert concepts[0].name == "DTCC"
        assert concepts[0].category == ConceptCategory.CAREER

    def test_health_memory(self):
        concepts = ConceptExtractor.extract("Health", "Gym")
        assert len(concepts) == 1
        assert concepts[0].name == "Gym"
        assert concepts[0].category == ConceptCategory.HEALTH

    def test_generic_memory(self):
        concepts = ConceptExtractor.extract("Generic", "Random note")
        assert len(concepts) == 1
        assert concepts[0].category == ConceptCategory.GENERAL

    def test_unknown_type_falls_back_to_general(self):
        concepts = ConceptExtractor.extract("Unknown", "Something")
        assert len(concepts) == 1
        assert concepts[0].category == ConceptCategory.GENERAL

    def test_empty_topic_uses_category_name(self):
        concepts = ConceptExtractor.extract("Learning", "a an the")
        assert len(concepts) == 1
        assert concepts[0].name == "Learning"  # fallback

    def test_strips_stop_words_from_topic(self):
        # "about" and "today" are stop words; "Learned" is kept as content
        concepts = ConceptExtractor.extract("Learning", "Learned about Kafka today")
        assert "about" not in concepts[0].name
        assert "today" not in concepts[0].name
