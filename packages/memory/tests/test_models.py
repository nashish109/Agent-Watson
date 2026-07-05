"""Unit tests for domain models."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from memory.models import Contribution, Memory, MemoryType, Reflection, Session


class TestContribution:
    def test_minimal_creation(self):
        c = Contribution(text="Hello")
        assert c.text == "Hello"
        assert c.source == "unknown"
        assert c.tags == []
        assert isinstance(c.id, str)
        assert len(c.id) == 32  # hex UUID

    def test_with_all_fields(self):
        ts = datetime.now(timezone.utc)
        c = Contribution(
            text="Test", timestamp=ts, source="cli", tags=["dev", "test"]
        )
        assert c.source == "cli"
        assert c.tags == ["dev", "test"]
        assert c.timestamp == ts

    def test_text_required(self):
        with pytest.raises(ValidationError):
            Contribution()  # type: ignore[call-arg]

    def test_id_is_unique(self):
        c1 = Contribution(text="a")
        c2 = Contribution(text="b")
        assert c1.id != c2.id


class TestMemory:
    def test_minimal_creation(self):
        m = Memory(type=MemoryType.LEARNING, topic="Kafka", summary="test", contribution_id="abc")
        assert m.type == MemoryType.LEARNING
        assert m.topic == "Kafka"
        assert m.confidence == 0.5
        assert isinstance(m.id, str)

    def test_confidence_validation(self):
        with pytest.raises(ValidationError):
            Memory(
                type=MemoryType.LEARNING,
                topic="x",
                summary="x",
                contribution_id="x",
                confidence=1.5,
            )

    def test_confidence_range(self):
        m = Memory(
            type=MemoryType.LEARNING,
            topic="x",
            summary="x",
            contribution_id="x",
            confidence=0.0,
        )
        assert m.confidence == 0.0
        m.confidence = 1.0
        assert m.confidence == 1.0


class TestReflection:
    def test_minimal_creation(self):
        r = Reflection(memory_id="mem1", text="Nice reflection")
        assert r.memory_id == "mem1"
        assert r.text == "Nice reflection"
        assert isinstance(r.id, str)

    def test_memory_id_required(self):
        with pytest.raises(ValidationError):
            Reflection(text="bad")  # type: ignore[call-arg]


class TestSession:
    def test_minimal_creation(self):
        s = Session()
        assert isinstance(s.id, str)
        assert s.session_date == datetime.now(timezone.utc).strftime("%Y-%m-%d")
        assert s.contributions == []
        assert s.memories == []

    def test_with_contributions(self):
        c = Contribution(text="Hi")
        s = Session(contributions=[c])
        assert len(s.contributions) == 1
        assert s.contributions[0].text == "Hi"

    def test_ended_at_optional(self):
        s = Session()
        assert s.ended_at is None

    def test_ended_at_settable(self):
        ts = datetime.now(timezone.utc)
        s = Session(ended_at=ts)
        assert s.ended_at == ts
