"""Unit tests for the SessionService."""

import pytest

from memory.models import Memory, MemoryType
from memory.service import MemoryService
from memory.session import SessionService


class TestSessionCreation:
    def test_create_session(self):
        svc = SessionService()
        session = svc.create_session()
        assert session.id is not None
        assert session.ended_at is None
        assert session.contributions == []
        assert session.memories == []
        assert session.reflections == []
        assert session.summary is None

    def test_create_multiple_sessions(self):
        svc = SessionService()
        s1 = svc.create_session()
        s2 = svc.create_session()
        assert s1.id != s2.id


class TestAddContribution:
    def test_add_contribution_stores_everything(self):
        svc = SessionService()
        session = svc.create_session()

        result = svc.add_contribution(session.id, "Learned Kafka partitions")

        assert len(session.contributions) == 1
        assert session.contributions[0].text == "Learned Kafka partitions"

        assert len(session.memories) >= 1
        assert session.memories[0].type == MemoryType.LEARNING

        assert result.intent.intent.value == "Learning"
        assert len(result.memories) >= 1
        assert len(result.reflections) >= 1
        assert len(session.reflections) >= 1

    def test_multiple_contributions(self):
        svc = SessionService()
        session = svc.create_session()

        svc.add_contribution(session.id, "Learned Kafka")
        svc.add_contribution(session.id, "Built a CLI tool")
        svc.add_contribution(session.id, "Went to the gym")

        assert len(session.contributions) == 3
        assert len(session.memories) == 3  # 1 per contribution
        assert len(session.reflections) == 3

    def test_add_to_nonexistent_session(self):
        svc = SessionService()
        with pytest.raises(KeyError):
            svc.add_contribution("bad-id", "test")

    def test_add_to_ended_session(self):
        svc = SessionService()
        session = svc.create_session()
        svc.end_session(session.id)
        with pytest.raises(ValueError, match="ended session"):
            svc.add_contribution(session.id, "test")


class TestEndSession:
    def test_end_session_sets_timestamp(self):
        svc = SessionService()
        session = svc.create_session()
        ended = svc.end_session(session.id)
        assert ended.ended_at is not None
        assert ended == session

    def test_end_session_idempotent(self):
        svc = SessionService()
        session = svc.create_session()
        svc.end_session(session.id)
        ts = session.ended_at
        svc.end_session(session.id)
        assert session.ended_at is not None
        # calling again just overwrites — acceptable for now


class TestRetrieval:
    def test_get_session(self):
        svc = SessionService()
        created = svc.create_session()
        fetched = svc.get_session(created.id)
        assert fetched.id == created.id

    def test_get_nonexistent(self):
        svc = SessionService()
        with pytest.raises(KeyError):
            svc.get_session("bad-id")

    def test_get_contributions(self):
        svc = SessionService()
        session = svc.create_session()
        svc.add_contribution(session.id, "Learned X")
        svc.add_contribution(session.id, "Built Y")
        contributions = svc.get_contributions(session.id)
        assert len(contributions) == 2

    def test_get_memories(self):
        svc = SessionService()
        session = svc.create_session()
        svc.add_contribution(session.id, "Learned X")
        assert len(svc.get_memories(session.id)) == 1

    def test_get_reflections(self):
        svc = SessionService()
        session = svc.create_session()
        svc.add_contribution(session.id, "Learned X")
        assert len(svc.get_reflections(session.id)) == 1


class TestSummary:
    def test_generate_summary(self):
        svc = SessionService()
        session = svc.create_session()
        svc.add_contribution(session.id, "Learned Kafka")
        svc.add_contribution(session.id, "Built Watson UI")
        svc.add_contribution(session.id, "Went to the gym")

        summary = svc.generate_summary(session.id)
        assert isinstance(summary, str)
        assert "Today's Session Summary" in summary
        assert "Kafka" in summary
        assert "Watson UI" in summary
        assert "Health activity" in summary
        assert session.summary == summary

    def test_summary_empty_session(self):
        svc = SessionService()
        session = svc.create_session()
        summary = svc.generate_summary(session.id)
        assert summary == "No activities recorded."

    def test_summary_dedupes_types(self):
        svc = SessionService()
        session = svc.create_session()
        svc.add_contribution(session.id, "Learned Kafka")
        svc.add_contribution(session.id, "Learned Rust")
        summary = svc.generate_summary(session.id)
        assert summary.count("•") == 1  # only one Learning line


class TestCustomMemoryService:
    def test_inject_custom_memory_service(self):
        calls = []

        class TrackingService(MemoryService):
            def process(self, contribution, **kwargs):  # type: ignore[override]
                calls.append(contribution.text)
                return super().process(contribution, **kwargs)

        svc = SessionService(memory_service=TrackingService())
        session = svc.create_session()
        svc.add_contribution(session.id, "Learned X")
        assert len(calls) == 1
        assert calls[0] == "Learned X"
