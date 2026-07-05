from typing import Optional
from uuid import uuid4

import pytest

from concept_graph.domain.concept import Concept, ConceptCategory
from context.models import ContextItem, MemoryEntry, SessionEntry
from context.services.retrieval_service import RetrievalService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_concept(name: str, category: str = "General") -> Concept:
    return Concept(id=uuid4().hex, name=name, category=ConceptCategory(category))


def _make_memory_entry(
    topic: str,
    summary: str = "",
    memory_type: str = "GENERIC",
) -> MemoryEntry:
    return MemoryEntry(
        id=uuid4().hex,
        topic=topic,
        summary=summary or f"Summary of {topic}",
        memory_type=memory_type,
    )


def _make_session_entry(
    session_date: str = "2026-06-30",
    memories: Optional[list[MemoryEntry]] = None,
) -> SessionEntry:
    return SessionEntry(
        id=uuid4().hex,
        session_date=session_date,
        memories=memories or [],
    )


def _make_service(
    sessions: Optional[dict[str, SessionEntry]] = None,
    concepts: Optional[list[Concept]] = None,
    neighbours: Optional[dict[str, list[Concept]]] = None,
) -> RetrievalService:
    sessions = sessions or {}
    concepts = concepts or []
    neighbours_map: dict[str, list[Concept]] = neighbours or {}

    def get_all() -> list[Concept]:
        return concepts

    def get_by_name(name: str) -> Optional[Concept]:
        for c in concepts:
            if c.name.lower() == name.strip().lower():
                return c
        return None

    def get_neighbours(cid: str) -> list[Concept]:
        return neighbours_map.get(cid, [])

    return RetrievalService(
        sessions=sessions,
        concept_graph_get_all_concepts=get_all,
        concept_graph_get_concept_by_name=get_by_name,
        concept_graph_get_neighbours=get_neighbours,
    )


# ---------------------------------------------------------------------------
# Query matching
# ---------------------------------------------------------------------------

def test_query_matches_text_exact():
    assert RetrievalService._query_matches_text("python", "Python")


def test_query_matches_text_substring():
    assert RetrievalService._query_matches_text("learn", "Learning Python")


def test_query_matches_text_token_subset():
    assert RetrievalService._query_matches_text("machine learning", "Machine Learning with Python")


def test_query_matches_text_token_intersection():
    assert RetrievalService._query_matches_text("neural networks", "deep neural networks")


def test_query_does_not_match():
    assert not RetrievalService._query_matches_text("ruby", "Python programming")


# ---------------------------------------------------------------------------
# Date parsing
# ---------------------------------------------------------------------------

def test_parse_full_date():
    assert RetrievalService._parse_date("2026-06-30") == "2026-06-30"


def test_parse_year_month():
    assert RetrievalService._parse_date("2026-06") == "2026-06"


def test_parse_year_only():
    assert RetrievalService._parse_date("2026") == "2026"


def test_parse_not_a_date():
    assert RetrievalService._parse_date("python") is None


def test_parse_empty_string():
    assert RetrievalService._parse_date("") is None


# ---------------------------------------------------------------------------
# Intent label matching
# ---------------------------------------------------------------------------

def test_match_learning_intent():
    assert RetrievalService._match_intent_labels({"learning"}, "learning python") == {"Learning"}


def test_match_project_intent():
    assert RetrievalService._match_intent_labels({"project", "kafka"}, "kafka project") == {"Project"}


def test_match_career_intent():
    assert RetrievalService._match_intent_labels({"career"}, "career growth") == {"Career"}


def test_match_health_intent():
    assert RetrievalService._match_intent_labels({"exercise"}, "morning exercise") == {"Health"}


def test_match_no_intent():
    assert RetrievalService._match_intent_labels({"aardvark"}, "aardvark zoo") == set()


# ---------------------------------------------------------------------------
# Concept retrieval
# ---------------------------------------------------------------------------

def test_query_matches_concept_name():
    svc = _make_service(concepts=[_make_concept("Python")])
    result = svc.query("python")
    assert result.total_count == 1
    item = result.items[0]
    assert item.type == "concept"
    assert item.label == "Python"
    assert item.score == 5


def test_query_matches_concept_alias():
    svc = _make_service(concepts=[Concept(
        id=uuid4().hex,
        name="Agent Watson",
        category=ConceptCategory.GENERAL,
        aliases=["watson", "agent"],
    )])
    result = svc.query("watson")
    assert result.total_count == 1
    assert result.items[0].label == "Agent Watson"


def test_query_no_concept_match():
    svc = _make_service(concepts=[_make_concept("Python")])
    result = svc.query("ruby")
    assert result.total_count == 0


