"""
JSON stdin/stdout bridge for the Agent Watson Memory Engine.

A persistent process that reads commands from stdin and writes
responses to stdout. Maintains SessionService in memory.

Protocol:
  Input:  One JSON object per line to stdin.
  Output: One JSON object per line to stdout.

Commands:
  {"cmd": "create_session"}
    → {"ok": true, "session": {"id": "...", "session_date": "...", ...}}

  {"cmd": "contribute", "session_id": "...", "text": "..."}
    → {"ok": true, "contribution": {...}, "memories": [...], "reflections": [...]}

  {"cmd": "end_session", "session_id": "..."}
    → {"ok": true, "session": {...}}

  {"cmd": "get_session", "session_id": "..."}
    → {"ok": true, "session": {...}}

  {"cmd": "get_summary", "session_id": "..."}
    → {"ok": true, "summary": "..."}

  {"cmd": "query", "text": "python"}
    → {"ok": true, "query": "python", "total_count": N, "items": [...]}
"""

import json
import sys
from datetime import datetime, timezone

from memory.session import SessionService
from reflection import SessionReflectionService

_service = SessionService()
_reflection_service = SessionReflectionService(
    session_service=_service,
    concept_graph=_service.concept_graph,
    retrieval_service=_service.retrieval_service,
)


def _serialise(obj: object) -> object:
    """Convert domain objects to JSON-safe dicts."""
    if hasattr(obj, "model_dump"):
        return obj.model_dump(mode="json")
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, list):
        return [_serialise(item) for item in obj]
    return str(obj)


def handle_command(cmd: dict) -> dict:
    command = cmd.get("cmd", "")

    if command == "create_session":
        session = _service.create_session()
        return {"ok": True, "session": _serialise(session)}

    if command == "contribute":
        session_id = cmd["session_id"]
        text = cmd["text"]
        source = cmd.get("source", "user")
        cr = _service.add_contribution(session_id, text, source)
        session = _service.get_session(session_id)
        return {
            "ok": True,
            "intent": cr.intent.intent.value,
            "intent_confidence": cr.intent.confidence,
            "response": cr.response,
            "contribution": _serialise(cr.contribution),
            "memories": _serialise(cr.memories),
            "reflections": _serialise(cr.reflections),
            "relationships": _serialise(cr.relationships),
            "concepts": cr.concept_names,
            "connections": cr.connections,
            "session": _serialise(session),
        }

    if command == "end_session":
        session_id = cmd["session_id"]
        session = _service.end_session(session_id)
        return {"ok": True, "session": _serialise(session)}

    if command == "get_session":
        session_id = cmd["session_id"]
        session = _service.get_session(session_id)
        return {"ok": True, "session": _serialise(session)}

    if command == "get_summary":
        session_id = cmd["session_id"]
        summary = _service.generate_summary(session_id)
        return {"ok": True, "summary": summary}

    if command == "query":
        result = _service.query_context(cmd["text"])
        return {
            "ok": True,
            "query": cmd["text"],
            "total_count": result.total_count,
            "items": _serialise(result.items),
        }

    if command == "reflect":
        session_id = cmd["session_id"]
        summary = _reflection_service.reflect(session_id)
        return {
            "ok": True,
            "primary_focus": summary.primary_focus,
            "topics_explored": summary.topics_explored,
            "progress": summary.progress,
            "strongest_connections": summary.strongest_connections,
            "reflection": summary.reflection,
        }

    if command == "health":
        return {"ok": True, "status": "alive"}

    return {"ok": False, "error": f"Unknown command: {command}"}


def main() -> None:
    """Read JSON commands from stdin, write JSON responses to stdout."""
    decoder = json.JSONDecoder()
    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        idx = 0
        while idx < len(line):
            try:
                obj, end = decoder.raw_decode(line, idx)
                response = handle_command(obj)
                sys.stdout.write(json.dumps(response) + "\n")
                idx = end
            except json.JSONDecodeError:
                break
        sys.stdout.flush()


if __name__ == "__main__":
    main()
