import re
from typing import Callable, Optional

from concept_graph.domain.concept import Concept

from context.models import ContextItem, ContextQuery, RetrievalResult, SessionEntry
from context.services.ranking_service import RankingService


_STOP_WORDS: set[str] = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "up", "about", "into", "over", "after",
    "before", "between", "under", "this", "that", "it", "its", "is", "was",
    "am", "are", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "shall", "can",
    "i", "you", "he", "she", "we", "they", "me", "him", "her", "us", "them",
    "my", "your", "his", "its", "our", "their", "what", "which", "who",
    "whom", "how", "where", "when", "why", "not", "no", "nor", "so", "if",
    "then", "than", "too", "very", "just", "also", "more", "some", "any",
    "each", "every", "all", "both", "few", "many", "much",
    "about", "above", "across", "after", "along", "among", "around",
    "behind", "below", "beneath", "beside", "beyond", "during", "except",
    "inside", "outside", "since", "through", "throughout", "toward",
    "towards", "underneath", "until", "upon", "within", "without",
    "get", "got", "getting", "make", "made", "making", "take", "took",
    "taking", "go", "went", "going", "come", "came", "coming", "see",
    "saw", "seeing", "know", "knew", "knowing", "think", "thought",
    "thinking", "want", "wanted", "wanting", "give", "gave", "giving",
    "find", "found", "finding", "tell", "told", "telling", "ask", "asked",
    "asking", "work", "works", "worked", "working", "seem", "seemed",
    "seeming", "feel", "felt", "feeling", "try", "tried", "trying",
    "leave", "left", "leaving", "call", "called", "calling", "need",
    "needs", "needed", "needing",
}

_DATE_PATTERN = re.compile(
    r"^(?P<year>\d{4})"
    r"([-/.]?(?P<month>\d{1,2})"
    r"([-/.]?(?P<day>\d{1,2}))?)?$"
)

_INTENT_LABEL_ALIASES: dict[str, list[str]] = {
    "Learning": ["learning", "learn", "study", "studying", "education", "course", "skill", "skills"],
    "Project": ["project", "projects", "development", "building", "feature", "code", "app", "application"],
    "Career": ["career", "work", "job", "professional", "job search", "interview", "promotion"],
    "Health": ["health", "fitness", "exercise", "diet", "sleep", "wellness", "medical"],
    "Reflection": ["reflection", "reflections", "reflect", "thinking", "insight", "realisation"],
    "Generic": ["generic", "general", "other", "misc"],
}


