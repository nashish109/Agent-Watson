"""
End-to-end example of the Agent Watson Memory Engine.

Demonstrates:
    - Creating a Contribution
    - Running the MemoryService pipeline
    - Inspecting extracted Memories and generated Reflections
"""

from memory.models import Contribution
from memory.service import MemoryService


def main() -> None:
    service = MemoryService()

    contributions = [
        "Today I learned Kafka partitions.",
        "Built a REST API with FastAPI.",
        "Had a technical interview at Google.",
        "Went to the gym and did chest day.",
        "Had a nice lunch with friends.",
        "Learned Python and built a CLI tool.",
    ]

    for text in contributions:
        contribution = Contribution(text=text, source="example")
        result = service.process(contribution)

        print(f"\n{'='*60}")
        print(f"Contribution: {text}")
        print(f"{'='*60}")

        for i, memory in enumerate(result.memories):
            print(f"\n  Memory #{i + 1}")
            print(f"    Type:       {memory.type.value}")
            print(f"    Topic:      {memory.topic}")
            print(f"    Summary:    {memory.summary}")
            print(f"    Confidence: {memory.confidence}")

        for i, ref in enumerate(result.reflections):
            print(f"\n  Reflection #{i + 1}")
            print(f"    {ref.text}")


if __name__ == "__main__":
    main()
