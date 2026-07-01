"""ConceptEdge domain model — a weighted, directed connection between two concepts."""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class ConceptEdge(BaseModel):
    """A weighted edge connecting two concepts.

    Edges are created when two concepts appear in the same contribution.
    The weight increases when the same pair co-occurs again.

    Attributes:
        id: Unique identifier.
        source_id: ID of the source concept.
        target_id: ID of the target concept.
        relation: Short label describing the connection (e.g. \"related_to\").
        weight: Integer weight (incremented on repeat co-occurrence).
        created_at: When this edge was first created.
        updated_at: When this edge was last updated.
    """

    id: str = Field(default_factory=lambda: uuid4().hex)
    source_id: str
    target_id: str
    relation: str = "related_to"
    weight: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
