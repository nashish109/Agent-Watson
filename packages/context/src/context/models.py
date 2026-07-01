from dataclasses import dataclass, field
from typing import Optional


@dataclass
class MemoryEntry:
    id: str
    topic: str
    summary: str
    memory_type: str


@dataclass
class SessionEntry:
    id: str
    session_date: str
    memories: list[MemoryEntry] = field(default_factory=list)
    contributions: list = field(default_factory=list)


@dataclass
class ContextQuery:
    text: str


@dataclass
class ContextItem:
    type: str
    id: str
    label: str
    summary: str
    score: int
    session_id: str
    session_date: str
    memory_type: Optional[str] = None
    matched_terms: list[str] = field(default_factory=list)


@dataclass
class RetrievalResult:
    query: ContextQuery
    items: list[ContextItem] = field(default_factory=list)

    @property
    def total_count(self) -> int:
        return len(self.items)
