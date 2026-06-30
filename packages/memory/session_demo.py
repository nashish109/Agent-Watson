"""
End-to-end demo of the Agent Watson Session Engine.

Demonstrates:
    - Creating a session
    - Adding multiple contributions
    - Ending the session
    - Printing sessions, memories, reflections, and summary
"""

from memory.session import SessionService


def main() -> None:
    svc = SessionService()

    print("=== Agent Watson Session Engine Demo ===\n")

    # 1. Start Session
    session = svc.create_session()
    print(f"Session started: {session.id}\n")

    # 2. Add contributions
    contributions = [
        "Today I learned Kafka partitions.",
        "Built Watson UI with React and FastAPI.",
        "Went to the gym and did chest day.",
    ]

    for text in contributions:
        print(f"  Adding: {text}")
        svc.add_contribution(session.id, text)
    print()

    # 3. End Session
    svc.end_session(session.id)
    print("Session ended.\n")

    # 4. Print timeline
    print("--- Timeline ---")
    session = svc.get_session(session.id)
    for i, c in enumerate(session.contributions, 1):
        print(f"  Contribution #{i}: {c.text}")

    print(f"\n--- Memories ({len(session.memories)} total) ---")
    for i, m in enumerate(session.memories, 1):
        print(f"  Memory #{i}")
        print(f"    Type:       {m.type.value}")
        print(f"    Topic:      {m.topic}")

    print(f"\n--- Reflections ({len(session.reflections)} total) ---")
    for i, r in enumerate(session.reflections, 1):
        print(f"  Reflection #{i}: {r.text}")

    # 5. Generate and print summary
    summary = svc.generate_summary(session.id)
    print(f"\n--- Session Summary ---")
    print(summary)


if __name__ == "__main__":
    main()
