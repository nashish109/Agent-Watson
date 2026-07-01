SCORE_EXACT_CONCEPT = 5
SCORE_CONNECTED_CONCEPT = 3
SCORE_SAME_INTENT = 1

SCORE_MEMORY_TOPIC = 2
SCORE_MEMORY_SUMMARY = 1
SCORE_SESSION_DATE = 2


class RankingService:
    def score(
        self,
        concept_match: bool = False,
        connected_concept: bool = False,
        topic_match: bool = False,
        summary_match: bool = False,
        same_intent: bool = False,
        date_match: bool = False,
    ) -> int:
        score = 0
        if concept_match:
            score += SCORE_EXACT_CONCEPT
        if connected_concept:
            score += SCORE_CONNECTED_CONCEPT
        if topic_match:
            score += SCORE_MEMORY_TOPIC
        if summary_match:
            score += SCORE_MEMORY_SUMMARY
        if same_intent:
            score += SCORE_SAME_INTENT
        if date_match:
            score += SCORE_SESSION_DATE
        return score
