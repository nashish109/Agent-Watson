"""
Deterministic memory extractor.

Uses keyword-based rules guided by the IntentClassifier to extract
Memory objects from a Contribution. Each matching rule produces
a separate Memory.
"""

import re
from typing import Optional

from memory.intent import IntentResult, IntentType
from memory.models import Contribution, Memory, MemoryType

# ---------------------------------------------------------------------------
# Display labels for each MemoryType (what the UI shows instead of enum values)
# ---------------------------------------------------------------------------

_DISPLAY_LABELS: dict[MemoryType, str] = {
    MemoryType.LEARNING: "Learning Memory",
    MemoryType.PROJECT: "Project Memory",
    MemoryType.CAREER: "Career Memory",
    MemoryType.HEALTH: "Health Memory",
    MemoryType.GENERIC: "Today's Note",
}


def get_display_label(memory_type: MemoryType, intent_type: IntentType) -> str:
    """Return the human-facing label for a memory.

    Reflection intents always show "Reflection" regardless of MemoryType.
    """
    if intent_type == IntentType.REFLECTION:
        return "Reflection"
    return _DISPLAY_LABELS.get(memory_type, "Memory")


# ---------------------------------------------------------------------------
# Keyword → MemoryType rules (used when IntentClassifier returns GENERIC)
# ---------------------------------------------------------------------------

_RULES: list[tuple[re.Pattern[str], MemoryType, float]] = [
    (re.compile(r"\blearn(?:ed|ing|s)?\b", re.IGNORECASE), MemoryType.LEARNING, 0.7),
    (re.compile(r"\bbuilt\b", re.IGNORECASE), MemoryType.PROJECT, 0.7),
    (re.compile(r"\bstud(?:ied|ying|y)\b", re.IGNORECASE), MemoryType.LEARNING, 0.7),
    (re.compile(r"\binterview\b", re.IGNORECASE), MemoryType.CAREER, 0.8),
    (re.compile(r"\bgym\b", re.IGNORECASE), MemoryType.HEALTH, 0.7),
]


def _extract_topic(text: str, memory_type: MemoryType) -> str:
    """Derive a short human-readable topic label from the contribution text."""
    text_lower = text.lower()

    # Learning
    if memory_type == MemoryType.LEARNING:
        for trigger in ("learned ", "learning ", "studied ", "studying "):
            if trigger in text_lower:
                idx = text_lower.index(trigger) + len(trigger)
                remainder = text[idx:].strip().rstrip(".!?,")
                if remainder and len(remainder.split()) <= 8:
                    return remainder
        # Handle "completed chapter 3" etc.
        for trigger in ("chapter ", "course ", "tutorial ", "lesson "):
            if trigger in text_lower:
                idx = text_lower.index(trigger) + len(trigger)
                remainder = text[idx:].strip().rstrip(".!?,")
                if remainder and len(remainder.split()) <= 8:
                    return f"{trigger.strip().title()} {remainder}"
        if "learn" in text_lower:
            idx = text_lower.index("learn") + len("learn")
            remainder = text[idx:].strip().lstrip("edings ").rstrip(".!?,")
            if remainder and len(remainder.split()) <= 8:
                return remainder

    # Project
    elif memory_type == MemoryType.PROJECT:
        for trigger in ("built ", "building ", "finished ", "finish ", "implemented ", "implementing ", "deployed ", "deploy ", "created ", "creating "):
            if trigger in text_lower:
                idx = text_lower.index(trigger) + len(trigger)
                remainder = text[idx:].strip().rstrip(".!?,")
                if remainder and len(remainder.split()) <= 8:
                    return remainder

    # Career
    elif memory_type == MemoryType.CAREER:
        if "interview" in text_lower:
            idx = text_lower.index("interview")
            start = max(0, idx - 30)
            snippet = text[start:idx + 20]
            words = snippet.split()
            return " ".join(words[-4:]) if len(words) >= 4 else snippet.strip()
        for trigger in ("working at ", "worked at ", "onboarding ", "onboarded at "):
            if trigger in text_lower:
                idx = text_lower.index(trigger) + len(trigger)
                remainder = text[idx:].strip().rstrip(".!?,")
                if remainder and len(remainder.split()) <= 8:
                    return remainder

    # Health
    elif memory_type == MemoryType.HEALTH:
        for trigger in ("went to the ", "played ", "ran ", "run "):
            if trigger in text_lower:
                idx = text_lower.index(trigger) + len(trigger)
                remainder = text[idx:].strip().rstrip(".!?,")
                if remainder and len(remainder.split()) <= 8:
                    return remainder
        if "gym" in text_lower:
            idx = text_lower.index("gym")
            remainder = text[idx:].strip().rstrip(".!?,")
            if remainder and len(remainder.split()) <= 8:
                return remainder

    # Fallback — first few meaningful words
    words = [w for w in text.split() if len(w) > 2]
    return " ".join(words[:5]).rstrip(".!?,") if words else memory_type.value


