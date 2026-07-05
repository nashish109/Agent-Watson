import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class IntentType(str, Enum):
    GOAL = "Goal"
    DEADLINE = "Deadline"
    HABIT = "Habit"
    ACHIEVEMENT = "Achievement"
    PROBLEM = "Problem"
    QUESTION = "Question"
    DECISION = "Decision"
    HELP_ME = "RequestForHelp"
    LEARNING = "Learning"
    CAREER = "Career"
    HEALTH = "Health"
    READING = "Reading"
    PERSONAL = "Personal"
    REFLECTION = "Reflection"
    PROJECT = "Project"
    GENERIC = "Generic"


@dataclass
class IntentResult:
    intent: IntentType
    confidence: float
    response: Optional[str] = None


_QUESTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"^(who|what|when|where|why|how|can|could|would|will|do|does|are|is|am)\b", re.IGNORECASE),
    re.compile(r"\btell me\b", re.IGNORECASE),
]

_INTENT_RULES: list[tuple[re.Pattern[str], IntentType, float]] = [
    # Question — highest priority
    (re.compile(r"\bhelp me\b", re.IGNORECASE), IntentType.HELP_ME, 0.85),
    # Achievement — strong signals only (avoid overlap with Learning/Project/Reading)
    (re.compile(r"\b(achieved|accomplished|earned|secured|won|milestone)\b", re.IGNORECASE), IntentType.ACHIEVEMENT, 0.8),
    # Problem
    (re.compile(r"\b(stuck|can't|cannot|couldn't|issue|bug|error|problem|struggling|frustrated|broken|failing|failed)\b", re.IGNORECASE), IntentType.PROBLEM, 0.8),
    # Decision
    (re.compile(r"\b(decided|chose|chosen|picked|decision|i'll go with|i'll take|going with)\b", re.IGNORECASE), IntentType.DECISION, 0.75),
    # Goal / planning
    (re.compile(r"\b(i[' ]?m (going|planning|hoping) to|i will|i want to|my goal|my target|i aim to|plan to|intend to|i shall|i need to)\b", re.IGNORECASE), IntentType.GOAL, 0.8),
    # Deadline
    (re.compile(r"\b(deadline|due|by |before |on )\d{1,2}[/-]\d{1,2}|by (tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", re.IGNORECASE), IntentType.DEADLINE, 0.8),
    (re.compile(r"\bdeadline|due date|by the end|by next|by this\b", re.IGNORECASE), IntentType.DEADLINE, 0.75),
    # Habit
    (re.compile(r"\b(every day|every morning|every evening|daily|weekly|routine|i always|i usually|i never|i try to|i make sure to|habit)\b", re.IGNORECASE), IntentType.HABIT, 0.75),
    # Reading
    (re.compile(r"\b(read|reading|book|article|blog post|paper|newsletter|substack)\b", re.IGNORECASE), IntentType.READING, 0.7),
    # Personal
    (re.compile(r"\b(family|friends?|weekend|vacation|trip|visited|met with|hang out|party|movie|show|restaurant|cafe)\b", re.IGNORECASE), IntentType.PERSONAL, 0.7),
    # Reflection — emotional / introspective
    (re.compile(r"\b(felt?|feeling|proud|stressed|struggled|struggling|grateful|anxious|hopeful|worried|excited|overwhelmed|grew|growth)\b", re.IGNORECASE), IntentType.REFLECTION, 0.75),
    # Learning
    (re.compile(r"\b(learn(?:ed|ing|s)?|stud(?:ied|ying|y)|read(?:ing)?|course|tutorial|practice|understand|understood|lesson)\b", re.IGNORECASE), IntentType.LEARNING, 0.7),
    # Project
    (re.compile(r"\b(built|building|finished|implemented|implementing|deployed|deploy|created|creating|developed|developing|launched|launching|wrote|writing)\b", re.IGNORECASE), IntentType.PROJECT, 0.7),
    # Career
    (re.compile(r"\b(interview|onboarding|onboarded|company|career|job|worked|working at|colleague|manager|promotion)\b", re.IGNORECASE), IntentType.CAREER, 0.75),
    # Health
    (re.compile(r"\b(gym|run(?:ning)?|workout|exercise|yoga|walk(?:ed|ing)?|sport|km|mile|swim|swimming|badminton|meditat(?:ed|ing|ion)|diet)\b", re.IGNORECASE), IntentType.HEALTH, 0.7),
]


def _is_question(text: str) -> bool:
    stripped = text.strip()
    if stripped.endswith("?"):
        return True
    for pattern in _QUESTION_PATTERNS:
        if pattern.search(stripped):
            return True
    return False


def classify(text: str) -> IntentResult:
    if _is_question(text):
        return IntentResult(intent=IntentType.QUESTION, confidence=0.9)

    for pattern, intent_type, confidence in _INTENT_RULES:
        if pattern.search(text):
            return IntentResult(intent=intent_type, confidence=confidence)

    return IntentResult(intent=IntentType.GENERIC, confidence=0.4)
