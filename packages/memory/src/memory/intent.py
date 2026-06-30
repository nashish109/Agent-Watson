"""
Intent classifier for the Agent Watson Memory Engine.

Determines a user's intent from their contribution text using
deterministic rules (no AI). The classified intent drives
downstream memory extraction and reflection generation.
"""

import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class IntentType(str, Enum):
    """The semantic intent behind a user contribution."""

    LEARNING = "Learning"
    PROJECT = "Project"
    CAREER = "Career"
    HEALTH = "Health"
    REFLECTION = "Reflection"
    QUESTION = "Question"
    GENERIC = "Generic"


@dataclass
class IntentResult:
    """Result of intent classification.

    Attributes:
        intent: The classified intent type.
        confidence: Confidence score (0.0 – 1.0).
        response: A conversational response for Question intents; None otherwise.
    """

    intent: IntentType
    confidence: float
    response: Optional[str] = None


# ---------------------------------------------------------------------------
# Question patterns — checked first so questions are caught regardless of
# other keywords.  These cover both direct question words and polite
# conversational openers.
# ---------------------------------------------------------------------------

_QUESTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"^(who|what|when|where|why|how|can|could|would|will|do|does|are|is|am)\b", re.IGNORECASE),
    re.compile(r"\btell me\b", re.IGNORECASE),
    re.compile(r"\bhelp me\b", re.IGNORECASE),
]

# ---------------------------------------------------------------------------
# Content intent rules — ordered by specificity (most specific first).
# Each entry: (regex, IntentType, confidence)
# ---------------------------------------------------------------------------

_INTENT_RULES: list[tuple[re.Pattern[str], IntentType, float]] = [
    # Reflection — emotional / introspective language
    (re.compile(r"\b(felt?|feeling|proud|stressed|struggled|struggling|grateful|anxious|hopeful|worried|excited|overwhelmed|grew|growth)\b", re.IGNORECASE), IntentType.REFLECTION, 0.75),
    # Learning
    (re.compile(r"\b(learn(?:ed|ing|s)?|stud(?:ied|ying|y)|read(?:ing)?|chapter|course|tutorial|practice|understand|understood|lesson)\b", re.IGNORECASE), IntentType.LEARNING, 0.7),
    # Project — building, finishing, implementing
    (re.compile(r"\b(built|building|finished|finish|implemented|implementing|deployed|deploy|created|creating|developed|developing|launched|launching|wrote|writing)\b", re.IGNORECASE), IntentType.PROJECT, 0.7),
    # Career
    (re.compile(r"\b(interview|onboarding|onboarded|company|career|job|worked|working at|colleague|manager|promotion)\b", re.IGNORECASE), IntentType.CAREER, 0.75),
    # Health
    (re.compile(r"\b(gym|run(?:ning)?|workout|exercise|yoga|walk(?:ed|ing)?|sport|km|mile|swim|swimming|badminton|meditat(?:ed|ing|ion)|diet)\b", re.IGNORECASE), IntentType.HEALTH, 0.7),
]


def _is_question(text: str) -> bool:
    """Return True if the text reads like a question."""
    stripped = text.strip()
    # Ends with a question mark
    if stripped.endswith("?"):
        return True
    # Starts with a question word or polite opener
    for pattern in _QUESTION_PATTERNS:
        if pattern.search(stripped):
            return True
    return False


def classify(text: str) -> IntentResult:
    """Classify the intent of a piece of text.

    Detection order:
      1. Question (checked first — a question is always a question)
      2. Reflection / emotional language
      3. Learning
      4. Project
      5. Career
      6. Health
      7. Generic (fallback)

    Args:
        text: The raw user input.

    Returns:
        An IntentResult with the matched intent, confidence, and optional
        conversational response for questions.
    """
    if _is_question(text):
        return IntentResult(intent=IntentType.QUESTION, confidence=0.9)

    for pattern, intent_type, confidence in _INTENT_RULES:
        if pattern.search(text):
            return IntentResult(intent=intent_type, confidence=confidence)

    return IntentResult(intent=IntentType.GENERIC, confidence=0.4)
