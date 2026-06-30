# Agent Watson

> **Become better every single day.**

Agent Watson is a personal AI platform designed to be your learning, career, and growth operating system. It ingests knowledge from your work, studies, projects, and goals — building a rich personal knowledge graph that powers intelligent recommendations, long-term memory, and contextual assistance.

This is not a notes app. This is not a chatbot. This is not a productivity tool. It is a lifelong learning companion that grows with you.

---

## Vision

Help every individual become better every single day by learning from their work, studies, projects, goals, and knowledge.

---

## Architecture

```text
agent-watson/
├── apps/              # User-facing applications
│   ├── web/           # Next.js web application
│   └── cli/           # Command-line interface
├── packages/          # Shared libraries
│   ├── shared/        # Types, utilities, and constants
│   ├── config/        # Shared configuration presets
│   ├── ui/            # React UI component library
│   └── database/      # Database schemas and migrations
├── services/          # Backend microservices
│   ├── api/           # RESTful API gateway
│   ├── knowledge/     # Knowledge graph engine
│   └── search/        # Semantic and full-text search
├── docs/              # Documentation
├── tests/             # Integration and end-to-end tests
└── tools/             # Build and development tooling
```

---

## Tech Stack

| Layer | Technology |
|--------|------------|
| Monorepo | pnpm Workspaces + Turborepo |
| Frontend | Next.js, React, TypeScript |
| Backend | Python (FastAPI), Node.js |
| Database | PostgreSQL (pgvector) |
| Search | PostgreSQL Full-Text Search + Vector Embeddings |
| AI / ML | LangChain, OpenAI / Anthropic |
| CLI | Rust *(future)* |

---

## Getting Started

```bash
# Prerequisites
Node.js >= 20
pnpm >= 9

# Install dependencies
pnpm install

# Start development
pnpm dev
```

---

## Principles

1. **Privacy-first** — Your data belongs to you.
2. **Intelligence over automation** — Understand, don't just execute.
3. **Progressive learning** — The system learns from every interaction.
4. **Integration over isolation** — Connect existing tools, don't replace them.
5. **Long-term value** — Every feature should pay dividends over years.
6. **Human-in-the-loop** — AI assists, humans decide.
7. **Contextual awareness** — Know what you're doing and why.

---

## License

Licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
