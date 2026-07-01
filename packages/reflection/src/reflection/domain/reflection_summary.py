from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ReflectionSummary:
    """The structured output of a reflection.

    Designed for re-use across:
    - Daily Reviews
    - Weekly Reviews
    - Monthly Reviews
    - Future AI-enhanced summaries (Sprint 5)

    The AI layer should enhance this summary, not replace it.
    """

    primary_focus: str = "Generic"
    topics_explored: list[str] = field(default_factory=list)
    progress: dict[str, list[str]] = field(default_factory=dict)
    strongest_connections: list[dict[str, str]] = field(default_factory=list)
    reflection: str = ""
