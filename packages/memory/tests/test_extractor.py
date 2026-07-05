"""Unit tests for the deterministic memory extractor."""

from memory.extractor import extract
from memory.models import Contribution, MemoryType


def _contrib(text: str) -> Contribution:
    return Contribution(text=text, source="test")


class TestKeywordRules:
    def test_learned_learning(self):
        c = _contrib("Today I learned Kafka partitions.")
        memories = extract(c)
        assert len(memories) == 1
        assert memories[0].type == MemoryType.LEARNING
        assert "Kafka partitions" in memories[0].topic
        assert memories[0].confidence == 0.7

    def test_learning_learning(self):
        c = _contrib("I am learning Rust lifetimes.")
        memories = extract(c)
        assert len(memories) == 1
        assert memories[0].type == MemoryType.LEARNING

    def test_studied_learning(self):
        c = _contrib("Studied quantum mechanics today.")
        memories = extract(c)
        assert len(memories) == 1
        assert memories[0].type == MemoryType.LEARNING

    def test_built_project(self):
        c = _contrib("Built a REST API with FastAPI.")
        memories = extract(c)
        assert len(memories) == 1
        assert memories[0].type == MemoryType.PROJECT

    def test_interview_career(self):
        c = _contrib("Had a technical interview at Google.")
        memories = extract(c)
        assert len(memories) == 1
        assert memories[0].type == MemoryType.CAREER
        assert memories[0].confidence == 0.8

    def test_gym_health(self):
        c = _contrib("Went to the gym and did chest day.")
        memories = extract(c)
        assert len(memories) == 1
        assert memories[0].type == MemoryType.HEALTH


class TestGenericFallback:
    def test_no_keyword_generic(self):
        c = _contrib("Had a nice lunch with friends.")
        memories = extract(c)
        assert len(memories) == 1
        assert memories[0].type == MemoryType.GENERIC
        assert memories[0].confidence == 0.4

    def test_empty_text_generic(self):
        c = _contrib("")
        memories = extract(c)
        assert len(memories) == 1
        assert memories[0].type == MemoryType.GENERIC


class TestMultipleMatches:
    def test_two_keywords_two_memories(self):
        c = _contrib("Learned Python and built a CLI tool.")
        memories = extract(c)
        types = {m.type for m in memories}
        assert MemoryType.LEARNING in types
        assert MemoryType.PROJECT in types
        assert len(memories) == 2

    def test_learning_and_interview(self):
        c = _contrib("Learned system design and had an interview.")
        memories = extract(c)
        assert len(memories) == 2
        types = {m.type for m in memories}
        assert MemoryType.LEARNING in types
        assert MemoryType.CAREER in types


class TestTopicExtraction:
    def test_topic_after_learned(self):
        c = _contrib("Learned Kafka partitions")
        memories = extract(c)
        assert memories[0].type == MemoryType.LEARNING
        assert "Kafka partitions" in memories[0].topic

    def test_topic_after_built(self):
        c = _contrib("Built a CLI tool")
        memories = extract(c)
        assert memories[0].type == MemoryType.PROJECT
        assert "a CLI tool" in memories[0].topic


class TestContributionLink:
    def test_memory_links_to_contribution(self):
        c = _contrib("Learned something new")
        memories = extract(c)
        for m in memories:
            assert m.contribution_id == c.id
