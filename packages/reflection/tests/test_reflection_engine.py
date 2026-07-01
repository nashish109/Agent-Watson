"""Unit tests for Reflection Engine V2."""
import hashlib

from reflection.domain.reflection_context import ReflectionContext
from reflection.domain.reflection_summary import ReflectionSummary
from reflection.services.reflection_engine import ReflectionEngineV2


# ---------------------------------------------------------------------------
# Helpers — lightweight test doubles (no external dependencies)
# ---------------------------------------------------------------------------

class _FakeType:
    """Simulates MemoryType enum with a .value attribute."""
    def __init__(self, value: str) -> None:
        self.value = value


class _FakeMemory:
    """Minimal memory stub with attributes needed by the engine."""
    def __init__(
        self,
        type_value: str = "Generic",
        topic: str = "test",
        mem_id: str = "",
    ) -> None:
        self.type = _FakeType(type_value)
        self.topic = topic
        self.id = mem_id or f"mem-{topic}"


class _FakeConcept:
    """Minimal concept stub with attributes needed by the engine."""
    def __init__(self, name: str = "test") -> None:
        self.name = name
        self.id = f"concept-{name}"


class _FakeRelationship:
    """Minimal relationship stub."""
    def __init__(
        self,
        source_id: str = "",
        target_id: str = "",
        label: str = "",
        rel_type: str = "RELATED_TOPIC",
    ) -> None:
        self.source_memory_id = source_id
        self.target_memory_id = target_id
        self.label = label

        class _RelType:
            def __init__(self, v: str) -> None:
                self.value = v
        self.relationship_type = _RelType(rel_type)


class _FakeSession:
    """Minimal session stub."""
    def __init__(self, memories=None) -> None:
        self.memories = memories or []
        self.id = "session-1"


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestEmptySession:
    def test_generic_focus(self):
        engine = ReflectionEngineV2()
        ctx = ReflectionContext(
            session=_FakeSession(),
            memories=[],
        )
        result = engine.generate(ctx)
        assert result.primary_focus == "Generic"

    def test_no_topics(self):
        engine = ReflectionEngineV2()
        ctx = ReflectionContext(
            session=_FakeSession(),
            memories=[],
        )
        result = engine.generate(ctx)
        assert result.topics_explored == []

    def test_no_progress(self):
        engine = ReflectionEngineV2()
        ctx = ReflectionContext(
            session=_FakeSession(),
            memories=[],
        )
        result = engine.generate(ctx)
        assert result.progress == {}

    def test_no_connections(self):
        engine = ReflectionEngineV2()
        ctx = ReflectionContext(
            session=_FakeSession(),
            memories=[],
        )
        result = engine.generate(ctx)
        assert result.strongest_connections == []

    def test_no_activity_reflection(self):
        engine = ReflectionEngineV2()
        ctx = ReflectionContext(
            session=_FakeSession(),
            memories=[],
        )
        result = engine.generate(ctx)
        assert result.reflection == "No activity recorded for this session."


