from context.services.ranking_service import RankingService


def test_no_matches_returns_zero():
    r = RankingService()
    assert r.score() == 0


def test_exact_concept_alone():
    r = RankingService()
    assert r.score(concept_match=True) == 5


def test_connected_concept_alone():
    r = RankingService()
    assert r.score(connected_concept=True) == 3


def test_topic_match_alone():
    r = RankingService()
    assert r.score(topic_match=True) == 2


def test_summary_match_alone():
    r = RankingService()
    assert r.score(summary_match=True) == 1


def test_same_intent_alone():
    r = RankingService()
    assert r.score(same_intent=True) == 1


def test_date_match_alone():
    r = RankingService()
    assert r.score(date_match=True) == 2


def test_combined_scores():
    r = RankingService()
    assert r.score(concept_match=True, topic_match=True, same_intent=True) == 8


def test_all_flags():
    r = RankingService()
    assert r.score(
        concept_match=True,
        connected_concept=True,
        topic_match=True,
        summary_match=True,
        same_intent=True,
        date_match=True,
    ) == 14
