"""
Domain models for the Agent Watson Memory Engine.

Each model represents a core entity in the memory lifecycle:
- Contribution: raw user input
- Memory: extracted knowledge from a Contribution
- Reflection: a generated reflective statement tied to a Memory
- Session: a grouping of Contributions and Memories within a time window
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class MemoryType(str, Enum):
    """Categorises extracted memories by domain."""

    LEARNING = "Learning"
    PROJECT = "Project"
    CAREER = "Career"
    HEALTH = "Health"
    GENERIC = "Generic"


class Contribution(BaseModel):
    """Raw input from a user during a session.

    Attributes:
        id: Unique identifier.
        text: The raw text provided by the user.
        timestamp: When the contribution was made.
        source: Origin of the contribution (e.g. "chat", "cli", "api").
        tags: Optional user-supplied tags.
    """

    id: str = Field(default_factory=lambda: uuid4().hex)
    text: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = "unknown"
    tags: list[str] = Field(default_factory=list)


class Memory(BaseModel):
    """A discrete piece of knowledge extracted from a Contribution.

    Attributes:
        id: Unique identifier.
        type: Domain category (Learning, Project, Career, Health, Generic).
        topic: Short topic label derived from the contribution text.
        summary: One-sentence summary of what was learned / done.
        confidence: How confident the extractor is (0.0 – 1.0).
        created_at: When this memory was created.
        contribution_id: ID of the source Contribution.
    """

    id: str = Field(default_factory=lambda: uuid4().hex)
    type: MemoryType
    topic: str
    summary: str
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    contribution_id: str
    display_label: Optional[str] = None


class Reflection(BaseModel):
    """A reflective statement generated from a Memory.

    Attributes:
        id: Unique identifier.
        memory_id: ID of the source Memory.
        text: The generated reflection text.
        created_at: When this reflection was generated.
        related_to: Topic labels of memories this reflection connects to.
    """

    id: str = Field(default_factory=lambda: uuid4().hex)
    memory_id: str
    text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    related_to: list[str] = Field(default_factory=list)


class Session(BaseModel):
    """Groups Contributions and their extracted Memories under a single session.

    Attributes:
        id: Unique identifier.
        session_date: Calendar date of the session (ISO format string).
        started_at: When the session began.
        ended_at: When the session ended (None if still active).
        contributions: Contributions recorded in this session.
        memories: Memories extracted from the contributions.
        reflections: Reflections generated from the memories.
        summary: Optional session summary string.
    """

    id: str = Field(default_factory=lambda: uuid4().hex)
    session_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None
    contributions: list[Contribution] = Field(default_factory=list)
    memories: list[Memory] = Field(default_factory=list)
    reflections: list[Reflection] = Field(default_factory=list)
    summary: Optional[str] = None
