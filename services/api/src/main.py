"""
API Gateway — Agent Watson backend entry point.

Built with FastAPI. Routes requests to internal services
(knowledge graph, search, ingestion, AI).

Placeholder — routes and middleware to be implemented in subsequent phases.
"""

from fastapi import FastAPI

app = FastAPI(title="Agent Watson API", version="0.1.0")


@app.get("/health")
async def health():
    return {"status": "ok"}
