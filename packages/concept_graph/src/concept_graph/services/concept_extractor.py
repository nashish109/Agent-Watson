"""ConceptExtractor — deterministic extraction of Concepts from Memory objects.

Rules (no AI, no embeddings):
  - Memory type → ConceptCategory mapping (see _CATEGORY_MAP).
  - Concept name is derived from the memory's topic field.
  - Stop words are stripped from the name.
  - If the topic is empty or all stop words, a fallback name is generated
    from the memory type.
"""

from concept_graph.domain.concept import Concept, ConceptCategory

# ---------------------------------------------------------------------------
# MemoryType → ConceptCategory mapping
# ---------------------------------------------------------------------------

_CATEGORY_MAP: dict[str, ConceptCategory] = {
    "Learning": ConceptCategory.LEARNING,
    "Project": ConceptCategory.PROJECT,
    "Career": ConceptCategory.CAREER,
    "Health": ConceptCategory.HEALTH,
    "Generic": ConceptCategory.GENERAL,
}

_STOP_WORDS: set[str] = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "up", "about", "into", "over", "after",
    "before", "between", "under", "this", "that", "it", "its", "is", "was",
    "my", "today", "i", "we", "you", "he", "she", "they",
}


def _clean_topic(topic: str) -> str:
    """Strip stop words and punctuation from a topic string.

    Returns a cleaned, title-cased name suitable as a concept name.
    If nothing remains after cleaning, returns an empty string.
    """
    words = topic.split()
    meaningful = [
        w.strip(".,!?;:()[]{}'\"")
        for w in words
        if w.lower().strip(".,!?;:()[]{}'\"") not in _STOP_WORDS
    ]
    if not meaningful:
        return ""
    return " ".join(meaningful)


class ConceptExtractor:
    """Stateless service that extracts Concepts from memory metadata.

    Usage:
        extractor = ConceptExtractor()
        concepts = extractor.extract(memory_type="Learning", topic="Kafka partitions")
    """

    @staticmethod
    def extract(memory_type: str, topic: str) -> list[Concept]:
        """Extract one or more Concepts from a memory's type and topic.

        Args:
            memory_type: The MemoryType value (e.g. \"Learning\", \"Project\").
            topic: The memory's topic string.

        Returns:
            A list containing the extracted Concept(s). Currently returns at most
            one concept per memory; the list structure allows future expansion
            (e.g. multi-concept extraction from a single memory).
        """
        category = _CATEGORY_MAP.get(memory_type, ConceptCategory.GENERAL)
        name = _clean_topic(topic)

        if not name:
            name = category.value

        return [
            Concept(name=name, category=category),
        ]
