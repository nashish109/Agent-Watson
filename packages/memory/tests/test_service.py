"""Unit tests for the MemoryService orchestrator."""

from memory.models import Contribution, MemoryType
from memory.intent import IntentType
from memory.service import MemoryResult, MemoryService


class TestMemoryService:
    def setup_method(self):
        self.service = MemoryService()

    def test_process_returns_result(self):
        c = Contribution(text="Learned Kafka partitions", source="test")
        result = self.service.process(c)
        assert isinstance(result, MemoryResult)
        assert result.contribution == c

    def test_process_learning_flow(self):
        c = Contribution(text="Learned Kafka partitions", source="test")
        result = self.service.process(c)
        assert result.intent.intent == IntentType.LEARNING
        assert len(result.memories) == 1
        assert result.memories[0].type == MemoryType.LEARNING
        assert len(result.reflections) == 1
        assert result.memories[0].id == result.reflections[0].memory_id

    def test_process_generic_flow(self):
        c = Contribution(text="Had a relaxing weekend", source="test")
        result = self.service.process(c)
        assert result.intent.intent == IntentType.GENERIC
        assert len(result.memories) == 1
        assert result.memories[0].type == MemoryType.GENERIC
        assert len(result.reflections) == 1

    def test_process_with_intent_produces_single_type(self):
        """With IntentClassifier, multi-keyword text produces one intent."""
        c = Contribution(text="Learned Python and built a CLI tool", source="test")
        result = self.service.process(c)
        # IntentClassifier classifies this as LEARNING (first match)
        assert result.intent.intent == IntentType.LEARNING
        assert len(result.memories) == 1
        assert result.memories[0].type == MemoryType.LEARNING
        assert len(result.reflections) == 1
        assert result.reflections[0].memory_id == result.memories[0].id

    def test_process_reflection_content(self):
        c = Contribution(text="Learned Kafka partitions", source="test")
        result = self.service.process(c)
        assert len(result.reflections) == 1
        text = result.reflections[0].text
        assert any(
            phrase in text.lower()
            for phrase in ("learning", "remember", "understanding", "knowledge")
        )

    def test_question_intent_no_memories(self):
        c = Contribution(text="Who are you?", source="test")
        result = self.service.process(c)
        assert result.intent.intent == IntentType.QUESTION
        assert result.memories == []
        assert result.reflections == []
        assert result.response is not None

    def test_reflection_intent(self):
        c = Contribution(text="I felt proud today", source="test")
        result = self.service.process(c)
        assert result.intent.intent == IntentType.REFLECTION
        assert len(result.memories) == 1
        assert result.memories[0].display_label == "Reflection"
        assert len(result.reflections) == 1
