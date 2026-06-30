"""
Knowledge base — conversational responses for Question intents.

All responses are deterministic and human-authored. No AI.
"""

import re
from typing import Optional

_RESPONSES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bwho are you\b", re.IGNORECASE),
     "I'm Watson — your quiet companion for learning, building, and growing. "
     "I'm here to help you reflect on your day and remember what matters."),
    (re.compile(r"\bwhat do you remember\b", re.IGNORECASE),
     "I remember everything you've shared with me during our sessions — "
     "the things you've learned, built, and the steps you've taken."),
    (re.compile(r"\bwhat (can|do) you do\b", re.IGNORECASE),
     "I help you capture and reflect on your daily experiences. "
     "Share what you learned, built, or felt today, and I'll remember it for you."),
    (re.compile(r"\bhow are you\b", re.IGNORECASE),
     "I'm here and ready — same as always. How was your day?"),
    (re.compile(r"\bcan you help me\b", re.IGNORECASE),
     "Of course. Just tell me what happened today — what you learned, built, "
     "or how you're feeling."),
    (re.compile(r"\btell me about yourself\b", re.IGNORECASE),
     "I'm Watson, a memory engine designed to help you grow. "
     "I track your learning, projects, career steps, health, and reflections — "
     "all so you can look back and see how far you've come."),
    (re.compile(r"\bwho (created|built|made) you\b", re.IGNORECASE),
     "I was built by Ashish as part of the Agent Watson project."),
]


def get_response(text: str) -> Optional[str]:
    """Return a conversational response for a question, if one is known.

    Args:
        text: The user's question.

    Returns:
        A response string, or None if no specific response is configured.
    """
    for pattern, response in _RESPONSES:
        if pattern.search(text):
            return response
    return "That's a good question. I'm not sure I have an answer yet — but feel free to share what's on your mind."
