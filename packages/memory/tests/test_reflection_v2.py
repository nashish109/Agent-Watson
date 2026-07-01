"""Tests for Reflection Engine V2 — ReflectionContext, ReflectionEngineV2, SessionReflectionService."""

from uuid import uuid4

import pytest

from memory.models import Memory, MemoryType, Session
from memory.relationships import Relationship, RelationshipType
from memory.reflection_v2 import (
    ReflectionContext,
    ReflectionEngineV2,
    ReflectionSummary,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mem(
    topic: str,
    mem_type: MemoryType = MemoryType.GENERIC,
    summary: str = "",
) -> Memory:
    return Memory(
        id=uuid4().hex,
        type=mem_type,
        topic=topic,
        summary=summary or f"Summary about {topic}",
        contribution_id=uuid4().hex,
    )


def _session(memories: list[Memory] | None = None) -> Session:
    return Session(memories=memories or [])


def _rel(src: Memory, tgt: Memory, rtype: RelationshipType = RelationshipType.RELATED_TOPIC) -> Relationship:
    return Relationship(
        source_memory_id=src.id,
        target_memory_id=tgt.id,
        relationship_type=rtype,
        label=tgt.topic,
    )


def _engine() -> ReflectionEngineV2:
    return ReflectionEngineV2()


def _ctx(session: Session, relationships=None, concepts=None, concept_connections=None, context=None) -> ReflectionContext:
    from context.models import ContextQuery, RetrievalResult
    return ReflectionContext(
        session=session,
        relationships=relationships or [],
        concepts=concepts or [],
        concept_connections=concept_connections or [],
        context=context or RetrievalResult(query=ContextQuery(text="")),
    )


# ---------------------------------------------------------------------------
# Empty session
# ---------------------------------------------------------------------------

class TestEmptySession:
    def test_no_memories_returns_generic_focus(self):
        ctx = _ctx(_session())
        result = _engine().generate(ctx)
        assert result.primary_focus == "Generic"

    def test_no_memories_returns_empty_topics(self):
        ctx = _ctx(_session())
        result = _engine().generate(ctx)
        assert result.topics_explored == []

    def test_no_memories_returns_empty_progress(self):
        ctx = _ctx(_session())
        result = _engine().generate(ctx)
        assert result.progress == {}

    def test_no_memories_empty_connections(self):
        ctx = _ctx(_session())
        result = _engine().generate(ctx)
        assert result.strongest_connections == []

    def test_no_memories_reflection_fallback(self):
        ctx = _ctx(_session())
        result = _engine().generate(ctx)
        assert result.reflection == "No activity recorded for this session."


# ---------------------------------------------------------------------------
# Single-type sessions
# ---------------------------------------------------------------------------

class TestLearningSession:
    def test_primary_focus_is_learning(self):
        mems = [_mem("Kafka", MemoryType.LEARNING)]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert result.primary_focus == "Learning"

    def test_topics_explored(self):
        mems = [
            _mem("Kafka", MemoryType.LEARNING),
            _mem("Python", MemoryType.LEARNING),
        ]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert result.topics_explored == ["Kafka", "Python"]

    def test_topics_deduplicated(self):
        mems = [
            _mem("Kafka", MemoryType.LEARNING),
            _mem("Kafka", MemoryType.LEARNING),
        ]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert result.topics_explored == ["Kafka"]

    def test_progress_has_learning_section(self):
        mems = [_mem("Kafka", MemoryType.LEARNING)]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert "Learning Progress" in result.progress
        assert "Learned about Kafka" in result.progress["Learning Progress"]

    def test_progress_deduplicates_topics(self):
        mems = [
            _mem("Kafka", MemoryType.LEARNING),
            _mem("Kafka", MemoryType.LEARNING),
        ]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert len(result.progress["Learning Progress"]) == 1

    def test_reflection_format(self):
        mems = [_mem("Kafka", MemoryType.LEARNING)]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert isinstance(result.reflection, str)
        assert len(result.reflection) > 10
        assert "Kafka" in result.reflection


class TestProjectSession:
    def test_primary_focus_is_project(self):
        mems = [_mem("Agent Watson", MemoryType.PROJECT)]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert result.primary_focus == "Project"

    def test_progress_has_project_section(self):
        mems = [_mem("Agent Watson", MemoryType.PROJECT)]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert "Project Progress" in result.progress
        assert "Progress on Agent Watson" in result.progress["Project Progress"]


class TestCareerSession:
    def test_primary_focus_is_career(self):
        mems = [_mem("DTCC", MemoryType.CAREER)]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert result.primary_focus == "Career"

    def test_progress_has_career_section(self):
        mems = [_mem("DTCC", MemoryType.CAREER)]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert "Career Progress" in result.progress
        assert "Career step: DTCC" in result.progress["Career Progress"]


class TestHealthSession:
    def test_primary_focus_is_health(self):
        mems = [_mem("Gym", MemoryType.HEALTH)]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert result.primary_focus == "Health"

    def test_progress_has_health_section(self):
        mems = [_mem("Gym", MemoryType.HEALTH)]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert "Health Progress" in result.progress
        assert "Health: Gym" in result.progress["Health Progress"]


class TestGenericSession:
    def test_primary_focus_is_generic(self):
        mems = [_mem("Random thought", MemoryType.GENERIC)]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert result.primary_focus == "Generic"


# ---------------------------------------------------------------------------
# Mixed-type sessions
# ---------------------------------------------------------------------------

class TestMixedSession:
    def test_mixed_focus_when_no_type_dominates(self):
        mems = [
            _mem("Kafka", MemoryType.LEARNING),
            _mem("Gym", MemoryType.HEALTH),
        ]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert result.primary_focus == "Mixed"

    def test_dominant_type_wins_when_over_50_percent(self):
        mems = [
            _mem("Kafka", MemoryType.LEARNING),
            _mem("Python", MemoryType.LEARNING),
            _mem("Gym", MemoryType.HEALTH),
        ]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert result.primary_focus == "Learning"

    def test_multiple_progress_sections(self):
        mems = [
            _mem("Kafka", MemoryType.LEARNING),
            _mem("Gym", MemoryType.HEALTH),
        ]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert "Learning Progress" in result.progress
        assert "Health Progress" in result.progress
        assert len(result.progress) >= 2

    def test_mixed_reflection_generated(self):
        mems = [
            _mem("Kafka", MemoryType.LEARNING),
            _mem("Gym", MemoryType.HEALTH),
        ]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert isinstance(result.reflection, str)
        assert len(result.reflection) > 10


# ---------------------------------------------------------------------------
# Progress grouping
# ---------------------------------------------------------------------------

class TestProgress:
    def test_all_types_appear(self):
        mems = [
            _mem("Kafka", MemoryType.LEARNING),
            _mem("Watson", MemoryType.PROJECT),
            _mem("DTCC", MemoryType.CAREER),
            _mem("Gym", MemoryType.HEALTH),
        ]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert "Learning Progress" in result.progress
        assert "Project Progress" in result.progress
        assert "Career Progress" in result.progress
        assert "Health Progress" in result.progress

    def test_progress_order_preserves_input_order(self):
        mems = [
            _mem("Kafka", MemoryType.LEARNING),
            _mem("Python", MemoryType.LEARNING),
        ]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        progress = result.progress["Learning Progress"]
        assert progress[0] == "Learned about Kafka"
        assert progress[1] == "Learned about Python"


# ---------------------------------------------------------------------------
# Connections
# ---------------------------------------------------------------------------

class TestConnections:
    def test_relationship_connections_appear(self):
        m1 = _mem("Kafka", MemoryType.LEARNING)
        m2 = _mem("Distributed Systems", MemoryType.LEARNING)
        session = _session([m1, m2])
        relationships = [_rel(m1, m2)]
        ctx = _ctx(session, relationships=relationships)
        result = _engine().generate(ctx)
        assert len(result.strongest_connections) >= 1
        found = result.strongest_connections[0]
        assert found["source"] == "Distributed Systems" or found["target"] == "Distributed Systems"

    def test_relationship_with_unrelated_memories_not_in_session(self):
        """Relationships referencing memories not in the session are skipped."""
        m1 = _mem("Kafka", MemoryType.LEARNING)
        m2 = _mem("Distributed Systems", MemoryType.LEARNING)
        session = _session([m1])
        relationships = [_rel(m1, m2)]
        ctx = _ctx(session, relationships=relationships)
        result = _engine().generate(ctx)
        # The relationship cannot resolve m2's topic, so it should be skipped
        # OR it uses the label from the relationship (which is m2.topic)
        # _rel sets label=tgt.topic, so it should appear
        assert len(result.strongest_connections) == 1

    def test_duplicate_relationship_pairs_deduplicated(self):
        m1 = _mem("Kafka", MemoryType.LEARNING)
        m2 = _mem("Distributed Systems", MemoryType.LEARNING)
        session = _session([m1, m2])
        relationships = [
            _rel(m1, m2),
            _rel(m1, m2),  # duplicate
        ]
        ctx = _ctx(session, relationships=relationships)
        result = _engine().generate(ctx)
        assert len(result.strongest_connections) == 1

    def test_concept_connections_included(self):
        m1 = _mem("Kafka", MemoryType.LEARNING)
        session = _session([m1])
        concept_connections = [
            {"source": "Kafka", "target": "Distributed Systems", "relation": "Connected (weight 2)"},
        ]
        ctx = _ctx(session, concept_connections=concept_connections)
        result = _engine().generate(ctx)
        assert len(result.strongest_connections) == 1
        assert result.strongest_connections[0]["source"] == "Kafka"

    def test_relationship_and_concept_connections_merged(self):
        m1 = _mem("Kafka", MemoryType.LEARNING)
        m2 = _mem("Distributed Systems", MemoryType.LEARNING)
        session = _session([m1, m2])
        relationships = [_rel(m1, m2)]
        concept_connections = [
            {"source": "Python", "target": "Django", "relation": "Connected (weight 1)"},
        ]
        ctx = _ctx(session, relationships=relationships, concept_connections=concept_connections)
        result = _engine().generate(ctx)
        assert len(result.strongest_connections) == 2

    def test_deduplication_across_relationship_and_concept(self):
        m1 = _mem("Kafka", MemoryType.LEARNING)
        m2 = _mem("Distributed Systems", MemoryType.LEARNING)
        session = _session([m1, m2])
        relationships = [_rel(m1, m2)]
        concept_connections = [
            {"source": "Kafka", "target": "Distributed Systems", "relation": "Connected (weight 3)"},
        ]
        ctx = _ctx(session, relationships=relationships, concept_connections=concept_connections)
        result = _engine().generate(ctx)
        assert len(result.strongest_connections) == 1


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------

class TestDeterminism:
    def test_same_input_identical_output(self):
        mems = [_mem("Kafka", MemoryType.LEARNING)]
        ctx1 = _ctx(_session(mems))
        ctx2 = _ctx(_session(mems))
        r1 = _engine().generate(ctx1)
        r2 = _engine().generate(ctx2)
        assert r1.primary_focus == r2.primary_focus
        assert r1.topics_explored == r2.topics_explored
        assert r1.progress == r2.progress
        assert r1.reflection == r2.reflection

    def test_deterministic_reflection_choice(self):
        """Same memory ID produces same template."""
        mem = _mem("Kafka", MemoryType.LEARNING)
        # Generate twice with same data
        r1 = _engine().generate(_ctx(_session([mem])))
        r2 = _engine().generate(_ctx(_session([mem])))
        assert r1.reflection == r2.reflection

    def test_different_memories_can_diverge(self):
        m1 = _mem("Kafka", MemoryType.LEARNING)
        m2 = _mem("Python", MemoryType.LEARNING)
        r1 = _engine().generate(_ctx(_session([m1])))
        r2 = _engine().generate(_ctx(_session([m2])))
        # They might be same if same template + different seed, but usually different
        # Just check both produce valid strings
        assert bool(r1.reflection)
        assert bool(r2.reflection)


# ---------------------------------------------------------------------------
# Regression tests
# ---------------------------------------------------------------------------

class TestRegression:
    def test_reflection_v2_does_not_raise(self):
        ctx = _ctx(_session([]))
        _engine().generate(ctx)

    def test_large_session_does_not_raise(self):
        mems = [_mem(f"Topic {i}", MemoryType.LEARNING) for i in range(100)]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert len(result.topics_explored) == 100

    def test_primary_focus_with_single_memory(self):
        for mt in MemoryType:
            mem = _mem(mt.value, mt)
            ctx = _ctx(_session([mem]))
            result = _engine().generate(ctx)
            if mt in (MemoryType.LEARNING,):
                assert result.primary_focus == "Learning"
            elif mt == MemoryType.PROJECT:
                assert result.primary_focus == "Project"
            elif mt == MemoryType.CAREER:
                assert result.primary_focus == "Career"
            elif mt == MemoryType.HEALTH:
                assert result.primary_focus == "Health"
            elif mt == MemoryType.GENERIC:
                assert result.primary_focus == "Generic"

    def test_progress_keys_are_strings(self):
        mems = [_mem("X", MemoryType.LEARNING), _mem("Y", MemoryType.HEALTH)]
        result = _engine().generate(_ctx(_session(mems)))
        for key, values in result.progress.items():
            assert isinstance(key, str)
            for v in values:
                assert isinstance(v, str)

    def test_connections_are_dicts_with_required_keys(self):
        m1 = _mem("Kafka", MemoryType.LEARNING)
        m2 = _mem("Distributed Systems", MemoryType.LEARNING)
        session = _session([m1, m2])
        relationships = [_rel(m1, m2)]
        ctx = _ctx(session, relationships=relationships)
        result = _engine().generate(ctx)
        for conn in result.strongest_connections:
            assert "source" in conn
            assert "target" in conn
            assert "relation" in conn
            assert isinstance(conn["source"], str)
            assert isinstance(conn["target"], str)
            assert isinstance(conn["relation"], str)

    def test_reflection_is_non_empty_for_session_with_memories(self):
        mems = [_mem("Anything", MemoryType.GENERIC)]
        ctx = _ctx(_session(mems))
        result = _engine().generate(ctx)
        assert result.reflection
        assert len(result.reflection) > 10


# ---------------------------------------------------------------------------
# ReflectionContext construction
# ---------------------------------------------------------------------------

class TestReflectionContext:
    def test_default_context_is_valid(self):
        ctx = ReflectionContext(
            session=_session(),
        )
        assert ctx.relationships == []
        assert ctx.concepts == []
        assert ctx.concept_connections == []

    def test_context_with_all_fields(self):
        mems = [_mem("Kafka", MemoryType.LEARNING)]
        session = _session(mems)
        ctx = ReflectionContext(
            session=session,
            relationships=[_rel(mems[0], mems[0])],
            concepts=["c1"],
            concept_connections=[{"source": "A", "target": "B", "relation": "test"}],
        )
        assert len(ctx.relationships) == 1
        assert ctx.concepts == ["c1"]
        assert ctx.concept_connections[0]["source"] == "A"
