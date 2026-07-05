"""Unit tests for the session summarizer."""

from memory.models import Memory, MemoryType
from memory.summarizer import summarize


def _mem(type_: MemoryType, topic: str = "test") -> Memory:
    return Memory(type=type_, topic=topic, summary="s", contribution_id="c1")


class TestSummarize:
    def test_single_learning(self):
        summary = summarize([_mem(MemoryType.LEARNING, "Kafka")])
        assert "Learning focused on Kafka." in summary
        assert "Today's Session Summary" in summary

    def test_single_project(self):
        summary = summarize([_mem(MemoryType.PROJECT, "Watson UI")])
        assert "Progress was made on Watson UI." in summary

    def test_single_career(self):
        summary = summarize([_mem(MemoryType.CAREER, "interview")])
        assert "Career step: interview." in summary

    def test_single_health(self):
        summary = summarize([_mem(MemoryType.HEALTH, "gym")])
        assert "Health activity was recorded." in summary

    def test_single_generic(self):
        summary = summarize([_mem(MemoryType.GENERIC, "Had lunch")])
        assert "Had lunch." in summary

    def test_multiple_types_deduped(self):
        memories = [
            _mem(MemoryType.LEARNING, "Kafka"),
            _mem(MemoryType.LEARNING, "Rust"),
            _mem(MemoryType.PROJECT, "Watson UI"),
        ]
        summary = summarize(memories)
        assert summary.count("•") == 2  # one per unique type
        assert "Kafka" in summary
        assert "Rust" not in summary  # second LEARNING is deduped
        assert "Watson UI" in summary

    def test_all_types(self):
        memories = [
            _mem(MemoryType.LEARNING, "Kafka"),
            _mem(MemoryType.PROJECT, "CLI tool"),
            _mem(MemoryType.CAREER, "interview"),
            _mem(MemoryType.HEALTH, "gym"),
            _mem(MemoryType.GENERIC, "lunch"),
        ]
        summary = summarize(memories)
        for line in (
            "Learning focused on Kafka.",
            "Progress was made on CLI tool.",
            "Career step: interview.",
            "Health activity was recorded.",
            "lunch.",
        ):
            assert line in summary

    def test_empty_memories(self):
        summary = summarize([])
        assert summary == "No activities recorded."