def _generate_summary(text: str, memory_type: MemoryType, topic: str) -> str:
    """Generate a one-sentence summary."""
    text_clean = text.strip().rstrip(".!?,")
    prefix = {
        MemoryType.LEARNING: "Learned about",
        MemoryType.PROJECT: "Worked on",
        MemoryType.CAREER: "Career development:",
        MemoryType.HEALTH: "Health activity:",
        MemoryType.GENERIC: "Noted:",
    }
    return f"{prefix[memory_type]} {topic}."


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def extract(
    contribution: Contribution,
    intent: IntentResult | None = None,
) -> list[Memory]:
    """Extract memories from a Contribution, guided by intent.

    Args:
        contribution: The source contribution.
        intent: Optional pre-classified intent. When provided the extractor
            uses the intent to improve topic extraction and labelling.

    Returns:
        A list of Memory objects.
    """
    text = contribution.text
    memories: list[Memory] = []
    intent_type = intent.intent if intent else IntentType.GENERIC

    # Reflection and Question intents produce no keyword-based memories.
    # Reflection creates a single Generic memory below with a reflection label.
    # Question is handled at a higher level and produces no memories at all.
    if intent_type == IntentType.REFLECTION:
        topic = _extract_topic(text, MemoryType.GENERIC)
        summary = _generate_summary(text, MemoryType.GENERIC, topic)
        memory = Memory(
            type=MemoryType.GENERIC,
            topic=topic,
            summary=summary,
            confidence=0.6,
            contribution_id=contribution.id,
            display_label="Reflection",
        )
        return [memory]

    if intent_type == IntentType.QUESTION:
        return []

    # Use intent to determine the memory type
    memory_type_map: dict[IntentType, MemoryType] = {
        IntentType.LEARNING: MemoryType.LEARNING,
        IntentType.PROJECT: MemoryType.PROJECT,
        IntentType.CAREER: MemoryType.CAREER,
        IntentType.HEALTH: MemoryType.HEALTH,
    }

    if intent_type in memory_type_map:
        mem_type = memory_type_map[intent_type]
        topic = _extract_topic(text, mem_type)
        summary = _generate_summary(text, mem_type, topic)
        confidence = intent.confidence
        memories.append(
            Memory(
                type=mem_type,
                topic=topic,
                summary=summary,
                confidence=confidence,
                contribution_id=contribution.id,
                display_label=get_display_label(mem_type, intent_type),
            )
        )
        return memories

    # GENERIC intent — fall back to keyword rules
    matched = False
    for pattern, mem_type, confidence in _RULES:
        if pattern.search(text):
            matched = True
            topic = _extract_topic(text, mem_type)
            summary = _generate_summary(text, mem_type, topic)
            memories.append(
                Memory(
                    type=mem_type,
                    topic=topic,
                    summary=summary,
                    confidence=confidence,
                    contribution_id=contribution.id,
                    display_label=get_display_label(mem_type, IntentType.GENERIC),
                )
            )

    if not matched:
        topic = _extract_topic(text, MemoryType.GENERIC)
        summary = _generate_summary(text, MemoryType.GENERIC, topic)
        memories.append(
            Memory(
                type=MemoryType.GENERIC,
                topic=topic,
                summary=summary,
                confidence=0.4,
                contribution_id=contribution.id,
                display_label=get_display_label(MemoryType.GENERIC, IntentType.GENERIC),
            )
        )

    return memories
