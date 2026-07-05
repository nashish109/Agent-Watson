import { pgTable, text, timestamp, integer, real, jsonb, vector, index } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  sessionDate: text("session_date").notNull(),
  title: text("title"),
  mode: text("mode").default("focus"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const contributions = pgTable("contributions", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  userId: text("user_id").references(() => users.id),
  text: text("text").notNull(),
  source: text("source").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const memories = pgTable(
  "memories",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id),
    contributionId: text("contribution_id").references(() => contributions.id),
    userId: text("user_id").references(() => users.id),
    type: text("type").notNull(),
    topic: text("topic").notNull(),
    summary: text("summary").notNull(),
    content: text("content"),
    confidence: text("confidence"),
    embedding: vector("embedding", { dimensions: 1536 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    embeddingIndex: index("memory_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    topicIndex: index("memory_topic_idx").on(table.topic),
    sessionIndex: index("memory_session_idx").on(table.sessionId),
  }),
)

export const reflections = pgTable("reflections", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  userId: text("user_id").references(() => users.id),
  memoryId: text("memory_id").references(() => memories.id),
  text: text("text").notNull(),
  relatedTo: jsonb("related_to"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const relationships = pgTable("relationships", {
  id: text("id").primaryKey(),
  sourceMemoryId: text("source_memory_id")
    .notNull()
    .references(() => memories.id),
  targetMemoryId: text("target_memory_id")
    .notNull()
    .references(() => memories.id),
  relationshipType: text("relationship_type").notNull(),
  label: text("label"),
  weight: text("weight"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const concepts = pgTable(
  "concepts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    name: text("name").notNull(),
    type: text("type").default("generic").notNull(),
    mentionCount: integer("mention_count").default(1).notNull(),
    firstSeen: timestamp("first_seen").defaultNow().notNull(),
    lastSeen: timestamp("last_seen").defaultNow().notNull(),
    relatedSessions: jsonb("related_sessions").default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    conceptNameIdx: index("concept_name_idx").on(table.name),
  }),
)

export const conceptEdges = pgTable("concept_edges", {
  id: text("id").primaryKey(),
  sourceConceptId: text("source_concept_id")
    .notNull()
    .references(() => concepts.id),
  targetConceptId: text("target_concept_id")
    .notNull()
    .references(() => concepts.id),
  relation: text("relation").default("related_to").notNull(),
  strength: real("strength").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const goals = pgTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").default("generic").notNull(),
  status: text("status").default("active").notNull(),
  progress: integer("progress").default(0).notNull(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const goalProgress = pgTable("goal_progress", {
  id: text("id").primaryKey(),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id),
  note: text("note").notNull(),
  progressDelta: integer("progress_delta").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const insights = pgTable("insights", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").default("generic").notNull(),
  strength: real("strength").default(0.5).notNull(),
  relatedMemoryIds: jsonb("related_memory_ids").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
