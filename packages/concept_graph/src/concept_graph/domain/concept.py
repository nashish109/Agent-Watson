"""Concept domain model — a reusable knowledge unit discovered from memories."""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class ConceptCategory(str, Enum):
    """High-level category assigned to a Concept based on its source memory type."""

    TECHNOLOGY = "Technology"
    PROJECT = "Project"
    CAREER = "Career"
    LEARNING = "Learning"
    HEALTH = "Health"
    EDUCATION = "Education"
    GENERAL = "General"


class Concept(BaseModel):
    """A reusable concept discovered from one or more memories.

    Attributes:
        id: Unique identifier.
        name: Normalised display name (trimmed, case-preserved).
        category: Broad category the concept belongs to.
        aliases: Alternative names or forms (lowercased for lookup).
        created_at: When this concept was first created.
        updated_at: When this concept was last touched.
    """

    id: str = Field(default_factory=lambda: uuid4().hex)
    name: str
    category: ConceptCategory = ConceptCategory.GENERAL
    aliases: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
