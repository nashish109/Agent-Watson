"""
API Gateway — Agent Watson backend entry point.

Built with FastAPI. Routes requests to internal services
(knowledge graph, search, ingestion, AI).
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="Agent Watson API", version="0.1.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/memory")
async def memory_bridge(request: Request):
    """Bridge-compatible endpoint that accepts the same commands as bridge.py.

    In the current implementation, this delegates to the bridge protocol.
    The full memory engine will be wired in a subsequent phase.
    """
    try:
        body = await request.json()
        cmd = body.get("cmd", "")

        if cmd == "health":
            return {"ok": True, "status": "alive"}

        if cmd == "create_session":
            return {
                "ok": True,
                "session": {
                    "id": "placeholder-session-id",
                    "session_date": "",
                    "started_at": "",
                    "ended_at": None,
                    "summary": None,
                },
            }

        if cmd == "get_session":
            return {
                "ok": True,
                "session": {
                    "id": body.get("session_id", ""),
                    "session_date": "",
                    "started_at": "",
                    "ended_at": None,
                    "contributions": [],
                    "memories": [],
                    "reflections": [],
                    "summary": None,
                },
            }

        if cmd == "contribute":
            return {
                "ok": True,
                "reply": "Thanks for sharing. I've noted that.",
                "intent": "Generic",
                "intent_confidence": 0.5,
                "contribution": {},
                "memories": [],
                "reflections": [],
                "relationships": [],
                "concepts": [],
                "connections": [],
            }

        if cmd == "query":
            return {
                "ok": True,
                "query": body.get("text", ""),
                "total_count": 0,
                "items": [],
            }

        if cmd == "reflect":
            return {
                "ok": True,
                "primary_focus": "Generic",
                "topics_explored": [],
                "progress": {},
                "strongest_connections": [],
                "reflection": "Submit more contributions to generate a reflection.",
            }

        return {"ok": False, "error": f"Unknown command: {cmd}"}
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"ok": False, "error": str(exc)},
        )
