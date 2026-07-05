"""Unit tests for the Relationship Engine."""

from memory.models import Memory, MemoryType
from memory.relationships import (
    Relationship,
    RelationshipEngine,
    RelationshipRepository,
    RelationshipType,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mem(
    type_: MemoryType,
    topic: str,
    *,
    mid: str = "",
    summary: str = "",
) -> Memory:
    return Memory(
        id=mid or topic.replace(" ", "-"),
        type=type_,
        topic=topic,
        summary=summary or topic,
        contribution_id="c1",
    )


# ===================================================================
# Relationship model
# ===================================================================

class TestRelationshipModel:
    def test_minimal_creation(self):
        r = Relationship(
            source_memory_id="src",
            target_memory_id="tgt",
            relationship_type=RelationshipType.RELATED_TOPIC,
            label="Kafka",
        )
        assert r.source_memory_id == "src"
        assert r.target_memory_id == "tgt"
        assert r.relationship_type == RelationshipType.RELATED_TOPIC
        assert r.label == "Kafka"
        assert r.id is not None
        assert r.created_at is not None

    def test_default_id(self):
        r1 = Relationship(source_memory_id="a", target_memory_id="b",
                           relationship_type=RelationshipType.GENERIC, label="x")
        r2 = Relationship(source_memory_id="a", target_memory_id="b",
                           relationship_type=RelationshipType.GENERIC, label="x")
        assert r1.id != r2.id


# ===================================================================
# RelationshipRepository
# ===================================================================

class TestRelationshipRepository:
    def test_add_and_retrieve(self):
        repo = RelationshipRepository()
        rel = Relationship(source_memory_id="src", target_memory_id="tgt",
                           relationship_type=RelationshipType.RELATED_TOPIC, label="Kafka")
        repo.add(rel)
        assert repo.get_by_memory("src") == [rel]

    def test_duplicate_skipped(self):
        repo = RelationshipRepository()
        rel = Relationship(source_memory_id="src", target_memory_id="tgt",
                           relationship_type=RelationshipType.RELATED_TOPIC, label="Kafka")
        repo.add(rel)
        dup = Relationship(source_memory_id="src", target_memory_id="tgt",
                           relationship_type=RelationshipType.RELATED_TOPIC, label="Kafka")
        result = repo.add(dup)
        assert result.id == rel.id  # same relationship returned
        assert len(repo.get_all()) == 1

    def test_different_type_not_duplicate(self):
        repo = RelationshipRepository()
        rel1 = Relationship(source_memory_id="src", target_memory_id="tgt",
                            relationship_type=RelationshipType.RELATED_TOPIC, label="Kafka")
        rel2 = Relationship(source_memory_id="src", target_memory_id="tgt",
                            relationship_type=RelationshipType.SAME_DOMAIN, label="Kafka")
        repo.add(rel1)
        repo.add(rel2)
        assert len(repo.get_all()) == 2

    def test_get_by_memory_empty(self):
        repo = RelationshipRepository()
        assert repo.get_by_memory("nonexistent") == []

    def test_add_all(self):
        repo = RelationshipRepository()
        rels = [
            Relationship(source_memory_id="src1", target_memory_id="tgt1",
                         relationship_type=RelationshipType.RELATED_TOPIC, label="A"),
            Relationship(source_memory_id="src2", target_memory_id="tgt2",
                         relationship_type=RelationshipType.RELATED_TOPIC, label="B"),
        ]
        stored = repo.add_all(rels)
        assert len(stored) == 2
        assert len(repo.get_all()) == 2

    def test_clear(self):
        repo = RelationshipRepository()
        repo.add(Relationship(source_memory_id="a", target_memory_id="b",
                              relationship_type=RelationshipType.GENERIC, label="x"))
        repo.clear()
        assert repo.get_all() == []


# ===================================================================
# RelationshipEngine — related topics
# ===================================================================

class TestRelatedTopic:
    def test_same_word_related(self):
        existing = [_mem(MemoryType.LEARNING, "Kafka partitions")]
        new = [_mem(MemoryType.PROJECT, "Kafka consumer")]
        rels = RelationshipEngine().find(existing, new)
        assert len(rels) == 1
        assert rels[0].relationship_type == RelationshipType.RELATED_TOPIC

    def test_unrelated_topics_no_relationship(self):
        existing = [_mem(MemoryType.LEARNING, "Kafka")]
        new = [_mem(MemoryType.HEALTH, "gym")]
        rels = RelationshipEngine().find(existing, new)
        assert len(rels) == 0

    def test_partial_word_match(self):
        existing = [_mem(MemoryType.LEARNING, "Rust ownership")]
        new = [_mem(MemoryType.LEARNING, "Rust macros")]
        rels = RelationshipEngine().find(existing, new)
        assert len(rels) == 1
        assert rels[0].relationship_type == RelationshipType.SAME_DOMAIN


# ===================================================================
# RelationshipEngine — type-specific rules
# ===================================================================

class TestSameProject:
    def test_both_project_related_topics(self):
        existing = [_mem(MemoryType.PROJECT, "CLI tool")]
        new = [_mem(MemoryType.PROJECT, "CLI tests")]
        rels = RelationshipEngine().find(existing, new)
        assert len(rels) == 1
        assert rels[0].relationship_type == RelationshipType.SAME_PROJECT

    def test_project_unrelated_topics(self):
        existing = [_mem(MemoryType.PROJECT, "CLI tool")]
        new = [_mem(MemoryType.PROJECT, "Dashboard")]
        rels = RelationshipEngine().find(existing, new)
        assert len(rels) == 0


class TestSameDomain:
    def test_same_type_related_topics(self):
        existing = [_mem(MemoryType.LEARNING, "Probability")]
        new = [_mem(MemoryType.LEARNING, "Probability theory")]
        rels = RelationshipEngine().find(existing, new)
        assert len(rels) == 1
        assert rels[0].relationship_type == RelationshipType.SAME_DOMAIN


class TestCareerLearning:
    def test_learning_after_career(self):
        existing = [_mem(MemoryType.CAREER, "DTCC")]
        new = [_mem(MemoryType.LEARNING, "Capital Markets")]
        rels = RelationshipEngine().find(existing, new)
        assert len(rels) == 1
        assert rels[0].relationship_type == RelationshipType.CAREER_LEARNING

    def test_career_after_learning(self):
        existing = [_mem(MemoryType.LEARNING, "Capital Markets")]
        new = [_mem(MemoryType.CAREER, "DTCC interview")]
        rels = RelationshipEngine().find(existing, new)
        assert len(rels) == 1
        assert rels[0].relationship_type == RelationshipType.CAREER_LEARNING


class TestHealthPattern:
    def test_health_repetition(self):
        existing = [_mem(MemoryType.HEALTH, "gym session")]
        new = [_mem(MemoryType.HEALTH, "gym workout")]
        rels = RelationshipEngine().find(existing, new)
        assert len(rels) == 1
        assert rels[0].relationship_type == RelationshipType.HEALTH_PATTERN


# ===================================================================
# RelationshipEngine — edge cases
# ===================================================================

class TestMultipleRelationships:
    def test_multiple_new_memories(self):
        existing = [_mem(MemoryType.LEARNING, "Kafka")]
        new = [
            _mem(MemoryType.LEARNING, "Kafka consumer"),
            _mem(MemoryType.LEARNING, "Rust"),
        ]
        rels = RelationshipEngine().find(existing, new)
        assert len(rels) == 1  # only Kafka consumer relates

    def test_multiple_existing_memories(self):
        existing = [
            _mem(MemoryType.LEARNING, "Kafka basics"),
            _mem(MemoryType.HEALTH, "yoga"),
        ]
        new = [_mem(MemoryType.PROJECT, "Kafka producer")]
        rels = RelationshipEngine().find(existing, new)
        assert len(rels) == 1  # only Kafka basics relates

    def test_memory_not_related_to_itself(self):
        mem = _mem(MemoryType.LEARNING, "Kafka", mid="same-id")
        rels = RelationshipEngine().find([mem], [mem])
        assert len(rels) == 0


class TestNoExistingMemories:
    def test_empty_existing(self):
        new = [_mem(MemoryType.LEARNING, "Kafka")]
        rels = RelationshipEngine().find([], new)
        assert rels == []

    def test_empty_new(self):
        existing = [_mem(MemoryType.LEARNING, "Kafka")]
        rels = RelationshipEngine().find(existing, [])
        assert rels == []

    def test_both_empty(self):
        rels = RelationshipEngine().find([], [])
        assert rels == []


# ===================================================================
# Reflection enrichment via relationships
# ===================================================================

class TestReflectionEnrichment:
    def test_enriched_text_with_relationship(self):
        from memory.generator import generate as gen

        existing = [_mem(MemoryType.LEARNING, "Kafka partitions", mid="existing-kafka")]
        new_mem = _mem(MemoryType.LEARNING, "Kafka consumer", mid="new-kafka")
        rels = RelationshipEngine().find(existing, [new_mem])

        reflection = gen(new_mem, relationships=rels)
        assert any(word in reflection.text.lower()
                    for word in ("adds", "deepens", "earlier", "builds", "connects"))
        assert "Kafka partitions" in reflection.text

    def test_related_to_field_populated(self):
        from memory.generator import generate as gen

        existing = _mem(MemoryType.PROJECT, "CLI tool", mid="existing-cli")
        new_mem = _mem(MemoryType.PROJECT, "CLI tests", mid="new-cli")
        rels = RelationshipEngine().find([existing], [new_mem])
        reflection = gen(new_mem, relationships=rels)
        assert "CLI tool" in reflection.related_to

    def test_no_relationship_standard_template(self):
        from memory.generator import generate as gen

        mem = _mem(MemoryType.LEARNING, "Rust")
        reflection = gen(mem)
        assert reflection.related_to == []
        assert "learning" in reflection.text.lower()

    def test_multiple_relationships_all_labels(self):
        from memory.generator import generate as gen

        existing = [
            _mem(MemoryType.LEARNING, "Kafka basics", mid="k1"),
            _mem(MemoryType.LEARNING, "Kafka partitions", mid="k2"),
        ]
        new_mem = _mem(MemoryType.LEARNING, "Kafka consumer", mid="new-k")
        rels = RelationshipEngine().find(existing, [new_mem])
        assert len(rels) == 2
        reflection = gen(new_mem, relationships=rels)
        assert len(reflection.related_to) == 2
        assert "Kafka basics" in reflection.related_to
        assert "Kafka partitions" in reflection.related_to

    def test_enrichment_via_service(self):
        from memory.service import MemoryService
        from memory.models import Contribution

        service = MemoryService()
        # First contribution — no existing memories
        c1 = Contribution(text="Learned Kafka partitions", source="test")
        r1 = service.process(c1)
        assert len(r1.reflections) == 1
        assert r1.reflections[0].related_to == []

        # Second contribution — should detect relationship
        c2 = Contribution(text="Built Kafka consumer", source="test")
        r2 = service.process(c2, existing_memories=r1.memories)
        assert len(r2.reflections) == 1
        assert len(r2.new_relationships) == 1
        assert r2.new_relationships[0].relationship_type == RelationshipType.RELATED_TOPIC
        # Reflection should be enriched with target topic
        text = r2.reflections[0].text
        assert "Kafka partitions" in text