class TestLearningOnly:
    def test_primary_focus_learning(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Learning", "Kafka")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert result.primary_focus == "Learning"

    def test_topic_extracted(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Learning", "Kafka")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert "Kafka" in result.topics_explored

    def test_progress_learning(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Learning", "Kafka")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert "Learning" in result.progress
        assert result.progress["Learning"] == ["Kafka"]

    def test_learning_reflection_template(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Learning", "Kafka", mem_id="test-lrn")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert "Kafka" in result.reflection or "understanding" in result.reflection


class TestProjectOnly:
    def test_primary_focus_project(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Project", "Watson CLI")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert result.primary_focus == "Project"

    def test_progress_project(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Project", "Watson CLI")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert "Project" in result.progress
        assert result.progress["Project"] == ["Watson CLI"]

    def test_project_reflection_template(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Project", "Watson CLI", mem_id="test-proj")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert "Watson CLI" in result.reflection or "progress" in result.reflection


class TestCareerSession:
    def test_primary_focus_career(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Career", "DTCC")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert result.primary_focus == "Career"

    def test_career_reflection(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Career", "DTCC", mem_id="test-career")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert "professional" in result.reflection or "career" in result.reflection


class TestHealthSession:
    def test_primary_focus_health(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Health", "Gym")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert result.primary_focus == "Health"

    def test_health_reflection(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Health", "yoga", mem_id="test-health")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert "wellbeing" in result.reflection or "health" in result.reflection


class TestMixedSession:
    def test_mixed_focus_when_no_dominant_type(self):
        engine = ReflectionEngineV2()
        memories = [
            _FakeMemory("Learning", "Kafka"),
            _FakeMemory("Project", "Watson CLI"),
        ]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert result.primary_focus == "Mixed"

    def test_mixed_with_three_types(self):
        engine = ReflectionEngineV2()
        memories = [
            _FakeMemory("Learning", "Rust"),
            _FakeMemory("Career", "Interview"),
            _FakeMemory("Health", "Gym"),
        ]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert result.primary_focus == "Mixed"

    def test_mixed_reflection_template(self):
        engine = ReflectionEngineV2()
        memories = [
            _FakeMemory("Learning", "Kafka", mem_id="mixed-1"),
            _FakeMemory("Project", "Watson", mem_id="mixed-2"),
        ]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        # Mixed template should mention combined/learning/progress
        tokens = ("learning", "progress", "combined", "growth", "connected", "spanning")
        assert any(t in result.reflection.lower() for t in tokens), (
            f"Mixed reflection '{result.reflection}' lacks expected keywords"
        )

    def test_mixed_with_over_50_percent_still_mixed_uses_first_topic(self):
        """If 50/50 split, it's Mixed."""
        engine = ReflectionEngineV2()
        memories = [
            _FakeMemory("Learning", "Python"),
            _FakeMemory("Project", "Watson UI"),
        ]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert result.primary_focus == "Mixed"


class TestMultipleConcepts:
    def test_topics_sorted_alphabetically(self):
        engine = ReflectionEngineV2()
        memories = [
            _FakeMemory("Learning", "Zebra"),
            _FakeMemory("Learning", "Apple"),
            _FakeMemory("Learning", "Banana"),
        ]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert result.topics_explored == ["Apple", "Banana", "Zebra"]

    def test_topics_from_concepts_as_well(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Learning", "Kafka")]
        concepts = [_FakeConcept("Distributed Systems")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
            concepts=concepts,
        )
        result = engine.generate(ctx)
        assert "Distributed Systems" in result.topics_explored
        assert "Kafka" in result.topics_explored

    def test_topics_deduped(self):
        engine = ReflectionEngineV2()
        memories = [
            _FakeMemory("Learning", "Kafka"),
            _FakeMemory("Project", "Kafka"),
        ]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert result.topics_explored == ["Kafka"]

    def test_progress_deduped_same_topic_diff_type(self):
        """Same topic in different types appears once per group."""
        engine = ReflectionEngineV2()
        memories = [
            _FakeMemory("Learning", "Kafka"),
            _FakeMemory("Project", "Kafka"),
        ]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert "Learning" in result.progress
        assert "Project" in result.progress


class TestRelationshipRanking:
    def test_concept_connections_sorted_by_weight(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Learning", "Kafka")]
        concept_connections = [
            {"source": "Kafka", "target": "Other", "relation": "weak", "weight": 1},
            {"source": "Kafka", "target": "Core", "relation": "strong", "weight": 5},
        ]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
            concept_connections=concept_connections,
        )
        result = engine.generate(ctx)
        assert len(result.strongest_connections) == 2
        # First should be the strongest (weight 5)
        assert result.strongest_connections[0]["relation"] == "strong"

    def test_relationship_weights(self):
        engine = ReflectionEngineV2()
        memories = [
            _FakeMemory("Learning", "Kafka", mem_id="m1"),
            _FakeMemory("Project", "Watson", mem_id="m2"),
        ]
        relationships = [
            _FakeRelationship(source_id="m1", target_id="m2", label="Watson",
                               rel_type="SAME_PROJECT"),
        ]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
            relationships=relationships,
        )
        result = engine.generate(ctx)

    def test_no_duplicate_connections(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Learning", "Kafka")]
        concept_connections = [
            {"source": "Kafka", "target": "Zoo", "relation": "edge", "weight": 3},
            {"source": "Kafka", "target": "Zoo", "relation": "edge", "weight": 3},
        ]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
            concept_connections=concept_connections,
        )
        result = engine.generate(ctx)
        assert len(result.strongest_connections) <= 1


class TestReflectionGeneration:
    def test_reflection_contains_topic(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Learning", "Rust", mem_id="rust-1")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert "Rust" in result.reflection

    def test_reflection_project_contains_project(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Project", "CLI Rewrite", mem_id="cli-1")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert "CLI Rewrite" in result.reflection or "progress" in result.reflection

    def test_reflection_career_uses_template(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Career", "Interview Prep", mem_id="career-1")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        # Career template doesn't include topic; it's general
        assert "professional" in result.reflection or "career" in result.reflection

    def test_reflection_health_uses_template(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Health", "Morning Run", mem_id="health-1")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert "wellbeing" in result.reflection or "health" in result.reflection


class TestDeterministicOutput:
    def test_same_input_same_output(self):
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Learning", "Kafka", mem_id="kafka-1")]
        ctx1 = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        ctx2 = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result1 = engine.generate(ctx1)
        result2 = engine.generate(ctx2)
        assert result1 == result2

    def test_same_memory_id_same_reflection(self):
        """Identical memory IDs select the same template deterministically."""
        engine = ReflectionEngineV2()
        m1 = _FakeMemory("Learning", "Kafka", mem_id="fixed-id")
        m2 = _FakeMemory("Learning", "Kafka", mem_id="fixed-id")

        r1 = engine.generate(ReflectionContext(
            session=_FakeSession([m1]), memories=[m1],
        ))
        r2 = engine.generate(ReflectionContext(
            session=_FakeSession([m2]), memories=[m2],
        ))
        assert r1.reflection == r2.reflection

    def test_template_selection_is_deterministic(self):
        """The hash-based selection is reproducible."""
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Project", "Test Proj", mem_id="seed-abc")]
        r1 = engine.generate(ReflectionContext(
            session=_FakeSession(memories), memories=memories,
        ))
        r2 = engine.generate(ReflectionContext(
            session=_FakeSession(memories), memories=memories,
        ))
        assert r1 == r2
        assert r1.reflection == r2.reflection
        assert r1.primary_focus == r2.primary_focus
        assert r1.topics_explored == r2.topics_explored
        assert r1.progress == r2.progress
        assert r1.strongest_connections == r2.strongest_connections


class TestProgressCategories:
    def test_progress_all_types(self):
        engine = ReflectionEngineV2()
        memories = [
            _FakeMemory("Learning", "Kafka"),
            _FakeMemory("Project", "CLI Tool"),
            _FakeMemory("Career", "DTCC"),
            _FakeMemory("Health", "Gym"),
            _FakeMemory("Generic", "Note"),
        ]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert "Learning" in result.progress
        assert "Project" in result.progress
        assert "Career" in result.progress
        assert "Health" in result.progress
        assert "Notes" in result.progress

    def test_progress_structure(self):
        """Progress values are lists of topic strings."""
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Learning", "Kafka")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert isinstance(result.progress["Learning"], list)
        assert len(result.progress["Learning"]) == 1


class TestReflectionSummaryModel:
    def test_summary_is_reflection_summary_type(self):
        engine = ReflectionEngineV2()
        ctx = ReflectionContext(
            session=_FakeSession(),
            memories=[_FakeMemory("Learning", "X")],
        )
        result = engine.generate(ctx)
        assert isinstance(result, ReflectionSummary)

    def test_all_fields_present(self):
        engine = ReflectionEngineV2()
        ctx = ReflectionContext(
            session=_FakeSession(),
            memories=[_FakeMemory("Learning", "X")],
        )
        result = engine.generate(ctx)
        assert hasattr(result, "primary_focus")
        assert hasattr(result, "topics_explored")
        assert hasattr(result, "progress")
        assert hasattr(result, "strongest_connections")
        assert hasattr(result, "reflection")

    def test_explicit_primary_focus_override(self):
        engine = ReflectionEngineV2()
        ctx = ReflectionContext(
            session=_FakeSession(),
            memories=[_FakeMemory("Learning", "X")],
            primary_focus="Career",
        )
        result = engine.generate(ctx)
        assert result.primary_focus == "Career"


class TestRegression:
    def test_regression_memory_topic_none(self):
        """Topic should be handled even if blank."""
        engine = ReflectionEngineV2()
        memories = [_FakeMemory("Learning", "")]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert len(result.topics_explored) == 0

    def test_regression_many_topics(self):
        """Many unique topics should all appear, sorted."""
        engine = ReflectionEngineV2()
        topics = [f"Topic-{i}" for i in range(20)]
        memories = [_FakeMemory("Learning", t) for t in topics]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert len(result.topics_explored) == 20
        # Verify sorted order
        for i in range(len(result.topics_explored) - 1):
            assert result.topics_explored[i].casefold() <= result.topics_explored[i + 1].casefold()

    def test_primary_focus_dominant_type(self):
        """When one type > 50%, it should be the primary focus."""
        engine = ReflectionEngineV2()
        memories = [
            _FakeMemory("Learning", "A"),
            _FakeMemory("Learning", "B"),
            _FakeMemory("Learning", "C"),
            _FakeMemory("Project", "D"),
        ]
        ctx = ReflectionContext(
            session=_FakeSession(memories),
            memories=memories,
        )
        result = engine.generate(ctx)
        assert result.primary_focus == "Learning"

    def test_template_selection_hash_based(self):
        """Verify the template selection logic uses the first memory's ID."""
        from reflection.services.reflection_engine import _select_template

        pool = ["t1", "t2", "t3"]
        seed = "test-seed"
        h = hashlib.sha256(seed.encode()).hexdigest()
        expected_idx = int(h[:8], 16) % len(pool)
        expected = pool[expected_idx]

        result = _select_template(pool, seed)
        assert result == expected

    def test_context_accepts_dominant_intent(self):
        """dominant_intent should be accepted but not yet used for output."""
        engine = ReflectionEngineV2()
        ctx = ReflectionContext(
            session=_FakeSession(),
            memories=[_FakeMemory("Learning", "Kafka")],
            dominant_intent="Learning",
        )
        result = engine.generate(ctx)
        assert result.primary_focus == "Learning"
