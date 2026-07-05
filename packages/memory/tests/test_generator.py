"""Unit tests for the reflection generator."""

from memory.generator import generate
from memory.models import Memory, MemoryType, Reflection


def _make_memory(type_: MemoryType, topic: str = "test topic") -> Memory:
    return Memory(type=type_, topic=topic, summary="test", contribution_id="c1")


def _make_reflection_memory(topic: str = "reflection") -> Memory:
    return Memory(
        type=MemoryType.GENERIC,
        topic=topic,
        summary="test",
        contribution_id="c1",
        display_label="Reflection",
    )


class TestTemplateSelection:
    def test_learning_reflection(self):
        r = generate(_make_memory(MemoryType.LEARNING, "Kafka partitions"))
        # Template may or may not include the topic — just verify it's a
        # Learning-category template
        assert any(
            phrase in r.text.lower()
            for phrase in ("learning", "understand", "knowledge")
        )

    def test_project_reflection(self):
        r = generate(_make_memory(MemoryType.PROJECT, "the CLI tool"))
        assert any(
            phrase in r.text.lower()
            for phrase in ("progress", "milestone", "forward", "recorded")
        )

    def test_career_reflection(self):
        r = generate(_make_memory(MemoryType.CAREER, "interview"))
        assert "career" in r.text.lower() or "professional" in r.text.lower()

    def test_health_reflection(self):
        r = generate(_make_memory(MemoryType.HEALTH, "gym session"))
        assert any(
            phrase in r.text.lower()
            for phrase in ("wellbeing", "health", "taking care of yourself")
        )

    def test_generic_reflection(self):
        r = generate(_make_memory(MemoryType.GENERIC, "random note"))
        assert any(
            phrase in r.text.lower()
            for phrase in ("remember", "captured", "later")
        )

    def test_reflection_intent_template(self):
        r = generate(_make_reflection_memory("felt stressed"))
        assert any(
            phrase in r.text.lower()
            for phrase in ("reflection", "feeling", "awareness", "remember")
        )


class TestTemplateVariation:
    def test_different_memories_eventually_diverge(self):
        """With enough distinct memories, at least 2 get different templates."""
        texts = set()
        for i in range(10):
            m = Memory(
                type=MemoryType.LEARNING, topic=f"topic-{i}",
                summary="s", contribution_id=f"c{i}",
            )
            texts.add(generate(m).text)
        assert len(texts) > 1, (
            "All 10 Learning memories got the same template — "
            "extremely unlikely (1 in 4^9 ≈ 1/262k)"
        )

    def test_same_id_gets_same_template(self):
        """Identical Memory ID always selects the same template."""
        m1 = Memory(
            id="fixed-id", type=MemoryType.LEARNING, topic="Kafka",
            summary="s", contribution_id="c1",
        )
        m2 = Memory(
            id="fixed-id", type=MemoryType.LEARNING, topic="Kafka",
            summary="s", contribution_id="c1",
        )
        r1 = generate(m1)
        r2 = generate(m2)
        assert r1.text == r2.text


class TestReflectionModel:
    def test_return_type(self):
        m = _make_memory(MemoryType.LEARNING)
        r = generate(m)
        assert isinstance(r, Reflection)

    def test_memory_id_linked(self):
        m = _make_memory(MemoryType.LEARNING)
        r = generate(m)
        assert r.memory_id == m.id

    def test_created_at_set(self):
        m = _make_memory(MemoryType.LEARNING)
        r = generate(m)
        assert r.created_at is not None