# ---------------------------------------------------------------------------
# Connected concept retrieval
# ---------------------------------------------------------------------------

def test_query_returns_connected_concepts():
    c1 = _make_concept("Python")
    c2 = _make_concept("Django")
    svc = _make_service(
        concepts=[c1, c2],
        neighbours={c1.id: [c2], c2.id: [c1]},
    )
    result = svc.query("python")
    assert result.total_count == 2
    items_by_type: dict[str, ContextItem] = {i.type: i for i in result.items}
    assert items_by_type["concept"].label == "Python"
    assert items_by_type["connected_concept"].label == "Django"
    assert items_by_type["connected_concept"].score == 3


# ---------------------------------------------------------------------------
# Memory retrieval
# ---------------------------------------------------------------------------

def test_query_matches_memory_topic():
    mem = _make_memory_entry(topic="Learning Python")
    session = _make_session_entry(memories=[mem])
    svc = _make_service(sessions={session.id: session})
    result = svc.query("python")
    assert result.total_count == 1
    item = result.items[0]
    assert item.type == "memory"
    assert item.label == "Learning Python"
    assert item.score >= 2


def test_query_matches_memory_summary():
    mem = _make_memory_entry(topic="Fitness", summary="Morning exercise routine")
    session = _make_session_entry(memories=[mem])
    svc = _make_service(sessions={session.id: session})
    result = svc.query("exercise")
    assert result.total_count == 1
    assert result.items[0].label == "Fitness"
    assert result.items[0].score >= 1


def test_query_matches_memory_type():
    mem = _make_memory_entry(topic="Python", memory_type="LEARNING")
    session = _make_session_entry(memories=[mem])
    svc = _make_service(sessions={session.id: session})
    result = svc.query("learning")
    assert result.total_count == 1
    assert result.items[0].memory_type == "LEARNING"


# ---------------------------------------------------------------------------
# Session date retrieval
# ---------------------------------------------------------------------------

def test_query_matches_session_by_date():
    session = _make_session_entry(session_date="2026-06-30")
    svc = _make_service(sessions={session.id: session})
    result = svc.query("2026-06-30")
    assert result.total_count == 1
    assert result.items[0].type == "session"
    assert result.items[0].score == 2


def test_query_matches_session_by_year():
    session = _make_session_entry(session_date="2026-06-30")
    svc = _make_service(sessions={session.id: session})
    result = svc.query("2026")
    assert result.total_count == 1
    assert result.items[0].type == "session"


# ---------------------------------------------------------------------------
# Sorting and ordering
# ---------------------------------------------------------------------------

def test_results_sorted_by_score_descending():
    c1 = _make_concept("Python")
    c2 = _make_concept("Django")
    mem = _make_memory_entry(topic="JavaScript")
    session = _make_session_entry(session_date="2026-06-30", memories=[mem])
    svc = _make_service(
        sessions={session.id: session},
        concepts=[c1, c2],
        neighbours={c1.id: [c2], c2.id: [c1]},
    )
    result = svc.query("python")
    scores = [i.score for i in result.items]
    assert scores == sorted(scores, reverse=True)


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def test_no_duplicate_items():
    mem = _make_memory_entry(topic="Learning Python", summary="Python is great")
    session = _make_session_entry(memories=[mem])
    svc = _make_service(sessions={session.id: session})
    result = svc.query("python")
    ids = [i.id for i in result.items]
    assert len(ids) == len(set(ids))


# ---------------------------------------------------------------------------
# Empty state
# ---------------------------------------------------------------------------

def test_empty_sessions_no_results():
    svc = _make_service()
    result = svc.query("anything")
    assert result.total_count == 0


def test_empty_query_returns_no_results():
    svc = _make_service()
    result = svc.query("")
    assert result.total_count == 0


# ---------------------------------------------------------------------------
# Multiple sessions
# ---------------------------------------------------------------------------

def test_query_across_multiple_sessions():
    mem1 = _make_memory_entry(topic="Python basics")
    mem2 = _make_memory_entry(topic="Advanced Python")
    s1 = _make_session_entry(session_date="2026-06-01", memories=[mem1])
    s2 = _make_session_entry(session_date="2026-06-30", memories=[mem2])
    svc = _make_service(sessions={s1.id: s1, s2.id: s2})
    result = svc.query("python")
    assert result.total_count == 2


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------

def test_deterministic_order():
    mems = [_make_memory_entry(topic=f"Topic {i} Python") for i in range(5)]
    session = _make_session_entry(memories=mems)
    svc = _make_service(sessions={session.id: session})
    r1 = svc.query("python")
    r2 = svc.query("python")
    ids1 = [i.id for i in r1.items]
    ids2 = [i.id for i in r2.items]
    assert ids1 == ids2
