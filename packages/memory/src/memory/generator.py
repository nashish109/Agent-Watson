"""
Reflection generator — produces reflective statements from Memory objects.

Uses multiple template strings per category (no AI) and selects one
deterministically via hash-based indexing to avoid repetition.

When relationship data is provided, generates richer reflections that
reference earlier, related memories.
"""

import hashlib
from typing import Optional

from memory.models import Memory, MemoryType, Reflection
from memory.relationships import Relationship, RelationshipType

# ---------------------------------------------------------------------------
# Standard templates (no relationship context)
# ---------------------------------------------------------------------------

_TEMPLATES: dict[MemoryType, list[str]] = {
    MemoryType.LEARNING: [
        "I'll remember that today's learning focused on {topic}.",
        "This became part of your learning journey.",
        "You've taken another step in understanding {topic}.",
        "Today's learning about {topic} is now part of your knowledge.",
    ],
    MemoryType.PROJECT: [
        "I'll remember today's progress on {topic}.",
        "Another milestone has been added.",
        "You've moved {topic} forward today.",
        "Today's work on {topic} has been recorded.",
    ],
    MemoryType.CAREER: [
        "I'll remember this step in your career journey.",
        "This feels like another step in your professional journey.",
        "Your career story continues to grow.",
    ],
    MemoryType.HEALTH: [
        "I'll remember today's effort toward your wellbeing.",
        "Taking care of yourself matters — this is now remembered.",
        "Another day of investing in your health.",
    ],
    MemoryType.GENERIC: [
        "I'll remember this as part of today's session.",
        "This moment has been captured.",
        "I'll remember this for later.",
    ],
}

_REFLECTION_TEMPLATES: list[str] = [
    "I'll carry this reflection into future sessions.",
    "This feeling has been noted and remembered.",
    "I'll hold onto this reflection for you.",
    "This moment of awareness has been recorded.",
]

# ---------------------------------------------------------------------------
# Enriched templates (when a relationship exists)
# ---------------------------------------------------------------------------

_ENRICHMENT_TEMPLATES: dict[RelationshipType, list[str]] = {
    RelationshipType.RELATED_TOPIC: [
        "This builds naturally on your earlier work on {related}.",
        "This connects to what you previously explored about {related}.",
    ],
    RelationshipType.SAME_PROJECT: [
        "This is another step forward on {related}.",
        "Your work on {related} continues to take shape.",
    ],
    RelationshipType.SAME_DOMAIN: [
        "This adds to what you've learned about {related}.",
        "This deepens your earlier understanding of {related}.",
    ],
    RelationshipType.CAREER_LEARNING: [
        "This continues your professional development after {related}.",
        "This connects your learning to your earlier experience with {related}.",
    ],
    RelationshipType.HEALTH_PATTERN: [
        "You've maintained your focus on {related}.",
        "Your consistency with {related} is building momentum.",
    ],
    RelationshipType.GENERIC: [
        "This connects to your earlier note about {related}.",
        "This relates to what you previously noted about {related}.",
    ],
}


# ---------------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------------

def _select_index(memory_id: str, pool_size: int) -> int:
    """Deterministically select a template index from a memory's ID."""
    h = hashlib.sha256(memory_id.encode()).hexdigest()
    return int(h[:8], 16) % pool_size


_NEWLINE_REPLACEMENT = "\n"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate(
    memory: Memory,
    relationships: Optional[list[Relationship]] = None,
) -> Reflection:
    """Generate a Reflection from a Memory.

    When *relationships* is provided and non-empty, the generated text
    references the earliest related memory's topic.

    Args:
        memory: The source Memory.
        relationships: Optional list of detected Relationships.

    Returns:
        A Reflection object with rendered text and any related_to labels.
    """
    # Collect labels for the "Connected To" UI section
    related_labels: list[str] = []
    enrichment_text: Optional[str] = None

    if relationships:
        for rel in relationships:
            label = rel.label.strip()
            if label and label not in related_labels:
                related_labels.append(label)

        # Use the first relationship for enrichment
        first = relationships[0]
        pool = _ENRICHMENT_TEMPLATES.get(first.relationship_type)
        if pool:
            idx = _select_index(memory.id + first.target_memory_id, len(pool))
            enrichment_text = pool[idx].format(related=first.label)

    if enrichment_text is not None:
        return Reflection(
            memory_id=memory.id,
            text=enrichment_text,
            related_to=related_labels,
        )

    # Standard (non-enriched) path
    if memory.display_label == "Reflection":
        templates = _REFLECTION_TEMPLATES
    else:
        templates = _TEMPLATES.get(memory.type, _TEMPLATES[MemoryType.GENERIC])

    idx = _select_index(memory.id, len(templates))
    text = templates[idx].format(topic=memory.topic)
    return Reflection(memory_id=memory.id, text=text)
