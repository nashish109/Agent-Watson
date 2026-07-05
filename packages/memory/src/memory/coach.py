"""Coach Service — deterministic mentoring responses for Agent Watson.

Provides structured coaching responses based on contribution intent and content.
No AI — all responses are deterministic and template-based.
"""

from dataclasses import dataclass, field
from typing import Optional

from memory.intent import IntentResult, IntentType


@dataclass
class CoachResponse:
    """Structured coaching response with optional encouragement and follow-up.

    Attributes:
        message: The coaching message to display.
        encouragement: Optional encouraging statement.
        follow_up: Optional follow-up question or prompt.
    """

    message: str
    encouragement: Optional[str] = None
    follow_up: Optional[str] = None


_COACH_TEMPLATES: dict[IntentType, list[str]] = {
    IntentType.LEARNING: [
        "That's a great step forward. Every new thing you learn compounds over time.",
        "Learning something new is always time well spent.",
        "Nice work — consistency in learning is what builds expertise.",
    ],
    IntentType.PROJECT: [
        "Progress, not perfection. Every bit of work adds up.",
        "Nice work moving things forward.",
        "Every commit counts. Keep the momentum going.",
    ],
    IntentType.CAREER: [
        "Every step in your career is building your future.",
        "Career growth happens one day at a time — this is a good sign.",
        "Investing in your professional journey is always worth it.",
    ],
    IntentType.HEALTH: [
        "Taking care of yourself is the foundation for everything else.",
        "Good habits compound — this is an investment in your future self.",
        "Health is wealth, and you just made a deposit.",
    ],
    IntentType.GOAL: [
        "Setting goals is the first step. You've got a plan — now let's track it.",
        "A clear goal gives direction. Let's see how it unfolds.",
    ],
    IntentType.REFLECTION: [
        "It's good to pause and reflect. Awareness is the beginning of growth.",
        "Taking time to reflect is how we turn experience into insight.",
    ],
    IntentType.ACHIEVEMENT: [
        "That's worth celebrating. Acknowledge your wins — they matter.",
        "You earned this. Take a moment to appreciate how far you've come.",
    ],
    IntentType.PROBLEM: [
        "Problems are just puzzles waiting to be solved. You've got this.",
        "Every challenge is an opportunity to learn something new.",
    ],
    IntentType.DECISION: [
        "Decisions shape our path. Sounds like you made a thoughtful choice.",
        "Good decisions come from experience. You're building both.",
    ],
    IntentType.QUESTION: [
        "That's a great question. Let me share what I know.",
        "Curiosity is a superpower. Happy to help.",
    ],
    IntentType.GENERIC: [
        "Noted. I'll remember this for you.",
        "Thanks for sharing. Every bit of context helps.",
    ],
}


class CoachService:
    """Generates deterministic coaching responses."""

    def generate(
        self,
        text: str,
        intent: IntentResult,
    ) -> CoachResponse:
        """Generate a coaching response based on text and intent.

        Args:
            text: The user's contribution text.
            intent: The classified intent.

        Returns:
            A CoachResponse with message, optional encouragement, and follow-up.
        """
        templates = _COACH_TEMPLATES.get(intent.intent, _COACH_TEMPLATES[IntentType.GENERIC])
        idx = len(text) % len(templates)
        message = templates[idx]
        return CoachResponse(message=message)
