"""
Session summary generator.

Uses deterministic templates (no AI) keyed on MemoryType to produce
a human-readable summary of a session's activities.
"""

from memory.models import Memory, MemoryType

_SUMMARY_TEMPLATES: dict[MemoryType, str] = {
    MemoryType.LEARNING: "Learning focused on {topic}.",
    MemoryType.PROJECT: "Progress was made on {topic}.",
    MemoryType.CAREER: "Career step: {topic}.",
    MemoryType.HEALTH: "Health activity was recorded.",
    MemoryType.GENERIC: "{topic}.",
}


def summarize(memories: list[Memory]) -> str:
    """Generate a session summary from a list of Memories.

    Each unique MemoryType contributes at most one line, using the
    first memory of that type to fill the template.

    Args:
        memories: All memories from the session.

    Returns:
        A formatted multi-line summary string.
    """
    seen_types: set[MemoryType] = set()
    lines: list[str] = []

    for memory in memories:
        if memory.type in seen_types:
            continue
        seen_types.add(memory.type)
        template = _SUMMARY_TEMPLATES.get(memory.type, _SUMMARY_TEMPLATES[MemoryType.GENERIC])
        lines.append(f"\u2022 {template.format(topic=memory.topic)}")

    if not lines:
        return "No activities recorded."

    return "Today's Session Summary\n" + "\n".join(lines)