class RetrievalService:
    def __init__(
        self,
        sessions: dict[str, SessionEntry],
        concept_graph_get_all_concepts: Callable[[], list[Concept]],
        concept_graph_get_concept_by_name: Callable[[str], Optional[Concept]],
        concept_graph_get_neighbours: Callable[[str], list[Concept]],
        ranking_service: Optional[RankingService] = None,
    ) -> None:
        self._sessions = sessions
        self._get_all_concepts = concept_graph_get_all_concepts
        self._get_concept_by_name = concept_graph_get_concept_by_name
        self._get_neighbours = concept_graph_get_neighbours
        self._ranking = ranking_service or RankingService()

    def query(self, text: str) -> RetrievalResult:
        query = ContextQuery(text=text)
        items: list[ContextItem] = []
        seen_ids: set[str] = set()
        normalised = text.strip().lower()
        tokens = self._tokenise(normalised)
        date_match = self._parse_date(normalised)

        matched_concept_names: set[str] = set()

        # 1. Match concepts by name
        for concept in self._get_all_concepts():
            concept_names = {concept.name.lower()} | {a.lower() for a in concept.aliases}
            for name_variant in concept_names:
                if self._query_matches_text(normalised, name_variant):
                    matched_concept_names.add(concept.name)
                    if concept.id not in seen_ids:
                        seen_ids.add(concept.id)
                        items.append(ContextItem(
                            type="concept",
                            id=concept.id,
                            label=concept.name,
                            summary=concept.category.value,
                            score=5,
                            session_id="",
                            session_date="",
                            matched_terms=[concept.name],
                        ))
                    break

        # 2. Find connected concepts (neighbours of matched concepts)
        for concept in self._get_all_concepts():
            if concept.name in matched_concept_names:
                neighbours = self._get_neighbours(concept.id)
                for nb in neighbours:
                    if nb.id not in seen_ids:
                        seen_ids.add(nb.id)
                        items.append(ContextItem(
                            type="connected_concept",
                            id=nb.id,
                            label=nb.name,
                            summary=nb.category.value,
                            score=3,
                            session_id="",
                            session_date="",
                            matched_terms=[f"connected_to_{concept.name}"],
                        ))

        # 3. Match memories across all sessions
        intent_types = self._match_intent_labels(tokens, normalised)

        for session in self._sessions.values():
            for memory in session.memories:
                if memory.id in seen_ids:
                    continue

                topic_match = self._query_matches_text(normalised, memory.topic)
                summary_match = self._query_matches_text(normalised, memory.summary)
                type_match = any(
                    memory.memory_type.lower() == it.lower()
                    for it in intent_types
                )

                if not (topic_match or summary_match or type_match):
                    continue

                matched = []
                if topic_match:
                    matched.append(memory.topic)
                if summary_match:
                    matched.append(memory.summary[:40])
                if type_match:
                    matched.append(memory.memory_type)

                score = self._ranking.score(
                    topic_match=topic_match,
                    summary_match=summary_match,
                    same_intent=type_match,
                )
                seen_ids.add(memory.id)
                items.append(ContextItem(
                    type="memory",
                    id=memory.id,
                    label=memory.topic,
                    summary=memory.summary,
                    score=score,
                    session_id=session.id,
                    session_date=session.session_date,
                    memory_type=memory.memory_type,
                    matched_terms=matched,
                ))

        # 4. Match sessions by date
        if date_match is not None:
            for session in self._sessions.values():
                if session.id in seen_ids:
                    continue
                if session.session_date.startswith(date_match):
                    seen_ids.add(session.id)
                    items.append(ContextItem(
                        type="session",
                        id=session.id,
                        label=f"Session {session.session_date}",
                        summary=_summarise_session(session),
                        score=2,
                        session_id=session.id,
                        session_date=session.session_date,
                        matched_terms=[date_match],
                    ))

        items.sort(key=lambda x: (-x.score, x.session_date if x.session_date else "", x.label))

        return RetrievalResult(query=query, items=items)

    @staticmethod
    def _tokenise(text: str) -> set[str]:
        return {
            w for w in re.sub(r"[^a-z0-9\s]", " ", text).split()
            if w not in _STOP_WORDS and len(w) > 1
        }

    @staticmethod
    def _query_matches_text(query: str, text: str) -> bool:
        q = query.strip().lower()
        t = text.strip().lower()
        if q == t:
            return True
        if q in t:
            return True
        q_tokens = {w for w in q.split() if w not in _STOP_WORDS and len(w) > 1}
        t_tokens = {
            w for w in re.sub(r"[^a-z0-9\s]", " ", t).split()
            if w not in _STOP_WORDS and len(w) > 1
        }
        if q_tokens and q_tokens.issubset(t_tokens):
            return True
        return bool(q_tokens & t_tokens)

    @staticmethod
    def _parse_date(text: str) -> Optional[str]:
        m = _DATE_PATTERN.match(text.strip())
        if not m:
            return None
        year = m.group("year")
        month = m.group("month")
        day = m.group("day")
        if month and day:
            return f"{year}-{int(month):02d}-{int(day):02d}"
        if month:
            return f"{year}-{int(month):02d}"
        return year

    @staticmethod
    def _match_intent_labels(tokens: set[str], query: str) -> set[str]:
        matched: set[str] = set()
        for intent_label, aliases in _INTENT_LABEL_ALIASES.items():
            for alias in aliases:
                if alias in query or alias in tokens:
                    matched.add(intent_label)
                    break
        return matched


def _summarise_session(session: SessionEntry) -> str:
    memory_count = len(session.memories)
    contribution_count = len(session.contributions)
    topics = [m.topic for m in session.memories[:3]]
    topic_str = ", ".join(topics) if topics else "no memories"
    return f"{contribution_count} contributions, {memory_count} memories: {topic_str}"
