# @agent-watson/database

Database schemas, migrations, and query layer for Agent Watson.

## Tech

- **PostgreSQL** with `pgvector` extension for hybrid search (full-text + vector embeddings)
- **Drizzle ORM** for type-safe queries and migrations
- **Drizzle Kit** for migration generation and push

## Structure

```
src/
├── schema/          # Drizzle table definitions
│   ├── knowledge.ts # Knowledge graph entities
│   ├── documents.ts # Notes, articles, books
│   ├── projects.ts  # Projects and tasks
│   └── user.ts      # User profile and preferences
├── migrations/      # Auto-generated migration files
├── seed/            # Seed data scripts
├── queries/         # Reusable query helpers
└── index.ts         # Database client and connection
```
